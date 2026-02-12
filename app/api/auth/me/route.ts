import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

export async function GET() {
    const userId = getSessionUserId();

    if (!userId) {
        return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, avatar: true, bio: true },
    });

    return NextResponse.json({ user });
}
