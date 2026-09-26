import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PickerItem, PlayerPicker } from '@/components/PlayerPicker';
import { TeamCard } from '@/components/TeamCard';
import { Button, Card, confirm, EmptyState, IconButton, Screen, SectionLabel } from '@/components/ui';
import { playersInRotation } from '@/logic/rotation';
import { Player, Team } from '@/logic/types';
import { FixedKeeper, fixedKeeperFor, usePlayersById } from '@/store/selectors';
import { usePeladaStore } from '@/store/usePeladaStore';
import { font, radius, space, useColors } from '@/theme';

export default function RotationScreen() {
  const c = useColors();
  const rotation = usePeladaStore((s) => s.rotation);
  const matches = usePeladaStore((s) => s.matches);
  const canUndo = usePeladaStore((s) => s.undoStack.length > 0);
  const allPlayers = usePeladaStore((s) => s.players);
  const presentIds = usePeladaStore((s) => s.presentIds);
  const { teamLost, undoMatch, playerLeft, lateArrival, addPlayer } = usePeladaStore.getState();
  const players = usePlayersById();
  const [picker, setPicker] = useState<'left' | 'arrived' | null>(null);

  if (!rotation) {
    return (
      <Screen title="Rodízio">
        <EmptyState
          icon="repeat-outline"
          title="Sorteie os times primeiro"
          text="Depois do sorteio, o rodízio aparece aqui: quem perde sai e o próximo entra."
        />
      </Screen>
    );
  }

  const [a, b] = rotation.onField.map((id) => rotation.teams[id]);
  const waiting = rotation.queue.length;
  const closed = rotation.mode === 'closed';

  // Quem pode sair: todo mundo nos times (e goleiros fixos), na ordem do rodízio.
  const leaving: PickerItem[] = [
    ...rotation.keepers.map((id) => ({ id, name: players[id]?.name ?? '', hint: 'Goleiro fixo' })),
    ...[...rotation.onField, ...rotation.queue].flatMap((teamId) => {
      const t = rotation.teams[teamId];
      return t.playerIds.map((id) => ({ id, name: players[id]?.name ?? '', hint: t.name, color: t.color }));
    }),
  ];
  // Quem pode chegar: cadastrados que não estão no rodízio (ausentes ou que saíram).
  const inRotation = playersInRotation(rotation);
  const arriving: PickerItem[] = allPlayers
    .filter((p) => !inRotation.has(p.id))
    .sort((x, y) => x.name.localeCompare(y.name))
    .map((p) => ({ id: p.id, name: p.name, hint: presentIds.includes(p.id) ? 'saiu' : undefined }));

  const onLeft = (id: string) => {
    const name = players[id]?.name ?? 'Jogador';
    confirm(
      `${name} saiu?`,
      'Ele sai do rodízio e os times são reorganizados. Continua na lista de pagamento.',
      () => {
        playerLeft(id);
        setPicker(null);
      },
      'Tirar',
    );
  };
  const onArrived = (id: string) => {
    lateArrival(id);
    setPicker(null);
  };

  return (
    <Screen
      title="Rodízio"
      subtitle={`${matches.length} partida${matches.length === 1 ? '' : 's'} · ${waiting} na fila`}
      right={
        canUndo ? (
          <IconButton icon="arrow-undo" label="Desfazer última partida" onPress={undoMatch} color={c.text} bg={c.surfaceAlt} />
        ) : null
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.roster}>
          <Button
            label="Chegou"
            icon="person-add-outline"
            variant="secondary"
            compact
            onPress={() => setPicker('arrived')}
            style={{ flex: 1 }}
          />
          <Button
            label="Saiu"
            icon="exit-outline"
            variant="secondary"
            compact
            onPress={() => setPicker('left')}
            style={{ flex: 1 }}
          />
        </View>
        <SectionLabel>EM CAMPO</SectionLabel>
        <Card style={{ gap: space.lg }}>
          <View style={styles.versus}>
            <Side
              team={a}
              players={players}
              perTeam={rotation.perTeam}
              closed={closed}
              fixedKeeper={fixedKeeperFor(rotation, players, a.id)}
            />
            <View style={[styles.vs, { backgroundColor: c.surfaceAlt }]}>
              <Text style={[font.caption, { color: c.textMuted }]}>VS</Text>
            </View>
            {b ? <Side
                team={b}
                players={players}
                perTeam={rotation.perTeam}
                closed={closed}
                fixedKeeper={fixedKeeperFor(rotation, players, b.id)}
              /> : <View style={{ flex: 1 }} />}
          </View>
          {b && waiting > 0 ? (
            <>
              <Text style={[font.small, { color: c.textMuted, textAlign: 'center' }]}>Quem perdeu?</Text>
              <View style={styles.actions}>
                <Button label={a.name} icon="close" variant="danger" compact onPress={() => teamLost([a.id])} style={{ flex: 1 }} />
                <Button label={b.name} icon="close" variant="danger" compact onPress={() => teamLost([b.id])} style={{ flex: 1 }} />
              </View>
              <Button
                label="Empate · saem os dois"
                variant="ghost"
                compact
                disabled={waiting < 2}
                onPress={() => teamLost([a.id, b.id])}
              />
            </>
          ) : (
            <Text style={[font.small, { color: c.textMuted, textAlign: 'center' }]}>
              Nenhum time esperando — o rodízio só gira quando há time na fila.
            </Text>
          )}
        </Card>

        {waiting > 0 ? (
          <>
            <SectionLabel>FILA</SectionLabel>
            <View style={{ gap: space.sm }}>
              {rotation.queue.map((id, i) => (
                <TeamCard
                  key={id}
                  compact
                  team={rotation.teams[id]}
                  players={players}
                  perTeam={rotation.perTeam}
                  mode={rotation.mode}
                  badge={i === 0 ? 'PRÓXIMO' : `${i + 1}º`}
                />
              ))}
            </View>
          </>
        ) : null}

        {matches.length ? (
          <>
            <SectionLabel>PARTIDAS</SectionLabel>
            <Card style={{ paddingVertical: space.sm }}>
              {matches.map((m, i) => (
                <View
                  key={m.id}
                  style={[styles.match, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}
                >
                  <Text style={[font.caption, { color: c.textMuted, width: 28 }]}>#{matches.length - i}</Text>
                  <Text style={[font.body, { color: c.text, flex: 1 }]}>
                    {m.winners.length ? `${m.winners.join(', ')} venceu ${m.losers.join(', ')}` : `Empate: ${m.losers.join(' × ')}`}
                  </Text>
                  <Text style={[font.small, { color: c.textMuted }]}>
                    {new Date(m.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>

      <PlayerPicker
        visible={picker === 'arrived'}
        title="Quem chegou?"
        subtitle="Entra no último time incompleto ou num time novo no fim da fila."
        icon="person-add-outline"
        items={arriving}
        emptyText="Todos os cadastrados já estão no rodízio. Cadastre alguém novo acima."
        onPick={onArrived}
        onCreate={(name) => {
          const id = addPlayer(name);
          if (id) onArrived(id);
        }}
        onClose={() => setPicker(null)}
      />
      <PlayerPicker
        visible={picker === 'left'}
        title="Quem saiu?"
        subtitle="Quem está no último time da fila sobe para completar."
        icon="exit-outline"
        items={leaving}
        emptyText="Ninguém no rodízio."
        onPick={onLeft}
        onClose={() => setPicker(null)}
      />
    </Screen>
  );
}

function Side({
  team,
  players,
  perTeam,
  closed,
  fixedKeeper,
}: {
  team: Team;
  players: Record<string, Player>;
  perTeam: number;
  closed: boolean;
  fixedKeeper?: FixedKeeper;
}) {
  const c = useColors();
  const members = team.playerIds.map((id) => players[id]).filter(Boolean);
  const isKeeper = (p: Player) => closed && p.isGoalkeeper;
  const ordered = [...members].sort((x, y) => Number(isKeeper(y)) - Number(isKeeper(x)));
  return (
    <View style={{ flex: 1, gap: space.sm }}>
      <View style={styles.sideHead}>
        <View style={[styles.dot, { backgroundColor: team.color }]} />
        <Text style={[font.h2, { color: c.text }]} numberOfLines={1}>
          {team.name}
        </Text>
      </View>
      {members.length < perTeam ? (
        <Text style={[font.caption, { color: c.warning }]}>
          {members.length}/{perTeam}
        </Text>
      ) : null}
      {fixedKeeper ? (
        <View style={styles.sideRow}>
          <Ionicons name="hand-left" size={12} color={team.color} />
          <Text
            style={[
              font.small,
              { flexShrink: 1 },
              fixedKeeper.placeholder ? { color: c.textMuted, fontStyle: 'italic' } : { color: c.text },
            ]}
            numberOfLines={1}
          >
            {fixedKeeper.name}
          </Text>
        </View>
      ) : null}
      {ordered.map((p) => (
        <View key={p.id} style={styles.sideRow}>
          {isKeeper(p) ? <Ionicons name="hand-left" size={12} color={team.color} /> : null}
          <Text style={[font.small, { color: c.text, flexShrink: 1 }]} numberOfLines={1}>
            {p.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  roster: { flexDirection: 'row', gap: space.md },
  versus: { flexDirection: 'row', gap: space.md },
  vs: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  actions: { flexDirection: 'row', gap: space.md },
  sideHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sideRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  match: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md },
});
