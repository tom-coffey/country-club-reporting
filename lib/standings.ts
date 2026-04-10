import picks from "@/config/picks.json";
import preTournamentOddsData from "@/config/pre_tournament_odds.json";
import { GolferLeaderboard, GolferOdds, GolferPoolData, EntrantStanding, DashboardData } from "./types";
import { normalizeName } from "./normalizeNames";
import { calculatePayout } from "./tieLogic";
import { calculateExpectedDollars, oddsToImpliedProbability } from "./expectedValue";
import { getLeaderboard } from "./leaderboard";
import { getLiveOdds } from "./odds";

const poolPicks: Record<string, string[]> = picks;
const preOdds: Record<string, number> = preTournamentOddsData.odds;

export async function getDashboardData(): Promise<DashboardData> {
  const errors: string[] = [];

  // Fetch data in parallel
  const [leaderboardResult, oddsResult] = await Promise.all([
    getLeaderboard(),
    getLiveOdds(),
  ]);

  if (leaderboardResult.error) errors.push(leaderboardResult.error);
  if (oddsResult.error) errors.push(oddsResult.error);

  const leaderboardMap = new Map<string, GolferLeaderboard>();
  for (const p of leaderboardResult.players) {
    leaderboardMap.set(p.name, p);
  }

  const oddsMap = new Map<string, GolferOdds>();
  for (const o of oddsResult.odds) {
    oddsMap.set(o.name, o);
  }

  // Build set of all rostered golfers
  const allGolferNames = new Set<string>();
  const golferEntrants = new Map<string, string[]>();

  for (const [entrant, golfers] of Object.entries(poolPicks)) {
    for (const g of golfers) {
      const name = normalizeName(g);
      allGolferNames.add(name);
      if (!golferEntrants.has(name)) golferEntrants.set(name, []);
      golferEntrants.get(name)!.push(entrant);
    }
  }

  // Build player data
  const playerDataMap = new Map<string, GolferPoolData>();

  for (const name of allGolferNames) {
    const lb = leaderboardMap.get(name);
    const od = oddsMap.get(name);

    const position = lb?.position ?? null;
    const status = lb?.status ?? "active";
    const isTied = lb?.isTied ?? false;
    const tiedCount = lb?.tiedCount ?? 1;
    const isAmateur = lb?.isAmateur ?? false;

    // Current dollars
    let currentDollars = 0;
    if (position !== null) {
      currentDollars = calculatePayout({
        name,
        position,
        isTied,
        tiedCount,
        status,
        isAmateur,
      });
    }

    // Expected dollars
    const ev = calculateExpectedDollars(
      position,
      od?.odds ?? null,
      status
    );

    const selectedBy = golferEntrants.get(name) || [];

    const playerData: GolferPoolData = {
      name,
      position,
      score: lb?.score ?? "—",
      today: lb?.today ?? "—",
      thru: lb?.thru ?? "—",
      round: lb?.round ?? 0,
      status,
      isTied,
      tiedCount,
      isAmateur,
      currentDollars,
      expectedDollars: ev.expectedDollars,
      winProbability: ev.winProbability,
      evMethod: ev.method,
      odds: od?.odds ?? null,
      selectedByCount: selectedBy.length,
      selectedBy,
    };

    playerDataMap.set(name, playerData);
  }

  // Build entrant standings
  const standings: EntrantStanding[] = [];

  for (const [entrant, golfers] of Object.entries(poolPicks)) {
    const entrantGolfers: GolferPoolData[] = golfers.map((g) => {
      const name = normalizeName(g);
      return playerDataMap.get(name)!;
    });

    const currentDollars = entrantGolfers.reduce(
      (sum, g) => sum + g.currentDollars,
      0
    );
    const expectedDollars = entrantGolfers.reduce(
      (sum, g) => sum + g.expectedDollars,
      0
    );

    // Firepower: sum of pre-tournament implied win probabilities
    const firepower = golfers.reduce((sum, g) => {
      const name = normalizeName(g);
      const odds = preOdds[name];
      if (odds !== undefined) {
        return sum + oddsToImpliedProbability(odds);
      }
      return sum;
    }, 0);

    standings.push({
      name: entrant,
      golfers: entrantGolfers,
      currentDollars,
      expectedDollars,
      firepower,
      rank: 0,
    });
  }

  // Sort and rank
  standings.sort((a, b) => b.currentDollars - a.currentDollars);
  standings.forEach((s, i) => (s.rank = i + 1));

  // All players sorted by position
  const players = Array.from(playerDataMap.values()).sort((a, b) => {
    if (a.position === null && b.position === null) return 0;
    if (a.position === null) return 1;
    if (b.position === null) return -1;
    return a.position - b.position;
  });

  return {
    standings,
    players,
    leaderboardUpdated: leaderboardResult.updatedAt,
    oddsUpdated: oddsResult.updatedAt,
    errors,
  };
}
