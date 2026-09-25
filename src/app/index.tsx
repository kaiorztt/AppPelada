import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GameSettings } from '@/components/GameSettings';
import { Button, confirm, EmptyState, IconButton, Screen, tap } from '@/components/ui';
import { Player } from '@/logic/types';
import { usePeladaStore } from '@/store/usePeladaStore';
import { font, radius, space, useColors } from '@/theme';

export default function PlayersScreen() {
  const c = useColors();
  const [name, setName] = useState('');
  const players = usePeladaStore((s) => s.players);
  const presentIds = usePeladaStore((s) => s.presentIds);
  const hasTeams = usePeladaStore((s) => !!s.rotation);
  const { addPlayer, removePlayer, toggleGoalkeeper, togglePresent, draw } = usePeladaStore.getState();

  const sorted = useMemo(() => {
    const present = presentIds
      .map((id) => players.find((p) => p.id === id))
      .filter((p): p is Player => !!p);
    const absent = players
      .filter((p) => !presentIds.includes(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...present, ...absent];
  }, [players, presentIds]);

  const keepers = players.filter((p) => p.isGoalkeeper && presentIds.includes(p.id)).length;

  const submit = () => {
    addPlayer(name);
    setName('');
  };

  const onDraw = () => {
    const go = () => {
      draw();
      router.navigate('/times');
    };
    if (hasTeams) confirm('Sortear de novo?', 'Os times e o rodízio atuais serão substituídos.', go, 'Sortear');
    else go();
  };

  return (
    <Screen
      title="Jogadores"
      subtitle={`${presentIds.length} presentes · ${keepers} goleiro${keepers === 1 ? '' : 's'}`}
    >
      <View style={styles.pad}>
        <View style={[styles.inputRow, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={submit}
            placeholder="Nome do jogador"
            placeholderTextColor={c.textMuted}
            returnKeyType="done"
            submitBehavior="submit"
            style={[font.body, styles.input, { color: c.text }]}
          />
          <IconButton
            icon="add"
            label="Adicionar"
            onPress={submit}
            color={c.onAccent}
            bg={c.accent}
            size={22}
          />
        </View>

        <GameSettings />
        {players.length ? (
          <Text style={[font.small, { color: c.textMuted, paddingVertical: space.sm }]}>
            Toque para marcar presença · segure para remover
          </Text>
        ) : null}
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.pad, { paddingBottom: 110, flexGrow: 1 }]}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        ListEmptyComponent={
          <EmptyState
            icon="football-outline"
            title="Nenhum jogador ainda"
            text="Adicione os nomes acima. Toque no jogador para marcar presença — a ordem define quem chegou primeiro."
          />
        }
        renderItem={({ item }) => {
          const arrival = presentIds.indexOf(item.id);
          const present = arrival !== -1;
          return (
            <Pressable
              onPress={() => {
                tap();
                togglePresent(item.id);
              }}
              onLongPress={() =>
                confirm('Remover jogador?', `${item.name} sai da lista.`, () => removePlayer(item.id), 'Remover')
              }
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: c.surface,
                  borderColor: present ? c.accent : c.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.check,
                  present
                    ? { backgroundColor: c.accent, borderColor: c.accent }
                    : { borderColor: c.border },
                ]}
              >
                {present ? (
                  <Text style={[font.small, { color: c.onAccent, fontWeight: '800' }]}>{arrival + 1}</Text>
                ) : null}
              </View>
              <Text
                style={[font.body, { color: present ? c.text : c.textMuted, flex: 1 }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.isGoalkeeper ? 'Desmarcar goleiro' : 'Marcar como goleiro'}
                hitSlop={8}
                onPress={() => {
                  tap();
                  toggleGoalkeeper(item.id);
                }}
                style={[
                  styles.gk,
                  { backgroundColor: item.isGoalkeeper ? c.accentSoft : 'transparent' },
                ]}
              >
                <Ionicons
                  name={item.isGoalkeeper ? 'hand-left' : 'hand-left-outline'}
                  size={16}
                  color={item.isGoalkeeper ? c.accent : c.textMuted}
                />
                <Text style={[font.caption, { color: item.isGoalkeeper ? c.accent : c.textMuted }]}>GOL</Text>
              </Pressable>
            </Pressable>
          );
        }}
      />

      <View style={[styles.footer, { backgroundColor: c.bg }]}>
        <Button
          label={`Sortear times${presentIds.length ? ` (${presentIds.length})` : ''}`}
          icon="shuffle"
          onPress={onDraw}
          disabled={presentIds.length < 2}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    height: 52,
  },
  input: { flex: 1, height: '100%', outlineWidth: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg },
});
