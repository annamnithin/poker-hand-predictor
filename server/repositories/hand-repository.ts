import { prisma } from '@/server/db/prisma';
import type { HandScenarioInput, RecommendationResult } from '@/lib/domain/types';

// ============================================================
// HAND REPOSITORY — CRUD operations for hand scenarios
// ============================================================

const DEFAULT_USER_ID = 'default-user';

/** Ensure a default user exists (for MVP single-user mode) */
export async function ensureDefaultUser() {
  const existing = await prisma.user.findUnique({ where: { id: DEFAULT_USER_ID } });
  if (!existing) {
    await prisma.user.create({
      data: { id: DEFAULT_USER_ID, name: 'Default Player' },
    });
  }
  return DEFAULT_USER_ID;
}

/** Save a hand scenario and its recommendation */
export async function saveHandWithRecommendation(
  input: HandScenarioInput,
  recommendation: RecommendationResult
) {
  const userId = await ensureDefaultUser();

  const hand = await prisma.handScenario.create({
    data: {
      userId,
      street: input.street,
      heroCards: input.heroCards,
      boardCards: input.boardCards,
      totalPlayers: input.totalPlayers,
      heroPosition: input.heroPosition,
      potSize: input.potSize,
      amountToCall: input.amountToCall,
      heroStack: input.heroStack,
      villainStack: input.villainStack,
      opponentsLeft: input.opponentsLeft,
      opponents: input.opponents as any,
      actionHistory: input.actionHistory as any,
      recommendation: {
        create: {
          recommendedAction: recommendation.ev.bestAction,
          raiseSizing: recommendation.ev.bestRaiseSizing,
          evFold: recommendation.ev.evFold,
          evCall: recommendation.ev.evCall,
          evRaise: recommendation.ev.evRaise,
          confidence: recommendation.confidence,
          explanation: recommendation.explanation,
          breakdown: recommendation.breakdown as any,
          abstractionNode: recommendation.abstractionNode,
          mappingQuality: recommendation.mappingQuality,
        },
      },
    },
    include: { recommendation: true },
  });

  return hand;
}

/** List all saved hands with pagination */
export async function listHands(options?: {
  street?: string;
  position?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  if (options?.street) where.street = options.street;
  if (options?.position) where.heroPosition = options.position;
  if (options?.action) {
    where.recommendation = { recommendedAction: options.action };
  }

  const hands = await prisma.handScenario.findMany({
    where,
    include: { recommendation: true },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  });

  return hands;
}

/** Get a single hand with its recommendation */
export async function getHand(id: string) {
  return prisma.handScenario.findUnique({
    where: { id },
    include: { recommendation: true },
  });
}

/** Delete a hand */
export async function deleteHand(id: string) {
  return prisma.handScenario.delete({ where: { id } });
}

/** Get or update user settings */
export async function getUserSettings() {
  const userId = await ensureDefaultUser();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.settings ?? {};
}

export async function updateUserSettings(settings: Record<string, any>) {
  const userId = await ensureDefaultUser();
  return prisma.user.update({
    where: { id: userId },
    data: { settings },
  });
}
