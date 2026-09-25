import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { GoalsCard, TeamCard } from '@/components/TeamCard';
import { Button, Card, EmptyState, IconButton, Screen, SectionLabel } from '@/components/ui';
import { Player, Team } from '@/logic/types';
import { usePlayersById } from '@/store/selectors';
import { usePeladaStore } from '@/store/usePeladaStore';
import { font, radius, space, useColors } from '@/theme';

export default function RotationScreen() {
  const c = useColors();
  const rotation = usePeladaStore((s) => s.rotation);
  const matches = usePeladaStore((s) => s.matches);
  const canUndo = usePeladaStore((s) => s.undoStack.length > 0);
  const { teamLost, undoMatch } = usePeladaStore.getState();
  const players = usePlayersById();

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
        <SectionLabel>EM CAMPO</SectionLabel>
        <Card style={{ gap: space.lg }}>
          <View style={styles.versus}>
            <Side team={a} players={players} perTeam={rotation.perTeam} closed={closed} />
            <View style={[styles.vs, { backgroundColor: c.surfaceAlt }]}>
              <Text style={[font.caption, { color: c.textMuted }]}>VS</Text>
            </View>
            {b ? <Side team={b} players={players} perTeam={rotation.perTeam} closed={closed} /> : <View style={{ flex: 1 }} />}
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
        {closed ? null : <View style={{ height: space.sm }} />}
        <GoalsCard rotation={rotation} players={players} />

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
    </Screen>
  );
}

function Side({
  team,
  players,
  perTeam,
  closed,
}: {
  team: Team;
  players: Record<string, Player>;
  perTeam: number;
  closed: boolean;
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
