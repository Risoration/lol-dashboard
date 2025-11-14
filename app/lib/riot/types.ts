/**
 * Riot Games API Type Definitions
 * Based on official Riot API documentation
 */

// ============================================================================
// Common Types
// ============================================================================

export type Region =
  | 'NA1'
  | 'EUW1'
  | 'KR'
  | 'BR1'
  | 'LAN1'
  | 'LAS1'
  | 'EUN1'
  | 'TR1'
  | 'RU'
  | 'JP1'
  | 'OC1';
export function getRegionalEndpoint(region: Region): string {
  const regionMap: Record<Region, string> = {
    NA1: 'americas',
    EUW1: 'europe',
    KR: 'asia',
    BR1: 'americas',
    LAN1: 'americas',
    LAS1: 'americas',
    EUN1: 'europe',
    TR1: 'europe',
    RU: 'europe',
    JP1: 'asia',
    OC1: 'asia',
  };
  return regionMap[region];
}
export type Tier =
  | 'IRON'
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'EMERALD'
  | 'DIAMOND'
  | 'MASTER'
  | 'GRANDMASTER'
  | 'CHALLENGER';
export type Rank = 'I' | 'II' | 'III' | 'IV';
export type QueueType = 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR' | 'ARAM';
export type Role = 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY' | 'NONE';
export type TeamPosition =
  | 'TOP'
  | 'JUNGLE'
  | 'MIDDLE'
  | 'BOTTOM'
  | 'UTILITY'
  | 'NONE';

// ============================================================================
// Account Types (ACCOUNT-V1)
// ============================================================================

export interface AccountDto {
  /** Encrypted PUUID */
  puuid: string;
  /** Game name (the part before #) */
  gameName: string;
  /** Tag line (the part after #) */
  tagLine: string;
}

// ============================================================================
// Summoner Types (SUMMONER-V4)
// ============================================================================

export interface SummonerDto {
  /** Encrypted summoner ID */
  id: string;
  /** Encrypted account ID (legacy) */
  accountId: string;
  /** Encrypted PUUID */
  puuid: string;
  /** Profile icon ID */
  profileIconId: number;
  /** Summoner level */
  summonerLevel: number;
  /** Date summoner was last modified (Unix timestamp in milliseconds) */
  revisionDate: number;
}

// ============================================================================
// League/ ranked Types
// ============================================================================

export interface LeagueEntryDto {
  /** League ID */
  leagueId: string;
  /** Summoner ID */
  summonerId: string;
  /** Player's league name */
  summonerName: string;
  /** Queue type */
  queueType: QueueType;
  /** Rank tier */
  tier: Tier;
  /** Rank division */
  rank: Rank;
  /** Current LP */
  leaguePoints: number;
  /** Wins */
  wins: number;
  /** Losses */
  losses: number;
  /** Is hot streak */
  hotStreak: boolean;
  /** Is veteran */
  veteran: boolean;
  /** Is fresh blood */
  freshBlood: boolean;
  /** Is inactive */
  inactive: boolean;
}

// ============================================================================
// Match Types
// ============================================================================

export interface MatchDto {
  metadata: MetadataDto;
  info: InfoDto;
}

export interface MetadataDto {
  /** Match data version */
  dataVersion: string;
  /** Match ID */
  matchId: string;
  /** Participant PUUIDs */
  participants: string[];
}

export interface InfoDto {
  /** Unix timestamp for when the game is created on the game server */
  gameCreation: number;
  /** Game duration in seconds */
  gameDuration: number;
  /** Unix timestamp for when match ends */
  gameEndTimestamp?: number;
  /** Game ID */
  gameId: number;
  /** Game mode */
  gameMode: string;
  /** Game name */
  gameName: string;
  /** Unix timestamp for when the game started */
  gameStartTimestamp: number;
  /** Game type */
  gameType: string;
  /** Queue ID */
  queueId: number;
  /** Game version */
  gameVersion: string;
  /** Map ID */
  mapId: number;
  /** Platform ID */
  platformId: string;
  /** Tournament code used to generate the match */
  tournamentCode?: string;
  /** Participants in the match */
  participants: ParticipantDto[];
  /** Teams in the match */
  teams: TeamDto[];
}

export interface ParticipantDto {
  /** Participant's team side */
  teamId: 100 | 200;
  /** Champion ID */
  championId: number;
  /** Champion name */
  championName: string;
  /** Champion transform (for Kayn) */
  championTransform?: number;
  /** Participant's individual level */
  champLevel: number;
  /** First summoner spell ID */
  summoner1Id: number;
  /** Second summoner spell ID */
  summoner2Id: number;
  /** Encrypted PUUID */
  puuid: string;
  /** Summoner name */
  summonerName: string;
  /** Encrypted summoner ID */
  summonerId: string;
  /** Summoner Icons */
  profileIcon: number;
  /** Rune tree ID for primary */
  perks: PerksDto;
  /** Individual position */
  individualPosition: TeamPosition;
  /** Team position */
  teamPosition: TeamPosition;
  /** Participant's role */
  role: Role;
  /** Win status */
  win: boolean;
  /** Kills */
  kills: number;
  /** Deaths */
  deaths: number;
  /** Assists */
  assists: number;
  /** Total damage dealt to champions */
  totalDamageDealtToChampions: number;
  /** Damage dealt to turrets */
  damageDealtToTurrets: number;
  /** Physical damage dealt */
  physicalDamageDealtToChampions: number;
  /** Magic damage dealt */
  magicDamageDealtToChampions: number;
  /** True damage dealt */
  trueDamageDealtToChampions: number;
  /** Total damage dealt */
  totalDamageDealt: number;
  /** Largest single critical strike */
  largestCriticalStrike: number;
  /** Total damage taken */
  totalDamageTaken: number;
  /** Damage self mitigated */
  damageSelfMitigated: number;
  /** Total heal and shield */
  totalHeal: number;
  /** Total units healed */
  totalUnitsHealed: number;
  /** Damage dealt to objectives */
  damageDealtToObjectives: number;
  /** Time CC'd other players */
  timeCCingOthers: number;
  /** Total damage dealt to structures */
  damageDealtToBuildings: number;
  /** Total gold spent */
  goldSpent: number;
  /** Total gold earned */
  goldEarned: number;
  /** Gold per minute */
  goldPerMinute: number;
  /** Total minions and monsters killed */
  totalMinionsKilled: number;
  /** Neutral minions killed */
  neutralMinionsKilled: number;
  /** Neutral minions killed in team's jungle */
  neutralMinionsKilledInTeamJungle: number;
  /** Neutral minions killed in enemy's jungle */
  neutralMinionsKilledInEnemyJungle: number;
  /** Total time crowd controlled */
  totalTimeCCDealt: number;
  /** Time of buying the first item */
  timePlayed: number;
  /** Total champion kills */
  totalAllyJungleMinionsKilled: number;
  /** Total enemy jungle minions killed */
  totalEnemyJungleMinionsKilled: number;
  /** Vision score */
  visionScore: number;
  /** Vision wards bought */
  visionWardsBoughtInGame: number;
  /** Control wards placed */
  detectorWardsPlaced: number;
  /** Wards placed */
  wardsPlaced: number;
  /** Wards killed */
  wardsKilled: number;
  /** First blood */
  firstBloodKill: boolean;
  /** First blood assist */
  firstBloodAssist: boolean;
  /** First tower kill */
  firstTowerKill: boolean;
  /** First tower assist */
  firstTowerAssist: boolean;
  /** First inhibitor kill */
  firstInhibitorKill: boolean;
  /** First inhibitor assist */
  firstInhibitorAssist: boolean;
  /** First Herald kill */
  firstBaronKill: boolean;
  /** First Baron assist */
  firstBaronAssist: boolean;
  /** First Dragon kill */
  firstDragonKill: boolean;
  /** First Dragon assist */
  firstDragonAssist: boolean;
  /** Items purchased */
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  /** Items sold */
  itemsPurchased: number;
  /** Killing spree */
  killingSprees: number;
  /** Largest killing spree */
  largestKillingSpree: number;
  /** Largest multi kill */
  largestMultiKill: number;
  /** Longest time spent living */
  longestTimeSpentLiving: number;
  /** Double kills */
  doubleKills: number;
  /** Triple kills */
  tripleKills: number;
  /** Quadra kills */
  quadraKills: number;
  /** Penta kills */
  pentaKills: number;
  /** Total damage shielded */
  totalDamageShieldedOnTeammates: number;
  /** Total damage shielded from teammates */
  totalDamageShieldedSelf: number;
  /** Total damage taken */
  totalHealsOnTeammates: number;
  /** Total heals */
  totalHealsSelf: number;
  /** Objective stollen */
  objectivesStolen: number;
  /** Jungle stolen */
  objectivesStolenAssists: number;
  /** Turret takedowns */
  turretTakedowns: number;
  /** Unreal kills */
  unrealKills: number;
}

export interface PerksDto {
  /** Primary rune tree */
  styles: PerkStyleDto[];
  /** Stat perks */
  statPerks: PerkStatsDto;
}

export interface PerkStyleDto {
  /** Style description */
  description: string;
  /** Selected perk IDs */
  selections: PerkSelectionDto[];
  /** Style ID */
  style: number;
}

export interface PerkSelectionDto {
  /** Perk ID */
  perk: number;
  /** ID of the first var */
  var1: number;
  /** ID of the second var */
  var2: number;
  /** ID of the third var */
  var3: number;
}

export interface PerkStatsDto {
  /** Defense stat */
  defense: number;
  /** Flex stat */
  flex: number;
  /** Offense stat */
  offense: number;
}

export interface TeamDto {
  /** Team ID (100 = blue, 200 = red) */
  teamId: 100 | 200;
  /** Win status */
  win: boolean;
  /** Team objectives */
  objectives: ObjectivesDto;
}

export interface ObjectivesDto {
  /** Baron objective */
  baron: ObjectiveDto;
  /** Champion objective */
  champion: ObjectiveDto;
  /** Dragon objective */
  dragon: ObjectiveDto;
  /** Inhibitor objective */
  inhibitor: ObjectiveDto;
  /** Rift Herald objective */
  riftHerald: ObjectiveDto;
  /** Tower objective */
  tower: ObjectiveDto;
}

export interface ObjectiveDto {
  /** Objective status */
  first: boolean;
  kills: number;
}

// ============================================================================
// Champion Types (for our database)
// ============================================================================

export interface ChampionDto {
  id: number;
  name: string;
  key: string; // Used in game data dragon
}

// ============================================================================
// Helper Types for Processing
// ============================================================================

export interface ProcessedMatchData {
  matchId: string;
  gameCreation: number;
  gameDuration: number;
  queueId: number;
  championId: number;
  championName: string;
  role: Role;
  teamPosition: TeamPosition;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number; // total minions killed
  goldEarned: number;
  damageDealt: number;
  visionScore: number;
  opponentChampionId?: number;
  opponentChampionName?: string;
}

export interface AggregatedChampionStats {
  championId: number;
  championName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  assists: number;
  avgKDA: string; // e.g., "2.35"
  winRate: number; // 0-100
}

export interface AggregatedMatchupStats {
  playerChampionId: number;
  playerChampionName: string;
  opponentChampionId: number;
  opponentChampionName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
}
