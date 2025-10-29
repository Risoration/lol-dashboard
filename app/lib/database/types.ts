/**
 * Database Type Definitions
 * These types match the Supabase schema
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      summoners: {
        Row: Summoner;
        Insert: SummonerInsert;
        Update: SummonerUpdate;
      };
      ranked_stats: {
        Row: RankedStats;
        Insert: RankedStatsInsert;
        Update: RankedStatsUpdate;
      };
      matches: {
        Row: Match;
        Insert: MatchInsert;
        Update: MatchUpdate;
      };
      champion_stats: {
        Row: ChampionStats;
        Insert: ChampionStatsInsert;
        Update: ChampionStatsUpdate;
      };
      matchup_stats: {
        Row: MatchupStats;
        Insert: MatchupStatsInsert;
        Update: MatchupStatsUpdate;
      };
    };
  };
}

// ============================================================================
// Profile Types
// ============================================================================

export interface Profile {
  id: string; // UUID from auth.users
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  email?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  id?: string;
  email?: string | null;
  updated_at?: string;
}

// ============================================================================
// Summoner Types
// ============================================================================

export interface Summoner {
  id: string;
  user_id: string;
  region: 'NA1' | 'EUW1';
  puuid: string;
  summoner_id: string;
  summoner_name: string;
  profile_icon_id: number;
  summoner_level: number;
  last_synced_at: string | null;
  created_at: string;
}

export interface SummonerInsert {
  id?: string;
  user_id: string;
  region: 'NA1' | 'EUW1';
  puuid: string;
  summoner_id: string;
  summoner_name: string;
  profile_icon_id: number;
  summoner_level: number;
  last_synced_at?: string | null;
  created_at?: string;
}

export interface SummonerUpdate {
  id?: string;
  summoner_name?: string;
  profile_icon_id?: number;
  summoner_level?: number;
  last_synced_at?: string | null;
}

// ============================================================================
// Ranked Stats Types
// ============================================================================

export interface RankedStats {
  id: string;
  summoner_id: string;
  queue_type: string; // 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR'
  tier: string | null; // IRON, BRONZE, etc.
  rank: string | null; // I, II, III, IV
  league_points: number;
  wins: number;
  losses: number;
  synced_at: string;
}

export interface RankedStatsInsert {
  id?: string;
  summoner_id: string;
  queue_type: string;
  tier?: string | null;
  rank?: string | null;
  league_points?: number;
  wins?: number;
  losses?: number;
  synced_at?: string;
}

export interface RankedStatsUpdate {
  tier?: string | null;
  rank?: string | null;
  league_points?: number;
  wins?: number;
  losses?: number;
  synced_at?: string;
}

// ============================================================================
// Match Types
// ============================================================================

export interface Match {
  id: string;
  summoner_id: string;
  match_id: string;
  game_creation: number;
  game_duration: number;
  queue_id: number;
  champion_id: number;
  champion_name: string;
  role: string | null;
  team_position: string | null;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number; // total minions killed
  gold_earned: number;
  damage_dealt: number;
  vision_score: number;
  synced_at: string;
}

export interface MatchInsert {
  id?: string;
  summoner_id: string;
  match_id: string;
  game_creation: number;
  game_duration: number;
  queue_id: number;
  champion_id: number;
  champion_name: string;
  role?: string | null;
  team_position?: string | null;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold_earned: number;
  damage_dealt: number;
  vision_score: number;
  synced_at?: string;
}

export interface MatchUpdate {
  win?: boolean;
  kills?: number;
  deaths?: number;
  assists?: number;
  cs?: number;
  gold_earned?: number;
  damage_dealt?: number;
  vision_score?: number;
}

// ============================================================================
// Champion Stats Types
// ============================================================================

export interface ChampionStats {
  id: string;
  summoner_id: string;
  champion_id: number;
  champion_name: string;
  games_played: number;
  wins: number;
  losses: number;
  total_kills: number;
  total_deaths: number;
  total_assists: number;
  synced_at: string;
}

export interface ChampionStatsInsert {
  id?: string;
  summoner_id: string;
  champion_id: number;
  champion_name: string;
  games_played?: number;
  wins?: number;
  losses?: number;
  total_kills?: number;
  total_deaths?: number;
  total_assists?: number;
  synced_at?: string;
}

export interface ChampionStatsUpdate {
  games_played?: number;
  wins?: number;
  losses?: number;
  total_kills?: number;
  total_deaths?: number;
  total_assists?: number;
  synced_at?: string;
}

// ============================================================================
// Matchup Stats Types
// ============================================================================

export interface MatchupStats {
  id: string;
  summoner_id: string;
  player_champion_id: number;
  opponent_champion_id: number;
  opponent_champion_name: string;
  games_played: number;
  wins: number;
  losses: number;
  synced_at: string;
}

export interface MatchupStatsInsert {
  id?: string;
  summoner_id: string;
  player_champion_id: number;
  opponent_champion_id: number;
  opponent_champion_name: string;
  games_played?: number;
  wins?: number;
  losses?: number;
  synced_at?: string;
}

export interface MatchupStatsUpdate {
  games_played?: number;
  wins?: number;
  losses?: number;
  synced_at?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
