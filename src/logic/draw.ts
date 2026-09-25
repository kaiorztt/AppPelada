import { makeTeam, Player, Rotation, TeamMode } from './types';

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sorteia os times entre os presentes (`present` em ordem de chegada).
 *
 * - Fechado: cada time tem lineSize + 1; no máximo um goleiro por time, e os
 *   goleiros excedentes são sorteados na linha.
 * - Aberto: cada time tem só lineSize; até dois goleiros (os primeiros a chegar)
 *   ficam fixos no gol, fora dos times.
 *
 * Os times são preenchidos em sequência, então só o último pode ficar incompleto.
 */
export function drawTeams(
  present: Player[],
  lineSize: number,
  mode: TeamMode = 'closed',
  random: () => number = Math.random,
): Rotation {
  const closed = mode === 'closed';
  const perTeam = closed ? lineSize + 1 : lineSize;
  const allKeepers = present.filter((p) => p.isGoalkeeper);
  const fixed = closed ? [] : allKeepers.slice(0, 2);
  const pool = present.filter((p) => !fixed.includes(p));

  const count = Math.max(1, Math.ceil(pool.length / perTeam));
  const keepers = closed ? shuffle(allKeepers, random) : [];
  const field = pool.filter((p) => !keepers.includes(p));

  const slots: string[][] = Array.from({ length: count }, () => []);
  keepers.slice(0, count).forEach((gk, i) => slots[i].push(gk.id));
  const rest = shuffle([...keepers.slice(count), ...field], random).map((p) => p.id);

  for (const slot of slots) {
    while (slot.length < perTeam && rest.length) slot.push(rest.shift()!);
  }

  const teams = slots
    .filter((s) => s.length > 0)
    .map((ids, i) => makeTeam(i + 1, ids));

  return {
    teams: Object.fromEntries(teams.map((t) => [t.id, t])),
    mode,
    perTeam,
    keepers: fixed.map((p) => p.id),
    onField: teams.slice(0, 2).map((t) => t.id),
    queue: teams.slice(2).map((t) => t.id),
    nextNumber: teams.length + 1,
  };
}
