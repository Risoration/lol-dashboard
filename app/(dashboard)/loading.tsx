import { Skeleton } from '../../components/ui/skeleton';
import { Card, CardContent, CardHeader } from '../../components/ui/card';

export default function DashboardLoading() {
  return (
    <div className='space-y-6'>
      <div>
        <Skeleton className='h-10 w-48 mb-2' />
        <Skeleton className='h-5 w-96' />
      </div>

      <Skeleton className='h-16 w-full' />

      <div>
        <Skeleton className='h-8 w-40 mb-4' />
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className='pb-3'>
                <Skeleton className='h-4 w-20' />
              </CardHeader>
              <CardContent>
                <Skeleton className='h-8 w-16 mb-2' />
                <Skeleton className='h-3 w-24' />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className='grid md:grid-cols-2 gap-6'>
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className='h-6 w-32' />
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {[...Array(5)].map((_, j) => (
                  <Skeleton
                    key={j}
                    className='h-20 w-full'
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
