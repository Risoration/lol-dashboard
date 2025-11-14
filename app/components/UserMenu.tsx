'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut, getUserSummoners } from '../lib/actions';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '../../components/ui/avatar';
import { Settings, LogOut, LayoutDashboard, User } from 'lucide-react';
import { toast } from 'sonner';
import { getProfileIcon, buildPlayerProfilePath } from '../lib/utils';
import type { Summoner } from '../lib/database/types';

export default function UserMenu() {
  const router = useRouter();
  const [summoners, setSummoners] = useState<Summoner[]>([]);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    async function fetchSummoners() {
      try {
        const result = await getUserSummoners();
        if (result.success && result.summoners) {
          setSummoners(result.summoners);
        } else {
          // User might not be logged in or have no summoners
          setSummoners([]);
        }
      } catch (error) {
        console.error('Failed to fetch summoners:', error);
        setSummoners([]);
      }
    }

    fetchSummoners();
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      const result = await signOut();

      if (result?.error) {
        toast.error(result.error);
        setIsSigningOut(false);
      } else {
        toast.success('Signed out successfully');
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
      setIsSigningOut(false);
    }
  }

  const mainAccount = summoners.find((s) => s.is_main) || summoners[0];
  const summonerName = mainAccount
    ? mainAccount.summoner_name.split('#')[0]
    : 'User';
  const summonerTag = mainAccount
    ? mainAccount.summoner_name.split('#')[1]
    : null;
  const profileIconUrl = mainAccount
    ? getProfileIcon(mainAccount.profile_icon_id)
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='sm' className='flex items-center gap-2'>
          <Avatar className='h-8 w-8'>
            {profileIconUrl && (
              <AvatarImage src={profileIconUrl} alt={summonerName} />
            )}
            <AvatarFallback>
              <User className='h-4 w-4' />
            </AvatarFallback>
          </Avatar>
          <span className='hidden sm:inline'>
            {summonerTag ? `${summonerName}#${summonerTag}` : summonerName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        <DropdownMenuLabel>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm font-medium leading-none'>
              {summonerTag ? `${summonerName}#${summonerTag}` : 'My Account'}
            </p>
            {mainAccount && (
              <p className='text-xs leading-none text-muted-foreground'>
                Level {mainAccount.summoner_level} • {mainAccount.region}
                {mainAccount.is_main && (
                  <span className='ml-1 text-primary'>• Main</span>
                )}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href='/dashboard'
            className='flex items-center cursor-pointer w-full'
          >
            <LayoutDashboard className='mr-2 h-4 w-4' />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        {summoners.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className='text-xs text-muted-foreground'>
              Linked Accounts
            </DropdownMenuLabel>
            {summoners.map((summoner) => {
              const [name, tag] = summoner.summoner_name.split('#');
              const profilePath = buildPlayerProfilePath(
                summoner.region,
                name,
                tag
              );
              return (
                <DropdownMenuItem key={summoner.id} asChild>
                  <Link
                    href={profilePath}
                    className='flex items-center justify-between w-full'
                  >
                    <div className='flex items-center gap-2'>
                      <Avatar className='h-6 w-6'>
                        <AvatarImage
                          src={getProfileIcon(summoner.profile_icon_id)}
                          alt={name}
                        />
                        <AvatarFallback className='text-xs'>
                          {name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className='flex flex-col'>
                        <span className='text-sm'>{name}</span>
                        <span className='text-xs text-muted-foreground'>
                          {tag} • {summoner.region}
                        </span>
                      </div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <Settings className='mr-2 h-4 w-4' />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isSigningOut}
          className='text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400'
        >
          <LogOut className='mr-2 h-4 w-4' />
          <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
