-- Add unique constraint on (summoner_id, queue_type) for ranked_stats
-- This allows upsert operations to work correctly
-- Drop constraint if it already exists (idempotent)
ALTER TABLE public.ranked_stats
DROP CONSTRAINT IF EXISTS ranked_stats_summoner_id_queue_type_key;

ALTER TABLE public.ranked_stats
ADD CONSTRAINT ranked_stats_summoner_id_queue_type_key UNIQUE (summoner_id, queue_type);

