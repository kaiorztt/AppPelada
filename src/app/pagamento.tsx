import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, confirm, EmptyState, Screen, tap } from '@/components/ui';
import { usePlayersById } from '@/store/selectors';
import { usePeladaStore } from '@/store/usePeladaStore';
import { font, radius, space, useColors } from '@/theme';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PaymentScreen() {
  const c = useColors();
  const presentIds = usePeladaStore((s) => s.presentIds);
  const paidIds = usePeladaStore((s) => s.paidIds);
  const totalCost = usePeladaStore((s) => s.totalCost);
  const { togglePaid, setTotalCost, newSession } = usePeladaStore.getState();
  const players = usePlayersById();

  const [costText, setCostText] = useState(totalCost ? String(totalCost).replace('.', ',') : '');

  const present = presentIds.map((id) => players[id]).filter(Boolean);
  const paidCount = present.filter((p) => paidIds.includes(p.id)).length;
  const perPerson = present.length ? totalCost / present.length : 0;
  const progress = present.length ? paidCount / present.length : 0;

  const onReset = () =>
    confirm(
      'Começar nova pelada?',
      'Presenças, times, rodízio e pagamentos serão zerados. A lista de jogadores continua.',
      newSession,
      'Zerar',
    );

  return (
    <Screen title="Pagamento" subtitle={`${paidCount} de ${present.length} pagaram`}>
      <FlatList
        data={present}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        ListHeaderComponent={
          <Card style={{ gap: space.md, marginBottom: space.lg }}>
            <View style={styles.costRow}>
              <Text style={[font.small, { color: c.textMuted, flex: 1 }]}>Valor total da pelada</Text>
              <View style={[styles.costInput, { backgroundColor: c.surfaceAlt }]}>
                <Text style={[font.body, { color: c.textMuted }]}>R$</Text>
                <TextInput
                  value={costText}
                  onChangeText={(t) => {
                    const clean = t.replace(/[^\d,.]/g, '');
                    setCostText(clean);
                    setTotalCost(Number(clean.replace(/\./g, '').replace(',', '.')) || 0);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor={c.textMuted}
                  style={[font.body, styles.input, { color: c.text }]}
                />
              </View>
            </View>
            <View style={styles.stats}>
              <Stat label="Por pessoa" value={brl(perPerson)} />
              <Stat label="Arrecadado" value={brl(perPerson * paidCount)} />
              <Stat label="Falta" value={brl(perPerson * (present.length - paidCount))} />
            </View>
            <View style={[styles.bar, { backgroundColor: c.surfaceAlt }]}>
              <View style={[styles.barFill, { backgroundColor: c.accent, width: `${progress * 100}%` }]} />
            </View>
          </Card>
        }
        ListEmptyComponent={
          <EmptyState
            icon="wallet-outline"
            title="Ninguém presente"
            text="Marque a presença na aba Jogadores para controlar os pagamentos aqui."
          />
        }
        renderItem={({ item }) => {
          const paid = paidIds.includes(item.id);
          return (
            <Pressable
              onPress={() => {
                tap(paid ? 'light' : 'success');
                togglePaid(item.id);
              }}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[font.body, { color: c.text, flex: 1 }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.status, { backgroundColor: paid ? c.accentSoft : c.surfaceAlt }]}>
                <Ionicons
                  name={paid ? 'checkmark-circle' : 'time-outline'}
                  size={16}
                  color={paid ? c.accent : c.textMuted}
                />
                <Text style={[font.caption, { color: paid ? c.accent : c.textMuted }]}>
                  {paid ? 'PAGO' : 'PENDENTE'}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Button
            label="Nova pelada"
            icon="refresh"
            variant="danger"
            onPress={onReset}
            style={{ marginTop: space.xl }}
          />
        }
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[font.caption, { color: c.textMuted }]}>{label.toUpperCase()}</Text>
      <Text style={[font.body, { color: c.text, fontWeight: '700', marginTop: 2 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl, flexGrow: 1 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  costInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    height: 44,
    width: 140,
  },
  input: { flex: 1, height: '100%', textAlign: 'right', minWidth: 0, outlineWidth: 0 },
  stats: { flexDirection: 'row', gap: space.md },
  bar: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.pill },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
});
