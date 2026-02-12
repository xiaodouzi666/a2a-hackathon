'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();
  const [value, setValue] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = value.trim();
    if (!normalized) return;

    const roomId = normalized.includes('/')
      ? normalized.split('/').filter(Boolean).pop()
      : normalized;

    if (!roomId) return;
    router.push(`/room/${roomId}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
        <h1 className="text-2xl font-bold">加入砍价房间</h1>
        <p className="mt-2 text-sm text-slate-400">粘贴邀请链接或房间 ID。</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-emerald-500"
            placeholder="https://your-domain.com/room/xxxx 或 xxxx"
          />
          <button className="w-full rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950">进入房间</button>
        </form>
      </div>
    </main>
  );
}
