import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import type { Match } from '../../lib/database/types';
import Image from 'next/image';
import { getChampionImageUrl } from '@/app/lib/utils';

interface RecentTenGameSummaryProps {
  matches: Match[];
}

const MAX_RECENT_GAMES = 10;

export default function RecentTenGameSummary({
  matches,
}: RecentTenGameSummaryProps) {
  const recentMatches = matches.slice(0, MAX_RECENT_GAMES);

  if (recentMatches.length === 0) {
    return null;
  }

  const wins = recentMatches.filter((m) => m.win).length;
  const losses = recentMatches.length - wins;
  const winRate =
    recentMatches.length > 0
      ? Math.round((wins / recentMatches.length) * 100)
      : 0;

  const totalKills = recentMatches.reduce((sum, match) => sum + match.kills, 0);
  const totalDeaths = recentMatches.reduce(
    (sum, match) => sum + match.deaths,
    0
  );
  const totalAssists = recentMatches.reduce(
    (sum, match) => sum + match.assists,
    0
  );

  const avgKills = totalKills / recentMatches.length || 0;
  const avgDeaths = totalDeaths / recentMatches.length || 0;
  const avgAssists = totalAssists / recentMatches.length || 0;

  const avgKda =
    avgDeaths === 0
      ? avgKills + avgAssists
      : Number(((avgKills + avgAssists) / avgDeaths).toFixed(2));

  const momentumScore = Math.round(avgKda * 6 + winRate / 2);

  const championMap = recentMatches.reduce<
    Record<
      string,
      {
        championName: string;
        wins: number;
        games: number;
        totalKills: number;
        totalDeaths: number;
        totalAssists: number;
        championId: number;
      }
    >
  >((acc, match) => {
    const existing = acc[match.champion_name];
    if (existing) {
      existing.games += 1;
      existing.wins += match.win ? 1 : 0;
      existing.totalKills += match.kills;
      existing.totalDeaths += match.deaths;
      existing.totalAssists += match.assists;
    } else {
      acc[match.champion_name] = {
        championName: match.champion_name,
        championId: match.champion_id,
        games: 1,
        wins: match.win ? 1 : 0,
        totalKills: match.kills,
        totalDeaths: match.deaths,
        totalAssists: match.assists,
      };
    }
    return acc;
  }, {});

  const topChampions = Object.values(championMap)
    .sort((a, b) => b.games - a.games)
    .slice(0, 3)
    .map((champ) => {
      const avgKills = champ.totalKills / champ.games;
      const avgDeaths = champ.totalDeaths / champ.games;
      const avgAssists = champ.totalAssists / champ.games;
      const kda =
        avgDeaths === 0
          ? avgKills + avgAssists
          : Number(((avgKills + avgAssists) / avgDeaths).toFixed(2));

      return {
        ...champ,
        winRate: Math.round((champ.wins / champ.games) * 100),
        kda,
      };
    });

  return (
    <Card className='overflow-hidden'>
      <CardHeader className='pb-6'>
        <CardTitle className='text-lg font-semibold'>
          Last {recentMatches.length} Games
        </CardTitle>
        <p className='text-sm text-muted-foreground'>
          Snapshot of your most recent performances
        </p>
      </CardHeader>
      <CardContent className='grid gap-6 md:grid-cols-[1fr,280px]'>
        <div className='flex flex-col gap-6'>
          <div className='flex items-center gap-6'>
            <div className='relative w-28 h-28'>
              <div className='absolute inset-0 rounded-full bg-muted' />
              <div
                className='absolute inset-0 rounded-full'
                style={{
                  background: `conic-gradient(var(--primary) ${winRate *
                    3.6}deg, var(--muted) 0deg)`,
                }}
              />
              <div className='absolute inset-2 rounded-full bg-background flex flex-col items-center justify-center text-center'>
                <span className='text-2xl font-semibold'>{winRate}%</span>
                <span className='text-xs text-muted-foreground'>Win rate</span>
              </div>
            </div>
            <div>
              <div className='text-3xl font-bold leading-tight'>
                {recentMatches.length} Games
              </div>
              <div className='text-sm text-muted-foreground mb-4'>
                {wins}W {losses}L
              </div>
              <div className='flex gap-6 text-sm'>
                <div>
                  <div className='text-xs uppercase text-muted-foreground'>
                    Average KDA
                  </div>
                  <div className='text-xl font-semibold'>
                    {avgKda.toFixed(2)}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {avgKills.toFixed(1)} / {avgDeaths.toFixed(1)} /{' '}
                    {avgAssists.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className='text-xs uppercase text-muted-foreground'>
                    Momentum Score
                  </div>
                  <div className='text-xl font-semibold'>
                    {isNaN(momentumScore) ? '-' : momentumScore}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    Based on win rate & KDA
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <SummaryCard
              label='CS/min'
              value={`${averageValue(
                recentMatches.map((m) => {
                  const minutes = m.game_duration / 60;
                  return minutes > 0 ? m.cs / minutes : 0;
                })
              ).toFixed(1)}`}
            />
            <SummaryCard
              label='Gold/min'
              value={`${averageValue(
                recentMatches.map((m) => {
                  const minutes = m.game_duration / 60;
                  return minutes > 0 ? m.gold_earned / minutes : 0;
                })
              ).toFixed(0)}`}
            />
            <SummaryCard
              label='Damage/min'
              value={`${averageValue(
                recentMatches.map((m) => {
                  const minutes = m.game_duration / 60;
                  return minutes > 0 ? m.damage_dealt / minutes : 0;
                })
              ).toFixed(0)}`}
            />
            <SummaryCard
              label='Vision/min'
              value={averageValue(
                recentMatches.map((m) => {
                  const minutes = m.game_duration / 60;
                  return minutes > 0 ? (m.vision_score || 0) / minutes : 0;
                })
              ).toFixed(1)}
            />
          </div>
        </div>

        <div className='rounded-xl border bg-muted/30 p-4'>
          <div className='text-sm font-semibold mb-3'>Champions Played</div>
          {topChampions.length === 0 ? (
            <div className='text-sm text-muted-foreground'>
              No champion data available.
            </div>
          ) : (
            <div className='space-y-3'>
              {topChampions.map((champ) => (
                <div
                  key={`${champ.championId}-${champ.championName}`}
                  className='flex items-center justify-between rounded-lg bg-background/60 p-3'
                >
                  <div className='flex items-center gap-3'>
                    <Image
                      src={getChampionImageUrl(champ.championName)}
                      alt={champ.championName}
                      width={40}
                      height={40}
                      className='rounded-full border'
                    />
                    <div>
                      <div className='font-medium text-sm'>
                        {champ.championName}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {champ.games} games · {champ.winRate}% WR
                      </div>
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='text-sm font-semibold'>
                      {champ.kda} KDA
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {champ.wins}W/{champ.games - champ.wins}L
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg border bg-background/60 p-3'>
      <div className='text-xs text-muted-foreground uppercase mb-1'>
        {label}
      </div>
      <div className='text-lg font-semibold'>{value}</div>
    </div>
  );
}

function averageValue(values: number[]) {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

