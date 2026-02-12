import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  AgentRole,
  MAX_NEGOTIATION_ROUNDS,
  buildBuyerSystemPrompt,
  buildSellerSystemPrompt,
  buildTurnUserPrompt,
  hasRoleSpoken,
  parseAgentReply,
} from '@/lib/negotiation';
import { getValidUserAccessToken, streamSecondMeChat } from '@/lib/mindos';

function clampOffer(params: {
  sender: AgentRole;
  offer: number;
  minPrice: number;
  maxPrice: number | null;
  fallback: number;
}) {
  const base = Number.isFinite(params.offer) && params.offer > 0 ? params.offer : params.fallback;

  if (params.sender === 'SELLER') {
    return Math.max(base, params.minPrice);
  }

  if (params.maxPrice) {
    return Math.min(base, params.maxPrice);
  }

  return base;
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const roomId = params.id;

  const lock = await prisma.room.updateMany({
    where: {
      id: roomId,
      status: 'ACTIVE',
      isProcessing: false,
    },
    data: {
      isProcessing: true,
    },
  });

  if (lock.count === 0) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { status: true, finalPrice: true },
    });
    return NextResponse.json({ status: room?.status ?? 'NOT_FOUND', finalPrice: room?.finalPrice ?? null });
  }

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        host: true,
        guest: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!room || !room.guest) {
      if (room) {
        await prisma.room.update({
          where: { id: roomId },
          data: { isProcessing: false },
        });
      }
      return NextResponse.json({ error: 'Room not ready' }, { status: 400 });
    }

    const round = room.messages.length + 1;
    if (round > MAX_NEGOTIATION_ROUNDS) {
      await prisma.room.update({
        where: { id: roomId },
        data: { status: 'FAILED', isProcessing: false },
      });
      return NextResponse.json({ roomStatus: 'FAILED', round: MAX_NEGOTIATION_ROUNDS });
    }

    const isSellerTurn = room.messages.length % 2 === 0;
    const sender: AgentRole = isSellerTurn ? 'SELLER' : 'BUYER';
    const actor = isSellerTurn ? room.host : room.guest;

    const lastMessage = room.messages[room.messages.length - 1] ?? null;
    const fallbackPrice = isSellerTurn
      ? Math.max(room.minPrice, lastMessage?.priceOffer ?? room.listPrice)
      : Math.min(room.maxPrice ?? room.listPrice, lastMessage?.priceOffer ?? room.listPrice);

    const sellerSessionId = room.sellerSessionId ?? `${room.id}-seller`;
    const buyerSessionId = room.buyerSessionId ?? `${room.id}-buyer`;
    const sessionId = isSellerTurn ? sellerSessionId : buyerSessionId;

    const systemPrompt = hasRoleSpoken(room.messages, sender)
      ? undefined
      : isSellerTurn
        ? buildSellerSystemPrompt({
            sellerName: room.host.name,
            itemName: room.itemName,
            description: room.description,
            listPrice: room.listPrice,
            minPrice: room.minPrice,
          })
        : buildBuyerSystemPrompt({
            buyerName: room.guest.name,
            itemName: room.itemName,
            description: room.description,
            maxPrice: room.maxPrice ?? room.listPrice,
          });

    const userPrompt = buildTurnUserPrompt({
      isFirstTurn: room.messages.length === 0,
      round,
      lastPrice: lastMessage?.priceOffer ?? room.listPrice,
      lastMessage: lastMessage?.content ?? 'No previous message',
    });

    const accessToken = await getValidUserAccessToken(actor.id);
    const rawReply = await streamSecondMeChat({
      accessToken,
      sessionId,
      userPrompt,
      systemPrompt,
    });

    const parsed = parseAgentReply(rawReply, fallbackPrice);
    const priceOffer = clampOffer({
      sender,
      offer: parsed.price,
      minPrice: room.minPrice,
      maxPrice: room.maxPrice,
      fallback: fallbackPrice,
    });

    const message = await prisma.message.create({
      data: {
        roomId,
        sender,
        content: parsed.say,
        priceOffer,
        round,
      },
    });

    let roomStatus: 'ACTIVE' | 'COMPLETED' | 'FAILED' = 'ACTIVE';
    let finalPrice: number | null = null;

    if (sender === 'BUYER') {
      const sellerAsk = lastMessage?.priceOffer ?? null;
      const buyerOffer = priceOffer;
      if (sellerAsk !== null && buyerOffer >= sellerAsk) {
        roomStatus = 'COMPLETED';
        finalPrice = sellerAsk;
      }
    } else {
      const buyerOffer = lastMessage?.priceOffer ?? null;
      const sellerAsk = priceOffer;
      if (buyerOffer !== null && buyerOffer >= sellerAsk) {
        roomStatus = 'COMPLETED';
        finalPrice = sellerAsk;
      }
    }

    if (roomStatus === 'ACTIVE' && round >= MAX_NEGOTIATION_ROUNDS) {
      roomStatus = 'FAILED';
    }

    await prisma.room.update({
      where: { id: roomId },
      data: {
        status: roomStatus,
        finalPrice,
        sellerSessionId,
        buyerSessionId,
        isProcessing: false,
      },
    });

    return NextResponse.json({
      status: 'OK',
      roomStatus,
      round,
      message,
      finalPrice,
    });
  } catch (error) {
    console.error('Turn execution failed:', error);

    await prisma.room.update({
      where: { id: roomId },
      data: { isProcessing: false },
    });

    return NextResponse.json({ error: 'Turn failed' }, { status: 500 });
  }
}
