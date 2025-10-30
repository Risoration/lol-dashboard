# Type System Overview

This document outlines the type definitions used throughout the LoL Dashboard application.

## Structure

```
app/lib/
├── riot/
│   ├── types.ts          # Riot API response types
│   ├── api.ts            # Riot API client (uses types.ts)
│   └── rate-limiter.ts   # Rate limiting logic
├── database/
│   └── types.ts          # Supabase database types
└── TYPES.md              # This file
```

## Riot API Types (`app/lib/riot/types.ts`)

### Core Types

- **`Region`** - Platform regions: NA1, EUW1, KR, etc.
- **`RegionalEndpoint`** - API clusters: americas, europe, asia
- **`Tier`** - Rank tiers: IRON → CHALLENGER
- **`QueueType`** - RANKED_SOLO_5x5, RANKED_FLEX_SR

### Account Types (ACCOUNT-V1)

- **`AccountDto`** - Riot account information (uses Riot ID)
  - Includes puuid, gameName, tagLine
  - Used to get PUUID from Riot ID (gameName#tagLine)

### Summoner Types (SUMMONER-V4)

- **`SummonerDto`** - League of Legends summoner data
  - Includes puuid, summoner_id (encrypted), level, profile icon
  - Fetched using PUUID

### League Types

- **`LeagueEntryDto`** - Ranked information (formerly RankedInformationData)
  - Includes tier, rank, LP, wins, losses
- **`MiniSeriesDto`** - Promotion series info

### Match Types

- **`MatchDto`** - Complete match data from Riot (formerly MatchData)
  - Contains `metadata: MetadataDto` and `info: InfoDto`
- **`MetadataDto`** - Match metadata (matchId, participants PUUIDs)
- **`InfoDto`** - Match information (duration, queue, participants, teams)
- **`ParticipantDto`** - Individual player stats in a match (formerly ParticipantData)
  - KDA, damage, CS, items, runes, etc.
- **`TeamDto`** - Team objectives and win status (formerly TeamData)
- **`PerksDto`**, **`PerkStyleDto`**, **`PerkSelectionDto`**, **`PerkStatsDto`** - Rune/perk data
- **`ObjectivesDto`**, **`ObjectiveDto`** - Game objectives data

### Helper Types

- **`ProcessedMatchData`** - Extracted data we store in our DB
- **`AggregatedChampionStats`** - Champion performance summary
- **`AggregatedMatchupStats`** - Matchup analysis data

## Database Types (`app/lib/database/types.ts`)

These types mirror the Supabase schema and are used for type-safe database operations.

### Tables

1. **`profiles`** - User profiles (extends Supabase auth)
2. **`summoners`** - Linked Riot accounts
3. **`ranked_stats`** - Current rank information
4. **`matches`** - Individual match records
5. **`champion_stats`** - Aggregated champion performance
6. **`matchup_stats`** - Matchup analysis

### Each Table Has Three Types

- **`TableRow`** - Data returned from queries
- **`TableInsert`** - Data for insert operations
- **`TableUpdate`** - Data for update operations

Example:

```typescript
import type {
  Summoner,
  SummonerInsert,
  SummonerUpdate,
} from '@/lib/database/types';

const summoner: Summoner = {
  /* full row */
};
const toInsert: SummonerInsert = {
  /* insert data */
};
const toUpdate: SummonerUpdate = {
  /* update data */
};
```

## Usage Examples

### Using Riot API Types

```typescript
import { RiotApi } from '@/lib/riot/api';
import type {
  AccountDto,
  SummonerDto,
  LeagueEntryDto,
  MatchDto,
  ParticipantDto,
} from '@/lib/riot/types';

const riotAPI = new RiotApi();

// Get account by Riot ID (gameName#tagLine)
const account: AccountDto = await riotAPI.getAccountByRiotId(
  'NA1',
  'PlayerName',
  'NA1'
);

// Get summoner data using PUUID
const summoner: SummonerDto = await riotAPI.getSummonerByPuuid(
  'NA1',
  account.puuid
);

// Or use the convenience method (combines both calls)
const summonerDirect: SummonerDto = await riotAPI.getSummonerByRiotId(
  'NA1',
  'PlayerName',
  'NA1'
);

// Get ranked info
const rankedInfo: LeagueEntryDto[] = await riotAPI.getRankedInfoBySummonerId(
  'NA1',
  summoner.id
);

// Get match data
const match: MatchDto = await riotAPI.getMatchDetails('NA1', 'match_id');
const participant: ParticipantDto = match.info.participants[0];

// TypeScript knows all available properties
console.log(participant.kills, participant.championName, participant.win);
```

### Using Database Types

```typescript
import { createClient } from '@/lib/supabase/server';
import type { Match, MatchInsert } from '@/lib/database/types';

const supabase = createClient();

// Type-safe queries
const { data: matches } = await supabase
  .from('matches')
  .select('*')
  .eq('summoner_id', '...');

// TypeScript knows matches is Match[] | null
matches?.forEach((match: Match) => {
  console.log(match.champion_name, match.kills);
});

// Type-safe inserts
const newMatch: MatchInsert = {
  summoner_id: '...',
  match_id: '...',
  champion_name: 'Lucian',
  kills: 12,
  deaths: 3,
  assists: 8,
  // ... all required fields
};

await supabase.from('matches').insert(newMatch);
```

## Benefits

1. **Type Safety** - Catch errors at compile time
2. **IntelliSense** - Autocomplete for all properties
3. **Documentation** - Types serve as inline documentation
4. **Refactoring** - Safe to rename properties
5. **Validation** - Ensure data shapes match contracts

## Next Steps

1. Generate Supabase types automatically:

   ```bash
   npx supabase gen types typescript --project-id your-id > app/lib/database/types.ts
   ```

2. Import types in API routes and components

3. Use for validation with Zod schemas (optional)
