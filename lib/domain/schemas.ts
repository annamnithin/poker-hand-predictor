import { z } from 'zod';
import { RANKS, SUITS, STREETS, POSITIONS, ACTION_TYPES, PLAYER_STYLES, TENDENCY_LABELS } from './types';

// --- Card ---
const rankEnum = z.enum(RANKS);
const suitEnum = z.enum(SUITS);

/** Card is a 2-char string: rank + suit */
export const CardSchema = z
  .string()
  .length(2)
  .refine(
    (val) => {
      const r = val[0] as any;
      const s = val[1] as any;
      return RANKS.includes(r) && SUITS.includes(s);
    },
    { message: 'Invalid card format. Use rank+suit like "Ah", "Ts"' }
  );

// --- Street ---
export const StreetSchema = z.enum(STREETS);

// --- Position ---
export const PositionSchema = z.enum(POSITIONS);

// --- Action Type ---
export const ActionTypeSchema = z.enum(ACTION_TYPES);

// --- Player Style ---
export const PlayerStyleSchema = z.enum(PLAYER_STYLES);

// --- Tendency Label ---
export const TendencyLabelSchema = z.enum(TENDENCY_LABELS);

// --- Action History Entry ---
export const ActionHistoryEntrySchema = z.object({
  street: StreetSchema,
  actorPosition: PositionSchema,
  action: ActionTypeSchema,
  size: z.number().min(0),
  orderIndex: z.number().int().min(0),
});

// --- Full Hand Scenario Input ---
export const HandScenarioInputSchema = z
  .object({
    street: StreetSchema,
    heroCards: z.tuple([CardSchema, CardSchema]),
    boardCards: z.array(CardSchema),
    totalPlayers: z.number().int().min(2).max(9),
    heroPosition: PositionSchema,
    potSize: z.number().positive(),
    amountToCall: z.number().min(0),
    heroStack: z.number().positive(),
    villainStack: z.number().positive(),
    opponentsLeft: z.number().int().min(1).max(8),
    actionHistory: z.array(ActionHistoryEntrySchema),
    opponentStyle: PlayerStyleSchema,
    opponentRange: z.string().optional(),
    tendencyOverrides: z.array(TendencyLabelSchema).optional(),
  })
  .superRefine((data, ctx) => {
    // Board card count must match street
    const expectedBoardCards: Record<string, number> = {
      preflop: 0,
      flop: 3,
      turn: 4,
      river: 5,
    };
    if (data.boardCards.length !== expectedBoardCards[data.street]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Street "${data.street}" requires exactly ${expectedBoardCards[data.street]} board cards, got ${data.boardCards.length}`,
        path: ['boardCards'],
      });
    }

    // No duplicate cards across hero + board
    const allCards = [...data.heroCards, ...data.boardCards];
    const unique = new Set(allCards);
    if (unique.size !== allCards.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate cards detected between hero cards and board cards',
        path: ['heroCards'],
      });
    }

    // Opponents left can't exceed total players - 1
    if (data.opponentsLeft >= data.totalPlayers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Opponents left must be less than total players',
        path: ['opponentsLeft'],
      });
    }

    // Amount to call can't exceed hero stack
    if (data.amountToCall > data.heroStack) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Amount to call cannot exceed hero stack',
        path: ['amountToCall'],
      });
    }
  });

// --- User Settings ---
export const UserSettingsSchema = z.object({
  displayUnit: z.enum(['chips', 'bb']),
  defaultStack: z.number().positive(),
  darkMode: z.boolean(),
  sizingPresets: z.array(
    z.object({
      label: z.string(),
      fraction: z.number().min(0).max(5), // allow up to 5x pot overbet
    })
  ),
});
