// ============================================================
// DOMAIN TYPES — Core poker primitives and app-wide contracts
// ============================================================

// --- Card primitives ---

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
export type Rank = (typeof RANKS)[number];

export const SUITS = ['h', 'd', 'c', 's'] as const;
export type Suit = (typeof SUITS)[number];

/** A card is a two-character string like "Ah", "Ts", "2c" */
export type Card = `${Rank}${Suit}`;

/** Build the full 52-card deck at module load */
export const FULL_DECK: Card[] = RANKS.flatMap((r) =>
  SUITS.map((s) => `${r}${s}` as Card)
);

// --- Street ---

export const STREETS = ['preflop', 'flop', 'turn', 'river'] as const;
export type Street = (typeof STREETS)[number];

/** How many board cards should exist per street */
export const BOARD_CARD_COUNT: Record<Street, number> = {
  preflop: 0,
  flop: 3,
  turn: 4,
  river: 5,
};

// --- Position ---

export const POSITIONS = ['UTG', 'UTG+1', 'UTG+2', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;
export type Position = (typeof POSITIONS)[number];

/** Canonical positional advantage ordering (higher = better position) */
export const POSITION_VALUE: Record<Position, number> = {
  UTG: 1,
  'UTG+1': 2,
  'UTG+2': 3,
  MP: 4,
  HJ: 5,
  CO: 6,
  BTN: 7,
  SB: 8, // acts last preflop but first postflop — treated as moderate
  BB: 0, // worst postflop position but closes preflop action
};

// --- Actions ---

export const ACTION_TYPES = [
  'fold',
  'check',
  'call',
  'bet',
  'raise',
  'limp',
  '3-bet',
  '4-bet',
  'c-bet',
  'check-raise',
  'all-in',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export interface ActionHistoryEntry {
  street: Street;
  actorPosition: Position;
  action: ActionType;
  size: number; // 0 for check/fold
  orderIndex: number;
}

// --- Player Style ---

export const PLAYER_STYLES = ['TAG', 'LAG', 'tight-passive', 'loose-passive', 'unknown'] as const;
export type PlayerStyle = (typeof PLAYER_STYLES)[number];

// --- Tendency Overrides ---

export const TENDENCY_LABELS = ['loose', 'tight', 'aggressive', 'passive'] as const;
export type TendencyLabel = (typeof TENDENCY_LABELS)[number];

// --- Opponent Profile ---

export interface OpponentProfile {
  style: PlayerStyle;
  range?: string;             // optional explicit range label like "top15%"
  tendencyOverrides?: TendencyLabel[];
}

// --- Hand Scenario Input (what the user enters) ---

export interface HandScenarioInput {
  street: Street;
  heroCards: [Card, Card];
  boardCards: Card[];
  totalPlayers: number;       // 2-9
  heroPosition: Position;
  potSize: number;
  amountToCall: number;
  heroStack: number;
  villainStack: number;
  opponentsLeft: number;
  actionHistory: ActionHistoryEntry[];
  opponents: OpponentProfile[]; // one entry per active opponent (length === opponentsLeft)
}

// --- Normalized / Abstracted Scenario ---

export interface NormalizedScenario {
  street: Street;
  heroCards: [Card, Card];
  boardCards: Card[];
  heroPosition: Position;
  effectiveStackBB: number;
  potSizeBB: number;
  amountToCallBB: number;
  /** Mapped to nearest effective stack bucket */
  stackBucket: EffectiveStackBucket;
  /** Mapped action line for lookup */
  actionLine: string;
  opponentStyle: PlayerStyle;
  opponentsLeft: number;
}

// --- Abstraction Buckets ---

export const EFFECTIVE_STACK_BUCKETS = [20, 40, 60, 100, 150] as const;
export type EffectiveStackBucket = (typeof EFFECTIVE_STACK_BUCKETS)[number];

export const BET_SIZE_BUCKETS = [0.25, 0.33, 0.5, 0.66, 0.75, 1.0] as const;
export type BetSizeBucket = (typeof BET_SIZE_BUCKETS)[number];

// --- Sizing Presets ---

export interface SizingPreset {
  label: string;
  fraction: number; // fraction of pot
}

export const DEFAULT_SIZING_PRESETS: SizingPreset[] = [
  { label: '25% pot', fraction: 0.25 },
  { label: '33% pot', fraction: 0.33 },
  { label: '50% pot', fraction: 0.5 },
  { label: '66% pot', fraction: 0.66 },
  { label: '75% pot', fraction: 0.75 },
  { label: '100% pot', fraction: 1.0 },
];

// --- EV and Recommendation Results ---

export interface EVResult {
  evFold: number;
  evCall: number;
  evRaise: number;
  evCheck: number;
  evBet: number;
  bestAction: 'fold' | 'call' | 'raise' | 'check' | 'bet';
  bestRaiseSizing: number | null; // absolute chips
  bestRaiseFraction: number | null; // as pot fraction
  bestBetSizing: number | null;
  bestBetFraction: number | null;
}

export interface RecommendationResult {
  ev: EVResult;
  confidence: number;           // 0-100
  explanation: string;          // plain English
  abstractionNode: string | null;
  mappingQuality: number;       // 0-1
  breakdown: EVBreakdown;
  gtoContext?: GTOContext;       // rich GTO analysis
}

export interface EVBreakdown {
  potOdds: number;              // as percentage, e.g. 25.0
  heroEquity: number;           // estimated equity vs villain range, e.g. 55.0
  equityRealizationFactor: number;
  foldEquity: number;           // estimated fold equity for raises
  villainContinueRange: string; // descriptive label
  notes: string[];
}

// --- GTO Context (rich postflop/preflop analysis) ---

export interface GTOContext {
  spr: number;
  sprCategory: 'micro' | 'low' | 'medium' | 'deep';
  isIP: boolean;
  handDescription: string;      // e.g. "Top pair, ace kicker"
  handCategory: string;         // 'monster' | 'strong' | 'medium' | 'weak-made' | 'draw-heavy' | 'air'
  draws: Array<{
    type: string;
    description: string;
    outs: number;
    equity: number;
  }>;
  boardTexture?: {
    wetness: string;
    flushTexture: string;
    connectedness: string;
    pairStructure: string;
    description: string;
  };
  exploitLabel?: string;
  exploitReasoning?: string;
  gtoFrequency?: number;        // 0-1, how often GTO plays this action
}

// --- Range Data Format ---

export interface RangeEntry {
  /** Canonical hand notation, e.g. "AKs", "QJo", "TT" */
  hand: string;
  /** Frequency this hand takes the action (0 to 1) */
  frequency: number;
}

export interface RangeDefinition {
  id: string;
  label: string;
  position: Position;
  street: Street;
  actionLine: string;    // e.g. "open", "vs-3bet", "c-bet-call"
  stackBucket: EffectiveStackBucket;
  hands: RangeEntry[];
}

// --- User Settings ---

export interface UserSettings {
  displayUnit: 'chips' | 'bb';
  defaultStack: number;
  darkMode: boolean;
  sizingPresets: SizingPreset[];
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  displayUnit: 'chips',
  defaultStack: 100,
  darkMode: false,
  sizingPresets: DEFAULT_SIZING_PRESETS,
};
