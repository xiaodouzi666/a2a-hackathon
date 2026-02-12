import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const voteFor = body.voteFor;

  if (voteFor !== 'SELLER' && voteFor !== 'BUYER') {
    return NextResponse.json({ error: 'voteFor must be SELLER or BUYER' }, { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      status: true,
    },
  });

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (room.status !== 'COMPLETED' && room.status !== 'FAILED') {
    return NextResponse.json({ error: 'Voting opens after negotiation ends' }, { status: 400 });
  }

  await prisma.vote.upsert({
    where: {
      roomId_voterId: {
        roomId: room.id,
        voterId: userId,
      },
    },
    update: {
      voteFor,
    },
    create: {
      roomId: room.id,
      voterId: userId,
      voteFor,
    },
  });

  const [sellerVotes, buyerVotes] = await Promise.all([
    prisma.vote.count({ where: { roomId: room.id, voteFor: 'SELLER' } }),
    prisma.vote.count({ where: { roomId: room.id, voteFor: 'BUYER' } }),
  ]);

  return NextResponse.json({ sellerVotes, buyerVotes, myVote: voteFor });
}
