-- ============================================================================
-- Add is_main field to summoners table
-- Allows users to set one account as their main account
-- ============================================================================

-- Add is_main column (defaults to false)
ALTER TABLE public.summoners
ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_summoners_is_main ON public.summoners(user_id, is_main) WHERE is_main = TRUE;

-- Set the first account for each user as main (if no main account exists)
-- This ensures existing users have at least one main account
UPDATE public.summoners
SET is_main = TRUE
WHERE id IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.summoners
  WHERE is_main = FALSE
  ORDER BY user_id, created_at ASC
)
AND NOT EXISTS (
  SELECT 1
  FROM public.summoners s2
  WHERE s2.user_id = summoners.user_id
    AND s2.is_main = TRUE
);

-- Add constraint to ensure only one main account per user
-- We'll handle this in application logic, but this helps with data integrity
CREATE UNIQUE INDEX IF NOT EXISTS idx_summoners_one_main_per_user 
ON public.summoners(user_id) 
WHERE is_main = TRUE;

