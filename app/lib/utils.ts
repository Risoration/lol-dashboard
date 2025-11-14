import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertAxiosHeadersToHeaders(
  headers: Record<string, any>
): Headers {
  const headersObject = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      headersObject.append(key, value.join(', '));
    } else if (value !== null && value !== undefined) {
      headersObject.append(key, String(value));
    }
  }
  return headersObject;
}

/**
 * Get game version for Data Dragon URLs
 * Works on both server and client - checks NEXT_PUBLIC_GAME_VERSION first (client),
 * then falls back to GAME_VERSION (server-only)
 */
export function getGameVersion(): string {
  if (typeof window !== 'undefined') {
    // Client-side: must use NEXT_PUBLIC_ prefix
    return process.env.NEXT_PUBLIC_GAME_VERSION || 'latest';
  }
  // Server-side: can use either
  return (
    process.env.NEXT_PUBLIC_GAME_VERSION || process.env.GAME_VERSION || 'latest'
  );
}

/**
 * Normalize champion name for Data Dragon image URLs
 * Some champions have special mappings or need formatting
 */
export function normalizeChampionName(championName: string): string {
  // Special cases where API name differs from image file name
  const nameMap: Record<string, string> = {
    Wukong: 'MonkeyKing',
    Fiddlesticks: 'FiddleSticks',
  };

  const normalized = nameMap[championName] || championName;

  // Remove any spaces and ensure proper casing
  return normalized.replace(/\s+/g, '');
}

/**
 * Get champion image URL from Data Dragon
 */
export function getChampionImageUrl(championName: string): string {
  const version = getGameVersion();
  const normalized = normalizeChampionName(championName);
  console.log(
    `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${normalized}.png`
  );
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${normalized}.png`;
}

export function getProfileIcon(profileIconId: number) {
  const version = getGameVersion();
  const playerIcon = `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${profileIconId}.png`;
  console.log(playerIcon);
  return playerIcon;
}

/**
 * Queue ID to human-readable queue name mapping
 * Based on Riot's official queue types
 */
const QUEUE_NAMES: Record<number, string> = {
  0: 'Custom',
  400: 'Normal Draft Pick',
  420: 'Ranked Solo/Duo',
  430: 'Normal Blind Pick',
  440: 'Ranked Flex',
  450: 'ARAM',
  700: 'Clash',
  830: 'Co-op vs. AI (Intro)',
  840: 'Co-op vs. AI (Beginner)',
  850: 'Co-op vs. AI (Intermediate)',
  900: 'ARURF',
  1020: 'One For All',
  1300: 'Nexus Blitz',
  1400: 'Ultimate Spellbook',
  1700: 'Arena',
  1900: 'Pick URF',
  // Add more as needed
};

/**
 * Get human-readable queue name from queue ID
 */
export function getQueueName(queueId: number): string {
  return QUEUE_NAMES[queueId] || `Queue ${queueId}`;
}

/**
 * Build the canonical player profile route path
 */
export function buildPlayerProfilePath(
  region: string,
  gameName: string,
  tagLine: string
): string {
  return `/player/${region}/${encodeURIComponent(
    gameName
  )}/${encodeURIComponent(tagLine)}`;
}

/**
 * Parse search inputs from a FormData. Supports either:
 * - separate fields: searchGameName, searchTagLine, searchRegion
 * - single combined query: searchQuery => "GameName#TAG"
 */
export function parseSearchInputs(
  formData: FormData,
  fallbackRegion?: string
): { region: string; gameName: string; tagLine: string } | { error: string } {
  const rawRegion =
    (formData.get('searchRegion') as string) || fallbackRegion || '';
  const rawGameName = (formData.get('searchGameName') as string) || '';
  const rawTagLine = (formData.get('searchTagLine') as string) || '';

  let region = String(rawRegion || '').trim();
  let gameName = String(rawGameName || '').trim();
  let tagLine = String(rawTagLine || '').trim();

  // If separate fields not provided, try parsing a single query like "Name#TAG"
  if (!gameName || !tagLine) {
    const query = (formData.get('searchQuery') as string) || '';
    const [qName, qTag] = String(query).split('#');
    if (!gameName && qName) gameName = qName.trim();
    if (!tagLine && qTag) tagLine = qTag.trim();
  }

  if (!region || !gameName || !tagLine) {
    return { error: 'Please fill in all fields' };
  }

  return { region, gameName, tagLine };
}

/**
 * Get ranked tier icon URL from local assets
 * Data Dragon API does not provide ranked tier icons, so we use local assets
 * Files are named: Rank=Iron.png, Rank=Bronze.png, etc.
 */
export function getTierIcon(tier: string): string {
  // Map tier to filename format
  // API returns: IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, MASTER, GRANDMASTER, CHALLENGER
  // Files are: Rank=Iron.png, Rank=Bronze.png, etc.
  const tierMap: Record<string, string> = {
    IRON: 'Iron',
    BRONZE: 'Bronze',
    SILVER: 'Silver',
    GOLD: 'Gold',
    PLATINUM: 'Platinum',
    EMERALD: 'Emerald',
    DIAMOND: 'Diamond',
    MASTER: 'Master',
    GRANDMASTER: 'Grandmaster', // Note: one word in filename
    CHALLENGER: 'Challenger',
  };

  const tierName = tierMap[tier.toUpperCase()] || tier;
  return `/ranked_icons/Rank=${tierName}.png`;
}

/**
 * Map queue type to queue IDs
 */
export function getQueueIdsForQueueType(
  queueType: 'ALL' | 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR'
): number[] | null {
  switch (queueType) {
    case 'RANKED_SOLO_5x5':
      return [420]; // Ranked Solo/Duo
    case 'RANKED_FLEX_SR':
      return [440]; // Ranked Flex
    case 'ALL':
    default:
      return null; // null means all queues
  }
}

/**
 * Filter matches by queue type
 */
export function filterMatchesByQueueType<T extends { queue_id: number }>(
  matches: T[],
  queueType: 'ALL' | 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR'
): T[] {
  if (queueType === 'ALL') {
    return matches;
  }

  const queueIds = getQueueIdsForQueueType(queueType);
  if (!queueIds) {
    return matches;
  }

  return matches.filter((match) => queueIds.includes(match.queue_id));
}

/**
 * Filter ranked stats by queue type
 */
export function filterRankedStatsByQueueType<T extends { queue_type: string }>(
  rankedStats: T[],
  queueType: 'ALL' | 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR'
): T[] {
  if (queueType === 'ALL') {
    return rankedStats;
  }

  return rankedStats.filter((stat) => stat.queue_type === queueType);
}
