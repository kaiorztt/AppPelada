import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { drawTeams } from '@/logic/draw';
import {
  addLatePlayer,
  playersInRotation,
  locate,
  relocate,
  removeFromRotation,
  ReorderContext,
  rotate,
  Slot,
  swapPlayers,
} from '@/logic/rotation';
import { FillMode, Match, Player, Rotation, TeamMode } from '@/logic/types';

/** Foto do rodízio antes de uma ação, para poder desfazer. */
export type Snapshot = {
  /** O que foi feito (ex.: "Kaio ↔ Henrique"). */
  label: string;
  rotation: Rotation;
  presentIds: string[];
  matches: Match[];
};

type State = {
  players: Player[];
  /** Presentes, em ordem de chegada. */
  presentIds: string[];
  paidIds: string[];
  lineSize: number;
  teamMode: TeamMode;
  fillMode: FillMode;
  /** Valor total da pelada (quadra), dividido entre os presentes. */
  totalCost: number;
  rotation: Rotation | null;
  matches: Match[];
  /** Ações do rodízio que podem ser desfeitas (partidas, trocas, saiu/chegou), da mais antiga para a mais nova. */
  undoStack: Snapshot[];
};

type Actions = {
  addPlayer: (name: string) => string | undefined;
  removePlayer: (id: string) => void;
  toggleGoalkeeper: (id: string) => void;
  togglePresent: (id: string) => void;
  togglePaid: (id: string) => void;
  setLineSize: (n: number) => void;
  setTeamMode: (mode: TeamMode) => void;
  setFillMode: (mode: FillMode) => void;
  setTotalCost: (value: number) => void;
  draw: () => void;
  teamLost: (teamIds: string[]) => void;
  /** Jogador foi embora no meio da pelada: sai do rodízio, mas continua presente (paga). */
  playerLeft: (id: string) => void;
  /** Jogador chegou depois do sorteio: marca presença e entra no rodízio. */
  lateArrival: (id: string) => void;
  /** Tela Trocar: coloca o jogador em `group` na posição `index` (arrastar o nome). */
  relocatePlayer: (id: string, group: Slot, index: number) => void;
  /** Tela Trocar: dois jogadores trocam de lugar (tocar em um e depois no outro). */
  swap: (a: string, b: string) => void;
  /** Desfaz a última ação do rodízio. */
  undo: () => void;
  newSession: () => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

const reorderCtx = (s: State): ReorderContext => ({ arrival: s.presentIds, fill: s.fillMode });

const nameOf = (s: State, id: string) => s.players.find((p) => p.id === id)?.name ?? 'Jogador';

/** Empilha a foto do estado atual antes de uma ação no rodízio. */
function remember(s: State, label: string): Snapshot[] {
  if (!s.rotation) return s.undoStack;
  const snap: Snapshot = { label, rotation: s.rotation, presentIds: s.presentIds, matches: s.matches };
  return [...s.undoStack, snap].slice(-30);
}

export const usePeladaStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      players: [],
      presentIds: [],
      paidIds: [],
      lineSize: 5,
      teamMode: 'closed',
      fillMode: 'arrival',
      totalCost: 0,
      rotation: null,
      matches: [],
      undoStack: [],

      addPlayer: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return undefined;
        const id = uid();
        set((s) => ({ players: [...s.players, { id, name: trimmed, isGoalkeeper: false }] }));
        return id;
      },

      removePlayer: (id) =>
        set((s) => ({
          players: s.players.filter((p) => p.id !== id),
          presentIds: s.presentIds.filter((p) => p !== id),
          paidIds: s.paidIds.filter((p) => p !== id),
          rotation: s.rotation && removeFromRotation(s.rotation, id, reorderCtx(s)),
          undoStack: [],
        })),

      toggleGoalkeeper: (id) =>
        set((s) => ({
          players: s.players.map((p) => (p.id === id ? { ...p, isGoalkeeper: !p.isGoalkeeper } : p)),
        })),

      togglePresent: (id) =>
        set((s) => {
          if (s.presentIds.includes(id)) {
            return {
              presentIds: s.presentIds.filter((p) => p !== id),
              rotation: s.rotation && removeFromRotation(s.rotation, id, reorderCtx(s)),
              undoStack: [],
            };
          }
          return {
            presentIds: [...s.presentIds, id],
            // Com os times já sorteados, quem chega entra no fim da fila.
            rotation:
              s.rotation &&
              addLatePlayer(s.rotation, id, !!s.players.find((p) => p.id === id)?.isGoalkeeper),
            undoStack: [],
          };
        }),

      togglePaid: (id) =>
        set((s) => ({
          paidIds: s.paidIds.includes(id) ? s.paidIds.filter((p) => p !== id) : [...s.paidIds, id],
        })),

      setLineSize: (n) => set({ lineSize: Math.max(1, Math.min(10, n)) }),
      setTeamMode: (teamMode) => set({ teamMode }),
      setFillMode: (fillMode) => set({ fillMode }),
      setTotalCost: (value) => set({ totalCost: Math.max(0, value) }),

      draw: () => {
        const { players, presentIds, lineSize, teamMode } = get();
        const present = presentIds
          .map((id) => players.find((p) => p.id === id))
          .filter((p): p is Player => !!p);
        if (!present.length) return;
        set({ rotation: drawTeams(present, lineSize, teamMode), matches: [], undoStack: [] });
      },

      teamLost: (leaving) => {
        const s = get();
        const { rotation, presentIds, players, fillMode, matches } = s;
        if (!rotation || !rotation.queue.length) return;
        const keepers = new Set(players.filter((p) => p.isGoalkeeper).map((p) => p.id));
        const next = rotate(rotation, leaving, {
          arrival: presentIds,
          isGoalkeeper: (id) => keepers.has(id),
          fill: fillMode,
        });
        const match: Match = {
          id: uid(),
          at: Date.now(),
          winners: rotation.onField
            .filter((id) => !leaving.includes(id))
            .map((id) => rotation.teams[id].name),
          losers: leaving.map((id) => rotation.teams[id].name),
        };
        const label = match.winners.length
          ? `${match.winners.join(', ')} venceu ${match.losers.join(', ')}`
          : `Empate: ${match.losers.join(' × ')}`;
        set({ rotation: next, matches: [match, ...matches], undoStack: remember(s, label) });
      },

      playerLeft: (id) =>
        set((s) =>
          s.rotation
            ? {
                rotation: removeFromRotation(s.rotation, id, reorderCtx(s)),
                undoStack: remember(s, `${nameOf(s, id)} saiu`),
              }
            : {},
        ),

      lateArrival: (id) =>
        set((s) => {
          if (!s.rotation || playersInRotation(s.rotation).has(id)) return {};
          const isGoalkeeper = !!s.players.find((p) => p.id === id)?.isGoalkeeper;
          return {
            presentIds: s.presentIds.includes(id) ? s.presentIds : [...s.presentIds, id],
            rotation: addLatePlayer(s.rotation, id, isGoalkeeper),
            undoStack: remember(s, `${nameOf(s, id)} chegou`),
          };
        }),

      relocatePlayer: (id, group, index) =>
        set((s) => {
          const r = s.rotation;
          const from = r && locate(r, id);
          if (!r || !from || (from.group === group && from.index === index)) return {};
          const next = relocate(r, id, group, index);
          if (next === r) return {};
          const dest =
            group === 'keepers'
              ? 'gol fixo'
              : group === 'new' || !r.teams[group]
                ? next.teams[next.queue[next.queue.length - 1]].name
                : r.teams[group].name;
          const label = from.group === group ? `${nameOf(s, id)} mudou de posição` : `${nameOf(s, id)} → ${dest}`;
          return { rotation: next, undoStack: remember(s, label) };
        }),

      swap: (a, b) =>
        set((s) =>
          s.rotation && a !== b
            ? { rotation: swapPlayers(s.rotation, a, b), undoStack: remember(s, `${nameOf(s, a)} ↔ ${nameOf(s, b)}`) }
            : {},
        ),

      undo: () => {
        const { undoStack } = get();
        const last = undoStack[undoStack.length - 1];
        if (!last) return;
        set({
          rotation: last.rotation,
          presentIds: last.presentIds,
          matches: last.matches,
          undoStack: undoStack.slice(0, -1),
        });
      },

      newSession: () => {
        set({ presentIds: [], paidIds: [], rotation: null, matches: [], undoStack: [] });
      },
    }),
    {
      name: 'pelada-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted, version) => {
        const s = persisted as State;
        // v0 não guardava modo/tamanho no rodízio: era sempre rodízio no gol.
        if (version < 1) {
          const upgrade = (r: Rotation): Rotation => ({
            ...r,
            mode: 'closed',
            perTeam: s.lineSize + 1,
            keepers: [],
          });
          s.rotation = s.rotation && upgrade(s.rotation);
        }
        // v2: o histórico passou a guardar fotos com descrição; o antigo é descartado.
        if (version < 2) s.undoStack = [];
        return s;
      },
    },
  ),
);
