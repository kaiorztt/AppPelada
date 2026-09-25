import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { ComponentProps } from 'react';

import { useColors } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Jogadores', icon: 'people' },
  { name: 'times', title: 'Times', icon: 'shuffle' },
  { name: 'rodizio', title: 'Rodízio', icon: 'repeat' },
  { name: 'pagamento', title: 'Pagamento', icon: 'wallet' },
];

export default function RootLayout() {
  const c = useColors();
  return (
    <>
      <StatusBar style="auto" />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: c.bg },
          tabBarActiveTintColor: c.accent,
          tabBarInactiveTintColor: c.textMuted,
          tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        {tabs.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.title,
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons
                  name={(focused ? t.icon : `${t.icon}-outline`) as IconName}
                  size={size}
                  color={color}
                />
              ),
            }}
          />
        ))}
      </Tabs>
    </>
  );
}
