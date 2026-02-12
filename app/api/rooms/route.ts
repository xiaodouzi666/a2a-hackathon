import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

export async function POST(request: NextRequest) {
  const userId = getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const itemName = String(body.itemName ?? '').trim();
    const description = String(body.description ?? '').trim();
    const listPrice = Number(body.listPrice);
    const minPrice = Number(body.minPrice);

    if (!itemName) {
      return NextResponse.json({ error: 'itemName is required' }, { status: 400 });
    }

    if (!Number.isFinite(listPrice) || !Number.isFinite(minPrice) || listPrice <= 0 || minPrice <= 0) {
      return NextResponse.json({ error: 'Invalid listPrice/minPrice' }, { status: 400 });
    }

    if (minPrice > listPrice) {
      return NextResponse.json({ error: 'minPrice cannot exceed listPrice' }, { status: 400 });
    }

    const room = await prisma.room.create({
      data: {
        hostId: userId,
        itemName,
        description: description || null,
        listPrice,
        minPrice,
        status: 'WAITING',
      },
    });

    return NextResponse.json({ room });
  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
