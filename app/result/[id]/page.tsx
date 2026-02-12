'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface ResultUser {
  id: string;
  name: string;
  avatar?: string | null;
}

interface ResultMessage {
  id: string;
  sender: 'SELLER' | 'BUYER';
  content: string;
  priceOffer: number | null;
  round: number;
}

interface ResultRoom {
  id: string;
  itemName: string;
  listPrice: number;
  finalPrice: number | null;
  status: 'WAITING' | 'READY' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
  host: ResultUser;
  guest: ResultUser | null;
  messages: ResultMessage[];
}

interface ResultPayload {
  room: ResultRoom;
  highlights: string[];
  cutPercent: number | null;
  sellerVotes: number;
  buyerVotes: number;
  myVote: 'SELLER' | 'BUYER' | null;
  canVote: boolean;
}

interface CurrentUser {
  id: string;
  name: string;
}

export default function ResultPage({ params }: { params: { id: string } }) {
  const [payload, setPayload] = useState<ResultPayload | null>(null);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const loginUrl = useMemo(
    () => `/api/auth/login?next=${encodeURIComponent(`/result/${params.id}`)}`,
    [params.id],
  );

  const roomLink = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/room/${params.id}`;
  }, [params.id]);

  const load = useCallback(async () => {
    const [resultResponse, meResponse] = await Promise.all([
      fetch(`/api/rooms/${params.id}/result`, { cache: 'no-store' }),
      fetch('/api/auth/me', { cache: 'no-store' }),
    ]);

    if (!resultResponse.ok) {
      setPayload(null);
      setLoading(false);
      return;
    }

    const resultData = await resultResponse.json();
    const meData = await meResponse.json();

    setPayload(resultData);
    setMe(meData.user);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!payload) return;
    if (payload.room.status === 'COMPLETED' || payload.room.status === 'FAILED') return;

    const timer = setInterval(load, 1500);
    return () => clearInterval(timer);
  }, [load, payload]);

  const handleVote = async (voteFor: 'SELLER' | 'BUYER') => {
    if (!me) {
      window.location.href = loginUrl;
      return;
    }

    if (!payload) return;

    setVoting(true);
    const response = await fetch(`/api/rooms/${params.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voteFor }),
    });

    if (response.ok) {
      const voteData = await response.json();
      setPayload({
        ...payload,
        sellerVotes: voteData.sellerVotes,
        buyerVotes: voteData.buyerVotes,
        myVote: voteData.myVote,
      });
    }

    setVoting(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-200">加载结果中...</div>;
  }

  if (!payload) {
    return <div className="p-8 text-center text-rose-300">结果不存在</div>;
  }

  const { room } = payload;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Result</p>
          <h1 className="mt-1 text-3xl font-black">{room.itemName}</h1>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-xs text-slate-400">结果</p>
              <p className="mt-1 text-lg font-semibold">
                {room.status === 'COMPLETED' ? '成交' : room.status === 'FAILED' ? '流拍' : room.status}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-xs text-slate-400">成交价</p>
              <p className="mt-1 text-lg font-semibold">{room.finalPrice ? room.finalPrice.toFixed(0) : '--'}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-xs text-slate-400">砍价幅度</p>
              <p className="mt-1 text-lg font-semibold">{payload.cutPercent !== null ? `${payload.cutPercent.toFixed(1)}%` : '--'}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => navigator.clipboard.writeText(roomLink)}
              className="rounded-lg border border-slate-600 px-3 py-1 hover:bg-slate-800"
            >
              复制挑战链接
            </button>
            <a href={`/room/${room.id}`} className="rounded-lg border border-slate-600 px-3 py-1 hover:bg-slate-800">
              回到房间
            </a>
            <a href="/create" className="rounded-lg border border-emerald-500 px-3 py-1 text-emerald-300">
              再来一局
            </a>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold">神回合摘要</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {payload.highlights.length === 0 && <li>暂无摘要。</li>}
            {payload.highlights.map((highlight, index) => (
              <li key={`${highlight}-${index}`} className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
                {highlight}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold">围观投票：谁更会砍价？</h2>
          {!me && (
            <p className="mt-3 text-sm text-slate-300">
              登录后可投票：
              <a href={loginUrl} className="ml-1 underline">
                SecondMe 登录
              </a>
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              disabled={voting}
              onClick={() => handleVote('SELLER')}
              className={`rounded-lg border px-4 py-3 text-left ${
                payload.myVote === 'SELLER' ? 'border-sky-400 bg-sky-900/30' : 'border-slate-700 bg-slate-950/70'
              }`}
            >
              <p className="font-semibold">卖家 AI</p>
              <p className="mt-1 text-sm text-slate-300">{payload.sellerVotes} 票</p>
            </button>
            <button
              disabled={voting}
              onClick={() => handleVote('BUYER')}
              className={`rounded-lg border px-4 py-3 text-left ${
                payload.myVote === 'BUYER' ? 'border-violet-400 bg-violet-900/30' : 'border-slate-700 bg-slate-950/70'
              }`}
            >
              <p className="font-semibold">买家 AI</p>
              <p className="mt-1 text-sm text-slate-300">{payload.buyerVotes} 票</p>
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold">完整回合记录</h2>
          <div className="mt-3 space-y-2">
            {room.messages.map((message) => (
              <article key={message.id} className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{message.sender === 'SELLER' ? '卖家 AI' : '买家 AI'} · 第 {message.round} 轮</span>
                  <span>{message.priceOffer ? `报价 ${message.priceOffer.toFixed(0)}` : '无报价'}</span>
                </div>
                <p>{message.content}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
