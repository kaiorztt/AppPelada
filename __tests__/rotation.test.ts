import { describe, expect, it } from '@jest/globals';
import { addLatePlayer, removeFromRotation, rotate, RotationContext } from '../src/logic/rotation';
import { makeTeam, Rotation, TeamMode } from '../src/logic/types';

// Chegada: a1..a6, b1..b6, c1..c6 ... ; goleiros são os IDs terminados em "g".
function stateWith(mode: TeamMode, perTeam: number, keepers: string[], teams: string[][]): Rotation {
  const ts = teams.map((ids, i) => makeTeam(i + 1, ids));
  return {
    teams: Object.fromEntries(ts.map((t) => [t.id, t])),
    mode,
    perTeam,
    keepers,
    onField: ts.slice(0, 2).map((t) => t.id),
    queue: ts.slice(2).map((t) => t.id),
    nextNumber: ts.length + 1,
  };
}

const state = (...teams: string[][]) => stateWith('closed', 6, [], teams);

function ctx(arrival: string[]): RotationContext {
  return { arrival, isGoalkeeper: (id) => id.endsWith('g') };
}

const A = ['ag', 'a1', 'a2', 'a3', 'a4', 'a5'];
const B = ['bg', 'b1', 'b2', 'b3', 'b4', 'b5'];
const C = ['cg', 'c1', 'c2', 'c3', 'c4', 'c5'];

describe('rotate', () => {
  it('time completo da fila entra e o perdedor vai para o fim', () => {
    const s = state(A, B, C);
    const r = rotate(s, ['t1'], ctx([...A, ...B, ...C]));
    expect(r.onField).toEqual(['t3', 't2']);
    expect(r.queue).toEqual(['t1']);
    expect(r.teams.t1.playerIds).toEqual(A);
  });

  it('completa o próximo incompleto com o perdedor por ordem de chegada', () => {
    const s = state(A, B, ['cg', 'c1']);
    // a3 e a1 chegaram antes dos outros do time 1
    const arrival = ['a3', 'a1', 'cg', 'c1', 'a5', 'ag', 'a2', 'a4', ...B];
    const r = rotate(s, ['t1'], ctx(arrival));
    expect(r.onField).toEqual(['t3', 't2']);
    expect(r.teams.t3.playerIds).toEqual(['cg', 'c1', 'a3', 'a1', 'a5', 'a2']);
    expect(r.queue).toEqual(['t1']);
    expect(r.teams.t1.playerIds).toEqual(['ag', 'a4']);
  });

  it('goleiro do perdedor fica se o time que entra não tem goleiro', () => {
    const s = state(A, B, ['c1', 'c2', 'c3']);
    const r = rotate(s, ['t2'], ctx([...A, ...B, 'c1', 'c2', 'c3']));
    expect(r.onField).toEqual(['t1', 't3']);
    expect(r.teams.t3.playerIds).toEqual(['c1', 'c2', 'c3', 'bg', 'b1', 'b2']);
    expect(r.teams.t2.playerIds).toEqual(['b3', 'b4', 'b5']);
  });

  it('sobras do perdedor completam o último time da fila', () => {
    const D = ['d1', 'd2'];
    const s = state(A, B, C, D);
    const r = rotate(s, ['t1'], ctx([...A, ...B, ...C, ...D]));
    expect(r.queue).toEqual(['t4', 't1']);
    expect(r.teams.t4.playerIds).toEqual(['d1', 'd2', 'ag', 'a1', 'a2', 'a3']);
    expect(r.teams.t1.playerIds).toEqual(['a4', 'a5']);
  });

  it('empate: os dois saem e os dois próximos entram', () => {
    const D = ['dg', 'd1', 'd2', 'd3', 'd4', 'd5'];
    const s = state(A, B, C, D);
    const r = rotate(s, ['t1', 't2'], ctx([...A, ...B, ...C, ...D]));
    expect(r.onField).toEqual(['t3', 't4']);
    expect(r.queue).toEqual(['t1', 't2']);
  });

  it('sem ninguém na fila não muda nada', () => {
    const s = state(A, B);
    expect(rotate(s, ['t1'], ctx([...A, ...B]))).toBe(s);
  });
});

describe('addLatePlayer', () => {
  it('entra no último time se ele estiver incompleto', () => {
    const s = state(A, B, ['c1']);
    const r = addLatePlayer(s, 'x');
    expect(r.teams.t3.playerIds).toEqual(['c1', 'x']);
  });

  it('cria time novo se todos estão completos', () => {
    const s = state(A, B);
    const r = addLatePlayer(s, 'x');
    expect(r.queue).toEqual(['t3']);
    expect(r.teams.t3.playerIds).toEqual(['x']);
    expect(r.nextNumber).toBe(4);
  });
});

describe('removeFromRotation', () => {
  it('remove o jogador e apaga time vazio da fila', () => {
    const s = state(A, B, ['c1']);
    const r = removeFromRotation(s, 'c1');
    expect(r.queue).toEqual([]);
    expect(r.teams.t3).toBeUndefined();
  });
});

describe('rotate — sorteio para completar', () => {
  it('com fill=draw completa com jogadores sorteados de quem saiu', () => {
    const s = state(A, B, ['cg', 'c1']);
    const arrival = ['a5', 'a4', 'a3', 'a2', 'a1', 'ag', ...B, 'cg', 'c1'];
    const byArrival = rotate(s, ['t1'], ctx(arrival));
    expect(byArrival.teams.t3.playerIds.slice(2)).toEqual(['a5', 'a4', 'a3', 'a2']);
    // random sempre 0: o embaralhamento vira [a1..a5, ag], diferente da chegada
    const drawn = rotate(s, ['t1'], { ...ctx(arrival), fill: 'draw', random: () => 0 });
    expect(drawn.teams.t3.playerIds.slice(2)).toEqual(['a1', 'a2', 'a3', 'a4']);
    expect(drawn.teams.t1.playerIds.sort()).toEqual(['a5', 'ag']);
  });
});

describe('modo aberto (time não fechado)', () => {
  const L1 = ['a1', 'a2', 'a3', 'a4', 'a5'];
  const L2 = ['b1', 'b2', 'b3', 'b4', 'b5'];

  it('não puxa goleiro do perdedor e usa o tamanho só da linha', () => {
    const s = stateWith('open', 5, ['xg', 'yg'], [[...L1.slice(0, 4), 'ag'], L2, ['c1', 'c2']]);
    const r = rotate(s, ['t1'], ctx(['a1', 'a2', 'a3', 'a4', 'ag', ...L2, 'c1', 'c2']));
    expect(r.teams.t3.playerIds).toEqual(['c1', 'c2', 'a1', 'a2', 'a3']);
    expect(r.keepers).toEqual(['xg', 'yg']);
  });

  it('goleiro atrasado vira goleiro fixo se faltar goleiro', () => {
    const s = stateWith('open', 5, ['xg'], [L1, L2]);
    const r = addLatePlayer(s, 'zg', true);
    expect(r.keepers).toEqual(['xg', 'zg']);
    expect(Object.keys(r.teams)).toHaveLength(2);
  });

  it('remover goleiro fixo tira ele do gol', () => {
    const s = stateWith('open', 5, ['xg', 'yg'], [L1, L2]);
    expect(removeFromRotation(s, 'xg').keepers).toEqual(['yg']);
  });
});
