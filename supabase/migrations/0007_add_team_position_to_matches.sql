-- Add team_position column to matches table
-- This column stores the player's team position (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS team_position TEXT;

