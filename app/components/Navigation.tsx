'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '../lib/actions/auth-actions';
import { Button } from '../../components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import DarkModeToggle from '@/components/ui/darkmodetoggle';

export default function Navigation() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  return (
    <nav className='fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200 dark:bg-slate-950/80 dark:border-slate-800'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          <div className='flex items-center'>
            <h1 className='text-xl font-bold text-slate-900 dark:text-white'>
              LoL Dashboard
            </h1>
          </div>

          <div className='flex items-center gap-4'>
            <DarkModeToggle />
            <Button
              variant='ghost'
              size='sm'
              onClick={handleSignOut}
              disabled={isSigningOut}
              className='gap-2'
            >
              <LogOut className='h-4 w-4' />
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
