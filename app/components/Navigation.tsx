'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import Link from 'next/link';
import { toast } from 'sonner';
import DarkModeToggle from '@/components/ui/darkmodetoggle';
import UserMenu from './UserMenu';
import { buildPlayerProfilePath, parseSearchInputs } from '../lib/utils';

export default function Navigation() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('EUW1');
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearchAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSearching(true);

    const formData = new FormData(e.currentTarget);
    const parsed = parseSearchInputs(formData, region);
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
    setIsSearching(false);
    setQuery('');
  }

  return (
    <nav className='fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200 dark:bg-slate-950/80 dark:border-slate-800'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          <Link href='/dashboard'>
            <Button className='w-full'>LoL Dashboard</Button>
          </Link>

          {/* Search */}
          <form
            className='hidden md:flex items-center gap-2 flex-1 max-w-xl mx-6'
            onSubmit={handleSearchAccount}
          >
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              name='searchRegion'
              className='h-9 rounded-md border border-slate-300 bg-transparent px-2 text-sm dark:border-slate-700'
            >
              <option className='bg-white dark:bg-slate-900' value='NA1'>
                North America
              </option>
              <option className='bg-white dark:bg-slate-900' value='EUW1'>
                Europe West
              </option>
              <option className='bg-white dark:bg-slate-900' value='EUN1'>
                Europe Nordic & East
              </option>
              <option className='bg-white dark:bg-slate-900' value='KR'>
                Korea
              </option>
              <option className='bg-white dark:bg-slate-900' value='BR1'>
                Brazil
              </option>
              <option className='bg-white dark:bg-slate-900' value='LAN1'>
                Latin America North
              </option>
              <option className='bg-white dark:bg-slate-900' value='LAS1'>
                Latin America South
              </option>
              <option className='bg-white dark:bg-slate-900' value='TR1'>
                Turkey
              </option>
              <option className='bg-white dark:bg-slate-900' value='RU'>
                Russia
              </option>
              <option className='bg-white dark:bg-slate-900' value='JP1'>
                Japan
              </option>
              <option className='bg-white dark:bg-slate-900' value='OC1'>
                Oceania
              </option>
            </select>
            <Input
              placeholder='Search summoner (GameName#TAG)'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              name='searchQuery'
            />
            <Button type='submit' size='sm' disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </form>

          <div className='flex items-center gap-4'>
            <DarkModeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
