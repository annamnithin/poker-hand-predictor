import { PrismaClient } from '@prisma/client';
import { generateRecommendation } from '../lib/engine/recommend';
import type { HandScenarioInput } from '../lib/domain/types';

const prisma = new PrismaClient();

const DEMO_HANDS: HandScenarioInput[] = [
  {
    street: 'preflop',
    heroCards: ['Ah', 'Kd'],
    boardCards: [],
    totalPlayers: 6,
    heroPosition: 'CO',
    potSize: 1.5,
    amountToCall: 0,
    heroStack: 100,
    villainStack: 100,
    opponentsLeft: 4,
    opponents: [{ style: 'unknown' }, { style: 'unknown' }, { style: 'unknown' }, { style: 'unknown' }],
    actionHistory: [],
  },
  {
    street: 'preflop',
    heroCards: ['Jh', 'Jc'],
    boardCards: [],
    totalPlayers: 6,
    heroPosition: 'UTG',
    potSize: 1.5,
    amountToCall: 0,
    heroStack: 100,
    villainStack: 100,
    opponentsLeft: 5,
    opponents: [{ style: 'TAG' }, { style: 'unknown' }, { style: 'unknown' }, { style: 'unknown' }, { style: 'unknown' }],
    actionHistory: [],
  },
  {
    street: 'preflop',
    heroCards: ['9h', '8h'],
    boardCards: [],
    totalPlayers: 6,
    heroPosition: 'BTN',
    potSize: 7,
    amountToCall: 3,
    heroStack: 100,
    villainStack: 100,
    opponentsLeft: 1,
    opponents: [{ style: 'LAG' }],
    actionHistory: [
      { street: 'preflop', actorPosition: 'CO', action: 'raise', size: 3, orderIndex: 0 },
    ],
  },
  {
    street: 'flop',
    heroCards: ['As', 'Qh'],
    boardCards: ['Ks', 'Td', '2c'],
    totalPlayers: 6,
    heroPosition: 'BTN',
    potSize: 12,
    amountToCall: 6,
    heroStack: 94,
    villainStack: 88,
    opponentsLeft: 1,
    opponents: [{ style: 'TAG' }],
    actionHistory: [
      { street: 'preflop', actorPosition: 'CO', action: 'raise', size: 3, orderIndex: 0 },
      { street: 'preflop', actorPosition: 'BTN', action: 'call', size: 3, orderIndex: 1 },
      { street: 'flop', actorPosition: 'CO', action: 'bet', size: 6, orderIndex: 2 },
    ],
  },
  {
    street: 'flop',
    heroCards: ['7h', '6h'],
    boardCards: ['8h', '5d', '2h'],
    totalPlayers: 6,
    heroPosition: 'BB',
    potSize: 10,
    amountToCall: 5,
    heroStack: 95,
    villainStack: 90,
    opponentsLeft: 1,
    opponents: [{ style: 'tight-passive' }],
    actionHistory: [
      { street: 'preflop', actorPosition: 'BTN', action: 'raise', size: 3, orderIndex: 0 },
      { street: 'preflop', actorPosition: 'BB', action: 'call', size: 2, orderIndex: 1 },
      { street: 'flop', actorPosition: 'BTN', action: 'bet', size: 5, orderIndex: 2 },
    ],
  },
  {
    street: 'turn',
    heroCards: ['Kh', 'Qh'],
    boardCards: ['Jh', '9c', '3h', 'Ah'],
    totalPlayers: 6,
    heroPosition: 'CO',
    potSize: 24,
    amountToCall: 0,
    heroStack: 76,
    villainStack: 80,
    opponentsLeft: 1,
    opponents: [{ style: 'LAG' }],
    actionHistory: [
      { street: 'preflop', actorPosition: 'CO', action: 'raise', size: 3, orderIndex: 0 },
      { street: 'preflop', actorPosition: 'BB', action: 'call', size: 2, orderIndex: 1 },
      { street: 'flop', actorPosition: 'BB', action: 'check', size: 0, orderIndex: 2 },
      { street: 'flop', actorPosition: 'CO', action: 'bet', size: 5, orderIndex: 3 },
      { street: 'flop', actorPosition: 'BB', action: 'call', size: 5, orderIndex: 4 },
      { street: 'turn', actorPosition: 'BB', action: 'check', size: 0, orderIndex: 5 },
    ],
  },
  {
    street: 'river',
    heroCards: ['Ac', 'Tc'],
    boardCards: ['Kd', '8s', '4c', '2d', '7h'],
    totalPlayers: 6,
    heroPosition: 'BTN',
    potSize: 30,
    amountToCall: 15,
    heroStack: 55,
    villainStack: 40,
    opponentsLeft: 1,
    opponents: [{ style: 'loose-passive' }],
    actionHistory: [
      { street: 'preflop', actorPosition: 'BTN', action: 'raise', size: 3, orderIndex: 0 },
      { street: 'preflop', actorPosition: 'BB', action: 'call', size: 2, orderIndex: 1 },
      { street: 'flop', actorPosition: 'BB', action: 'check', size: 0, orderIndex: 2 },
      { street: 'flop', actorPosition: 'BTN', action: 'bet', size: 4, orderIndex: 3 },
      { street: 'flop', actorPosition: 'BB', action: 'call', size: 4, orderIndex: 4 },
      { street: 'turn', actorPosition: 'BB', action: 'check', size: 0, orderIndex: 5 },
      { street: 'turn', actorPosition: 'BTN', action: 'bet', size: 7, orderIndex: 6 },
      { street: 'turn', actorPosition: 'BB', action: 'call', size: 7, orderIndex: 7 },
      { street: 'river', actorPosition: 'BB', action: 'bet', size: 15, orderIndex: 8 },
    ],
  },
  {
    street: 'preflop',
    heroCards: ['5s', '5d'],
    boardCards: [],
    totalPlayers: 9,
    heroPosition: 'BB',
    potSize: 9,
    amountToCall: 6,
    heroStack: 40,
    villainStack: 45,
    opponentsLeft: 1,
    opponents: [{ style: 'TAG' }],
    actionHistory: [
      { street: 'preflop', actorPosition: 'UTG', action: 'raise', size: 3, orderIndex: 0 },
      { street: 'preflop', actorPosition: 'CO', action: '3-bet', size: 9, orderIndex: 1 },
    ],
  },
  {
    street: 'preflop',
    heroCards: ['Td', '9d'],
    boardCards: [],
    totalPlayers: 6,
    heroPosition: 'SB',
    potSize: 7,
    amountToCall: 2.5,
    heroStack: 100,
    villainStack: 100,
    opponentsLeft: 1,
    opponents: [{ style: 'unknown' }],
    actionHistory: [
      { street: 'preflop', actorPosition: 'BTN', action: 'raise', size: 3, orderIndex: 0 },
    ],
  },
  {
    street: 'flop',
    heroCards: ['Ad', 'Jd'],
    boardCards: ['Qd', '7d', '3s'],
    totalPlayers: 6,
    heroPosition: 'CO',
    potSize: 14,
    amountToCall: 0,
    heroStack: 90,
    villainStack: 86,
    opponentsLeft: 1,
    opponents: [{ style: 'TAG' }],
    actionHistory: [
      { street: 'preflop', actorPosition: 'CO', action: 'raise', size: 3, orderIndex: 0 },
      { street: 'preflop', actorPosition: 'BB', action: 'call', size: 2, orderIndex: 1 },
      { street: 'flop', actorPosition: 'BB', action: 'check', size: 0, orderIndex: 2 },
    ],
  },
];

async function seed() {
  console.log('Seeding database...');

  const user = await prisma.user.upsert({
    where: { id: 'default-user' },
    update: {},
    create: { id: 'default-user', name: 'Default Player' },
  });
  console.log('Created user:', user.name);

  for (let i = 0; i < DEMO_HANDS.length; i++) {
    const input = DEMO_HANDS[i];
    const recommendation = generateRecommendation(input);

    await prisma.handScenario.create({
      data: {
        userId: user.id,
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
    });
    console.log(`Seeded hand ${i + 1}/${DEMO_HANDS.length}: ${input.heroCards.join('')} on ${input.street}`);
  }

  console.log('Seeding complete!');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
