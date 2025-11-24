'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import DarkModeToggle from '../../../components/ui/darkmodetoggle';

import RefreshButton from './RefreshButton';
import AccountManager from '../AccountManager';

import type { Summoner } from '../../lib/database/types';
import { buildPlayerProfilePath, parseSearchInputs } from '../../lib/utils';

interface DashboardTopBarProps {
  summoners: Summoner[];
  refreshSummonerId: string;
  refreshLastSyncedAt: string | null;
}

export default function DashboardTopBar({
  summoners,
  refreshSummonerId,
  refreshLastSyncedAt,
}: DashboardTopBarProps) {
  const router = useRouter();
  const [searchRegion, setSearchRegion] = useState('EUW1');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearchAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSearching(true);

    try {
      const formData = new FormData(event.currentTarget);
      const parsed = parseSearchInputs(formData, searchRegion);

      if ('error' in parsed) {
        toast.error(parsed.error);
        setIsSearching(false);
        return;
      }

      const path = buildPlayerProfilePath(
        parsed.region,
        parsed.gameName,
        parsed.tagLine
      );

      router.push(path);
      setSearchQuery('');
    } catch (error) {
      console.error('Search failed', error);
      toast.error('Unable to search for that summoner right now.');
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className='flex flex-wrap items-center gap-4 justify-between'>
      <div className='flex items-center gap-4 flex-wrap'>
        <Link
          href='/dashboard'
          className='text-2xl font-bold'
        >
          LoL Dashboard
        </Link>
        <DarkModeToggle />
      </div>

      <form
        className='flex-1 min-w-[260px] flex items-center gap-2 max-w-xl'
        onSubmit={handleSearchAccount}
      >
        <select
          value={searchRegion}
          onChange={(event) => setSearchRegion(event.target.value)}
          name='searchRegion'
          className='h-10 rounded-md border border-slate-300 bg-transparent px-2 text-sm dark:border-slate-700 flex-shrink-0'
        >
          <option
            className='bg-white dark:bg-slate-900'
            value='NA1'
          >
            North America
          </option>
          <option
            className='bg-white dark:bg-slate-900'
            value='EUW1'
          >
            Europe West
          </option>
          <option
            className='bg-white dark:bg-slate-900'
            value='EUN1'
          >
            Europe Nordic & East
          </option>
          <option
            className='bg-white dark:bg-slate-900'
            value='KR'
          >
            Korea
          </option>
          <option
            className='bg-white dark:bg-slate-900'
            value='BR1'
          >
            Brazil
          </option>
          <option
            className='bg-white dark:bg-slate-900'
            value='LAN1'
          >
            Latin America North
          </option>
          <option
            className='bg-white dark:bg-slate-900'
            value='LAS1'
          >
            Latin America South
          </option>
          <option
            className='bg-white dark:bg-slate-900'
            value='TR1'
          >
            Turkey
          </option>
          <option
            className='bg-white dark:bg-slate-900'
            value='RU'
          >
            Russia
          </option>
          <option
            className='bg-white dark:bg-slate-900'
            value='JP1'
          >
            Japan
          </option>
          <option
            className='bg-white dark:bg-slate-900'
            value='OC1'
          >
            Oceania
          </option>
        </select>
        <Input
          placeholder='Search summoner (GameName#TAG)'
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          name='searchQuery'
        />
        <Button
          type='submit'
          disabled={isSearching}
        >
          {isSearching ? 'Searching…' : 'Search'}
        </Button>
      </form>

      <div className='flex flex-wrap items-center gap-4 justify-end'>
        <RefreshButton
          summonerId={refreshSummonerId}
          lastSyncedAt={refreshLastSyncedAt}
        />
        <AccountManager initialSummoners={summoners} />
      </div>
    </div>
  );
}
