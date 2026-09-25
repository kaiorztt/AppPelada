import { describe, expect, it } from '@jest/globals';
import { drawTeams } from '../src/logic/draw';
import { Player } from '../src/logic/types';

function players(total: number, keepers: number): Player[] {
  return Array.from({ length: total }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Jogador ${i + 1}`,
    isGoalkeeper: i < keepers,
  }));
}

const gkIds = (ps: Player[]) => new Set(ps.filter((p) => p.isGoalkeeper).map((p) => p.id));

describe('drawTeams', () => {
  it('monta times completos e deixa só o último incompleto', () => {
    const ps = players(17, 3);
    const r = drawTeams(ps, 5);
    const sizes = [...r.onField, ...r.queue].map((id) => r.teams[id].playerIds.length);
    expect(sizes).toEqual([6, 6, 5]);
    expect(r.onField).toHaveLength(2);
    expect(r.queue).toHaveLength(1);
    expect(r.nextNumber).toBe(4);
  });

  it('coloca um goleiro por time', () => {
    const ps = players(18, 3);
    const gks = gkIds(ps);
    const r = drawTeams(ps, 5);
    for (const t of Object.values(r.teams)) {
      expect(t.playerIds.filter((id) => gks.has(id))).toHaveLength(1);
    }
  });

  it('sorteia goleiros excedentes na linha e usa todos os jogadores', () => {
    const ps = players(12, 4);
    const r = drawTeams(ps, 5);
    const all = Object.values(r.teams).flatMap((t) => t.playerIds);
    expect(all.sort()).toEqual(ps.map((p) => p.id).sort());
    const gks = gkIds(ps);
    for (const t of Object.values(r.teams)) {
      expect(t.playerIds.filter((id) => gks.has(id)).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('com menos goleiros que times, os primeiros times recebem os goleiros', () => {
    const ps = players(18, 1);
    const r = drawTeams(ps, 5);
    expect(r.teams[r.onField[0]].playerIds[0]).toBe('p1');
  });
});

describe('drawTeams — modo aberto', () => {
  it('times só com a linha e até dois goleiros fixos fora dos times', () => {
    const ps = players(17, 3); // p1, p2, p3 goleiros
    const r = drawTeams(ps, 5, 'open');
    expect(r.mode).toBe('open');
    expect(r.perTeam).toBe(5);
    expect(r.keepers).toEqual(['p1', 'p2']);
    const inTeams = Object.values(r.teams).flatMap((t) => t.playerIds);
    expect(inTeams).not.toContain('p1');
    expect(inTeams).not.toContain('p2');
    expect(inTeams).toContain('p3');
    const sizes = [...r.onField, ...r.queue].map((id) => r.teams[id].playerIds.length);
    expect(sizes).toEqual([5, 5, 5]);
  });

  it('sem goleiros, ninguém fica fixo', () => {
    const r = drawTeams(players(10, 0), 5, 'open');
    expect(r.keepers).toEqual([]);
    expect(r.onField).toHaveLength(2);
  });
});
