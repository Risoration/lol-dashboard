'use client';

import { useEffect, useState } from 'react';
import { useAccount } from '../../lib/context/AccountContext';
import {
  getMatchupStats,
  getSynergyStats,
  getDuoStats,
} from '../../lib/actions';
import MatchupsSection from './MatchupsSection';
import SynergiesSection from './SynergiesSection';
import DuosSection from './DuosSection';
import MatchFetchProgress from './MatchFetchProgress';

export default function SynergyPageContent() {
  const { filters, summoners, setIsFetching } = useAccount();
  const [matchups, setMatchups] = useState<any[]>([]);
  const [synergies, setSynergies] = useState<any[]>([]);
  const [duos, setDuos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressKeys, setProgressKeys] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      // Wait for summoners to be loaded
      if (summoners.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setIsFetching(true);

      // Get the selected summoner or aggregate all
      const selectedSummonerId = filters.selectedSummonerId;

      console.log(
        `[SynergyPageContent] Starting fetch - selectedSummonerId: ${selectedSummonerId}, total summoners: ${summoners.length}, queueType: ${filters.queueType}`
      );

      if (selectedSummonerId) {
        // Fetch for single summoner
        const queueTypeStr = filters.queueType || 'ALL';
        setProgressKeys([
          `matchup:${selectedSummonerId}:${queueTypeStr}`,
          `synergy:${selectedSummonerId}:${queueTypeStr}`,
          `duo:${selectedSummonerId}:${queueTypeStr}`,
        ]);

        try {
          const [matchupsResult, synergiesResult, duosResult] =
            await Promise.all([
              getMatchupStats(selectedSummonerId, filters.queueType),
              getSynergyStats(selectedSummonerId, filters.queueType),
              getDuoStats(selectedSummonerId, filters.queueType),
            ]);

          console.log('Matchup result:', matchupsResult);
          console.log('Synergy result:', synergiesResult);
          console.log('Duo result:', duosResult);

          if ('success' in matchupsResult && matchupsResult.success) {
            console.log(
              `Setting ${matchupsResult.matchups?.length || 0} matchups`
            );
            setMatchups(matchupsResult.matchups || []);
          } else if ('error' in matchupsResult) {
            console.error('Matchup stats error:', matchupsResult.error);
            setMatchups([]);
            setError(matchupsResult.error || 'Failed to load matchup stats');
          }
          if ('success' in synergiesResult && synergiesResult.success) {
            console.log(
              `Setting ${synergiesResult.synergies?.length || 0} synergies`
            );
            setSynergies(synergiesResult.synergies || []);
          } else if ('error' in synergiesResult) {
            console.error('Synergy stats error:', synergiesResult.error);
            setSynergies([]);
            if (!error)
              setError(synergiesResult.error || 'Failed to load synergy stats');
          }
          if ('success' in duosResult && duosResult.success) {
            console.log(`Setting ${duosResult.duos?.length || 0} duos`);
            setDuos(duosResult.duos || []);
          } else if ('error' in duosResult) {
            console.error('Duo stats error:', duosResult.error);
            setDuos([]);
            if (!error)
              setError(duosResult.error || 'Failed to load duo stats');
          }
        } catch (err) {
          console.error('Error fetching stats:', err);
          setError(
            err instanceof Error ? err.message : 'Failed to load statistics'
          );
        } finally {
          setLoading(false);
          setIsFetching(false);
        }
      } else {
        // Aggregate across all accounts
        console.log(
          `[SynergyPageContent] Aggregating across ${summoners.length} accounts`
        );
        const queueTypeStr = filters.queueType || 'ALL';
        const keys: string[] = [];
        for (const summoner of summoners) {
          keys.push(
            `matchup:${summoner.id}:${queueTypeStr}`,
            `synergy:${summoner.id}:${queueTypeStr}`,
            `duo:${summoner.id}:${queueTypeStr}`
          );
        }
        setProgressKeys(keys);

        try {
          const allMatchups: any[] = [];
          const allSynergies: any[] = [];
          const allDuos: any[] = [];
          const errors: string[] = [];

          for (let i = 0; i < summoners.length; i++) {
            const summoner = summoners[i];
            console.log(
              `[SynergyPageContent] Fetching stats for summoner ${i + 1}/${
                summoners.length
              }: ${summoner.id}`
            );
            const [matchupsResult, synergiesResult, duosResult] =
              await Promise.all([
                getMatchupStats(summoner.id, filters.queueType),
                getSynergyStats(summoner.id, filters.queueType),
                getDuoStats(summoner.id, filters.queueType),
              ]);

            console.log(
              `Summoner ${summoner.id} - Matchup result:`,
              matchupsResult
            );
            console.log(
              `Summoner ${summoner.id} - Synergy result:`,
              synergiesResult
            );
            console.log(`Summoner ${summoner.id} - Duo result:`, duosResult);

            if ('success' in matchupsResult && matchupsResult.success) {
              console.log(
                `Adding ${
                  matchupsResult.matchups?.length || 0
                } matchups from summoner ${summoner.id}`
              );
              allMatchups.push(...(matchupsResult.matchups || []));
            } else if ('error' in matchupsResult) {
              console.error(
                `Matchup stats error for ${summoner.id}:`,
                matchupsResult.error
              );
              if (matchupsResult.error) errors.push(matchupsResult.error);
            }
            if ('success' in synergiesResult && synergiesResult.success) {
              console.log(
                `Adding ${
                  synergiesResult.synergies?.length || 0
                } synergies from summoner ${summoner.id}`
              );
              allSynergies.push(...(synergiesResult.synergies || []));
            } else if ('error' in synergiesResult) {
              console.error(
                `Synergy stats error for ${summoner.id}:`,
                synergiesResult.error
              );
              if (synergiesResult.error) errors.push(synergiesResult.error);
            }
            if ('success' in duosResult && duosResult.success) {
              console.log(
                `Adding ${duosResult.duos?.length || 0} duos from summoner ${
                  summoner.id
                }`
              );
              allDuos.push(...(duosResult.duos || []));
            } else if ('error' in duosResult) {
              console.error(
                `Duo stats error for ${summoner.id}:`,
                duosResult.error
              );
              if (duosResult.error) errors.push(duosResult.error);
            }
          }

          // Aggregate matchups
          const matchupMap = new Map<string, any>();
          allMatchups.forEach((m) => {
            const key = `${m.playerChampionId}-${m.opponentChampionId}`;
            const existing = matchupMap.get(key);
            if (existing) {
              existing.games += m.games;
              existing.wins += m.wins;
              existing.losses += m.losses;
              existing.winRate = Number(
                ((existing.wins / existing.games) * 100).toFixed(1)
              );
            } else {
              matchupMap.set(key, { ...m });
            }
          });
          setMatchups(Array.from(matchupMap.values()));

          // Aggregate synergies (include role in key to separate same champions in different roles)
          const synergyMap = new Map<string, any>();
          allSynergies.forEach((s) => {
            const key = `${s.playerChampionId}-${s.teammateChampionId}-${
              s.teammateRole || 'NONE'
            }`;
            const existing = synergyMap.get(key);
            if (existing) {
              existing.games += s.games;
              existing.wins += s.wins;
              existing.losses += s.losses;
              existing.winRate = Number(
                ((existing.wins / existing.games) * 100).toFixed(1)
              );
              // Preserve role if missing
              if (!existing.teammateRole && s.teammateRole) {
                existing.teammateRole = s.teammateRole;
              }
            } else {
              synergyMap.set(key, { ...s });
            }
          });
          setSynergies(Array.from(synergyMap.values()));

          // Aggregate duos (by PUUID)
          const duoMap = new Map<string, any>();
          allDuos.forEach((d) => {
            const existing = duoMap.get(d.teammatePuuid);
            if (existing) {
              existing.games += d.games;
              existing.wins += d.wins;
              existing.losses += d.losses;
              existing.winRate = Number(
                ((existing.wins / existing.games) * 100).toFixed(1)
              );
              // Preserve name if current one is missing or update to most recent
              if (
                d.teammateName &&
                (!existing.teammateName ||
                  d.teammateName !== existing.teammateName)
              ) {
                existing.teammateName = d.teammateName;
              }
            } else {
              duoMap.set(d.teammatePuuid, { ...d });
            }
          });
          setDuos(Array.from(duoMap.values()));
        } catch (err) {
          console.error('Error fetching stats:', err);
          setError(
            err instanceof Error ? err.message : 'Failed to load statistics'
          );
        } finally {
          setLoading(false);
          setIsFetching(false);
        }
      }
    }

    fetchData();
  }, [filters.selectedSummonerId, filters.queueType, summoners, setIsFetching]);

  if (summoners.length === 0) {
    return (
      <div className='text-center py-12 text-muted-foreground'>
        <p>No summoners found. Please link an account first.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <MatchFetchProgress
        progressKeys={progressKeys}
        onComplete={() => setIsFetching(false)}
      />
    );
  }

  if (error) {
    return (
      <div className='text-center py-12 text-destructive'>
        <p>Error loading statistics: {error}</p>
        <p className='text-sm text-muted-foreground mt-2'>
          This feature requires fetching full match data from Riot API. Please
          ensure you have recent matches synced.
        </p>
      </div>
    );
  }

  // Check if all data is empty
  if (matchups.length === 0 && synergies.length === 0 && duos.length === 0) {
    return (
      <div className='text-center py-12 text-muted-foreground'>
        <p>No matchup, synergy, or duo data available.</p>
        <p className='text-sm mt-2'>
          This feature requires match data. Please refresh your account data to
          sync matches from Riot API.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      {/* Matchups Section */}
      <div>
        <h2 className='text-2xl font-bold mb-4'>Champion Matchups</h2>
        <p className='text-muted-foreground mb-4'>
          Your win rates against specific enemy champions
        </p>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <MatchupsSection
            matchups={matchups}
            title='Best Matchups'
            limit={3}
            showBest={true}
          />
          <MatchupsSection
            matchups={matchups}
            title='Worst Matchups'
            limit={3}
            showBest={false}
          />
        </div>
      </div>

      {/* Synergies Section */}
      <div>
        <h2 className='text-2xl font-bold mb-4'>Champion Synergies</h2>
        <p className='text-muted-foreground mb-4'>
          Your win rates when playing with specific teammate champions
        </p>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <SynergiesSection
            synergies={synergies}
            title='Best Synergies'
            limit={5}
            showBest={true}
          />
          <SynergiesSection
            synergies={synergies}
            title='Worst Synergies'
            limit={5}
            showBest={false}
          />
        </div>
      </div>

      {/* Duos Section */}
      <div>
        <h2 className='text-2xl font-bold mb-4'>Best Duos</h2>
        <p className='text-muted-foreground mb-4'>
          Your win rates when playing with specific summoners
        </p>
        <DuosSection
          duos={duos}
          title='Best Duos'
          limit={100}
        />
      </div>
    </div>
  );
}
