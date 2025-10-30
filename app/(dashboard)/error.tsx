'use client';

import { useEffect } from 'react';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className='flex items-center justify-center min-h-[60vh]'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-muted-foreground'>
            We encountered an error loading your dashboard. This might be a
            temporary issue.
          </p>
          <div className='flex gap-4'>
            <Button onClick={reset}>Try again</Button>
            <Button
              variant='outline'
              onClick={() => (window.location.href = '/')}
            >
              Go home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
