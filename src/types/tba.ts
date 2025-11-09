/**
 * TBA (The Blue Alliance) API types
 */

export type TbaRecord = {
  wins: number;
  losses: number;
  ties: number;
  winratePct: number;
};

export type TbaRanking = {
  rank: number;
  rp?: number | null;
  dq?: number | null;
};

export type TbaEventSummary = {
  eventKey: string;
  teamNumber: string;
  teamName?: string | null;
  matchesPlayed?: number | null;
  record?: TbaRecord | null;
  opr?: number | null;
  dpr?: number | null;
  ccwm?: number | null;
  ranking?: TbaRanking | null;
};
