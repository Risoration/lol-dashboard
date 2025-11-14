-- Add SELECT policies for matches and ranked_stats (missing from previous migration)
-- Drop policies if they already exist (idempotent)
drop policy if exists "Users can view own matches" on public.matches;
drop policy if exists "Users can view own ranked stats" on public.ranked_stats;

create policy "Users can view own matches"
  on public.matches
  for select
  using (
    exists (
      select 1
      from public.summoners
      where summoners.id = matches.summoner_id
        and summoners.user_id = auth.uid()
    )
  );

create policy "Users can view own ranked stats"
  on public.ranked_stats
  for select
  using (
    exists (
      select 1
      from public.summoners
      where summoners.id = ranked_stats.summoner_id
        and summoners.user_id = auth.uid()
    )
  );

