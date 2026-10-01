import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { font, radius, space, useColors } from '@/theme';
import { EmptyState, IconButton, IconName, tap } from './ui';

export type PickerItem = {
  id: string;
  name: string;
  /** Texto à direita (ex.: "saiu"). */
  hint?: string;
  /** Bloco da lista (ex.: nome do time). Itens seguidos do mesmo grupo ficam juntos. */
  group?: string;
  /** Cor do grupo (bolinha no título do bloco). */
  color?: string;
};

type Section = { title?: string; color?: string; data: PickerItem[] };

function toSections(items: PickerItem[]): Section[] {
  const sections: Section[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.title === item.group) last.data.push(item);
    else sections.push({ title: item.group, color: item.color, data: [item] });
  }
  return sections;
}

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  icon: IconName;
  items: PickerItem[];
  emptyText: string;
  onPick: (id: string) => void;
  onClose: () => void;
  /** Se definido, mostra um campo para cadastrar alguém novo e já escolher. */
  onCreate?: (name: string) => void;
};

/** Lista em folha inferior para escolher um jogador (quem saiu / quem chegou). */
export function PlayerPicker({ visible, title, subtitle, icon, items, emptyText, onPick, onClose, onCreate }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');

  const create = () => {
    if (!onCreate || !name.trim()) return;
    onCreate(name.trim());
    setName('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />
      <View style={[styles.sheet, { backgroundColor: c.bg, paddingBottom: insets.bottom + space.lg }]}>
        <View style={[styles.grabber, { backgroundColor: c.border }]} />
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={[font.h2, { color: c.text }]}>{title}</Text>
            {subtitle ? <Text style={[font.small, { color: c.textMuted, marginTop: 2 }]}>{subtitle}</Text> : null}
          </View>
          <IconButton icon="close" label="Fechar" onPress={onClose} color={c.text} bg={c.surfaceAlt} />
        </View>

        {onCreate ? (
          <View style={[styles.inputRow, { backgroundColor: c.surface, borderColor: c.border }]}>
            <TextInput
              value={name}
              onChangeText={setName}
              onSubmitEditing={create}
              placeholder="Jogador novo"
              placeholderTextColor={c.textMuted}
              returnKeyType="done"
              submitBehavior="submit"
              style={[font.body, styles.input, { color: c.text }]}
            />
            <IconButton icon="add" label="Adicionar jogador novo" onPress={create} color={c.onAccent} bg={c.accent} />
          </View>
        ) : null}

        <SectionList
          sections={toSections(items)}
          keyExtractor={(i) => i.id}
          style={{ flexGrow: 0, flexShrink: 1 }}
          contentContainerStyle={{ paddingHorizontal: space.lg }}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="Ninguém aqui" text={emptyText} />}
          renderSectionHeader={({ section }) =>
            section.title ? (
              <View style={styles.sectionHead}>
                {section.color ? <View style={[styles.sectionDot, { backgroundColor: section.color }]} /> : null}
                <Text style={[font.caption, { color: c.textMuted, flex: 1 }]}>{section.title.toUpperCase()}</Text>
                <Text style={[font.caption, { color: c.textMuted }]}>{section.data.length}</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                tap();
                onPick(item.id);
              }}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name={icon} size={18} color={c.accent} />
              <Text style={[font.body, { color: c.text, flex: 1 }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.hint ? <Text style={[font.small, { color: c.textMuted }]}>{item.hint}</Text> : null}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: space.sm,
    gap: space.md,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: radius.pill },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    height: 52,
    marginHorizontal: space.lg,
  },
  input: { flex: 1, height: '100%', outlineWidth: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  sectionDot: { width: 10, height: 10, borderRadius: radius.pill },
});
