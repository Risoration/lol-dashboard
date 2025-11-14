'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import DuoMatchHistoryDialog from './DuoMatchHistoryDialog';
import { useAccount } from '../../lib/context/AccountContext';

interface DuoStat {
  teammatePuuid: string;
  teammateName: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface DuosSectionProps {
  duos: DuoStat[];
  title?: string;
  limit?: number;
}

export default function DuosSection({
  duos,
  title = 'Best Duos',
  limit = 5,
}: DuosSectionProps) {
  const { filters, summoners } = useAccount();
  const [selectedDuo, setSelectedDuo] = useState<DuoStat | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Sort by games played (most games first), then by winrate
  const filtered = duos
    .filter((d) => d.games >= 5)
    .sort((a, b) => {
      if (b.games !== a.games) return b.games - a.games;
      return b.winRate - a.winRate;
    })
    .slice(0, limit);

  if (filtered.length === 0) {
    return null;
  }

  const handleDuoClick = (duo: DuoStat) => {
    setSelectedDuo(duo);
    setDialogOpen(true);
  };

  const selectedSummonerId =
    filters.selectedSummonerId ||
    summoners.find((s) => s.is_main)?.id ||
    summoners[0]?.id;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {filtered.map((duo, index) => (
              <div
                key={duo.teammatePuuid}
                onClick={() => handleDuoClick(duo)}
                className='flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer'
              >
                <div className='flex items-center gap-4 flex-1'>
                  {/* Rank */}
                  <div className='w-8 text-center font-bold text-lg text-muted-foreground'>
                    #{index + 1}
                  </div>

                  {/* Summoner Name */}
                  <div className='flex-1'>
                    <div className='font-semibold'>{duo.teammateName}</div>
                    <div className='text-sm text-muted-foreground'>
                      {duo.games} games played together
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className='flex gap-6 text-center'>
                  <div>
                    <div className='text-sm text-muted-foreground'>
                      Win Rate
                    </div>
                    <Badge
                      variant={duo.winRate >= 50 ? 'victory' : 'defeat'}
                      className='mt-1'
                    >
                      {duo.winRate}%
                    </Badge>
                  </div>
                  <div>
                    <div className='text-sm text-muted-foreground'>Record</div>
                    <div className='text-sm mt-1'>
                      {duo.wins}W - {duo.losses}L
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedDuo && selectedSummonerId && (
        <DuoMatchHistoryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          summonerId={selectedSummonerId}
          teammatePuuid={selectedDuo.teammatePuuid}
          teammateName={selectedDuo.teammateName}
        />
      )}
    </>
  );
}
