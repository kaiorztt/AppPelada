import { useMemo } from 'react';

import { Player, Rotation } from '@/logic/types';
import { usePeladaStore } from './usePeladaStore';

export function usePlayersById(): Record<string, Player> {
  const players = usePeladaStore((s) => s.players);
  return useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
}

/**
 * Quem fica nos dois gols no time aberto: os goleiros fixos e, se faltar,
 * um jogador do time que está de próximo.
 */
export function goalkeepersLabel(rotation: Rotation, players: Record<string, Player>): string[] {
  const fixed = rotation.keepers.map((id) => players[id]?.name).filter(Boolean);
  const next = rotation.queue[0] ? rotation.teams[rotation.queue[0]].name : null;
  const missing = Array.from({ length: Math.max(0, 2 - fixed.length) }, () =>
    next ? `alguém do ${next}` : 'revezam',
  );
  return [...fixed, ...missing];
}

/** Texto dos times para compartilhar (WhatsApp etc.). */
export function teamsAsText(rotation: Rotation, players: Record<string, Player>): string {
  const closed = rotation.mode === 'closed';
  const teams = [...rotation.onField, ...rotation.queue].map((id) => {
    const t = rotation.teams[id];
    const names = t.playerIds.map((p) => {
      const pl = players[p];
      return pl ? `${closed && pl.isGoalkeeper ? '🧤 ' : '• '}${pl.name}` : '';
    });
    return `*${t.name}*\n${names.join('\n')}`;
  });
  if (!closed) teams.unshift(`*Gols*\n🧤 ${goalkeepersLabel(rotation, players).join('\n🧤 ')}`);
  return teams.join('\n\n');
}
