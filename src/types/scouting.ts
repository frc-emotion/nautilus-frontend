/**
 * Scouting aggregation types
 */

export type LevelPoints = {
  L1: number;
  L2: number;
  L3: number;
  L4: number;
};

export type LevelPercentages = {
  L1: number;
  L2: number;
  L3: number;
  L4: number;
};

export type ClimbCounts = {
  PARK: number;
  SHALLOW_CAGE: number;
  DEEP_CAGE: number;
};

export type ClimbType = "PARK" | "SHALLOW_CAGE" | "DEEP_CAGE";

export type ScoutingSampleAuto = {
  coral: number[]; // [L1, L2, L3, L4]
  algae: number[]; // [ground, net]
};

export type ScoutingSampleTeleop = {
  coral: number[]; // [L1, L2, L3, L4]
  algae: number[]; // [ground, net]
};

export type ScoutingSample = {
  matchNumber: string;
  won: boolean | number; // 1=won, 0=tied, -1=lost, or boolean
  comments?: string;
  defensive?: boolean;
  brokeDown?: boolean;
  rankingPoints?: number;
  auto: ScoutingSampleAuto;
  teleop: ScoutingSampleTeleop;
  climb?: ClimbType;
  points: number;
};

export type TeamScoutingAggregation = {
  competition: string;
  teamNumber: string;
  matchesScouted: number;
  totalPoints: number;
  avgPpgScouted: number;
  levelPoints: LevelPoints;
  levelPct: LevelPercentages;
  climbCounts: ClimbCounts;
  samples: ScoutingSample[];
};

export type Competition = {
  label: string;
  value: string;
};
