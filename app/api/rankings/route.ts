import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const rooms = await prisma.room.findMany({
    where: {
      status: 'COMPLETED',
      finalPrice: {
        not: null,
      },
    },
    include: {
      host: {
        select: {
          id: true,
          name: true,
        },
      },
      guest: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 100,
  });

  const enriched = rooms
    .filter((room) => room.finalPrice && room.listPrice > 0)
    .map((room) => {
      const finalPrice = room.finalPrice!;
      const cutPercent = ((room.listPrice - finalPrice) / room.listPrice) * 100;
      const saleRatio = finalPrice / room.listPrice;
      return {
        roomId: room.id,
        itemName: room.itemName,
        hostName: room.host.name,
        guestName: room.guest?.name ?? 'Unknown',
        listPrice: room.listPrice,
        finalPrice,
        cutPercent,
        saleRatio,
      };
    });

  const bargainKings = [...enriched]
    .sort((a, b) => b.cutPercent - a.cutPercent)
    .slice(0, 5);

  const salesKings = [...enriched]
    .sort((a, b) => b.saleRatio - a.saleRatio)
    .slice(0, 5);

  return NextResponse.json({ bargainKings, salesKings });
}
