import { Message } from '@prisma/client';

export const MAX_NEGOTIATION_ROUNDS = 10;
export type AgentRole = 'SELLER' | 'BUYER';

export interface ParsedAgentReply {
  price: number;
  say: string;
  raw: string;
}

export function parseAgentReply(rawText: string, fallbackPrice: number): ParsedAgentReply {
  const priceMatch = rawText.match(/PRICE:\s*(-?\d+(?:\.\d+)?)/i);
  const sayMatch = rawText.match(/SAY:\s*([\s\S]+)/i);

  const parsedPrice = priceMatch ? Number(priceMatch[1]) : NaN;
  const safePrice = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : fallbackPrice;

  const extractedSay = sayMatch?.[1]?.trim();
  const fallbackSay = rawText
    .replace(/PRICE:\s*-?\d+(?:\.\d+)?/gi, '')
    .replace(/SAY:\s*/gi, '')
    .trim();

  return {
    price: safePrice,
    say: extractedSay || fallbackSay || '...',
    raw: rawText.trim(),
  };
}

export function roleLabel(role: AgentRole): 'seller' | 'buyer' {
  return role === 'SELLER' ? 'seller' : 'buyer';
}

export function hasRoleSpoken(messages: Message[], role: AgentRole): boolean {
  return messages.some((message) => message.sender === role);
}

export function buildSellerSystemPrompt(input: {
  sellerName: string;
  itemName: string;
  description?: string | null;
  listPrice: number;
  minPrice: number;
}) {
  return [
    `You are ${input.sellerName}'s AI proxy, acting as the SELLER for item "${input.itemName}".`,
    input.description ? `Item detail: ${input.description}` : 'Item detail: Not provided.',
    `Listed price: ${input.listPrice}. Hidden floor price: ${input.minPrice}. Never reveal the floor price.`,
    'Goal: close the deal at the highest possible price while staying realistic.',
    'Negotiate in short replies and adapt by round. You have at most 10 rounds total in this room.',
    'Output MUST be exactly two lines:',
    'PRICE: <number>',
    'SAY: <one concise sentence>',
  ].join('\n');
}

export function buildBuyerSystemPrompt(input: {
  buyerName: string;
  itemName: string;
  description?: string | null;
  maxPrice: number;
}) {
  return [
    `You are ${input.buyerName}'s AI proxy, acting as the BUYER for item "${input.itemName}".`,
    input.description ? `Item detail: ${input.description}` : 'Item detail: Not provided.',
    `Hidden max budget: ${input.maxPrice}. Never reveal the max budget.`,
    'Goal: close the deal at the lowest possible price without exceeding your budget.',
    'Use progressive concessions: probe first, then controlled concessions, then final offer if needed.',
    'Output MUST be exactly two lines:',
    'PRICE: <number>',
    'SAY: <one concise sentence>',
  ].join('\n');
}

export function buildTurnUserPrompt(input: {
  isFirstTurn: boolean;
  lastPrice: number;
  lastMessage: string;
  round: number;
}) {
  if (input.isFirstTurn) {
    return 'Start negotiation now. Provide your opening offer.';
  }

  return [
    `Round: ${input.round}.`,
    `Counterparty previous offer: ${input.lastPrice}.`,
    `Counterparty previous statement: ${input.lastMessage}`,
    'Respond now with your next offer.',
  ].join('\n');
}

export function buildHighlights(params: {
  messages: Message[];
  listPrice: number;
  finalPrice: number | null;
  status: string;
}) {
  const { messages, listPrice, finalPrice, status } = params;
  if (messages.length === 0) return [];

  const highlights: string[] = [];

  const opener = messages[0];
  if (opener.priceOffer && (opener.sender === 'SELLER' || opener.sender === 'BUYER')) {
    highlights.push(`第 ${opener.round} 轮开场锚定：${roleLabel(opener.sender)} 先报 ${opener.priceOffer.toFixed(0)}。`);
  }

  let biggestShift: { round: number; sender: AgentRole; delta: number } | null = null;
  const previousByRole: Partial<Record<AgentRole, number>> = {};
  for (let i = 0; i < messages.length; i += 1) {
    const curr = messages[i];
    if (curr.sender !== 'SELLER' && curr.sender !== 'BUYER') continue;
    if (!curr.priceOffer) continue;

    const previous = previousByRole[curr.sender];
    previousByRole[curr.sender] = curr.priceOffer;
    if (typeof previous !== 'number') continue;

    const delta = Math.abs(curr.priceOffer - previous);
    if (!biggestShift || delta > biggestShift.delta) {
      biggestShift = { round: curr.round, sender: curr.sender, delta };
    }
  }

  if (biggestShift && biggestShift.delta > 0) {
    highlights.push(`第 ${biggestShift.round} 轮关键让步：${roleLabel(biggestShift.sender)} 调整了 ${biggestShift.delta.toFixed(0)}。`);
  }

  if (status === 'COMPLETED' && finalPrice) {
    const cut = listPrice > 0 ? Math.max(0, ((listPrice - finalPrice) / listPrice) * 100) : 0;
    highlights.push(`最终成交 ${finalPrice.toFixed(0)}，较标价下探 ${cut.toFixed(1)}%。`);
  } else if (status === 'FAILED') {
    const last = messages[messages.length - 1];
    if (last.priceOffer) {
      highlights.push(`第 ${last.round} 轮后仍未重叠，最后报价为 ${last.priceOffer.toFixed(0)}，本局流拍。`);
    }
  }

  return highlights.slice(0, 3);
}
