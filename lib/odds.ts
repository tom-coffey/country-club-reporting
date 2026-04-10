import { GolferOdds } from "./types";
import { normalizeName } from "./normalizeNames";

// Cache
let cachedOdds: GolferOdds[] | null = null;
let cachedTimestamp: string | null = null;
let lastFetchTime = 0;
const CACHE_MS = 120_000; // 2 minutes

export async function getLiveOdds(): Promise<{
  odds: GolferOdds[];
  updatedAt: string | null;
  error: string | null;
}> {
  const now = Date.now();
  if (cachedOdds && now - lastFetchTime < CACHE_MS) {
    return { odds: cachedOdds, updatedAt: cachedTimestamp, error: null };
  }

  const apiKey = process.env.ODDS_API_KEY;

  if (!apiKey) {
    return getDemoOdds("No ODDS_API_KEY configured — using demo odds");
  }

  try {
    // The Odds API — golf_masters_tournament_winner
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/golf_masters_tournament_winner/odds/?apiKey=${apiKey}&regions=us&markets=outrights&oddsFormat=american`,
      { next: { revalidate: 120 } }
    );

    if (!res.ok) {
      throw new Error(`Odds API returned ${res.status}`);
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return getDemoOdds("No odds data returned from API");
    }

    const event = data[0];
    const bookmakers = event?.bookmakers || [];

    if (bookmakers.length === 0) {
      return getDemoOdds("No bookmakers in odds response");
    }

    // Use first available bookmaker for MVP
    const book = bookmakers[0];
    const market = book?.markets?.find(
      (m: { key: string }) => m.key === "outrights"
    );

    if (!market) {
      return getDemoOdds("No outright market found");
    }

    const odds: GolferOdds[] = market.outcomes.map(
      (o: { name: string; price: number }) => {
        const name = normalizeName(o.name);
        const americanOdds = o.price;
        const impliedProb =
          americanOdds > 0
            ? 100 / (americanOdds + 100)
            : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
        return {
          name,
          odds: americanOdds,
          impliedProbability: impliedProb,
          bookmaker: book.title || book.key,
          lastUpdate: book.last_update || new Date().toISOString(),
        };
      }
    );

    cachedOdds = odds;
    cachedTimestamp = new Date().toISOString();
    lastFetchTime = now;

    return { odds, updatedAt: cachedTimestamp, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    if (cachedOdds) {
      return {
        odds: cachedOdds,
        updatedAt: cachedTimestamp,
        error: `Using cached odds. Fetch error: ${error}`,
      };
    }
    return getDemoOdds(error);
  }
}

function getDemoOdds(reason: string): {
  odds: GolferOdds[];
  updatedAt: string | null;
  error: string | null;
} {
  const now = new Date().toISOString();
  const demoOdds: GolferOdds[] = [
    { name: "Scottie Scheffler", odds: 350, impliedProbability: 0.222, bookmaker: "Demo", lastUpdate: now },
    { name: "Xander Schauffele", odds: 600, impliedProbability: 0.143, bookmaker: "Demo", lastUpdate: now },
    { name: "Rory McIlroy", odds: 800, impliedProbability: 0.111, bookmaker: "Demo", lastUpdate: now },
    { name: "Jon Rahm", odds: 1000, impliedProbability: 0.091, bookmaker: "Demo", lastUpdate: now },
    { name: "Bryson DeChambeau", odds: 1200, impliedProbability: 0.077, bookmaker: "Demo", lastUpdate: now },
    { name: "Ludvig Aberg", odds: 1400, impliedProbability: 0.067, bookmaker: "Demo", lastUpdate: now },
    { name: "Cameron Young", odds: 4000, impliedProbability: 0.024, bookmaker: "Demo", lastUpdate: now },
    { name: "Justin Rose", odds: 5000, impliedProbability: 0.020, bookmaker: "Demo", lastUpdate: now },
    { name: "Matt Fitzpatrick", odds: 5000, impliedProbability: 0.020, bookmaker: "Demo", lastUpdate: now },
    { name: "Akshay Bhatia", odds: 6000, impliedProbability: 0.016, bookmaker: "Demo", lastUpdate: now },
    { name: "Jake Knapp", odds: 8000, impliedProbability: 0.012, bookmaker: "Demo", lastUpdate: now },
  ];
  return {
    odds: demoOdds,
    updatedAt: now,
    error: reason,
  };
}
