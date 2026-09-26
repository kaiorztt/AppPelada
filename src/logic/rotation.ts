import { shuffle } from './draw';
import { FillMode, makeTeam, Rotation, Team } from './types';

export type RotationContext = {
  /** IDs dos presentes em ordem de chegada. */
  arrival: string[];
  isGoalkeeper: (playerId: string) => boolean;
  /** Quem de quem saiu completa o próximo time: ordem de chegada ou sorteio. */
  fill?: FillMode;
  random?: () => number;
};

function byArrival(ids: string[], arrival: string[]) {
  const pos = (id: string) => {
    const i = arrival.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...ids].sort((a, b) => pos(a) - pos(b));
}

/**
 * Tira do campo os times em `leavingIds` (perdedor, ou os dois no empate) e coloca
 * os próximos da fila. Se um time que entra estiver incompleto, é completado com
 * jogadores de quem saiu, por ordem de chegada ou sorteio (`ctx.fill`); no rodízio
 * no gol, se ele não tiver goleiro, o goleiro de quem saiu fica. Quem sobra vai
 * para o fim da fila, completando primeiro o último time da fila se ele estiver
 * incompleto.
 */
export function rotate(state: Rotation, leavingIds: string[], ctx: RotationContext): Rotation {
  const n = Math.min(leavingIds.length, state.queue.length);
  if (n === 0) return state;

  const leaving = leavingIds.filter((id) => state.onField.includes(id)).slice(0, n);
  const teams: Record<string, Team> = {};
  for (const [id, t] of Object.entries(state.teams)) teams[id] = { ...t, playerIds: [...t.playerIds] };

  const incoming = state.queue.slice(0, leaving.length);
  const queue = state.queue.slice(leaving.length);

  const perTeam = state.perTeam;
  const isGoalkeeper = state.mode === 'closed' ? ctx.isGoalkeeper : () => false;
  const leavers = leaving.flatMap((id) => teams[id].playerIds);
  let pool = ctx.fill === 'draw' ? shuffle(leavers, ctx.random) : byArrival(leavers, ctx.arrival);
  const take = (id: string) => {
    pool = pool.filter((p) => p !== id);
    return id;
  };

  for (const id of incoming) {
    const team = teams[id];
    if (team.playerIds.length >= perTeam) continue;
    if (!team.playerIds.some(isGoalkeeper)) {
      const gk = pool.find(isGoalkeeper);
      if (gk) team.playerIds.push(take(gk));
    }
    for (const p of pool.filter((p) => !isGoalkeeper(p))) {
      if (team.playerIds.length >= perTeam) break;
      team.playerIds.push(take(p));
    }
    for (const p of [...pool]) {
      if (team.playerIds.length >= perTeam) break;
      team.playerIds.push(take(p));
    }
  }

  for (const id of leaving) {
    const left = pool.filter((p) => teams[id].playerIds.includes(p));
    pool = pool.filter((p) => !left.includes(p));
    const last = queue.length ? teams[queue[queue.length - 1]] : undefined;
    while (last && last.playerIds.length < perTeam && left.length) {
      last.playerIds.push(left.shift()!);
    }
    if (left.length) {
      teams[id].playerIds = left;
      queue.push(id);
    } else {
      delete teams[id];
    }
  }

  const onField = state.onField.map((id) => {
    const i = leaving.indexOf(id);
    return i === -1 ? id : incoming[i];
  });

  return { ...state, teams, onField, queue };
}

/**
 * Coloca um jogador que chegou atrasado no último time incompleto, ou num time novo.
 * No goleiro fixo, um goleiro atrasado vai direto para o gol se ainda faltar goleiro fixo.
 */
export function addLatePlayer(state: Rotation, playerId: string, isGoalkeeper = false): Rotation {
  if (state.mode === 'open' && isGoalkeeper && state.keepers.length < 2) {
    return { ...state, keepers: [...state.keepers, playerId] };
  }
  const perTeam = state.perTeam;
  const teams = { ...state.teams };
  const order = [...state.onField, ...state.queue];
  const target = [...order].reverse().find((id) => teams[id].playerIds.length < perTeam);
  const lastId = order[order.length - 1];

  if (target && (target === lastId || state.queue.length === 0)) {
    teams[target] = { ...teams[target], playerIds: [...teams[target].playerIds, playerId] };
    return { ...state, teams };
  }

  const team = makeTeam(state.nextNumber, [playerId]);
  teams[team.id] = team;
  const next = { ...state, teams, nextNumber: state.nextNumber + 1 };
  return state.onField.length < 2
    ? { ...next, onField: [...state.onField, team.id] }
    : { ...next, queue: [...state.queue, team.id] };
}

export type ReorderContext = Pick<RotationContext, 'arrival' | 'fill' | 'random'>;

/**
 * Tira um jogador (foi embora) do time dele e reorganiza o rodízio: o buraco é
 * preenchido com alguém do último time da fila (por ordem de chegada ou sorteio),
 * mantendo só o último time incompleto. Times vazios somem da fila.
 */
export function removeFromRotation(
  state: Rotation,
  playerId: string,
  ctx: ReorderContext = { arrival: [] },
): Rotation {
  const teams: Record<string, Team> = {};
  for (const [id, t] of Object.entries(state.teams)) {
    teams[id] = { ...t, playerIds: t.playerIds.filter((p) => p !== playerId) };
  }

  const order = [...state.onField, ...state.queue];
  for (let i = 0; i < order.length; i++) {
    const team = teams[order[i]];
    while (team.playerIds.length < state.perTeam) {
      // Só times da fila cedem jogadores; quem está em campo não troca de time.
      const donorId = [...order.slice(Math.max(i + 1, state.onField.length))]
        .reverse()
        .find((id) => teams[id].playerIds.length);
      if (!donorId) break;
      const donor = teams[donorId];
      const candidates =
        ctx.fill === 'draw' ? shuffle(donor.playerIds, ctx.random) : byArrival(donor.playerIds, ctx.arrival);
      const moved = candidates[0];
      donor.playerIds = donor.playerIds.filter((p) => p !== moved);
      team.playerIds.push(moved);
    }
  }

  for (const id of state.queue) if (!teams[id].playerIds.length) delete teams[id];
  return {
    ...state,
    teams,
    keepers: state.keepers.filter((p) => p !== playerId),
    queue: state.queue.filter((id) => teams[id]),
  };
}

/** IDs de todo mundo que está no rodízio (times e goleiros fixos). */
export function playersInRotation(state: Rotation): Set<string> {
  return new Set([...Object.values(state.teams).flatMap((t) => t.playerIds), ...state.keepers]);
}
