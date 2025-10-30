'use client';

import { Badge } from '../../../components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { getQueueName } from '../../lib/utils';

interface MatchListProps {
  matches: any[];
  playerPuuid: string;
}

export default function MatchList({ matches, playerPuuid }: MatchListProps) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  if (!matches || matches.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>No recent matches found</p>
    );
  }

  return (
    <div className='space-y-3'>
      {matches.map((match) => {
        // Find the player's participant data
        const participant = match.info.participants.find(
          (p: any) => p.puuid === playerPuuid
        );

        if (!participant) return null;

        const isWin = participant.win;
        const kda = `${participant.kills}/${participant.deaths}/${participant.assists}`;
        const kdaRatio =
          participant.deaths === 0
            ? participant.kills + participant.assists
            : (
                (participant.kills + participant.assists) /
                participant.deaths
              ).toFixed(2);

        return (
          <div
            key={match.metadata.matchId}
            className={`p-4 rounded-lg border-2 ${
              isWin
                ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
            }`}
          >
            <div className='flex justify-between items-start'>
              <div className='space-y-1'>
                <div className='flex items-center gap-2'>
                  <Badge variant={isWin ? 'victory' : 'defeat'}>
                    {isWin ? 'Victory' : 'Defeat'}
                  </Badge>
                  <span className='text-sm font-medium'>
                    {getQueueName(match.info.queueId)}
                  </span>
                </div>
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <span>{participant.championName}</span>
                  <span>•</span>
                  <span>{formatDuration(match.info.gameDuration)}</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(
                      new Date(match.info.gameEndTimestamp),
                      {
                        addSuffix: true,
                      }
                    )}
                  </span>
                </div>
              </div>
              <div className='text-right'>
                <div className='text-lg font-bold'>{kda}</div>
                <div className='text-sm text-muted-foreground'>
                  {kdaRatio} KDA
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
