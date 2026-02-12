'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

interface CurrentUser {
  id: string;
  name: string;
  avatar?: string | null;
}

export default function CreateRoomPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  const roomLink = useMemo(() => {
    if (!roomId || typeof window === 'undefined') return '';
    return `${window.location.origin}/room/${roomId}`;
  }, [roomId]);

  useEffect(() => {
    const loadUser = async () => {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await response.json();
      setUser(data.user);
      setLoadingUser(false);
    };

    loadUser();
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      itemName: formData.get('itemName'),
      description: formData.get('description'),
      listPrice: Number(formData.get('listPrice')),
      minPrice: Number(formData.get('minPrice')),
    };

    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || '创建失败');
      setSubmitting(false);
      return;
    }

    setRoomId(data.room.id);
    setSubmitting(false);
  };

  if (loadingUser) {
    return <div className="p-6 text-center text-sm text-slate-200">加载登录态...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto mt-24 max-w-lg rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-slate-100">
        <h1 className="text-2xl font-bold">创建砍价房间前需要登录</h1>
        <p className="mt-3 text-sm text-slate-400">请先完成 SecondMe OAuth，再创建房间并分享链接给买家。</p>
        <a
          href={`/api/auth/login?next=${encodeURIComponent('/create')}`}
          className="mt-6 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          立即登录
        </a>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1.2fr,1fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h1 className="text-2xl font-bold">卖家建房</h1>
          <p className="mt-2 text-sm text-slate-400">底价仅保存在服务端，不会暴露给买家 AI。</p>

          <form onSubmit={handleCreate} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-300">物品名称</label>
              <input
                name="itemName"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-emerald-500"
                placeholder="例如：Sony WH-1000XM5"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">描述</label>
              <textarea
                name="description"
                className="h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-emerald-500"
                placeholder="成色、配件、购买时间..."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-300">标价</label>
                <input
                  name="listPrice"
                  type="number"
                  min="1"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-rose-300">最低可接受价（保密）</label>
                <input
                  name="minPrice"
                  type="number"
                  min="1"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-rose-400"
                />
              </div>
            </div>

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60"
            >
              {submitting ? '创建中...' : '创建房间'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold">邀请买家</h2>
          {!roomId ? (
            <p className="mt-3 text-sm text-slate-400">创建成功后，这里会出现房间链接。</p>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-emerald-300">房间已创建：{roomId}</p>
              <textarea
                readOnly
                value={roomLink}
                className="h-20 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
              />
              <button
                onClick={() => navigator.clipboard.writeText(roomLink)}
                className="w-full rounded-lg border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-300"
              >
                复制邀请链接
              </button>
              <a
                href={`/room/${roomId}`}
                className="block w-full rounded-lg bg-slate-100 px-4 py-2 text-center text-sm font-semibold text-slate-900"
              >
                进入房间
              </a>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
