import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const userId = getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const room = await prisma.room.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      hostId: true,
      guestId: true,
      status: true,
    },
  });

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (room.hostId !== userId) {
    return NextResponse.json({ error: 'Only seller can start negotiation' }, { status: 403 });
  }

  if (!room.guestId) {
    return NextResponse.json({ error: 'Buyer has not joined yet' }, { status: 400 });
  }

  if (room.status !== 'READY') {
    return NextResponse.json({ error: `Room cannot start from status ${room.status}` }, { status: 400 });
  }

  const updated = await prisma.room.update({
    where: { id: params.id },
    data: {
      status: 'ACTIVE',
      isProcessing: false,
      finalPrice: null,
    },
  });

  return NextResponse.json({ room: updated });
}
