import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { drawTeams } from '@/logic/draw';
import { addLatePlayer, removeFromRotation, rotate } from '@/logic/rotation';
import { FillMode, Match, Player, Rotation, TeamMode } from '@/logic/types';

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
  /** Estados anteriores do rodízio, para desfazer a última partida. */
  undoStack: Rotation[];
};

type Actions = {
  addPlayer: (name: string) => void;
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
  undoMatch: () => void;
  newSession: () => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

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
        if (!trimmed) return;
        set((s) => ({ players: [...s.players, { id: uid(), name: trimmed, isGoalkeeper: false }] }));
      },

      removePlayer: (id) =>
        set((s) => ({
          players: s.players.filter((p) => p.id !== id),
          presentIds: s.presentIds.filter((p) => p !== id),
          paidIds: s.paidIds.filter((p) => p !== id),
          rotation: s.rotation && removeFromRotation(s.rotation, id),
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
              rotation: s.rotation && removeFromRotation(s.rotation, id),
            };
          }
          return {
            presentIds: [...s.presentIds, id],
            // Com os times já sorteados, quem chega entra no fim da fila.
            rotation:
              s.rotation &&
              addLatePlayer(s.rotation, id, !!s.players.find((p) => p.id === id)?.isGoalkeeper),
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
        const { rotation, presentIds, players, fillMode, matches, undoStack } = get();
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
        set({
          rotation: next,
          matches: [match, ...matches],
          undoStack: [...undoStack, rotation].slice(-20),
        });
      },

      undoMatch: () => {
        const { undoStack, matches } = get();
        if (!undoStack.length) return;
        set({
          rotation: undoStack[undoStack.length - 1],
          undoStack: undoStack.slice(0, -1),
          matches: matches.slice(1),
        });
      },

      newSession: () => {
        set({ presentIds: [], paidIds: [], rotation: null, matches: [], undoStack: [] });
      },
    }),
    {
      name: 'pelada-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // v0 não guardava modo/tamanho no rodízio: era sempre time fechado.
      migrate: (persisted, version) => {
        const s = persisted as State;
        if (version < 1) {
          const upgrade = (r: Rotation): Rotation => ({
            ...r,
            mode: 'closed',
            perTeam: s.lineSize + 1,
            keepers: [],
          });
          s.rotation = s.rotation && upgrade(s.rotation);
          s.undoStack = (s.undoStack ?? []).map(upgrade);
        }
        return s;
      },
    },
  ),
);
