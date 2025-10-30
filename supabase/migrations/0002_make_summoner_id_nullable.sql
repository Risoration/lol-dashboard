-- Make summoner_id nullable since Riot API no longer returns it in all cases
-- Modern Riot API uses PUUID as the primary identifier instead

ALTER TABLE summoners
ALTER COLUMN summoner_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN summoners.summoner_id IS 'Encrypted summoner ID (legacy, may be null in newer API responses)';

