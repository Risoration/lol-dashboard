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

export default function MatchupSynergyDuoSection() {
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

      // Get the selected summoner or first summoner
      const selectedSummonerId =
        filters.selectedSummonerId ||
        summoners.find((s) => s.is_main)?.id ||
        summoners[0]?.id;

      if (!selectedSummonerId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch all three stats in parallel with queue type filter
        const [matchupsResult, synergiesResult, duosResult] = await Promise.all(
          [
            getMatchupStats(selectedSummonerId, filters.queueType),
            getSynergyStats(selectedSummonerId, filters.queueType),
            getDuoStats(selectedSummonerId, filters.queueType),
          ]
        );

        if (matchupsResult.success) {
          setMatchups(matchupsResult.matchups || []);
        } else {
          console.error('Matchup stats error:', matchupsResult.error);
        }

        if (synergiesResult.success) {
          setSynergies(synergiesResult.synergies || []);
        } else {
          console.error('Synergy stats error:', synergiesResult.error);
        }

        if (duosResult.success) {
          setDuos(duosResult.duos || []);
        } else {
          console.error('Duo stats error:', duosResult.error);
        }
      } catch (err) {
        console.error('Error fetching matchup/synergy/duo stats:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load statistics'
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [filters.selectedSummonerId, filters.queueType, summoners]);

  if (loading) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <div className='col-span-1 md:col-span-2'>
          <div className='text-center py-8 text-muted-foreground'>
            Loading matchup and synergy statistics...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-center py-8 text-destructive'>
        <p>Error loading statistics: {error}</p>
        <p className='text-sm text-muted-foreground mt-2'>
          This feature requires fetching full match data from Riot API. Please
          ensure you have recent matches synced.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Matchups */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <MatchupsSection
          matchups={matchups}
          title='Best Matchups'
          limit={5}
          showBest={true}
        />
        <MatchupsSection
          matchups={matchups}
          title='Worst Matchups'
          limit={5}
          showBest={false}
        />
      </div>

      {/* Synergies */}
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

      {/* Duos */}
      <DuosSection duos={duos} title='Best Duos' limit={5} />
    </div>
  );
}
