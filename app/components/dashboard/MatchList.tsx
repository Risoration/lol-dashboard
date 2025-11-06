'use client';

import { Badge } from '../../../components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { getQueueName } from '../../lib/utils';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '../../../components/ui/avatar';
import TopThreeChampionsOverview from './TopThreeChampionsOverview';
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

  // Calculate winrate
  const winLossData = matches.reduce(
    (acc, match) => {
      const participant = match.info.participants.find(
        (p: any) => p.puuid === playerPuuid
      );
      if (participant) {
        if (participant.win) {
          acc.wins++;
        } else {
          acc.losses++;
        }
      }
      return acc;
    },
    { wins: 0, losses: 0 }
  );

  const totalGames = winLossData.wins + winLossData.losses;
  const winrate =
    totalGames > 0 ? ((winLossData.wins / totalGames) * 100).toFixed(1) : '0.0';

  // Aggregate K/D/A across recent matches
  const aggregate = matches.reduce(
    (acc: { kills: number; deaths: number; assists: number }, match: any) => {
      const participant = match.info.participants.find(
        (p: any) => p.puuid === playerPuuid
      );
      if (!participant) return acc;
      acc.kills += participant.kills;
      acc.deaths += participant.deaths;
      acc.assists += participant.assists;
      return acc;
    },
    { kills: 0, deaths: 0, assists: 0 }
  );

  const avgKills = (aggregate.kills / Math.max(1, totalGames)).toFixed(1);
  const avgDeaths = (aggregate.deaths / Math.max(1, totalGames)).toFixed(1);
  const avgAssists = (aggregate.assists / Math.max(1, totalGames)).toFixed(1);
  const overallKda =
    aggregate.deaths === 0
      ? (aggregate.kills + aggregate.assists).toFixed(2)
      : (
          (aggregate.kills + aggregate.assists) /
          Math.max(1, aggregate.deaths)
        ).toFixed(2);

  // Simple AI-score heuristic
  const aiScore = Math.min(
    100,
    Math.round(parseFloat(winrate) * 0.6 + parseFloat(overallKda) * 10 * 0.4)
  );

  // Top 3 champions UI is rendered via TopThreeChampionsOverview

  return (
    <div className='space-y-4'>
      {/* Winrate Summary */}
      <div className='bg-card border border-slate-200 dark:border-slate-700 rounded-lg p-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {/* Left: Summary section */}
          <p className='text-sm font-medium text-muted-foreground'>
            Game Summary
          </p>
          <div className='flex items-center gap-4 justify-between'>
            {/* Donut */}
            <div
              className='relative shrink-0'
              style={{ width: 56, height: 56 }}
            >
              <div
                className='absolute inset-0 rounded-full'
                style={{
                  background: `conic-gradient(rgb(37,99,235) ${parseFloat(
                    winrate
                  )}%, rgb(220,38,38) 0)`,
                }}
              />
              <div className='absolute inset-1 rounded-full bg-card flex items-center justify-center text-xs font-semibold'>
                {parseFloat(winrate).toFixed(0)}%
              </div>
            </div>

            <div className='flex-1'>
              <div className='flex justify-center gap-4'>
                <div className='text-sm'>
                  <div className='text-base font-semibold'>
                    {totalGames} Games
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    <span className='text-blue-600 dark:text-blue-400 font-semibold'>
                      {winLossData.wins}W
                    </span>
                    <span className='mx-1'> </span>
                    <span className='text-red-600 dark:text-red-400 font-semibold'>
                      {winLossData.losses}L
                    </span>
                  </div>
                </div>
                <div className='text-sm'>
                  <div className='text-base font-semibold'>
                    {overallKda} KDA
                  </div>
                  <div className='text-xs'>
                    <span>{avgKills}</span>
                    <span className='text-muted-foreground'> / </span>
                    <span className='text-red-600 dark:text-red-400'>
                      {avgDeaths}
                    </span>
                    <span className='text-muted-foreground'> / </span>
                    <span>{avgAssists}</span>
                  </div>
                </div>
                <div className='text-right text-sm'>
                  <div className='text-base font-semibold text-green-600 dark:text-green-400'>
                    {aiScore}
                  </div>
                  <div className='text-xs text-muted-foreground'>AI-Score</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Champion Played section */}
          <div className='flex flex-col justify-end items-end'>
            <p className='text-sm font-medium text-muted-foreground mb-2'>
              Champion Played
            </p>
            <TopThreeChampionsOverview
              matches={matches}
              playerPuuid={playerPuuid}
              totalGames={totalGames}
            />
          </div>
        </div>
      </div>

      {/* Match List */}
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
                  <div className='grid grid-cols-[1fr_1fr_2fr] grid-rows-2 items-center gap-2'>
                    <Avatar className='justify-self-center row-span-1'>
                      <AvatarImage
                        src={`https://ddragon.leagueoflegends.com/cdn/15.1.1/img/champion/${participant.championName}.png`}
                      />
                      <AvatarFallback>
                        {participant.championName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <Badge
                      className='justify-self-center row-span-1'
                      variant={isWin ? 'victory' : 'defeat'}
                    >
                      {isWin ? 'Victory' : 'Defeat'}
                    </Badge>
                    <span className='text-sm font-medium justify-self-center row-span-1'>
                      {getQueueName(match.info.queueId)}
                    </span>

                    <span className='row-span-1 justify-self-center text-muted-foreground'>
                      {participant.championName}{' '}
                    </span>

                    <span className='row-span-1 justify-self-center text-muted-foreground'>
                      {formatDuration(match.info.gameDuration)}{' '}
                    </span>

                    <span className='row-span-1 justify-self-center text-muted-foreground'>
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
    </div>
  );
}
