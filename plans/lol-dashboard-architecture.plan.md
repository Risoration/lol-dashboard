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
│   └── auth/
│       └── callback/
│           └── route.ts      # Supabase auth callback (only API route needed)
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
│   ├── actions/
│   │   ├── summoner-actions.ts    # linkSummoner, refreshSummonerData
│   │   ├── stats-actions.ts        # getStatsOverview, getChampionStats
│   │   └── auth-actions.ts         # Auth helper functions
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

## Phase 5: Server Actions & API Routes

### Why Server Actions vs API Routes

**Use Server Actions for:**

- Actions that primarily interact with your Supabase database
- Internal operations (no external webhooks needed)
- Better type safety with TypeScript
- Direct function calls from client components
- Automatic form handling with built-in loading states

**Use API Routes for:**

- External webhooks/callbacks (e.g., Supabase auth callback)
- Any endpoint that MUST be accessible via HTTP/HTTPS

### Implementation: Server Actions (`lib/actions.ts`)

**File structure:**

```
lib/
├── actions/
│   ├── summoner-actions.ts     # Link & refresh summoner
│   ├── stats-actions.ts         # Fetch stats
│   └── auth-actions.ts          # Auth helpers
```

### 1. Link Summoner (Server Action)

**File:** `lib/actions/summoner-actions.ts`

```typescript
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { RiotAPI } from '@/lib/riot/api';
import { z } from 'zod';

const linkSummonerSchema = z.object({
  region: z.enum(['NA1', 'EUW1']),
  summonerName: z.string().min(1).max(16),
});

export async function linkSummoner(formData: FormData) {
  // Validate input
  const rawData = {
    region: formData.get('region'),
    summonerName: formData.get('summonerName'),
  };

  const validated = linkSummonerSchema.parse(rawData);

  // Get authenticated user
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  try {
    // Fetch from Riot API
    const riotAPI = new RiotAPI(process.env.RIOT_API_KEY!);
    const summonerData = await riotAPI.getSummonerByName(
      validated.region,
      validated.summonerName
    );

    // Fetch ranked stats
    const rankedData = await riotAPI.getLeagueEntries(
      validated.region,
      summonerData.id
    );

    // Store in database
    const { data: summoner } = await supabase
      .from('summoners')
      .upsert({
        user_id: user.id,
        region: validated.region,
        puuid: summonerData.puuid,
        summoner_id: summonerData.id,
        summoner_name: summonerData.name,
        profile_icon_id: summonerData.profileIconId,
        summoner_level: summonerData.summonerLevel,
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Store ranked stats
    if (rankedData && rankedData.length > 0) {
      for (const entry of rankedData) {
        await supabase.from('ranked_stats').upsert({
          summoner_id: summoner.id,
          queue_type: entry.queueType,
          tier: entry.tier,
          rank: entry.rank,
          league_points: entry.leaguePoints,
          wins: entry.wins,
          losses: entry.losses,
        });
      }
    }

    return { success: true, summoner };
  } catch (error) {
    console.error('Link summoner failed:', error);
    return { error: 'Failed to link summoner account' };
  }
}
```

**Usage in component:**

```tsx
// app/(dashboard)/components/link-summoner-form.tsx
import { linkSummoner } from '@/lib/actions/summoner-actions';

export function LinkSummonerForm() {
  async function handleSubmit(formData: FormData) {
    const result = await linkSummoner(formData);
    if (result.error) {
      // Show error toast
    } else {
      // Show success & refresh
    }
  }

  return (
    <form action={handleSubmit}>
      <input name='region' />
      <input name='summonerName' />
      <button type='submit'>Link Account</button>
    </form>
  );
}
```

---

### 2. Refresh Data (Server Action)

**File:** `lib/actions/summoner-actions.ts`

```typescript
'use server';

export async function refreshSummonerData(summonerId: string) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Get summoner data
  const { data: summoner } = await supabase
    .from('summoners')
    .select('*')
    .eq('id', summonerId)
    .eq('user_id', user.id)
    .single();

  if (!summoner) {
    return { error: 'Summoner not found' };
  }

  // Check 1-2 minute cooldown
  const lastSync = summoner.last_synced_at
    ? new Date(summoner.last_synced_at)
    : null;
  const cooldownMinutes = 1;
  const cooldownMs = cooldownMinutes * 60 * 1000;

  if (lastSync && Date.now() - lastSync.getTime() < cooldownMs) {
    const remainingTime = Math.ceil(
      (cooldownMs - (Date.now() - lastSync.getTime())) / 60000
    );
    return {
      error: `Please wait ${remainingTime} minute(s) before refreshing again`,
    };
  }

  try {
    const riotAPI = new RiotAPI(process.env.RIOT_API_KEY!);

    // Fetch match IDs
    const matchIds = await riotAPI.getMatchIds(
      summoner.region,
      summoner.puuid,
      20
    );

    // Fetch match details (queued automatically by rate limiter)
    const matches = await riotAPI.getMultipleMatches(summoner.region, matchIds);

    // Process and store matches (helper function)
    await processAndStoreMatches(matches, summoner.id, supabase);

    // Update last_synced_at
    await supabase
      .from('summoners')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', summoner.id);

    return { success: true, matchCount: matches.length };
  } catch (error) {
    console.error('Refresh failed:', error);
    return { error: 'Failed to refresh data' };
  }
}
```

---

### 3. Stats Actions (Server Actions)

**File:** `lib/actions/stats-actions.ts`

```typescript
'use server';

export async function getStatsOverview(summonerId: string) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Verify ownership and fetch data
  const { data: summoner } = await supabase
    .from('summoners')
    .select('*')
    .eq('id', summonerId)
    .eq('user_id', user.id)
    .single();

  if (!summoner) {
    return { error: 'Summoner not found' };
  }

  // Fetch matches and compute stats
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('summoner_id', summonerId)
    .order('game_creation', { ascending: false });

  // Compute aggregated stats
  const totalGames = matches?.length || 0;
  const wins = matches?.filter((m) => m.win).length || 0;
  const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

  const totalKills = matches?.reduce((sum, m) => sum + m.kills, 0) || 0;
  const totalDeaths = matches?.reduce((sum, m) => sum + m.deaths, 0) || 0;
  const totalAssists = matches?.reduce((sum, m) => sum + m.assists, 0) || 0;

  return {
    success: true,
    stats: {
      totalGames,
      wins,
      losses: totalGames - wins,
      winRate: Number(winRate.toFixed(1)),
      avgKDA: computeKDA(totalKills, totalDeaths, totalAssists),
      avgKills: Number((totalKills / totalGames).toFixed(1)),
      avgDeaths: Number((totalDeaths / totalGames).toFixed(1)),
      avgAssists: Number((totalAssists / totalGames).toFixed(1)),
    },
  };
}

export async function getChampionStats(summonerId: string) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { data: championStats } = await supabase
    .from('champion_stats')
    .select('*')
    .eq('summoner_id', summonerId)
    .order('games_played', { ascending: false })
    .limit(10);

  return { success: true, stats: championStats };
}
```

---

### 4. Keep API Routes for External Callbacks

**File:** `app/api/auth/callback/route.ts` (Required for Supabase Auth)

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(requestUrl.origin);
}
```

---

## Updated Folder Structure

```
app/
├── lib/
│   ├── actions/
│   │   ├── summoner-actions.ts    # linkSummoner, refreshSummonerData
│   │   ├── stats-actions.ts       # getStatsOverview, getChampionStats, getMatchupStats
│   │   └── auth-actions.ts        # Session helpers
│   └── ...
└── api/
    └── auth/
        └── callback/
            └── route.ts          # Supabase callback (keep this!)
```

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
