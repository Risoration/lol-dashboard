-- ============================================================================
-- Rebuild Database Schema from Scratch
-- This migration drops and recreates all tables to match the actual Riot API data
-- ============================================================================

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS public.matchup_stats CASCADE;
DROP TABLE IF EXISTS public.champion_stats CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.ranked_stats CASCADE;
DROP TABLE IF EXISTS public.summoners CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================================
-- Profiles Table
-- ============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Summoners Table
-- Stores linked League of Legends accounts
-- ============================================================================
CREATE TABLE public.summoners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  region TEXT NOT NULL, -- NA1, EUW1, KR, etc.
  puuid TEXT NOT NULL, -- Encrypted PUUID from Riot API
  summoner_id TEXT, -- Encrypted summoner ID (may be null in newer API responses)
  summoner_name TEXT NOT NULL, -- Format: "GameName#TagLine"
  profile_icon_id INTEGER NOT NULL,
  summoner_level INTEGER NOT NULL,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, region) -- One summoner per region per user
);

-- ============================================================================
-- Matches Table
-- Stores individual match data for each summoner
-- ============================================================================
CREATE TABLE public.matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  summoner_id UUID NOT NULL REFERENCES public.summoners(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL, -- Riot match ID
  game_creation BIGINT NOT NULL, -- Unix timestamp in milliseconds
  game_duration INTEGER NOT NULL, -- Duration in seconds
  queue_id INTEGER NOT NULL, -- Queue type ID
  champion_id INTEGER NOT NULL,
  champion_name TEXT NOT NULL,
  role TEXT, -- TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY, NONE
  team_position TEXT, -- TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY
  win BOOLEAN NOT NULL,
  kills INTEGER NOT NULL,
  deaths INTEGER NOT NULL,
  assists INTEGER NOT NULL,
  cs INTEGER NOT NULL, -- Total minions killed (totalMinionsKilled + neutralMinionsKilled)
  gold_earned INTEGER NOT NULL,
  damage_dealt INTEGER NOT NULL, -- totalDamageDealtToChampions
  vision_score INTEGER NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(summoner_id, match_id) -- One record per summoner per match
);

-- ============================================================================
-- Ranked Stats Table
-- Stores current season ranked information
-- ============================================================================
CREATE TABLE public.ranked_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  summoner_id UUID NOT NULL REFERENCES public.summoners(id) ON DELETE CASCADE,
  queue_type TEXT NOT NULL, -- RANKED_SOLO_5x5, RANKED_FLEX_SR, ARAM
  tier TEXT, -- IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, MASTER, GRANDMASTER, CHALLENGER
  rank TEXT, -- I, II, III, IV (null for MASTER, GRANDMASTER, CHALLENGER)
  league_points INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(summoner_id, queue_type) -- One ranked entry per queue type per summoner
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX idx_summoners_user_id ON public.summoners(user_id);
CREATE INDEX idx_summoners_puuid ON public.summoners(puuid);
CREATE INDEX idx_summoners_region ON public.summoners(region);

CREATE INDEX idx_matches_summoner_id ON public.matches(summoner_id);
CREATE INDEX idx_matches_game_creation ON public.matches(game_creation DESC);
CREATE INDEX idx_matches_match_id ON public.matches(match_id);
CREATE INDEX idx_matches_champion_id ON public.matches(champion_id);

CREATE INDEX idx_ranked_stats_summoner_id ON public.ranked_stats(summoner_id);
CREATE INDEX idx_ranked_stats_queue_type ON public.ranked_stats(queue_type);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summoners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranked_stats ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Profiles Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Summoners Policies
CREATE POLICY "Users can view own summoners"
  ON public.summoners
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summoners"
  ON public.summoners
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summoners"
  ON public.summoners
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own summoners"
  ON public.summoners
  FOR DELETE
  USING (auth.uid() = user_id);

-- Matches Policies
CREATE POLICY "Users can view own matches"
  ON public.matches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.summoners
      WHERE summoners.id = matches.summoner_id
        AND summoners.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own matches"
  ON public.matches
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.summoners
      WHERE summoners.id = matches.summoner_id
        AND summoners.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own matches"
  ON public.matches
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.summoners
      WHERE summoners.id = matches.summoner_id
        AND summoners.user_id = auth.uid()
    )
  );

-- Ranked Stats Policies
CREATE POLICY "Users can view own ranked stats"
  ON public.ranked_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.summoners
      WHERE summoners.id = ranked_stats.summoner_id
        AND summoners.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own ranked stats"
  ON public.ranked_stats
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.summoners
      WHERE summoners.id = ranked_stats.summoner_id
        AND summoners.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own ranked stats"
  ON public.ranked_stats
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.summoners
      WHERE summoners.id = ranked_stats.summoner_id
        AND summoners.user_id = auth.uid()
    )
  );

