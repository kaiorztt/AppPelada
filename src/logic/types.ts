export type Player = {
  id: string;
  name: string;
  isGoalkeeper: boolean;
};

export type Team = {
  id: string;
  name: string;
  color: string;
  playerIds: string[];
};

export type Match = {
  id: string;
  at: number;
  winners: string[];
  losers: string[];
};

/**
 * 'closed' (Rodízio no gol): cada time tem linha + 1 jogadores, que se revezam
 * no gol (ou usam o goleiro sorteado para o time).
 * 'open' (Goleiro fixo): os times têm só a linha; goleiros fixos ficam no gol e,
 * se faltar goleiro, quem está de próximo pega o gol.
 */
export type TeamMode = 'closed' | 'open';

/** Como completar o próximo time incompleto com quem saiu. */
export type FillMode = 'arrival' | 'draw';

export type Rotation = {
  teams: Record<string, Team>;
  mode: TeamMode;
  /** Jogadores por time completo. */
  perTeam: number;
  /** Goleiros fixos (só no modo goleiro fixo), fora dos times. */
  keepers: string[];
  /** Os dois times em campo. */
  onField: string[];
  /** Times esperando, na ordem de entrada. */
  queue: string[];
  /** Número do próximo time a ser criado (Time N). */
  nextNumber: number;
};

export function makeTeam(n: number, playerIds: string[] = []): Team {
  return {
    id: `t${n}`,
    name: `Time ${n}`,
    color: TEAM_COLORS[(n - 1) % TEAM_COLORS.length],
    playerIds,
  };
}

export const TEAM_COLORS = [
  '#16A34A',
  '#2563EB',
  '#F59E0B',
  '#DC2626',
  '#9333EA',
  '#0891B2',
  '#DB2777',
  '#65A30D',
];
