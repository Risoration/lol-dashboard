'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from './button';
import { useTheme } from 'next-themes';

export default function DarkModeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant='ghost'
      size='sm'
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? (
        <Moon className='size-4' />
      ) : (
        <Sun className='size-4' />
      )}
    </Button>
  );
}
