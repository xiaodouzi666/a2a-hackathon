import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';
import { buildHighlights } from '@/lib/negotiation';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const userId = getSessionUserId();

  const room = await prisma.room.findUnique({
    where: { id: params.id },
    include: {
      host: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      guest: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      votes: {
        select: {
          voterId: true,
          voteFor: true,
        },
      },
    },
  });

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const sellerVotes = room.votes.filter((vote) => vote.voteFor === 'SELLER').length;
  const buyerVotes = room.votes.filter((vote) => vote.voteFor === 'BUYER').length;
  const myVote = userId ? room.votes.find((vote) => vote.voterId === userId)?.voteFor ?? null : null;

  const highlights = buildHighlights({
    messages: room.messages,
    listPrice: room.listPrice,
    finalPrice: room.finalPrice,
    status: room.status,
  });

  const cutPercent = room.finalPrice
    ? Math.max(0, ((room.listPrice - room.finalPrice) / room.listPrice) * 100)
    : null;

  const publicRoom = {
    id: room.id,
    hostId: room.hostId,
    guestId: room.guestId,
    itemName: room.itemName,
    description: room.description,
    listPrice: room.listPrice,
    finalPrice: room.finalPrice,
    status: room.status,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    host: room.host,
    guest: room.guest,
    messages: room.messages,
  };

  return NextResponse.json({
    room: publicRoom,
    highlights,
    cutPercent,
    sellerVotes,
    buyerVotes,
    myVote,
    canVote: Boolean(userId),
  });
}
