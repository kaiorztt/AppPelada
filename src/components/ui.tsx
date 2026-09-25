import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ComponentProps, ReactNode } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { font, radius, space, useColors } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function tap(style: 'light' | 'medium' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else
    Haptics.impactAsync(
      style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    );
}

/** Pede confirmação (Alert no celular, window.confirm na web). */
export function confirm(title: string, message: string, onConfirm: () => void, action = 'Confirmar') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

export function Screen({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const c = useColors();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[font.title, { color: c.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[font.small, { color: c.textMuted, marginTop: 2 }]}>{subtitle}</Text>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </SafeAreaView>
  );
}

type ButtonProps = {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
  compact?: boolean;
};

export function Button({ label, icon, onPress, variant = 'primary', disabled, style, compact }: ButtonProps) {
  const c = useColors();
  const palette = {
    primary: { bg: c.accent, fg: c.onAccent },
    secondary: { bg: c.surfaceAlt, fg: c.text },
    danger: { bg: c.dangerSoft, fg: c.danger },
    ghost: { bg: 'transparent', fg: c.textMuted },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        tap(variant === 'primary' ? 'medium' : 'light');
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: palette.bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={compact ? 16 : 20} color={palette.fg} /> : null}
      <Text style={[compact ? font.small : font.body, { color: palette.fg, fontWeight: '700' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  color,
  bg,
  label,
  size = 20,
}: {
  icon: IconName;
  onPress: () => void;
  color: string;
  bg?: string;
  label: string;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: bg ?? 'transparent', opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

export function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[font.caption, { color }]}>{label}</Text>
    </View>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: c.surfaceAlt }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              tap();
              onChange(o.value);
            }}
            style={[styles.segment, active && { backgroundColor: c.surface }]}
          >
            <Text style={[font.small, { color: active ? c.text : c.textMuted, fontWeight: '700' }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <Text style={[font.caption, { color: c.textMuted, marginTop: space.lg, marginBottom: space.sm }]}>
      {children}
    </Text>
  );
}

export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.surfaceAlt }]}>
        <Ionicons name={icon} size={30} color={c.textMuted} />
      </View>
      <Text style={[font.h2, { color: c.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[font.small, { color: c.textMuted, textAlign: 'center', maxWidth: 280 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
    gap: space.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    height: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
  },
  buttonCompact: { height: 38, paddingHorizontal: space.md, borderRadius: radius.sm },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: space.lg },
  chip: { paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  segmented: { flexDirection: 'row', borderRadius: radius.sm, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    height: 34,
    borderRadius: radius.sm - 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.xxl, flex: 1 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
});
