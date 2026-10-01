import { describe, expect, it } from '@jest/globals';
import {
  addLatePlayer,
  locate,
  relocate,
  removeFromRotation,
  rotate,
  RotationContext,
  swapPlayers,
} from '../src/logic/rotation';
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

  it('quem sai do time em campo é reposto pelo último time da fila, por chegada', () => {
    const D = ['d1', 'd2', 'd3'];
    const s = state(A, B, C, D);
    const r = removeFromRotation(s, 'a2', { arrival: [...A, ...B, ...C, 'd3', 'd1', 'd2'] });
    expect(r.teams.t1.playerIds).toEqual(['ag', 'a1', 'a3', 'a4', 'a5', 'd3']);
    expect(r.teams.t3.playerIds).toEqual(C);
    expect(r.teams.t4.playerIds).toEqual(['d1', 'd2']);
  });

  it('o último time da fila fica incompleto e some se esvaziar', () => {
    const s = state(A, B, C, ['d1']);
    const r = removeFromRotation(s, 'b3', { arrival: [] });
    expect(r.teams.t2.playerIds).toEqual(['bg', 'b1', 'b2', 'b4', 'b5', 'd1']);
    expect(r.queue).toEqual(['t3']);
    expect(r.teams.t4).toBeUndefined();
  });

  it('sem fila, o time em campo só fica com um a menos', () => {
    const s = state(A, B);
    const r = removeFromRotation(s, 'a1');
    expect(r.teams.t1.playerIds).toEqual(['ag', 'a2', 'a3', 'a4', 'a5']);
    expect(r.teams.t2.playerIds).toEqual(B);
  });

  it('com fill=draw sorteia quem sobe do último time', () => {
    const s = state(A, B, ['c1', 'c2', 'c3']);
    // random sempre 0: o embaralhamento de [c1,c2,c3] vira [c2,c3,c1]
    const r = removeFromRotation(s, 'a1', { arrival: [], fill: 'draw', random: () => 0 });
    expect(r.teams.t1.playerIds).toContain('c2');
    expect(r.teams.t3.playerIds).toEqual(['c1', 'c3']);
  });
});

describe('relocate', () => {
  it('muda a ordem dentro do mesmo time', () => {
    const s = state(A, B);
    const r = relocate(s, 'a5', 't1', 1);
    expect(r.teams.t1.playerIds).toEqual(['ag', 'a5', 'a1', 'a2', 'a3', 'a4']);
  });

  it('leva o jogador para outro time na posição escolhida', () => {
    const s = state(A, B, ['c1', 'c2']);
    const r = relocate(s, 'a3', 't3', 1);
    expect(r.teams.t1.playerIds).toEqual(['ag', 'a1', 'a2', 'a4', 'a5']);
    expect(r.teams.t3.playerIds).toEqual(['c1', 'a3', 'c2']);
  });

  it('cria time novo no fim da fila e apaga time da fila que esvaziou', () => {
    const s = state(A, B, ['c1']);
    const r = relocate(s, 'c1', 'new', 0);
    expect(r.teams.t3).toBeUndefined();
    expect(r.queue).toEqual(['t4']);
    expect(r.teams.t4.playerIds).toEqual(['c1']);
    expect(r.nextNumber).toBe(5);
  });

  it('goleiro fixo vai para um time e alguém do time vai para o gol', () => {
    const s = stateWith('open', 5, ['xg', 'yg'], [['a1'], ['b1', 'b2']]);
    const r = relocate(relocate(s, 'yg', 't2', 0), 'b2', 'keepers', 1);
    expect(r.keepers).toEqual(['xg', 'b2']);
    expect(r.teams.t2.playerIds).toEqual(['yg', 'b1']);
  });

  it('não deixa ter mais de dois goleiros fixos', () => {
    const s = stateWith('open', 5, ['xg', 'yg'], [['a1'], ['b1']]);
    expect(relocate(s, 'a1', 'keepers', 0)).toBe(s);
  });

  it('locate encontra grupo e posição', () => {
    const s = stateWith('open', 5, ['xg'], [['a1', 'a2'], ['b1']]);
    expect(locate(s, 'a2')).toEqual({ group: 't1', index: 1 });
    expect(locate(s, 'xg')).toEqual({ group: 'keepers', index: 0 });
    expect(locate(s, 'zz')).toBeUndefined();
  });
});

describe('swapPlayers', () => {
  it('troca dois jogadores de times diferentes, cada um na posição do outro', () => {
    const s = state(A, B, C);
    const r = swapPlayers(s, 'a3', 'c2');
    expect(r.teams.t1.playerIds).toEqual(['ag', 'a1', 'a2', 'c2', 'a4', 'a5']);
    expect(r.teams.t3.playerIds).toEqual(['cg', 'c1', 'a3', 'c3', 'c4', 'c5']);
  });

  it('troca a posição dentro do mesmo time', () => {
    const s = state(A, B);
    expect(swapPlayers(s, 'a1', 'a5').teams.t1.playerIds).toEqual(['ag', 'a5', 'a2', 'a3', 'a4', 'a1']);
  });

  it('troca goleiro fixo com jogador de um time', () => {
    const s = stateWith('open', 5, ['xg', 'yg'], [['a1'], ['b1', 'b2']]);
    const r = swapPlayers(s, 'yg', 'b2');
    expect(r.keepers).toEqual(['xg', 'b2']);
    expect(r.teams.t2.playerIds).toEqual(['b1', 'yg']);
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
