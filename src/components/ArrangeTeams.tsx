import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  ScrollView,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MAX_KEEPERS, Slot } from '@/logic/rotation';
import { Player, Rotation } from '@/logic/types';
import { usePlayersById } from '@/store/selectors';
import { usePeladaStore } from '@/store/usePeladaStore';
import { font, radius, space, useColors } from '@/theme';
import { Button, Chip, IconButton, tap } from './ui';

const HEADER_H = 48;
const ROW_H = 52; // linha (46) + espaço (6)
const EDGE = 70; // perto da borda, a lista rola sozinha durante o arraste

type Row =
  | { kind: 'header'; key: string; group: Slot; title: string; tag?: string; count: string; full: boolean; color?: string }
  | { kind: 'player'; key: string; group: Slot; id: string; index: number; hidden?: boolean }
  | { kind: 'empty'; key: string; group: Slot; text: string }
  | { kind: 'placeholder'; key: string; group: Slot };

const heightOf = (r: Row) => (r.kind === 'header' ? HEADER_H : ROW_H);

/** Todas as linhas: goleiros fixos, times em campo, fila e "Novo time". */
function buildRows(rotation: Rotation): Row[] {
  const rows: Row[] = [];
  const pushGroup = (group: Slot, head: Omit<Extract<Row, { kind: 'header' }>, 'kind' | 'key' | 'group'>, ids: string[], empty: string) => {
    rows.push({ kind: 'header', key: `h:${group}`, group, ...head });
    ids.forEach((id, index) => rows.push({ kind: 'player', key: id, group, id, index }));
    if (!ids.length) rows.push({ kind: 'empty', key: `e:${group}`, group, text: empty });
  };

  if (rotation.mode === 'open') {
    pushGroup(
      'keepers',
      { title: 'Goleiros fixos', count: `${rotation.keepers.length}/${MAX_KEEPERS}`, full: rotation.keepers.length >= MAX_KEEPERS },
      rotation.keepers,
      'Solte aqui para colocar no gol',
    );
  }
  [...rotation.onField, ...rotation.queue].forEach((teamId) => {
    const t = rotation.teams[teamId];
    const q = rotation.queue.indexOf(teamId);
    pushGroup(
      teamId,
      {
        title: t.name,
        tag: q === -1 ? 'EM CAMPO' : q === 0 ? 'PRÓXIMO' : `${q + 1}º NA FILA`,
        count: `${t.playerIds.length}/${rotation.perTeam}`,
        full: t.playerIds.length === rotation.perTeam,
        color: t.color,
      },
      t.playerIds,
      'Time vazio',
    );
  });
  pushGroup('new', { title: 'Novo time', count: '', full: true }, [], 'Solte aqui para criar um time no fim da fila');
  return rows;
}

/**
 * Para onde vai o jogador se for solto com o topo em `y` (coordenada do conteúdo),
 * considerando as linhas sem ele. Retorna a posição na lista e o grupo/índice.
 */
function dropTarget(rows: Row[], y: number) {
  let top = 0;
  let pos = 0;
  for (const r of rows) {
    const h = heightOf(r);
    if (top + h / 2 < y + ROW_H / 2) pos++;
    else break;
    top += h;
  }
  pos = Math.max(1, pos); // nunca antes do primeiro título
  const prev = rows[pos - 1];
  const group = prev.group;
  const index = prev.kind === 'player' ? prev.index + 1 : 0;
  // A linha "vazio" do grupo some quando o espaço reservado entra nele.
  if (rows[pos]?.kind === 'empty' && rows[pos].group === group) pos++;
  return { pos, group, index };
}

/** Arraste em andamento: dedo (pageY), posição da lista na tela e rolagem atual. */
type Drag = { id: string; pageY: number; top: number; height: number; scroll: number };

/** Topo do item arrastado, em coordenadas do conteúdo da lista. */
const contentY = (d: Drag) => d.pageY - d.top + d.scroll - ROW_H / 2;

const withoutPlayer = (rows: Row[], id: string) => rows.filter((r) => !(r.kind === 'player' && r.id === id));

/**
 * Controle do arraste, fora do React: guarda o arraste atual, a posição da lista
 * na tela e a rolagem. Avisa a tela por `onChange`.
 */
function createDragController(onChange: (d: Drag | null) => void) {
  let drag: Drag | null = null;
  let scroll = 0;
  let box = { top: 0, height: 0 };
  let scrollTo: (y: number) => void = () => {};

  const set = (d: Drag | null) => {
    drag = d;
    onChange(d);
  };

  return {
    setBox: (top: number, height: number) => {
      box = { top, height };
      if (drag) set({ ...drag, top, height });
    },
    setScroller: (fn: (y: number) => void) => {
      scrollTo = fn;
    },
    onScroll: (y: number) => {
      if (!drag) scroll = y;
    },
    start: (id: string, pageY: number) => {
      set({ id, pageY, top: box.top, height: box.height, scroll });
      tap('medium');
    },
    move: (pageY: number) => {
      if (drag) set({ ...drag, pageY });
    },
    /** Solta o jogador onde está o espaço reservado e salva (com desfazer). */
    drop: (pageY: number) => {
      const d = drag;
      set(null);
      const rotation = usePeladaStore.getState().rotation;
      if (!d || !rotation) return;
      scroll = d.scroll;
      const t = dropTarget(withoutPlayer(buildRows(rotation), d.id), contentY({ ...d, pageY }));
      usePeladaStore.getState().relocatePlayer(d.id, t.group, t.index);
      tap('success');
    },
    cancel: () => {
      if (drag) {
        scroll = drag.scroll;
        set(null);
      }
    },
    /** Cancela só se ainda for o arraste deste jogador. */
    cancelIf: (id: string) => {
      if (drag?.id === id) {
        scroll = drag.scroll;
        set(null);
      }
    },
    /** Rola a lista sozinha quando o dedo chega perto do topo ou do fim. */
    autoScroll: () => {
      if (!drag) return;
      const step = drag.pageY < drag.top + EDGE ? -12 : drag.pageY > drag.top + drag.height - EDGE ? 12 : 0;
      if (!step) return;
      const y = Math.max(0, drag.scroll + step);
      scrollTo(y);
      set({ ...drag, scroll: y });
    },
  };
}

type DragController = ReturnType<typeof createDragController>;

/**
 * Linha de jogador: tocar marca (fica vermelho) e tocar em outro troca os dois;
 * segurar e arrastar muda a posição (o arraste só começa depois de segurar).
 */
function PlayerRow({
  id,
  name,
  keeper,
  selected,
  hidden,
  onTap,
  onDragStart,
  ctrl,
}: {
  id: string;
  name: string;
  keeper: boolean;
  selected: boolean;
  /** Sendo arrastado: fica invisível, mas montado, para o gesto continuar recebendo o dedo. */
  hidden: boolean;
  onTap: (id: string) => void;
  /** Começou a arrastar: desmarca quem estava marcado para troca. */
  onDragStart: () => void;
  ctrl: DragController;
}) {
  const c = useColors();
  const tapGesture = useTapGesture({
    disableReanimated: true,
    runOnJS: true,
    onActivate: () => onTap(id),
  });
  const pan = usePanGesture({
    activateAfterLongPress: 250,
    disableReanimated: true,
    runOnJS: true,
    onActivate: (e) => {
      onDragStart();
      ctrl.start(id, e.absoluteY);
    },
    onUpdate: (e) => ctrl.move(e.absoluteY),
    onDeactivate: (e) => (e.canceled ? ctrl.cancel() : ctrl.drop(e.absoluteY)),
    // Garantia: se o gesto terminar sem soltar normalmente, o arraste não fica preso.
    onFinalize: () => ctrl.cancelIf(id),
  });
  // Quem reconhecer primeiro ganha: toque rápido ou segurar para arrastar.
  const gesture = useCompetingGestures(pan, tapGesture);
  return (
    <GestureDetector gesture={gesture}>
      <View style={hidden ? styles.hiddenRow : { height: ROW_H }}>
        <View
          style={[
            styles.row,
            selected
              ? { backgroundColor: c.dangerSoft, borderColor: c.danger, borderWidth: 2 }
              : { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <Ionicons name="reorder-three" size={22} color={selected ? c.danger : c.textMuted} />
          {keeper ? <Ionicons name="hand-left" size={14} color={c.accent} /> : null}
          <Text
            style={[font.body, { color: selected ? c.danger : c.text, flex: 1, fontWeight: selected ? '700' : '500' }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {selected ? <Text style={[font.small, { color: c.danger }]}>toque em outro</Text> : null}
        </View>
      </View>
    </GestureDetector>
  );
}

export function ArrangeTeams({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors();
  const rotation = usePeladaStore((s) => s.rotation);
  const lastAction = usePeladaStore((s) => s.undoStack[s.undoStack.length - 1]?.label);
  const { undo, swap } = usePeladaStore.getState();
  const players = usePlayersById();

  const [drag, setDrag] = useState<Drag | null>(null);
  /** Jogador marcado (vermelho) esperando o segundo toque para trocar. */
  const [selected, setSelected] = useState<string | null>(null);
  const onTap = (id: string) => {
    if (!selected) {
      setSelected(id);
      tap();
    } else if (selected === id) {
      setSelected(null);
    } else {
      swap(selected, id);
      setSelected(null);
      tap('success');
    }
  };
  const [ctrl] = useState(() => createDragController(setDrag));
  const scrollRef = useRef<ScrollView>(null);
  const boxRef = useRef<View>(null);

  const rows = useMemo(() => (rotation ? buildRows(rotation) : []), [rotation]);
  const without = useMemo(() => (drag ? withoutPlayer(rows, drag.id) : rows), [rows, drag]);
  const target = drag ? dropTarget(without, contentY(drag)) : null;
  const keepersFull =
    !!rotation && target?.group === 'keepers' && rotation.keepers.filter((k) => k !== drag?.id).length >= MAX_KEEPERS;

  const shown: Row[] =
    drag && target && !keepersFull
      ? [
          ...without.slice(0, target.pos).filter((r) => !(r.kind === 'empty' && r.group === target.group)),
          { kind: 'placeholder', key: 'placeholder', group: target.group },
          ...without.slice(target.pos),
        ]
      : without;
  // A linha arrastada continua montada (invisível) para não perder o gesto do dedo.
  const dragRow = drag ? rows.find((r) => r.kind === 'player' && r.id === drag.id) : undefined;
  if (dragRow && dragRow.kind === 'player') shown.push({ ...dragRow, hidden: true });

  useEffect(() => {
    ctrl.setScroller((y) => scrollRef.current?.scrollTo({ y, animated: false }));
  }, [ctrl]);

  const dragging = !!drag;
  useEffect(() => {
    if (!dragging) return;
    // Confere de novo onde a lista está na tela e rola sozinha perto das bordas.
    boxRef.current?.measure((_x, _y, _w, height, _px, top) => ctrl.setBox(top, height));
    const timer = setInterval(ctrl.autoScroll, 16);
    return () => clearInterval(timer);
  }, [dragging, ctrl]);

  const measureBox = () => boxRef.current?.measure((_x, _y, _w, height, _px, top) => ctrl.setBox(top, height));
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => ctrl.onScroll(e.nativeEvent.contentOffset.y);

  const dragged: Player | undefined = drag ? players[drag.id] : undefined;
  const closed = rotation?.mode === 'closed';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => {
        ctrl.cancel();
        setSelected(null);
        onClose();
      }}
      statusBarTranslucent
      onShow={measureBox}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[font.title, { color: c.text }]}>Trocar</Text>
              <Text style={[font.small, { color: c.textMuted }]}>
                Toque em dois nomes para trocar · segure e arraste para mudar a posição
              </Text>
            </View>
            <IconButton
              icon="close"
              label="Fechar"
              onPress={() => {
                setSelected(null);
                ctrl.cancel();
                onClose();
              }}
              color={c.text}
              bg={c.surfaceAlt}
            />
          </View>

          {lastAction ? (
            <View style={[styles.undoBar, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="time-outline" size={18} color={c.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[font.caption, { color: c.textMuted }]}>ÚLTIMA AÇÃO</Text>
                <Text style={[font.small, { color: c.text }]} numberOfLines={2}>
                  {lastAction}
                </Text>
              </View>
              <Button label="Desfazer" icon="arrow-undo" variant="secondary" compact onPress={undo} />
            </View>
          ) : null}

          <View ref={boxRef} style={{ flex: 1 }} collapsable={false} onLayout={measureBox}>
            <ScrollView
              ref={scrollRef}
              scrollEnabled={!drag}
              onScroll={onScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}
            >
              {shown.map((r) => {
                if (r.kind === 'header') {
                  return (
                    <View key={r.key} style={[styles.headerRow, { height: HEADER_H }]}>
                      {r.color ? <View style={[styles.dot, { backgroundColor: r.color }]} /> : null}
                      <Text style={[font.h2, { color: c.text }]}>{r.title}</Text>
                      {r.tag ? <Chip label={r.tag} color={c.accent} bg={c.accentSoft} /> : null}
                      <View style={{ flex: 1 }} />
                      <Text style={[font.small, { color: r.full ? c.textMuted : c.warning }]}>{r.count}</Text>
                    </View>
                  );
                }
                if (r.kind === 'placeholder') {
                  return (
                    <View key={r.key} style={{ height: ROW_H }}>
                      <View style={[styles.row, styles.placeholder, { borderColor: c.accent, backgroundColor: c.accentSoft }]} />
                    </View>
                  );
                }
                if (r.kind === 'empty') {
                  return (
                    <View key={r.key} style={{ height: ROW_H }}>
                      <View style={[styles.row, styles.empty, { borderColor: c.border }]}>
                        <Text style={[font.small, { color: c.textMuted }]}>{r.text}</Text>
                      </View>
                    </View>
                  );
                }
                const p = players[r.id];
                return (
                  <PlayerRow
                    key={r.key}
                    id={r.id}
                    name={p?.name ?? ''}
                    keeper={!!closed && !!p?.isGoalkeeper}
                    selected={selected === r.id}
                    hidden={!!r.hidden}
                    onTap={onTap}
                    onDragStart={() => setSelected(null)}
                    ctrl={ctrl}
                  />
                );
              })}
            </ScrollView>

            {drag && dragged ? (
              <View
                pointerEvents="none"
                style={[
                  styles.row,
                  styles.floating,
                  {
                    top: drag.pageY - drag.top - ROW_H / 2,
                    backgroundColor: c.surface,
                    borderColor: keepersFull ? c.danger : c.accent,
                  },
                ]}
              >
                <Ionicons name="reorder-three" size={22} color={c.accent} />
                <Text style={[font.body, { color: c.text, flex: 1, fontWeight: '700' }]} numberOfLines={1}>
                  {dragged.name}
                </Text>
                {keepersFull ? <Text style={[font.small, { color: c.danger }]}>gol cheio</Text> : null}
              </View>
            ) : null}
          </View>

          <View style={styles.footer}>
            <Button
              label="Concluir"
              icon="checkmark"
              onPress={() => {
                setSelected(null);
                ctrl.cancel();
                onClose();
              }}
            />
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.sm },
  dot: { width: 12, height: 12, borderRadius: radius.pill },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: ROW_H - 6,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  placeholder: { borderStyle: 'dashed', borderWidth: 2 },
  empty: { borderStyle: 'dashed', justifyContent: 'center' },
  floating: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    borderWidth: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  footer: { padding: space.lg },
  hiddenRow: { height: 0, opacity: 0, overflow: 'hidden' },
});
