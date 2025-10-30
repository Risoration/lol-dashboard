import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RiotApi } from './riot/api';

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

export function getProfileIcon(profileIconId: number) {
  const playerIcon = `https://ddragon.leagueoflegends.com/cdn/${process.env.GAME_VERSION}/img/profileicon/${profileIconId}.png`;
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
