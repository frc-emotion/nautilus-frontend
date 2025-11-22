/**
 * TypeScript types for Advanced OPR Analytics
 */

export type TeamOprMetrics = {
  total_points_opr: number;
  total_notes_opr: number;
  total_note_points_opr: number;
  auto_notes_opr: number;
  teleop_notes_opr: number;
  amp_notes_opr: number;
  speaker_notes_opr: number;
  amplified_notes_opr: number;
  endgame_points_opr: number;
};

export type AdvancedOprResponse = {
  event: string;
  team_metrics: Record<string, TeamOprMetrics>;
};

/**
 * Flattened team data for table display
 */
export type TeamOprRow = {
  teamNumber: string;
} & TeamOprMetrics;

/**
 * Metric configuration for charts and display
 */
export type OprMetricConfig = {
  key: keyof TeamOprMetrics;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
};

/**
 * Available OPR metrics with display configuration
 */
export const OPR_METRICS: OprMetricConfig[] = [
  {
    key: 'total_points_opr',
    label: 'Total Points OPR',
    shortLabel: 'Points',
    color: '#3B82F6',
    description: 'Overall offensive contribution'
  },
  {
    key: 'total_notes_opr',
    label: 'Total Notes OPR',
    shortLabel: 'Notes',
    color: '#8B5CF6',
    description: 'Total game pieces scored'
  },
  {
    key: 'auto_notes_opr',
    label: 'Auto Notes OPR',
    shortLabel: 'Auto',
    color: '#10B981',
    description: 'Autonomous period notes'
  },
  {
    key: 'teleop_notes_opr',
    label: 'Teleop Notes OPR',
    shortLabel: 'Teleop',
    color: '#F59E0B',
    description: 'Teleoperated period notes'
  },
  {
    key: 'speaker_notes_opr',
    label: 'Speaker Notes OPR',
    shortLabel: 'Speaker',
    color: '#EF4444',
    description: 'Notes scored in speaker'
  },
  {
    key: 'amp_notes_opr',
    label: 'Amp Notes OPR',
    shortLabel: 'Amp',
    color: '#06B6D4',
    description: 'Notes scored in amp'
  },
  {
    key: 'amplified_notes_opr',
    label: 'Amplified Notes OPR',
    shortLabel: 'Amplified',
    color: '#EC4899',
    description: 'Amplified speaker notes'
  },
  {
    key: 'endgame_points_opr',
    label: 'Endgame Points OPR',
    shortLabel: 'Endgame',
    color: '#6366F1',
    description: 'Endgame scoring contribution'
  },
];
