'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { linkSummoner } from '../lib/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

interface LinkAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LinkAccountDialog({
  open,
  onOpenChange,
}: LinkAccountDialogProps) {
  const router = useRouter();
  const [isLinking, setIsLinking] = useState(false);

  async function handleLinkAccount(formData: FormData) {
    setIsLinking(true);
    try {
      const result = await linkSummoner(formData);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Account linked successfully!');
        onOpenChange(false);
        router.refresh();
      }
    } catch (error) {
      toast.error('Failed to link account. Please try again.');
    } finally {
      setIsLinking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Link Another Account</DialogTitle>
          <DialogDescription>
            Connect another League of Legends account to track your performance
            across multiple accounts
          </DialogDescription>
        </DialogHeader>
        <form action={handleLinkAccount} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='region'>Region</Label>
            <select
              id='region'
              name='region'
              required
              className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <option value='NA1'>North America</option>
              <option value='EUW1'>Europe West</option>
              <option value='EUN1'>Europe Nordic & East</option>
              <option value='KR'>Korea</option>
              <option value='BR1'>Brazil</option>
              <option value='LAN1'>Latin America North</option>
              <option value='LAS1'>Latin America South</option>
              <option value='TR1'>Turkey</option>
              <option value='RU'>Russia</option>
              <option value='JP1'>Japan</option>
              <option value='OC1'>Oceania</option>
            </select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='gameName'>Game Name</Label>
            <Input
              id='gameName'
              name='gameName'
              placeholder='Faker'
              required
              maxLength={16}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='tagLine'>Tag Line</Label>
            <Input
              id='tagLine'
              name='tagLine'
              placeholder='KR1'
              required
              maxLength={5}
            />
          </div>

          <div className='flex justify-end gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isLinking}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isLinking}>
              {isLinking ? 'Linking...' : 'Link Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
