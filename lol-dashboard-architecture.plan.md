<!-- 82ee1516-3987-4641-9980-72418ff11033 e7d72467-8e54-43e3-b5a3-9e31debc598b -->

# LoL Dashboard - Technical Architecture Plan

## System Architecture

### High-Level Flow

```
User → Next.js Frontend → Next.js API Routes → Riot Games API
                                ↓
                         Supabase (Auth + PostgreSQL)
```

**Key Design Decisions:**

- **Caching Strategy**: Store only the last refresh per user (1-2 minute cooldown). Each refresh overwrites previous data.
- **Region Support**: NA1 and EUW1, stored per summoner with manual selection during account linking.
- **Auth Flow**: Supabase Auth (email/GitHub) + manual Riot account linking via summoner name lookup.
- **UI Components**: shadcn/ui for consistent, accessible, customizable components.

---

## Phase 1: Project Setup & Dependencies

### Required npm Packages

```json
{
  "@supabase/supabase-js": "^2.39.0",
  "@supabase/auth-helpers-nextjs": "^0.10.0",
  "recharts": "^2.10.0",
  "date-fns": "^3.0.0",
  "zod": "^3.22.0",
  "@tanstack/react-query": "^5.0.0",
  "lucide-react": "^0.300.0"
}
```

### shadcn/ui Setup

```bash
npx shadcn@latest init
npx shadcn@latest add button card input label tabs badge avatar skeleton toast
```

### Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RIOT_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Phase 2: Supabase Database Schema

### SQL Schema File

Create `supabase/schema.sql` in your project root to store the database schema. This file can be version controlled and executed in the Supabase SQL Editor when needed.

**File location:** `supabase/schema.sql`

**How to use this file:**

1. **Create the file locally**: Create a `supabase` folder in your project root, then create `schema.sql` inside it
2. **Copy the SQL code**: Copy all the SQL code below into `supabase/schema.sql`
3. **Execute in Supabase**:

   - Go to your Supabase project dashboard at [supabase.com/dashboard](https://supabase.com/dashboard)
   - Navigate to the SQL Editor (left sidebar)
   - Click "New Query"
   - Copy and paste the entire contents of `supabase/schema.sql`
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - Verify tables were created in the "Table Editor" tab

**Alternative: Use Supabase CLI** (optional, for advanced users):

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Push schema to Supabase
supabase db push
```

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Summoners table (linked Riot accounts)
CREATE TABLE public.summoners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('NA1', 'EUW1')),
  puuid TEXT UNIQUE NOT NULL,
  summoner_id TEXT NOT NULL,
  summoner_name TEXT NOT NULL,
  profile_icon_id INTEGER NOT NULL,
  summoner_level INTEGER NOT NULL,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, region)
);

-- Ranked stats (current season rank info)
CREATE TABLE public.ranked_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  summoner_id UUID REFERENCES public.summoners(id) ON DELETE CASCADE NOT NULL,
  queue_type TEXT NOT NULL, -- RANKED_SOLO_5x5, RANKED_FLEX_SR
  tier TEXT, -- IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, MASTER, GRANDMASTER, CHALLENGER
  rank TEXT, -- I, II, III, IV
  league_points INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(summoner_id, queue_type)
);

-- Matches table (last refresh only)
CREATE TABLE public.matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  summoner_id UUID REFERENCES public.summoners(id) ON DELETE CASCADE NOT NULL,
  match_id TEXT NOT NULL,
  game_creation BIGINT NOT NULL,
  game_duration INTEGER NOT NULL,
  queue_id INTEGER NOT NULL,
  champion_id INTEGER NOT NULL,
  champion_name TEXT NOT NULL,
  role TEXT, -- TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY
  team_position TEXT,
  win BOOLEAN NOT NULL,
  kills INTEGER NOT NULL,
  deaths INTEGER NOT NULL,
  assists INTEGER NOT NULL,
  cs INTEGER NOT NULL, -- total minions killed
  gold_earned INTEGER NOT NULL,
  damage_dealt INTEGER NOT NULL,
  vision_score INTEGER NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(summoner_id, match_id)
);

-- Champion stats (aggregated from matches)
CREATE TABLE public.champion_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  summoner_id UUID REFERENCES public.summoners(id) ON DELETE CASCADE NOT NULL,
  champion_id INTEGER NOT NULL,
  champion_name TEXT NOT NULL,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_kills INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  total_assists INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(summoner_id, champion_id)
);

-- Matchup stats (performance vs specific champions)
CREATE TABLE public.matchup_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  summoner_id UUID REFERENCES public.summoners(id) ON DELETE CASCADE NOT NULL,
  player_champion_id INTEGER NOT NULL,
  opponent_champion_id INTEGER NOT NULL,
  opponent_champion_name TEXT NOT NULL,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(summoner_id, player_champion_id, opponent_champion_id)
);

-- Indexes for performance
CREATE INDEX idx_summoners_user_id ON public.summoners(user_id);
CREATE INDEX idx_matches_summoner_id ON public.matches(summoner_id);
CREATE INDEX idx_matches_game_creation ON public.matches(game_creation DESC);
CREATE INDEX idx_champion_stats_summoner ON public.champion_stats(summoner_id);
CREATE INDEX idx_matchup_stats_summoner ON public.matchup_stats(summoner_id);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summoners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranked_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.champion_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchup_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own summoners" ON public.summoners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own summoners" ON public.summoners FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own summoners" ON public.summoners FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own summoners" ON public.summoners FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own ranked stats" ON public.ranked_stats FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.summoners WHERE summoners.id = ranked_stats.summoner_id AND summoners.user_id = auth.uid())
);

CREATE POLICY "Users can view own matches" ON public.matches FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.summoners WHERE summoners.id = matches.summoner_id AND summoners.user_id = auth.uid())
);

CREATE POLICY "Users can view own champion stats" ON public.champion_stats FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.summoners WHERE summoners.id = champion_stats.summoner_id AND summoners.user_id = auth.uid())
);

CREATE POLICY "Users can view own matchup stats" ON public.matchup_stats FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.summoners WHERE summoners.id = matchup_stats.summoner_id AND summoners.user_id = auth.uid())
);
```

---

## Phase 3: Folder Structure

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx          # Email/GitHub login
│   └── signup/
│       └── page.tsx          # User registration
├── (dashboard)/
│   ├── layout.tsx            # Authenticated layout with navbar
│   ├── page.tsx              # Main dashboard (summoner overview)
│   ├── champions/
│   │   └── page.tsx          # Champion performance page
│   ├── matchups/
│   │   └── page.tsx          # Matchup analysis page
│   └── matches/
│       └── page.tsx          # Match history page
├── api/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts      # Supabase auth callback
│   ├── summoner/
│   │   ├── link/
│   │   │   └── route.ts      # POST: Link summoner account
│   │   ├── refresh/
│   │   │   └── route.ts      # POST: Refresh summoner data
│   │   └── [id]/
│   │       └── route.ts      # GET: Fetch summoner details
│   └── stats/
│       ├── champions/
│       │   └── route.ts      # GET: Champion stats
│       ├── matchups/
│       │   └── route.ts      # GET: Matchup stats
│       └── overview/
│           └── route.ts      # GET: Dashboard overview
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── auth/
│   │   └── auth-form.tsx     # Login/signup form
│   ├── dashboard/
│   │   ├── summoner-card.tsx
│   │   ├── rank-badge.tsx
│   │   ├── champion-list.tsx
│   │   └── refresh-button.tsx
│   ├── charts/
│   │   ├── win-rate-chart.tsx
│   │   ├── role-distribution.tsx
│   │   └── kda-chart.tsx
│   └── layout/
│       ├── navbar.tsx
│       └── sidebar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser client
│   │   ├── server.ts         # Server client
│   │   └── middleware.ts     # Auth middleware
│   ├── riot/
│   │   ├── api.ts            # Riot API client
│   │   ├── endpoints.ts      # API endpoint builders
│   │   ├── rate-limiter.ts   # Rate limit handling
│   │   └── types.ts          # Riot API TypeScript types
│   ├── utils/
│   │   ├── calculations.ts   # KDA, win rate calculations
│   │   └── formatting.ts     # Date, number formatting
│   └── validations/
│       └── schemas.ts        # Zod validation schemas
├── types/
│   ├── database.ts           # Supabase generated types
│   └── index.ts              # Global types
└── middleware.ts             # Next.js middleware for auth
```

---

## Phase 4: Riot API Integration

### API Client (`lib/riot/api.ts`)

**Key Riot API Endpoints:**

1. **Summoner by Name**: `/lol/summoner/v4/summoners/by-name/{summonerName}`
2. **Match IDs by PUUID**: `/lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count=20`
3. **Match Details**: `/lol/match/v5/matches/{matchId}`
4. **League Entries**: `/lol/league/v4/entries/by-summoner/{summonerId}`

**Regional Routing:**

- NA1, EUW1 → Platform endpoints (summoner, league)
- americas, europe → Regional endpoints (match history)

**Rate Limiting:**

- Development key: 20 requests/second, 100 requests/2 minutes
- Implement token bucket algorithm in `rate-limiter.ts`
- Queue requests when approaching limits

### Implementation Pattern

```typescript
// lib/riot/api.ts
class RiotAPI {
  private rateLimiter: RateLimiter;

  async getSummonerByName(region: string, name: string) {}
  async getMatchHistory(region: string, puuid: string, count: number) {}
  async getMatchDetails(region: string, matchId: string) {}
  async getLeagueEntries(region: string, summonerId: string) {}
}
```

---

## Phase 5: Core API Routes

### 1. Link Summoner (`/api/summoner/link` - POST)

**Purpose:** Validate and link a Riot account to the authenticated user.

**Flow:**

1. Verify user is authenticated (check Supabase session)
2. Validate summoner name + region (NA1/EUW1)
3. Fetch summoner data from Riot API
4. Store in `summoners` table
5. Return summoner details

**Validation:** Zod schema for region and summoner name

---

### 2. Refresh Data (`/api/summoner/refresh` - POST)

**Purpose:** Fetch latest match history and recompute stats.

**Flow:**

1. Check `last_synced_at` → enforce 1-hour cooldown
2. Fetch last 20 match IDs from Riot API
3. Fetch match details for each match
4. **Delete existing matches** for this summoner (cache invalidation)
5. Insert new match data
6. Recompute and upsert `champion_stats` and `matchup_stats`
7. Update `last_synced_at` timestamp

**Error Handling:** Handle Riot API errors (404, 429 rate limit, 503)

---

### 3. Stats Endpoints

- **`/api/stats/overview`**: Aggregated KDA, win rate, total games
- **`/api/stats/champions`**: Top 10 champions by games played
- **`/api/stats/matchups`**: Best/worst matchups (win rate > 60% or < 40%, min 3 games)

---

## Phase 6: Frontend Components

### Authentication

- **Login/Signup**: Use Supabase `signInWithPassword` and `signUp`
- **Protected Routes**: Middleware checks for valid session, redirects to `/login`

### Dashboard Layout

- **Navbar**: Logo, summoner selector, refresh button, user menu
- **Sidebar**: Navigation (Overview, Champions, Matchups, Matches)
- **Main Content**: Dynamic based on route

### Key Components

**SummonerCard** (`components/dashboard/summoner-card.tsx`)

- Profile icon, summoner name, level
- Rank badge (tier + division + LP)
- "Not linked" state with link button

**ChampionList** (`components/dashboard/champion-list.tsx`)

- Card grid with champion icon, name, games, win rate, KDA
- Sort by games, win rate, or KDA
- Click to filter matchups

**RefreshButton** (`components/dashboard/refresh-button.tsx`)

- Shows time until next refresh available
- Triggers `/api/summoner/refresh`
- Loading state with toast notifications

### Charts (Recharts)

- **Win Rate Over Time**: Line chart (x: match number, y: rolling win rate)
- **Role Distribution**: Pie chart (roles played %)
- **KDA by Champion**: Bar chart (top 5 champions)

---

## Phase 7: Data Flow Example

### User Links Account

1. User logs in → redirected to dashboard
2. Dashboard checks if summoner linked (query `summoners` table)
3. If not linked → show "Link Account" modal
4. User enters summoner name + selects region
5. Frontend POSTs to `/api/summoner/link`
6. API fetches from Riot, stores in DB
7. Frontend refetches summoner data, shows dashboard

### User Views Dashboard

1. Frontend queries `/api/stats/overview` (server component or React Query)
2. API reads from `summoners`, `ranked_stats`, `matches` tables
3. Computes aggregated stats (total KDA, win rate, games)
4. Returns JSON to frontend
5. Frontend renders charts and cards

### User Refreshes Data

1. User clicks "Refresh" button
2. Frontend POSTs to `/api/summoner/refresh`
3. API checks cooldown, fetches from Riot API
4. Deletes old matches, inserts new matches
5. Recomputes champion_stats and matchup_stats
6. Returns success, frontend refetches stats

---

## Phase 8: Deployment

### Supabase Setup

1. Create new project at supabase.com
2. Run SQL schema in SQL Editor
3. Enable email auth (Settings → Auth)
4. Add GitHub OAuth provider (optional)
5. Copy URL and anon key to `.env.local`

### Riot API Key

1. Register at developer.riotgames.com
2. Generate development API key (expires in 24 hours)
3. For production: Apply for personal or production key
4. Store in Vercel environment variables

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RIOT_API_KEY`

4. Deploy → auto-deploy on push

### Post-Deployment

- Test auth flow (signup, login, logout)
- Link a test summoner account
- Monitor Riot API rate limits (check response headers)
- Set up error monitoring (Sentry or Vercel Analytics)

---

## Key Technical Considerations

### Rate Limiting

- Riot API has strict rate limits
- Implement exponential backoff for 429 errors
- Consider queuing match detail fetches (fetch 5 at a time with delays)

### Type Safety

- Generate Supabase types: `npx supabase gen types typescript --project-id <id> > types/database.ts`
- Use Zod for runtime validation of API inputs
- Type Riot API responses (manually or use existing type packages)

### Error Handling

- Summoner not found (404) → clear error message
- Rate limit exceeded (429) → suggest waiting and retry
- API key invalid (403) → log error, show maintenance message
- Network errors → retry with exponential backoff

### Performance

- Use Next.js Server Components for initial data fetching
- React Query for client-side caching and refetching
- Lazy load charts and images
- Use Supabase database indexes (already in schema)

### Security

- RLS policies protect user data
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
- Validate all user inputs with Zod
- Sanitize summoner names (trim, limit length)

---

## Summary & Next Steps

This architecture provides a scalable, maintainable foundation for your LoL Dashboard. The key design patterns are:

1. **Stateless API routes** that fetch from Riot and store in Supabase
2. **Cache invalidation** on refresh (delete old matches, insert new)
3. **RLS policies** for secure multi-tenant data access
4. **shadcn/ui** for consistent, accessible UI
5. **1-hour refresh cooldown** enforced server-side

After plan approval, implementation will proceed in phases: setup dependencies, configure Supabase, build API routes, create UI components, and deploy.

### To-dos

- [x] Install npm packages (Supabase client, React Query, Recharts, date-fns, Zod, lucide-react) and initialize shadcn/ui
- [x] Set up Supabase project, run SQL schema, configure authentication, and add environment variables
- [ ] Build Riot API client with rate limiter, endpoint builders, and TypeScript types
- [ ] Implement Supabase auth with login/signup pages, middleware, and protected route logic
- [ ] Create API routes for summoner linking, data refresh, and stats endpoints
- [ ] Build dashboard layout with summoner card, rank display, and navigation
- [ ] Implement champion stats, matchup analysis, and match history pages with charts
- [ ] Add refresh button with cooldown timer and data sync logic
- [ ] Test complete user flow, handle edge cases, and deploy to Vercel
