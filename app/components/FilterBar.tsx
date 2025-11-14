'use client';

import { useAccount } from '../lib/context/AccountContext';
import { Badge } from '../../components/ui/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '../../components/ui/avatar';
import { getProfileIcon } from '../lib/utils';
import { User } from 'lucide-react';

export default function FilterBar() {
  const { filters, setQueueType, setSelectedSummoner, summoners } =
    useAccount();

  return (
    <div className='flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border'>
      {/* Account Filter */}
      <div className='flex items-center gap-2'>
        <span className='text-sm font-medium'>Account:</span>
        <div className='flex gap-2'>
          <Badge
            variant={filters.selectedSummonerId === null ? 'victory' : 'defeat'}
            className='cursor-pointer'
            onClick={() => setSelectedSummoner(null)}
          >
            All Accounts
          </Badge>
          {summoners.map((summoner) => (
            <Badge
              key={summoner.id}
              variant={
                filters.selectedSummonerId === summoner.id
                  ? 'victory'
                  : 'defeat'
              }
              className='cursor-pointer flex items-center gap-1'
              onClick={() => setSelectedSummoner(summoner.id)}
            >
              <Avatar className='h-4 w-4'>
                <AvatarImage
                  src={getProfileIcon(summoner.profile_icon_id)}
                  alt={summoner.summoner_name}
                />
                <AvatarFallback>
                  <User className='h-3 w-3' />
                </AvatarFallback>
              </Avatar>
              <span className='text-xs'>
                {summoner.summoner_name.split('#')[0]}
              </span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Queue Type Filter */}
      <div className='flex items-center gap-2'>
        <span className='text-sm font-medium'>Queue:</span>
        <div className='flex gap-2'>
          <Badge
            variant={filters.queueType === 'ALL' ? 'victory' : 'defeat'}
            className='cursor-pointer'
            onClick={() => setQueueType('ALL')}
          >
            All
          </Badge>
          <Badge
            variant={
              filters.queueType === 'RANKED_SOLO_5x5' ? 'victory' : 'defeat'
            }
            className='cursor-pointer'
            onClick={() => setQueueType('RANKED_SOLO_5x5')}
          >
            Ranked Solo
          </Badge>
          <Badge
            variant={
              filters.queueType === 'RANKED_FLEX_SR' ? 'victory' : 'defeat'
            }
            className='cursor-pointer'
            onClick={() => setQueueType('RANKED_FLEX_SR')}
          >
            Ranked Flex
          </Badge>
        </div>
      </div>
    </div>
  );
}
