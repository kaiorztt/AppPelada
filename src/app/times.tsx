import { router } from 'expo-router';
import { ScrollView, Share, StyleSheet, View } from 'react-native';

import { TeamCard } from '@/components/TeamCard';
import { Button, confirm, EmptyState, IconButton, Screen } from '@/components/ui';
import { fixedKeeperFor, teamsAsText, usePlayersById } from '@/store/selectors';
import { usePeladaStore } from '@/store/usePeladaStore';
import { space, useColors } from '@/theme';

export default function TeamsScreen() {
  const c = useColors();
  const rotation = usePeladaStore((s) => s.rotation);
  const started = usePeladaStore((s) => s.matches.length > 0);
  const draw = usePeladaStore((s) => s.draw);
  const players = usePlayersById();

  if (!rotation) {
    return (
      <Screen title="Times">
        <EmptyState
          icon="shuffle-outline"
          title="Nenhum sorteio"
          text="Marque os presentes na aba Jogadores e toque em Sortear times."
        />
      </Screen>
    );
  }

  const order = [...rotation.onField, ...rotation.queue];
  const redraw = () =>
    started
      ? confirm('Sortear de novo?', 'O rodízio em andamento será perdido.', draw, 'Sortear')
      : draw();

  return (
    <Screen
      title="Times"
      subtitle={
        rotation.mode === 'closed'
          ? `${order.length} times de ${rotation.perTeam} · rodízio no gol`
          : `${order.length} times de ${rotation.perTeam} na linha · goleiro fixo`
      }
      right={
        <IconButton
          icon="share-social-outline"
          label="Compartilhar times"
          color={c.text}
          bg={c.surfaceAlt}
          onPress={() => Share.share({ message: teamsAsText(rotation, players) })}
        />
      }
    >
      <ScrollView contentContainerStyle={styles.list}>
        {order.map((id, i) => (
          <TeamCard
            key={id}
            team={rotation.teams[id]}
            players={players}
            perTeam={rotation.perTeam}
            mode={rotation.mode}
            fixedKeeper={fixedKeeperFor(rotation, players, id)}
            badge={i < 2 ? 'EM CAMPO' : i === 2 ? 'PRÓXIMO' : `${i - 1}º NA FILA`}
          />
        ))}
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: c.bg }]}>
        <Button label="Sortear" icon="refresh" variant="secondary" onPress={redraw} style={{ flex: 1 }} />
        <Button
          label="Rodízio"
          icon="play"
          onPress={() => router.navigate('/rodizio')}
          style={{ flex: 1 }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.lg, paddingBottom: 110, gap: space.md },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.lg,
    flexDirection: 'row',
    gap: space.md,
  },
});
