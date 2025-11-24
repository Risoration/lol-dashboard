'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { refreshSummonerData } from '../../lib/actions';
import type { RefreshSummonerResult } from '../../lib/actions/summoner-actions';
import { useAccount } from '../../lib/context/AccountContext';

interface RefreshButtonProps {
  summonerId: string;
  lastSyncedAt: string | null;
}

const COOLDOWN_SECONDS = 120;

function computeRemainingSeconds(lastSyncedAt: string | null): number {
  if (!lastSyncedAt) return 0;
  const lastSyncTime = new Date(lastSyncedAt).getTime();
  if (Number.isNaN(lastSyncTime)) return 0;

  const elapsedSeconds = Math.floor((Date.now() - lastSyncTime) / 1000);
  const remaining = COOLDOWN_SECONDS - elapsedSeconds;
  return remaining > 0 ? remaining : 0;
}

function formatSeconds(value: number): string {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

export default function RefreshButton({
  summonerId,
  lastSyncedAt,
}: RefreshButtonProps) {
  const router = useRouter();
  const { isFetching } = useAccount();
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isPending, startTransition] = useTransition();

  const isDisabled = useMemo(
    () => isPending || remainingSeconds > 0,
    [isPending, remainingSeconds]
  );

  // Only start countdown after fetching is complete
  // Reset countdown when fetching starts, start it when fetching completes
  useEffect(() => {
    if (isFetching) {
      // Reset countdown while fetching
      setRemainingSeconds(0);
    } else {
      // Start countdown when fetching completes
      setRemainingSeconds(computeRemainingSeconds(lastSyncedAt));
    }
  }, [lastSyncedAt, isFetching]);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [remainingSeconds]);

  function handleResult(result: RefreshSummonerResult) {
    if (result.success) {
      toast.success(
        result.matchCount > 0
          ? `Synced ${result.matchCount} recent matches`
          : 'No recent matches found, data is up to date'
      );
      setRemainingSeconds(result.cooldownSeconds);
      router.refresh();
      return;
    }

    toast.error(result.error);
    if (typeof result.cooldownRemaining === 'number') {
      setRemainingSeconds(result.cooldownRemaining);
    }
  }

  const handleClick = () => {
    startTransition(() => {
      refreshSummonerData(summonerId)
        .then(handleResult)
        .catch((error) => {
          console.error('Refresh failed', error);
          toast.error('Failed to refresh data. Please try again later.');
        });
    });
  };

  return (
    <div className='flex items-center gap-3'>
      <Button
        type='button'
        className='bg-blue-500 text-white hover:bg-blue-800 dark:bg-blue-800 dark:hover:bg-blue-900 cursor-pointer'
        onClick={handleClick}
        disabled={isDisabled}
      >
        {isPending ? 'Refreshing...' : 'Refresh Data'}
      </Button>
      {remainingSeconds > 0 && (
        <span className='text-sm text-muted-foreground'>
          Next refresh in {formatSeconds(remainingSeconds)}
        </span>
      )}
    </div>
  );
}
