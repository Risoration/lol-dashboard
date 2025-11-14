-- Allow users to view, insert and delete their own match records
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

create policy "Users can insert own matches"
  on public.matches
  for insert
  with check (
    exists (
      select 1
      from public.summoners
      where summoners.id = matches.summoner_id
        and summoners.user_id = auth.uid()
    )
  );

create policy "Users can delete own matches"
  on public.matches
  for delete
  using (
    exists (
      select 1
      from public.summoners
      where summoners.id = matches.summoner_id
        and summoners.user_id = auth.uid()
    )
  );

-- Allow users to insert and delete their own ranked stats
create policy "Users can insert own ranked stats"
  on public.ranked_stats
  for insert
  with check (
    exists (
      select 1
      from public.summoners
      where summoners.id = ranked_stats.summoner_id
        and summoners.user_id = auth.uid()
    )
  );

create policy "Users can delete own ranked stats"
  on public.ranked_stats
  for delete
  using (
    exists (
      select 1
      from public.summoners
      where summoners.id = ranked_stats.summoner_id
        and summoners.user_id = auth.uid()
    )
  );

