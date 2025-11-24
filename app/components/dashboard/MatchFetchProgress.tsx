'use client';

import { useEffect, useState } from 'react';
import { getMatchFetchProgress, type MatchFetchProgress } from '../../lib/actions';

interface MatchFetchProgressProps {
  progressKeys: string[];
  onComplete?: () => void;
}

export default function MatchFetchProgress({
  progressKeys,
  onComplete,
}: MatchFetchProgressProps) {
  const [progress, setProgress] = useState<MatchFetchProgress | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (progressKeys.length === 0) {
      setIsPolling(false);
      return;
    }

    let intervalId: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    const pollProgress = async () => {
      // Try to get progress from any of the keys (they should all have similar progress)
      for (const key of progressKeys) {
        const prog = await getMatchFetchProgress(key);
        if (prog) {
          setProgress(prog);
          if (prog.isComplete) {
            setIsPolling(false);
            if (onComplete) {
              onComplete();
            }
            return;
          }
          break;
        }
      }
    };

    // Poll immediately
    pollProgress();

    // Poll every 500ms
    intervalId = setInterval(pollProgress, 500);

    // Stop polling after 2 minutes (safety timeout)
    timeoutId = setTimeout(() => {
      setIsPolling(false);
    }, 2 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [progressKeys, onComplete]);

  if (!progress) {
    return (
      <div className='text-center py-8 text-muted-foreground'>
        <p>Preparing to fetch match data...</p>
      </div>
    );
  }

  const percentage = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  return (
    <div className='text-center py-8 space-y-4'>
      <div className='space-y-2'>
        <p className='text-muted-foreground'>
          Fetching match data from Riot API...
        </p>
        <div className='w-full max-w-md mx-auto bg-slate-200 dark:bg-slate-800 rounded-full h-2.5'>
          <div
            className='bg-blue-600 h-2.5 rounded-full transition-all duration-300'
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className='text-sm text-muted-foreground space-y-1'>
          <p>
            {progress.current} / {progress.total} matches loaded
          </p>
          {progress.cached > 0 && (
            <p className='text-xs'>
              ({progress.cached} from cache, {progress.fetched} from API)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

