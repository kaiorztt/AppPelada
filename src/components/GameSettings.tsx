import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FillMode, TeamMode } from '@/logic/types';
import { usePeladaStore } from '@/store/usePeladaStore';
import { font, radius, space, useColors } from '@/theme';
import { IconButton, Segmented, tap } from './ui';

/** Configurações da pelada: tamanho do time, time fechado/aberto e como completar o próximo. */
export function GameSettings() {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const lineSize = usePeladaStore((s) => s.lineSize);
  const teamMode = usePeladaStore((s) => s.teamMode);
  const fillMode = usePeladaStore((s) => s.fillMode);
  const { setLineSize, setTeamMode, setFillMode } = usePeladaStore.getState();

  const closed = teamMode === 'closed';
  const summary = [
    `${lineSize} na linha`,
    closed ? 'Time fechado' : 'Time aberto',
    fillMode === 'arrival' ? 'Por chegada' : 'Por sorteio',
  ].join(' · ');

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          tap();
          setOpen(!open);
        }}
        style={styles.head}
      >
        <Ionicons name="options-outline" size={18} color={c.accent} />
        <Text style={[font.small, { color: c.text, flex: 1, fontWeight: '600' }]} numberOfLines={1}>
          {summary}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.textMuted} />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          <View style={styles.row}>
            <Text style={[font.small, { color: c.textMuted, flex: 1 }]}>Jogadores de linha</Text>
            <IconButton icon="remove" label="Menos" onPress={() => setLineSize(lineSize - 1)} color={c.text} bg={c.surfaceAlt} />
            <Text style={[font.h2, { color: c.text, minWidth: 28, textAlign: 'center' }]}>{lineSize}</Text>
            <IconButton icon="add" label="Mais" onPress={() => setLineSize(lineSize + 1)} color={c.text} bg={c.surfaceAlt} />
          </View>

          <View style={styles.block}>
            <Text style={[font.caption, { color: c.textMuted }]}>TIME</Text>
            <Segmented<TeamMode>
              value={teamMode}
              onChange={setTeamMode}
              options={[
                { value: 'closed', label: 'Fechado' },
                { value: 'open', label: 'Aberto' },
              ]}
            />
            <Text style={[font.small, { color: c.textMuted }]}>
              {closed
                ? `Cada time tem ${lineSize + 1} (${lineSize} na linha + 1) e eles se revezam no gol. Goleiros marcados são sorteados um por time.`
                : `Cada time tem só ${lineSize} na linha. Goleiros marcados ficam fixos no gol; se faltar goleiro, quem está de próximo pega o gol.`}
            </Text>
          </View>

          <View style={styles.block}>
            <Text style={[font.caption, { color: c.textMuted }]}>COMPLETAR O PRÓXIMO TIME</Text>
            <Segmented<FillMode>
              value={fillMode}
              onChange={setFillMode}
              options={[
                { value: 'arrival', label: 'Ordem de chegada' },
                { value: 'draw', label: 'Sorteio' },
              ]}
            />
            <Text style={[font.small, { color: c.textMuted }]}>
              {fillMode === 'arrival'
                ? 'Se o próximo time estiver incompleto, fica quem chegou primeiro entre os que saíram.'
                : 'Se o próximo time estiver incompleto, o app sorteia entre os que saíram quem fica.'}
            </Text>
          </View>

          <Text style={[font.small, { color: c.textMuted, fontStyle: 'italic' }]}>
            Tamanho e tipo de time valem a partir do próximo sorteio.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, marginTop: space.md },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    height: 48,
  },
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  block: { gap: space.sm },
});
