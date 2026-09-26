import { useMemo } from 'react';

import { Player, Rotation } from '@/logic/types';
import { usePeladaStore } from './usePeladaStore';

export function usePlayersById(): Record<string, Player> {
  const players = usePeladaStore((s) => s.players);
  return useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
}

export type FixedKeeper = { name: string; placeholder: boolean };

/**
 * Goleiro fixo: cada gol tem seu goleiro, que fica no lugar do time em campo
 * (onField[i] usa keepers[i]). Sem goleiro para aquele gol, mostra só "Goleiro".
 * Retorna undefined para times fora de campo ou no modo rodízio.
 */
export function fixedKeeperFor(
  rotation: Rotation,
  players: Record<string, Player>,
  teamId: string,
): FixedKeeper | undefined {
  if (rotation.mode !== 'open') return undefined;
  const slot = rotation.onField.indexOf(teamId);
  if (slot === -1) return undefined;
  const name = players[rotation.keepers[slot]]?.name;
  return name ? { name, placeholder: false } : { name: 'Goleiro', placeholder: true };
}

/** Texto dos times para compartilhar (WhatsApp etc.). */
export function teamsAsText(rotation: Rotation, players: Record<string, Player>): string {
  const closed = rotation.mode === 'closed';
  return [...rotation.onField, ...rotation.queue]
    .map((id) => {
      const t = rotation.teams[id];
      const fixed = fixedKeeperFor(rotation, players, id);
      const names = t.playerIds.map((p) => {
        const pl = players[p];
        return pl ? `${closed && pl.isGoalkeeper ? '🧤 ' : '• '}${pl.name}` : '';
      });
      if (fixed) names.unshift(`🧤 ${fixed.name}`);
      return `*${t.name}*\n${names.join('\n')}`;
    })
    .join('\n\n');
}
