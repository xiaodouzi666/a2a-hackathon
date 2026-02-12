import { redirect } from 'next/navigation';

export default function LegacyRoomPage({ params }: { params: { id: string } }) {
  redirect(`/room/${params.id}`);
}
