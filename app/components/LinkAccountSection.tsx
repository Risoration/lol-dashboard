'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { linkSummoner } from '../lib/actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { buildPlayerProfilePath, parseSearchInputs } from '../lib/utils';

export default function LinkAccountSection() {
  const router = useRouter();
  const [isLinking, setIsLinking] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  async function handleLinkAccount(formData: FormData) {
    setIsLinking(true);
    try {
      const result = await linkSummoner(formData);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Account linked successfully!');
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      toast.error('Failed to link account. Please try again.');
    } finally {
      setIsLinking(false);
    }
  }

  async function handleSearchAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSearching(true);

    const formData = new FormData(e.currentTarget);
    const parsed = parseSearchInputs(formData);
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
  }

  return (
    <div className='w-full max-w-5xl p-6'>
      <div className='text-center mb-8'>
        <h1 className='text-4xl font-bold mb-2'>Welcome to LoL Dashboard</h1>
        <p className='text-muted-foreground'>
          Link your League of Legends account to view your stats and match
          history
        </p>
      </div>

      <div className='grid md:grid-cols-2 gap-6'>
        {/* Link Account Card */}
        <Card>
          <CardHeader>
            <CardTitle>Link Your Account</CardTitle>
            <CardDescription>
              Connect your League of Legends account to track your performance
            </CardDescription>
          </CardHeader>
          <CardContent>
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

              <Button type='submit' className='w-full' disabled={isLinking}>
                {isLinking ? 'Linking...' : 'Link Account'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Search Account Card */}
        <Card>
          <CardHeader>
            <CardTitle>Search for a Player</CardTitle>
            <CardDescription>
              Look up any player's stats without linking an account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearchAccount} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='searchRegion'>Region</Label>
                <select
                  id='searchRegion'
                  name='searchRegion'
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
                <Label htmlFor='searchGameName'>Game Name</Label>
                <Input
                  id='searchGameName'
                  name='searchGameName'
                  placeholder='Faker'
                  required
                  maxLength={16}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='searchTagLine'>Tag Line</Label>
                <Input
                  id='searchTagLine'
                  name='searchTagLine'
                  placeholder='KR1'
                  required
                  maxLength={5}
                />
              </div>

              <Button
                type='submit'
                variant='outline'
                className='w-full'
                disabled={isSearching}
              >
                {isSearching ? 'Searching...' : 'Search Player'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
