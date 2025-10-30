'use client';

import { useAccount } from '../lib/context/AccountContext';
import { Badge } from '../../components/ui/badge';

export default function FilterBar() {
  const { filters, setRegion, setQueueType } = useAccount();

  return (
    <div className='flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border'>
      {/* Queue Type Filter */}
      <div className='flex items-center gap-2'>
        <span className='text-sm font-medium'>Queue:</span>
        <div className='flex gap-2'>
          <Badge
            variant={filters.queueType === 'ALL' ? 'default' : 'outline'}
            className='cursor-pointer'
            onClick={() => setQueueType('ALL')}
          >
            All
          </Badge>
          <Badge
            variant={
              filters.queueType === 'RANKED_SOLO_5x5' ? 'default' : 'outline'
            }
            className='cursor-pointer'
            onClick={() => setQueueType('RANKED_SOLO_5x5')}
          >
            Ranked Solo
          </Badge>
          <Badge
            variant={
              filters.queueType === 'RANKED_FLEX_SR' ? 'default' : 'outline'
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
