import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

    try {
    const body = await request.json();
    const maxPrice = Number(body.maxPrice);

    if (!Number.isFinite(maxPrice) || maxPrice <= 0) {
      return NextResponse.json({ error: 'Invalid maxPrice' }, { status: 400 });
    }

    const existingRoom = await prisma.room.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        hostId: true,
        guestId: true,
        status: true,
      },
    });

    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (existingRoom.hostId === userId) {
      return NextResponse.json({ error: 'Host cannot join as buyer' }, { status: 400 });
    }

    if (existingRoom.status === 'WAITING') {
      // continue
    } else if (existingRoom.status === 'READY' && existingRoom.guestId === userId) {
      // Same buyer may update their hidden max price before seller starts.
    } else {
      return NextResponse.json({ error: 'Room is not joinable in current status' }, { status: 400 });
    }

    const room = await prisma.room.update({
      where: { id: params.id },
      data: {
        guestId: userId,
        maxPrice,
        status: 'READY',
      },
    });

    return NextResponse.json({ room });
  } catch (error) {
    console.error('Join room error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
