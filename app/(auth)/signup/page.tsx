'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '../../lib/actions/auth-actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';

export default function SignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      const result = await signUp(formData);

      if (result?.error) {
        toast.error(result.error);
      } else if (result?.needsConfirmation) {
        toast.success(
          'Account created! Please check your email to confirm your account.'
        );
        setTimeout(() => router.push('/login'), 2000);
      } else {
        toast.success('Account created successfully!');
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className='space-y-1'>
        <CardTitle className='text-2xl font-bold'>Create an Account</CardTitle>
        <CardDescription>
          Enter your email and password to create your LoL Dashboard account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={handleSubmit}
          className='space-y-4'
        >
          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              name='email'
              type='email'
              placeholder='summoner@example.com'
              required
              disabled={isLoading}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='password'>Password</Label>
            <Input
              id='password'
              name='password'
              type='password'
              placeholder='••••••••'
              required
              minLength={6}
              disabled={isLoading}
            />
            <p className='text-xs text-muted-foreground'>
              Must be at least 6 characters long
            </p>
          </div>

          <Button
            type='submit'
            className='w-full'
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div className='mt-4 text-center text-sm'>
          Already have an account?{' '}
          <Link
            href='/login'
            className='text-primary hover:underline'
          >
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
