'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';

export default function PlayerRefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      toast.info('Updating player data...');
      router.refresh();
    });
  };

  return (
    <Button
      type='button'
      variant='outline'
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? 'Refreshing...' : 'Refresh Player'}
    </Button>
  );
}
