# ♠ Pocket Solver — Texas Hold'em Study Tool

A web-based Texas Hold'em cash-game study app for **fast hand input and post-hand review**. Enter a hand scenario, get solver-inspired EV analysis and an actionable recommendation.

> **⚠️ This is a study/review tool, not a real-time assistant for live play.**
> It uses simplified abstractions and mocked range data. It is not a perfect GTO solver.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js Route Handlers |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Testing | Vitest + React Testing Library |

---

## Architecture

```
/app                    → Next.js pages and API routes
  /api/recommendation   → POST: generate recommendation
  /api/hands            → GET/POST: list and save hands
  /api/hands/[id]       → GET/DELETE: single hand
  /hand                 → Hand input form
  /result               → Recommendation display
  /saved                → Saved hands list

/components
  /poker                → Card picker, street selector, EV cards, etc.
  /ui                   → Shared UI components

/lib
  /domain               → TypeScript types + Zod schemas
  /engine               → Recommendation engine modules
    abstraction-mapper  → Maps raw input to engine buckets
    ev-calculator       → Fold/Call/Raise EV math
    opponent-model      → Player style adjustments
    confidence          → Confidence scoring
    explanation         → Human-readable reasoning
    recommendation-engine → Orchestrates all modules
  /ranges               → Precomputed range data (JSON)
  /validation           → Poker-specific validators

/server
  /db                   → Prisma client
  /repositories         → Database CRUD operations

/prisma                 → Schema + seed data
/tests                  → Test suites
```

### Engine Design

The recommendation engine does **not** solve the game tree in real time. Instead:

1. **Abstraction Mapper** maps the user scenario to the nearest supported bucket (stack depth, bet sizing)
2. **Range Lookup** determines hero hand strength and villain range width based on position and player style
3. **Equity Estimator** approximates hero's equity against the villain's estimated range
4. **EV Calculator** computes fold EV (always 0), call EV (pot odds × realized equity), and raise EV (fold equity + called equity)
5. **Opponent Model** applies style-based modifiers to fold/call/raise frequencies
6. **Confidence Scorer** rates recommendation reliability based on EV gap, input completeness, and mapping quality
7. **Explanation Generator** produces plain-English reasoning

All range data is stored in `lib/ranges/precomputed-ranges.json`. This can later be replaced with real solver exports or API-based solver calls — the interface is designed for that.

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Clone and install

```bash
git clone <repo-url>
cd poker-study-app
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL connection string:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/poker_study?schema=public"
```

### 3. Database setup

```bash
# Create the database
createdb poker_study

# Run Prisma migration
npx prisma migrate dev --name init

# Generate the Prisma client
npx prisma generate

# Seed demo data (10 hands)
npx tsx prisma/seed.ts
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run tests

```bash
npm test            # Run all tests
npm run test:watch  # Watch mode
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NEXT_PUBLIC_APP_URL` | App URL for client-side | `http://localhost:3000` |

---

## API Endpoints

### `POST /api/recommendation`
Generate a recommendation without saving.

**Body:** `HandScenarioInput` (see `lib/domain/types.ts`)
**Query:** `?save=true` to also persist the result
**Response:** `{ recommendation: RecommendationResult, savedId?: string }`

### `GET /api/hands`
List saved hands with optional filters.

**Query:** `?street=flop&position=BTN&action=call&limit=50&offset=0`

### `POST /api/hands`
Save a hand (generates recommendation automatically).

### `GET /api/hands/[id]`
Fetch a single saved hand with recommendation.

### `DELETE /api/hands/[id]`
Delete a saved hand.

---

## Assumptions & Limitations

### What this app is
- A study tool for reviewing poker hands after a session
- A way to build intuition about pot odds, equity, and EV
- A scaffold ready for future solver integration

### What this app is NOT
- A GTO solver (no game-tree search, no equilibrium computation)
- A real-time play assistant
- A guarantee of optimal play

### Engine simplifications
- **Equity estimation** uses tier-based hand strength vs range width, not Monte Carlo simulation
- **Range data** is mocked/simplified, not from actual solver output
- **Raise EV** uses a 2-outcome model (villain folds or calls), not a full branching tree
- **Opponent model** uses bounded multipliers, not bayesian inference
- **Multiway pots** are simplified to heads-up approximation
- **Position equity realization** uses a flat factor rather than street-by-street modeling

### Future improvements
- Real solver data integration (PIOsolver, GTO+, MonkerSolver exports)
- Monte Carlo equity calculation
- Multi-street game tree evaluation
- User accounts and authentication
- Hand history import (PokerStars, GGPoker formats)
- Range visualization matrix
- Study session tracking and analytics
- Mobile-native app

---

## License

MIT
