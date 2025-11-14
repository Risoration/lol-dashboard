'use client';

import { useMemo } from 'react';
import { useAccount } from '../../lib/context/AccountContext';
import RecentMatches from './RecentMatches';
import type { Match, Summoner } from '../../lib/database/types';
import { filterMatchesByQueueType } from '../../lib/utils';

interface MatchesContentProps {
  matches: Match[];
  summoners: Summoner[];
}

export default function MatchesContent({
  matches,
  summoners,
}: MatchesContentProps) {
  const { filters } = useAccount();

  const filteredMatches = useMemo(() => {
    let result = matches;

    if (filters.selectedSummonerId) {
      result = result.filter(
        (match) => match.summoner_id === filters.selectedSummonerId
      );
    }

    result = filterMatchesByQueueType(result, filters.queueType) as Match[];

    return result.sort((a, b) => b.game_creation - a.game_creation);
  }, [matches, filters]);

  return (
    <RecentMatches
      matches={filteredMatches}
      title={`Matches (${filteredMatches.length})`}
      limit={100}
    />
  );
}

