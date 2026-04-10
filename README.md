# Masters Pool 2026 — Live Dashboard

A live tracking dashboard for a 2026 Masters golf pool. Shows pool standings, golfer scores, current/expected dollar payouts, and live odds — all auto-refreshing.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

### Pool Picks
Edit `config/picks.json` to change entrants and their golfer selections.

### Payout Table
Edit `config/payouts_masters_2026.json` to update the prize money distribution. Based on projected $20M purse.

### Name Mapping
Edit `config/name_map.json` to handle golfer name variations across data sources (e.g., "Ludvig Åberg" → "Ludvig Aberg").

### Odds API Key (Optional)
1. Get a free key at [the-odds-api.com](https://the-odds-api.com)
2. Add to `.env.local`: `ODDS_API_KEY=your_key_here`
3. Without a key, demo odds data is used

## Data Sources

| Data | Source | Refresh |
|------|--------|---------|
| Leaderboard | ESPN Golf API | Every 30 seconds |
| Odds | The Odds API | Every 2 minutes |
| Payouts | Static config file | Manual update |

When no live Masters tournament is found on ESPN, demo data is displayed so you can preview the dashboard.

## How Expected Dollars Works

**This is a heuristic estimate, not a precise model.**

The MVP uses live outright win odds to derive an implied win probability, then spreads the remaining probability in a bell curve around the golfer's current leaderboard position. Expected dollars = sum of (probability at each position × payout at that position).

This approach is explicitly limited because:
- Win odds alone don't capture the full finish-position distribution
- The bell curve is a rough approximation
- It doesn't account for field strength, course conditions, etc.

The label "estimated from live odds" appears in the UI. The code is structured so a better finish-position model (e.g., Data Golf) can replace this heuristic without rewriting the app.

## Tie Payout Logic

When multiple golfers share a position, their payouts are averaged across the occupied spots. Example: 3 players tied for 5th → average of 5th, 6th, 7th place payouts assigned to each.

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repo
4. Add `ODDS_API_KEY` as an environment variable (optional)
5. Deploy
6. Share the public URL with friends

## Reuse for Other Majors

1. Update `config/picks.json` with new entrants/picks
2. Create a new payout file (e.g., `payouts_usopen_2026.json`)
3. Update the import in `lib/tieLogic.ts` and `lib/expectedValue.ts`
4. Update name mappings if needed
