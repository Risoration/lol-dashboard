'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from '../lib/context/AccountContext';
import { refreshSummonerData, signOut, setMainAccount } from '../lib/actions';
import type { Summoner } from '../lib/database/types';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '../../components/ui/avatar';
import { toast } from 'sonner';
import { RefreshCw, LogOut, User, Star } from 'lucide-react';
import LinkAccountDialog from './LinkAccountDialog';
import { getProfileIcon } from '../lib/utils';

interface AccountManagerProps {
  initialSummoners: Summoner[];
}

export default function AccountManager({
  initialSummoners,
}: AccountManagerProps) {
  const { summoners, setSummoners, filters, setSelectedSummoner, setRegion } =
    useAccount();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  useEffect(() => {
    setSummoners(initialSummoners);
  }, [initialSummoners, setSummoners]);

  const handleRefresh = async (summonerId: string) => {
    setRefreshing(summonerId);
    try {
      const result = await refreshSummonerData(summonerId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.matchCount > 0
          ? `Refreshed! Added ${result.matchCount} new matches`
          : 'No new matches found'
      );
      router.refresh();
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSetMainAccount = async (summonerId: string) => {
    try {
      const result = await setMainAccount(summonerId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Main account updated');
        router.refresh();
      }
    } catch (error) {
      toast.error('Failed to set main account');
    }
  };

  const mainAccount = summoners.find((s) => s.is_main) || summoners[0];

  const handleRegionFilter = (region: 'ALL' | 'NA1' | 'EUW1') => {
    setRegion(region);
    setSelectedSummoner(null);
  };

  const currentSummoner = summoners.find((s) =>
    filters.selectedSummonerId ? s.id === filters.selectedSummonerId : true
  );

  return (
    <div className='flex items-center gap-4'>
      {/* Region Filter */}
      <div className='flex gap-2'>
        <Badge
          variant={filters.region === 'ALL' ? 'victory' : 'defeat'}
          className='cursor-pointer'
          onClick={() => handleRegionFilter('ALL')}
        >
          All Regions
        </Badge>
        {summoners.map((summoner) => (
          <Badge
            key={summoner.id}
            variant={filters.region === summoner.region ? 'victory' : 'defeat'}
            className='cursor-pointer'
            onClick={() =>
              handleRegionFilter(summoner.region as 'NA1' | 'EUW1')
            }
          >
            {summoner.region}
          </Badge>
        ))}
      </div>

      {/* Account Dropdown */}
      <div className='relative'>
        <Button
          variant='outline'
          onClick={() => setIsOpen(!isOpen)}
          className='flex items-center gap-2'
        >
          <Avatar className='h-6 w-6'>
            {mainAccount ? (
              <AvatarImage
                src={getProfileIcon(mainAccount.profile_icon_id)}
                alt={mainAccount.summoner_name}
              />
            ) : null}
            <AvatarFallback>
              <User className='h-4 w-4' />
            </AvatarFallback>
          </Avatar>
          <span className='hidden sm:inline'>
            {filters.region === 'ALL'
              ? 'All Accounts'
              : currentSummoner?.summoner_name}
          </span>
        </Button>

        {isOpen && (
          <div className='absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border rounded-lg shadow-lg p-4 z-50'>
            <div className='space-y-4'>
              <div>
                <h3 className='font-semibold mb-2'>Linked Accounts</h3>
                <div className='space-y-2'>
                  {summoners.map((summoner) => (
                    <div
                      key={summoner.id}
                      className={`flex items-center justify-between p-2 rounded border ${
                        summoner.is_main ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className='flex items-center gap-2 flex-1'>
                        <Avatar className='h-8 w-8'>
                          <AvatarImage
                            src={getProfileIcon(summoner.profile_icon_id)}
                            alt={summoner.summoner_name}
                          />
                          <AvatarFallback>
                            <User className='h-4 w-4' />
                          </AvatarFallback>
                        </Avatar>
                        <div className='flex-1'>
                          <div className='flex items-center gap-1'>
                            <span className='font-medium text-sm'>
                              {summoner.summoner_name}
                            </span>
                            {summoner.is_main && (
                              <Star className='h-3 w-3 fill-yellow-500 text-yellow-500' />
                            )}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            Level {summoner.summoner_level} • {summoner.region}
                            {summoner.is_main && (
                              <span className='ml-1 text-primary'>• Main</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className='flex items-center gap-1'>
                        {!summoner.is_main && (
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => handleSetMainAccount(summoner.id)}
                            title='Set as main account'
                          >
                            <Star className='h-4 w-4' />
                          </Button>
                        )}
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => handleRefresh(summoner.id)}
                          disabled={refreshing === summoner.id}
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${
                              refreshing === summoner.id ? 'animate-spin' : ''
                            }`}
                          />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant='outline'
                className='w-full'
                onClick={() => {
                  setIsLinkDialogOpen(true);
                  setIsOpen(false);
                }}
              >
                Link Another Account
              </Button>

              <Button
                variant='ghost'
                className='w-full'
                onClick={handleSignOut}
              >
                <LogOut className='h-4 w-4 mr-2' />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>

      <LinkAccountDialog
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
      />
    </div>
  );
}
