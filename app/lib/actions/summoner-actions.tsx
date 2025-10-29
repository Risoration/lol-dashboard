'use server';

import { createServerClient } from '../supabase/server';
import { RiotApi } from '../riot/api';
import { z } from 'zod';

const linkSummonerSchema = z.object({
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

  const validated = linkSummonerSchema.parse(rawFormData);

  const supabase = createServerClient();
}
