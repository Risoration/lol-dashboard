'use server';
import { createServerClient } from './supabase/server';
import { z } from 'zod';
import { RiotApi } from './riot/api';

const FormSchema = z.object({
  region: z.enum(['NA1', 'EUW1']),
  summonerName: z.string().min(1).max(16),
  summonerId: z.string().min(2).max(5),
});

export async function linkSummoner(formData: FormData) {
  const rawFormData = {
    region: formData.get('region'),
    summonerName: formData.get('summonerName'),
    summonerId: formData.get('summonerId'),
  };
}
