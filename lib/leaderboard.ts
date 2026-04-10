import { GolferLeaderboard } from "./types";
import { normalizeName } from "./normalizeNames";

interface ESPNLinescoreHole {
  period: number;
  displayValue?: string;
  scoreType?: { displayValue?: string };
}

interface ESPNLinescore {
  period: number;
  value?: number;
  displayValue?: string;
  linescores?: ESPNLinescoreHole[];
}

interface ESPNCompetitor {
  athlete?: { displayName?: string; amateur?: boolean };
  status?: { type?: { name?: string; description?: string } };
  score?: string | { displayValue?: string };
  linescores?: ESPNLinescore[];
  order?: number;
  sortOrder?: number;
  statistics?: { name?: string; displayValue?: string }[];
}

// Cache
let cachedLeaderboard: GolferLeaderboard[] | null = null;
let cachedTimestamp: string | null = null;
let lastFetchTime = 0;
const CACHE_MS = 30_000; // 30 seconds

export async function getLeaderboard(): Promise<{
  players: GolferLeaderboard[];
  updatedAt: string | null;
  error: string | null;
}> {
  const now = Date.now();
  if (cachedLeaderboard && now - lastFetchTime < CACHE_MS) {
    return { players: cachedLeaderboard, updatedAt: cachedTimestamp, error: null };
  }

  try {
    // ESPN Masters scoreboard — tournament ID 401580329 is typical for Masters
    // We'll use the general golf scoreboard endpoint
    const res = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
      { next: { revalidate: 30 } }
    );

    if (!res.ok) {
      throw new Error(`ESPN API returned ${res.status}`);
    }

    const data = await res.json();
    const events = data?.events || [];

    // Find The Masters or current event
    const mastersEvent =
      events.find(
        (e: { name?: string }) =>
          e.name?.toLowerCase().includes("masters") ||
          e.name?.toLowerCase().includes("augusta")
      ) || events[0];

    if (!mastersEvent) {
      // Return demo data if no event found
      return getDemoLeaderboard();
    }

    const competition = mastersEvent.competitions?.[0];
    if (!competition) {
      return getDemoLeaderboard();
    }

    const competitors: ESPNCompetitor[] = competition.competitors || [];
    const players: GolferLeaderboard[] = [];

    // Build position groups for tie detection using order field
    const positionCounts = new Map<number, number>();
    competitors.forEach((c: ESPNCompetitor, i: number) => {
      const pos = c.order ?? c.sortOrder ?? i + 1;
      positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1);
    });

    competitors.forEach((c: ESPNCompetitor, i: number) => {
      const rawName = c.athlete?.displayName || `Player ${i + 1}`;
      const name = normalizeName(rawName);
      const pos = c.order ?? c.sortOrder ?? i + 1;

      // Status — ESPN may put it in c.status or we derive from score
      const statusName = c.status?.type?.name?.toLowerCase() || "";
      let status: GolferLeaderboard["status"] = "active";
      if (statusName.includes("cut")) status = "cut";
      else if (statusName.includes("wd")) status = "wd";
      else if (statusName.includes("dq")) status = "dq";
      else if (statusName.includes("complete")) status = "finished";

      // Score — ESPN returns either a string or an object
      let score: string;
      if (typeof c.score === "string") {
        score = c.score;
      } else if (c.score && typeof c.score === "object") {
        score = c.score.displayValue || "E";
      } else {
        score = "E";
      }

      // Find current round and today's score
      const linescores = c.linescores || [];
      // Current round = last round with holes played
      let currentRound = 1;
      let today = "--";
      let thru = "—";

      for (let r = linescores.length - 1; r >= 0; r--) {
        const round = linescores[r];
        const holesPlayed = (round.linescores || []).length;
        if (holesPlayed > 0) {
          currentRound = round.period || r + 1;
          today = round.displayValue || "--";
          thru = holesPlayed >= 18 ? "F" : String(holesPlayed);
          break;
        }
      }

      const tiedCount = positionCounts.get(pos) || 1;

      players.push({
        name,
        position: pos,
        score,
        today,
        thru,
        round: currentRound,
        status,
        isTied: tiedCount > 1,
        tiedCount,
        isAmateur: c.athlete?.amateur || false,
      });
    });

    players.sort((a, b) => a.position - b.position);

    cachedLeaderboard = players;
    cachedTimestamp = new Date().toISOString();
    lastFetchTime = now;

    return { players, updatedAt: cachedTimestamp, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    // Return cached data if available, otherwise demo
    if (cachedLeaderboard) {
      return {
        players: cachedLeaderboard,
        updatedAt: cachedTimestamp,
        error: `Using cached data. Fetch error: ${error}`,
      };
    }
    return getDemoLeaderboard(error);
  }
}

function getDemoLeaderboard(fetchError?: string): {
  players: GolferLeaderboard[];
  updatedAt: string | null;
  error: string | null;
} {
  // Demo data for development / when no live event
  const demoPlayers: GolferLeaderboard[] = [
    { name: "Scottie Scheffler", position: 1, score: "-12", today: "-4", thru: "F", round: 3, status: "active", isTied: false, tiedCount: 1, isAmateur: false },
    { name: "Xander Schauffele", position: 2, score: "-10", today: "-3", thru: "F", round: 3, status: "active", isTied: true, tiedCount: 2, isAmateur: false },
    { name: "Rory McIlroy", position: 2, score: "-10", today: "-5", thru: "F", round: 3, status: "active", isTied: true, tiedCount: 2, isAmateur: false },
    { name: "Jon Rahm", position: 4, score: "-8", today: "-2", thru: "F", round: 3, status: "active", isTied: false, tiedCount: 1, isAmateur: false },
    { name: "Bryson DeChambeau", position: 5, score: "-7", today: "-1", thru: "14", round: 3, status: "active", isTied: true, tiedCount: 3, isAmateur: false },
    { name: "Ludvig Aberg", position: 5, score: "-7", today: "-3", thru: "F", round: 3, status: "active", isTied: true, tiedCount: 3, isAmateur: false },
    { name: "Cameron Young", position: 5, score: "-7", today: "E", thru: "F", round: 3, status: "active", isTied: true, tiedCount: 3, isAmateur: false },
    { name: "Justin Rose", position: 8, score: "-5", today: "+1", thru: "F", round: 3, status: "active", isTied: false, tiedCount: 1, isAmateur: false },
    { name: "Matt Fitzpatrick", position: 9, score: "-4", today: "-2", thru: "12", round: 3, status: "active", isTied: true, tiedCount: 2, isAmateur: false },
    { name: "Akshay Bhatia", position: 9, score: "-4", today: "+1", thru: "F", round: 3, status: "active", isTied: true, tiedCount: 2, isAmateur: false },
    { name: "Jake Knapp", position: 15, score: "-1", today: "+2", thru: "F", round: 3, status: "active", isTied: true, tiedCount: 3, isAmateur: false },
  ];
  return {
    players: demoPlayers,
    updatedAt: new Date().toISOString(),
    error: fetchError || "Using demo data — no live tournament found",
  };
}
