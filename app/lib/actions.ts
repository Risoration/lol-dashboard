/**
 * Central export file for all server actions
 *
 * Usage in components:
 * import { linkSummoner, getStatsOverview } from '@/lib/actions';
 */

// Summoner actions
export {
  linkSummoner,
  refreshSummonerData,
  getSummonerById,
  getUserSummoners,
} from './actions/summoner-actions';

// Stats actions
export {
  getStatsOverview,
  getChampionStats,
  getMatchHistory,
  getRankedStats,
} from './actions/stats-actions';

// Auth actions
export {
  signUp,
  signIn,
  getSession,
  getUser,
  signOut,
} from './actions/auth-actions';

// Public actions
export { searchPlayer } from './actions/public-actions';
