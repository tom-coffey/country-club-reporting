export interface GolferLeaderboard {
  name: string;
  position: number;
  score: string; // e.g. "-5", "E", "+3"
  today: string;
  thru: string; // e.g. "F", "12", "—"
  round: number;
  status: "active" | "cut" | "wd" | "dq" | "finished";
  isTied: boolean;
  tiedCount: number;
  isAmateur: boolean;
}

export interface GolferOdds {
  name: string;
  odds: number; // American odds
  impliedProbability: number;
  bookmaker: string;
  lastUpdate: string;
}

export interface GolferPoolData {
  name: string;
  position: number | null;
  score: string;
  today: string;
  thru: string;
  round: number;
  status: string;
  isTied: boolean;
  tiedCount: number;
  isAmateur: boolean;
  currentDollars: number;
  expectedDollars: number;
  winProbability: number | null;
  evMethod: string;
  odds: number | null;
  selectedByCount: number;
  selectedBy: string[];
}

export interface EntrantStanding {
  name: string;
  golfers: GolferPoolData[];
  currentDollars: number;
  expectedDollars: number;
  rank: number;
}

export interface DashboardData {
  standings: EntrantStanding[];
  players: GolferPoolData[];
  leaderboardUpdated: string | null;
  oddsUpdated: string | null;
  errors: string[];
}
