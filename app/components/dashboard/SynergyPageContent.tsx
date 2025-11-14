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

export default function SynergyPageContent() {
  const { filters, summoners } = useAccount();
  const [matchups, setMatchups] = useState<any[]>([]);
  const [synergies, setSynergies] = useState<any[]>([]);
  const [duos, setDuos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      // Wait for summoners to be loaded
      if (!summoners || summoners.length === 0) {
        setLoading(false);
        return;
      }

      // Get the selected summoner or aggregate all
      const selectedSummonerId = filters.selectedSummonerId;

      if (selectedSummonerId) {
        // Fetch for single summoner
        try {
          const [matchupsResult, synergiesResult, duosResult] =
            await Promise.all([
              getMatchupStats(selectedSummonerId, filters.queueType),
              getSynergyStats(selectedSummonerId, filters.queueType),
              getDuoStats(selectedSummonerId, filters.queueType),
            ]);

          if (matchupsResult.success) {
            setMatchups(matchupsResult.matchups || []);
          } else {
            console.error('Matchup stats error:', matchupsResult.error);
            setMatchups([]);
          }
          if (synergiesResult.success) {
            setSynergies(synergiesResult.synergies || []);
          } else {
            console.error('Synergy stats error:', synergiesResult.error);
            setSynergies([]);
          }
          if (duosResult.success) {
            setDuos(duosResult.duos || []);
          } else {
            console.error('Duo stats error:', duosResult.error);
            setDuos([]);
          }

          // Set error if all requests failed
          if (
            !matchupsResult.success &&
            !synergiesResult.success &&
            !duosResult.success
          ) {
            setError(
              matchupsResult.error ||
                synergiesResult.error ||
                duosResult.error ||
                'Failed to load statistics'
            );
          }
        } catch (err) {
          console.error('Error fetching stats:', err);
          setError(
            err instanceof Error ? err.message : 'Failed to load statistics'
          );
          setMatchups([]);
          setSynergies([]);
          setDuos([]);
        } finally {
          setLoading(false);
        }
      } else {
        // Aggregate across all accounts
        try {
          const allMatchups: any[] = [];
          const allSynergies: any[] = [];
          const allDuos: any[] = [];
          const errors: string[] = [];

          for (const summoner of summoners) {
            try {
              const [matchupsResult, synergiesResult, duosResult] =
                await Promise.all([
                  getMatchupStats(summoner.id, filters.queueType),
                  getSynergyStats(summoner.id, filters.queueType),
                  getDuoStats(summoner.id, filters.queueType),
                ]);

              if (matchupsResult.success) {
                allMatchups.push(...(matchupsResult.matchups || []));
              } else {
                console.error(
                  `Matchup stats error for ${summoner.id}:`,
                  matchupsResult.error
                );
                if (matchupsResult.error) errors.push(matchupsResult.error);
              }
              if (synergiesResult.success) {
                allSynergies.push(...(synergiesResult.synergies || []));
              } else {
                console.error(
                  `Synergy stats error for ${summoner.id}:`,
                  synergiesResult.error
                );
                if (synergiesResult.error) errors.push(synergiesResult.error);
              }
              if (duosResult.success) {
                allDuos.push(...(duosResult.duos || []));
              } else {
                console.error(
                  `Duo stats error for ${summoner.id}:`,
                  duosResult.error
                );
                if (duosResult.error) errors.push(duosResult.error);
              }
            } catch (err) {
              console.error(`Error fetching stats for ${summoner.id}:`, err);
              const errorMsg =
                err instanceof Error ? err.message : 'Failed to fetch stats';
              errors.push(errorMsg);
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

          // Set error if all requests failed
          if (
            allMatchups.length === 0 &&
            allSynergies.length === 0 &&
            allDuos.length === 0 &&
            errors.length > 0
          ) {
            setError(errors[0] || 'Failed to load statistics');
          }
        } catch (err) {
          console.error('Error fetching stats:', err);
          setError(
            err instanceof Error ? err.message : 'Failed to load statistics'
          );
          setMatchups([]);
          setSynergies([]);
          setDuos([]);
        } finally {
          setLoading(false);
        }
      }
    }

    fetchData();
  }, [filters.selectedSummonerId, filters.queueType, summoners]);

  if (loading) {
    return (
      <div className='text-center py-12 text-muted-foreground'>
        <p>Loading matchup, synergy, and duo statistics...</p>
        <p className='text-sm mt-2'>
          This may take a moment as we fetch full match data from Riot API.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-center py-12 text-destructive'>
        <p className='font-semibold'>Error loading statistics: {error}</p>
        <p className='text-sm text-muted-foreground mt-2'>
          This feature requires fetching full match data from Riot API. Please
          ensure you have recent matches synced.
        </p>
      </div>
    );
  }

  // Show message if no summoners are available
  if (!summoners || summoners.length === 0) {
    return (
      <div className='text-center py-12 text-muted-foreground'>
        <p>No summoners found. Please link a summoner account first.</p>
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
            limit={10}
            showBest={true}
          />
          <MatchupsSection
            matchups={matchups}
            title='Worst Matchups'
            limit={10}
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
            limit={10}
            showBest={true}
          />
          <SynergiesSection
            synergies={synergies}
            title='Worst Synergies'
            limit={10}
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
        <DuosSection duos={duos} title='Best Duos' limit={20} />
      </div>
    </div>
  );
}
