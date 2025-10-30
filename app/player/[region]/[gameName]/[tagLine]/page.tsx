import { redirect } from 'next/navigation';
import { searchPlayer } from '../../../../lib/actions/public-actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import MatchList from '../../../../components/dashboard/MatchList';

interface PageProps {
  params: {
    region: string;
    gameName: string;
    tagLine: string;
  };
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { region, gameName, tagLine } = await params;

  // Decode URL parameters
  const decodedGameName = decodeURIComponent(gameName);
  const decodedTagLine = decodeURIComponent(tagLine);

  // Create FormData for the search
  const formData = new FormData();
  formData.append('region', region);
  formData.append('gameName', decodedGameName);
  formData.append('tagLine', decodedTagLine);

  const result = await searchPlayer(formData);

  if (result.error || !result.success) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4'>
        <Card className='max-w-md w-full'>
          <CardHeader>
            <CardTitle>Player Not Found</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href='/'>
              <Button className='w-full'>Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { player } = result;

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4'>
      <div className='max-w-4xl mx-auto space-y-6 py-8'>
        {/* Back Button */}
        <Link href='/'>
          <Button variant='outline'>← Back to Home</Button>
        </Link>

        {/* Player Header */}
        <Card>
          <CardHeader>
            <div className='flex items-center gap-4'>
              <div className='w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl font-bold'>
                <Image
                  src={player.profileIcon}
                  alt={`${player.gameName}'s profile icon`}
                  width={64}
                  height={64}
                  className='w-full h-full object-cover rounded-full'
                  unoptimized
                />
              </div>
              <div>
                <CardTitle className='text-3xl'>
                  {player.gameName}#{player.tagLine}
                </CardTitle>
                <CardDescription>
                  Level {player.summonerLevel} • {region.toUpperCase()}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Ranked Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Ranked Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {player.rankedStats.length > 0 ? (
              <div className='space-y-4'>
                {player.rankedStats.map((stat: any, index: number) => (
                  <div
                    key={index}
                    className='flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg'
                  >
                    <div>
                      <h3 className='font-semibold'>
                        {stat.queueType === 'RANKED_SOLO_5x5'
                          ? 'Ranked Solo/Duo'
                          : 'Ranked Flex'}
                      </h3>
                      <p className='text-2xl font-bold text-primary'>
                        {stat.tier} {stat.rank}
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        {stat.leaguePoints} LP
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-sm font-medium'>
                        {stat.wins}W {stat.losses}L
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        {stat.wins + stat.losses > 0
                          ? (
                              (stat.wins / (stat.wins + stat.losses)) *
                              100
                            ).toFixed(1)
                          : 0}
                        % WR
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-muted-foreground'>No ranked stats available</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Matches */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Matches</CardTitle>
            <CardDescription>
              {player.matches?.length || 0} recent matches found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MatchList
              matches={player.matches || []}
              playerPuuid={player.puuid}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
