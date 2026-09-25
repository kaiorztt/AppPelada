import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Player, Rotation, Team, TeamMode } from '@/logic/types';
import { goalkeepersLabel } from '@/store/selectors';
import { font, radius, space, useColors } from '@/theme';
import { Card, Chip } from './ui';

type Props = {
  team: Team;
  players: Record<string, Player>;
  perTeam: number;
  mode: TeamMode;
  badge?: string;
  footer?: ReactNode;
  compact?: boolean;
};

export function TeamCard({ team, players, perTeam, mode, badge, footer, compact }: Props) {
  const c = useColors();
  const members = team.playerIds.map((id) => players[id]).filter(Boolean);
  // No time aberto os goleiros ficam fora dos times; quem está no time é linha.
  const keeper = mode === 'closed' ? members.find((p) => p.isGoalkeeper) : undefined;
  const rotatesInGoal = mode === 'closed' && !keeper;
  const ordered = keeper ? [keeper, ...members.filter((p) => p !== keeper)] : members;
  const incomplete = members.length < perTeam;

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={[styles.stripe, { backgroundColor: team.color }]} />
      <View style={{ padding: space.lg, gap: space.md }}>
        <View style={styles.head}>
          <View style={[styles.dot, { backgroundColor: team.color }]} />
          <Text style={[font.h2, { color: c.text, flex: 1 }]}>{team.name}</Text>
          <Text style={[font.small, { color: incomplete ? c.warning : c.textMuted }]}>
            {members.length}/{perTeam}
          </Text>
        </View>
        {badge || incomplete || rotatesInGoal ? (
          <View style={styles.chips}>
            {badge ? <Chip label={badge} color={c.accent} bg={c.accentSoft} /> : null}
            {incomplete ? <Chip label="INCOMPLETO" color={c.warning} bg={c.warningSoft} /> : null}
            {rotatesInGoal ? <Chip label="REVEZAM NO GOL" color={c.textMuted} bg={c.surfaceAlt} /> : null}
          </View>
        ) : null}
        {compact ? (
          <Text style={[font.small, { color: c.textMuted }]} numberOfLines={2}>
            {ordered.map((p) => (p === keeper ? `${p.name} (gol)` : p.name)).join(' · ')}
          </Text>
        ) : (
          <View style={{ gap: space.sm }}>
            {ordered.map((p) => (
              <View key={p.id} style={styles.row}>
                <Ionicons
                  name={p === keeper ? 'hand-left' : 'person'}
                  size={16}
                  color={p === keeper ? team.color : c.textMuted}
                />
                <Text style={[font.body, { color: c.text }]}>{p.name}</Text>
              </View>
            ))}
          </View>
        )}
        {footer}
      </View>
    </Card>
  );
}

/** No time aberto: quem está nos dois gols. */
export function GoalsCard({ rotation, players }: { rotation: Rotation; players: Record<string, Player> }) {
  const c = useColors();
  if (rotation.mode !== 'open') return null;
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}>
      <Ionicons name="hand-left" size={20} color={c.accent} />
      <View style={{ flex: 1 }}>
        <Text style={[font.caption, { color: c.textMuted }]}>NO GOL</Text>
        <Text style={[font.body, { color: c.text }]}>{goalkeepersLabel(rotation, players).join(' · ')}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stripe: { height: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 12, height: 12, borderRadius: radius.pill },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
