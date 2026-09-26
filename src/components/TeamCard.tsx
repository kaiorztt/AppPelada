import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Player, Team, TeamMode } from '@/logic/types';
import { FixedKeeper } from '@/store/selectors';
import { font, radius, space, useColors } from '@/theme';
import { Card, Chip } from './ui';

type Props = {
  team: Team;
  players: Record<string, Player>;
  perTeam: number;
  mode: TeamMode;
  /** Goleiro fixo do gol deste time (só times em campo, modo goleiro fixo). */
  fixedKeeper?: FixedKeeper;
  badge?: string;
  footer?: ReactNode;
  compact?: boolean;
};

export function TeamCard({ team, players, perTeam, mode, fixedKeeper, badge, footer, compact }: Props) {
  const c = useColors();
  const members = team.playerIds.map((id) => players[id]).filter(Boolean);
  // No goleiro fixo os goleiros ficam fora dos times; quem está no time é linha.
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
            {[
              ...(fixedKeeper ? [`${fixedKeeper.name} (gol)`] : []),
              ...ordered.map((p) => (p === keeper ? `${p.name} (gol)` : p.name)),
            ].join(' · ')}
          </Text>
        ) : (
          <View style={{ gap: space.sm }}>
            {fixedKeeper ? (
              <View style={styles.row}>
                <Ionicons name="hand-left" size={16} color={team.color} />
                <Text
                  style={[
                    font.body,
                    fixedKeeper.placeholder
                      ? { color: c.textMuted, fontStyle: 'italic' }
                      : { color: c.text },
                  ]}
                >
                  {fixedKeeper.name}
                </Text>
              </View>
            ) : null}
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

const styles = StyleSheet.create({
  stripe: { height: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 12, height: 12, borderRadius: radius.pill },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
