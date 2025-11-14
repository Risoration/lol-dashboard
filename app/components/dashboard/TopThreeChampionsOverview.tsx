'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '../../../components/ui/avatar';
import clsx from 'clsx';
import { getChampionImageUrl } from '../../lib/utils';

interface TopThreeChampionsOverviewProps {
  matches: any[];
  playerPuuid: string;
  totalGames?: number;
}

export default function TopThreeChampionsOverview({
  matches,
  playerPuuid,
  totalGames,
}: TopThreeChampionsOverviewProps) {
  if (!matches || matches.length === 0) {
    return null;
  }

  interface ChampionStats {
    name: string;
    games: number;
    wins: number;
    losses: number;
    totalKills: number;
    totalDeaths: number;
    totalAssists: number;
  }

  const championStats = matches.reduce(
    (acc: Record<string, ChampionStats>, match: any) => {
      const participant = match.info.participants.find(
        (p: any) => p.puuid === playerPuuid
      );
      if (!participant) return acc;

      const champName = participant.championName;
      if (!acc[champName]) {
        acc[champName] = {
          name: champName,
          games: 0,
          wins: 0,
          losses: 0,
          totalKills: 0,
          totalDeaths: 0,
          totalAssists: 0,
        };
      }

      acc[champName].games += 1;
      acc[champName].wins += participant.win ? 1 : 0;
      acc[champName].losses += participant.win ? 0 : 1;
      acc[champName].totalKills += participant.kills;
      acc[champName].totalDeaths += participant.deaths;
      acc[champName].totalAssists += participant.assists;

      return acc;
    },
    {}
  );

  const championStatsArray = Object.values(championStats)
    .sort((a, b) => b.games - a.games)
    .slice(0, 3);

  const total = totalGames ?? matches.length;

  const winRate = (wins: number, losses: number) => {
    return losses === 0
      ? '100'
      : ((wins / (wins + losses)) * 100).toFixed(0).toString();
  };

  return (
    <div className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4'>
      <div className='space-y-2'>
        {championStatsArray.map((champ) => {
          const kdaRatio =
            champ.totalDeaths === 0
              ? ((champ.totalKills + champ.totalAssists) / champ.games).toFixed(
                  2
                )
              : (
                  (champ.totalKills + champ.totalAssists) /
                  Math.max(1, champ.totalDeaths)
                ).toFixed(2);

          return (
            <div
              key={champ.name}
              className='flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg'
            >
              <div className='flex items-center gap-3 min-w-0'>
                <Avatar className='size-8 shrink-0'>
                  <AvatarImage src={getChampionImageUrl(champ.name)} />
                  <AvatarFallback>{champ.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className='leading-tight'>
                  <div className='text-sm'>
                    <span
                      className={clsx(
                        'text-xs text-muted-foreground',
                        parseFloat(winRate(champ.wins, champ.losses)) >= 70
                          ? 'text-orange-600 dark:text-orange-400'
                          : parseFloat(winRate(champ.wins, champ.losses)) >= 60
                          ? 'text-blue-600 dark:text-blue-400'
                          : parseFloat(winRate(champ.wins, champ.losses)) >= 50
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {parseFloat(winRate(champ.wins, champ.losses)).toFixed(0)}
                      %
                    </span>
                    <span className='text-xs text-muted-foreground ml-2'>
                      ({champ.wins}W{champ.losses}L)
                    </span>
                  </div>
                  <div
                    className={clsx(
                      'text-xs text-muted-foreground',
                      parseFloat(kdaRatio) >= 5.0
                        ? 'text-orange-600 dark:text-orange-400'
                        : parseFloat(kdaRatio) >= 4.0
                        ? 'text-blue-600 dark:text-blue-400'
                        : parseFloat(kdaRatio) >= 3.0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
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
