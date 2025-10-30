import { Skeleton } from '../components/ui/skeleton';

export default function Loading() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900'>
      <div className='w-full max-w-5xl p-6'>
        <div className='text-center mb-8'>
          <Skeleton className='h-10 w-96 mx-auto mb-2' />
          <Skeleton className='h-5 w-128 mx-auto' />
        </div>

        <div className='grid md:grid-cols-2 gap-6'>
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className='border rounded-lg p-6 bg-white dark:bg-slate-900'
            >
              <Skeleton className='h-6 w-40 mb-2' />
              <Skeleton className='h-4 w-full mb-6' />

              <div className='space-y-4'>
                {[...Array(3)].map((_, j) => (
                  <div key={j}>
                    <Skeleton className='h-4 w-20 mb-2' />
                    <Skeleton className='h-10 w-full' />
                  </div>
                ))}
                <Skeleton className='h-10 w-full mt-4' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
