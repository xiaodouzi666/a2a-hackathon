'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface RoomUser {
  id: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
}

interface RoomMessage {
  id: string;
  sender: 'SELLER' | 'BUYER';
  content: string;
  priceOffer: number | null;
  round: number;
  createdAt: string;
}

interface RoomData {
  id: string;
  itemName: string;
  description: string | null;
  listPrice: number;
  finalPrice: number | null;
  status: 'WAITING' | 'READY' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
  host: RoomUser;
  guest: RoomUser | null;
  messages: RoomMessage[];
  sellerVotes: number;
  buyerVotes: number;
  myVote: 'SELLER' | 'BUYER' | null;
  viewerRole: 'SELLER' | 'BUYER' | 'SPECTATOR';
  canJoin: boolean;
  canStart: boolean;
  isParticipant: boolean;
}

interface CurrentUser {
  id: string;
  name: string;
}

function Avatar({ name, tone }: { name: string; tone: string }) {
  const letter = name?.trim()?.charAt(0)?.toUpperCase() || '?';
  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${tone}`}
      aria-label={name}
    >
      {letter}
    </span>
  );
}

function StatusBadge({ status }: { status: RoomData['status'] }) {
  const styleMap: Record<RoomData['status'], string> = {
    WAITING: 'bg-slate-700 text-slate-200',
    READY: 'bg-amber-600/80 text-amber-100',
    ACTIVE: 'bg-emerald-600/80 text-emerald-100',
    COMPLETED: 'bg-sky-600/80 text-sky-100',
    FAILED: 'bg-rose-600/80 text-rose-100',
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styleMap[status]}`}>{status}</span>;
}

export default function RoomPage({ params }: { params: { id: string } }) {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState('');
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);

  const turnBusyRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const roomStatus = room?.status;
  const messageCount = room?.messages.length ?? 0;

  const loginUrl = useMemo(
    () => `/api/auth/login?next=${encodeURIComponent(`/room/${params.id}`)}`,
    [params.id],
  );

  const roomUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/room/${params.id}`;
  }, [params.id]);

  const fetchRoom = useCallback(async () => {
    const response = await fetch(`/api/rooms/${params.id}`, { cache: 'no-store' });
    if (!response.ok) {
      setError('房间不存在或暂时不可用');
      return;
    }
    const data = await response.json();
    setRoom(data.room);
  }, [params.id]);

  const fetchMe = useCallback(async () => {
    const response = await fetch('/api/auth/me', { cache: 'no-store' });
    const data = await response.json();
    setMe(data.user);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      await Promise.all([fetchRoom(), fetchMe()]);
      setLoading(false);
    };

    bootstrap();
  }, [fetchMe, fetchRoom]);

  useEffect(() => {
    if (!roomStatus) return;
    if (roomStatus === 'COMPLETED' || roomStatus === 'FAILED') return;

    const interval = setInterval(() => {
      fetchRoom();
    }, 1500);

    return () => clearInterval(interval);
  }, [fetchRoom, roomStatus]);

  useEffect(() => {
    if (roomStatus !== 'ACTIVE') return;

    const timer = setTimeout(async () => {
      if (turnBusyRef.current) return;
      turnBusyRef.current = true;
      try {
        await fetch(`/api/rooms/${params.id}/turn`, { method: 'POST' });
      } finally {
        turnBusyRef.current = false;
        await fetchRoom();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [fetchRoom, messageCount, params.id, roomStatus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageCount]);

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!me) {
      window.location.href = loginUrl;
      return;
    }

    setJoining(true);
    const response = await fetch(`/api/rooms/${params.id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxPrice: Number(maxPrice) }),
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.error || '加入失败');
      setJoining(false);
      return;
    }

    setMaxPrice('');
    await fetchRoom();
    setJoining(false);
  };

  const handleStart = async () => {
    setStarting(true);
    const response = await fetch(`/api/rooms/${params.id}/start`, { method: 'POST' });
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || '开始失败');
      setStarting(false);
      return;
    }

    await fetchRoom();
    setStarting(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-200">加载房间中...</div>;
  }

  if (!room) {
    return <div className="p-8 text-center text-rose-300">{error || '房间不存在'}</div>;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Room {room.id.slice(0, 8)}</p>
              <h1 className="text-2xl font-bold">{room.itemName}</h1>
              <p className="mt-1 text-sm text-slate-400">标价：{room.listPrice.toFixed(0)}</p>
            </div>
            <StatusBadge status={room.status} />
          </div>
          {room.description && <p className="mt-3 text-sm text-slate-300">{room.description}</p>}

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => navigator.clipboard.writeText(roomUrl)}
              className="rounded-lg border border-slate-600 px-3 py-1 hover:bg-slate-800"
            >
              复制挑战链接
            </button>
            <a href="/create" className="rounded-lg border border-slate-600 px-3 py-1 hover:bg-slate-800">
              再开一局
            </a>
            {(room.status === 'COMPLETED' || room.status === 'FAILED') && (
              <a href={`/result/${room.id}`} className="rounded-lg border border-emerald-500 px-3 py-1 text-emerald-300">
                查看结果页
              </a>
            )}
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center gap-3">
              <Avatar name={room.host.name} tone="bg-sky-700/70 text-sky-100" />
              <div>
                <p className="text-sm text-slate-400">卖家</p>
                <p className="font-semibold">{room.host.name}</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            {room.guest ? (
              <div className="flex items-center gap-3">
                <Avatar name={room.guest.name} tone="bg-violet-700/70 text-violet-100" />
                <div>
                  <p className="text-sm text-slate-400">买家</p>
                  <p className="font-semibold">{room.guest.name}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">等待买家加入...</p>
            )}
          </article>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          {!me && (
            <div className="rounded-lg border border-amber-600/50 bg-amber-900/20 p-3 text-sm text-amber-200">
              你当前是游客，可围观。若要加入或投票，请先
              <a href={loginUrl} className="ml-1 underline">
                SecondMe 登录
              </a>
              。
            </div>
          )}

          {room.canJoin && (
            <form onSubmit={handleJoin} className="mt-4 grid gap-3">
              <input
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                type="number"
                min="1"
                required
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-emerald-500"
                placeholder="输入买家预算上限（保密）"
              />
              <button
                disabled={joining}
                className="justify-self-start rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60"
              >
                {joining ? '加入中...' : '作为买家加入'}
              </button>
            </form>
          )}

          {room.status === 'READY' && room.canStart && (
            <button
              onClick={handleStart}
              disabled={starting}
              className="mt-4 rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60"
            >
              {starting ? '启动中...' : '开始砍价'}
            </button>
          )}

          {room.status === 'READY' && !room.canStart && room.guest && (
            <p className="mt-4 text-sm text-slate-300">买家已就位，等待卖家点击“开始砍价”。</p>
          )}

          {room.status === 'ACTIVE' && (
            <p className="mt-4 text-sm text-emerald-300">
              AI 自动谈判进行中（第 {Math.min(room.messages.length + 1, 10)} 轮 / 10）...
            </p>
          )}

          {(room.status === 'COMPLETED' || room.status === 'FAILED') && (
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-sm">
              {room.status === 'COMPLETED'
                ? `已成交，成交价 ${room.finalPrice?.toFixed(0)}。`
                : '10 轮内未达成一致，本局流拍。'}
              <a href={`/result/${room.id}`} className="ml-2 text-emerald-300 underline">
                打开结果页
              </a>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold">A2A 砍价回合</h2>
          <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {room.messages.length === 0 && <p className="text-sm text-slate-400">尚未开始，等待首轮报价。</p>}

            {room.messages.map((message) => (
              <article
                key={message.id}
                className={`rounded-xl border p-3 ${
                  message.sender === 'SELLER'
                    ? 'border-sky-800/80 bg-sky-900/20'
                    : 'border-violet-800/80 bg-violet-900/20'
                }`}
              >
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold">{message.sender === 'SELLER' ? '卖家 AI' : '买家 AI'} · 第 {message.round} 轮</span>
                  <span>{message.priceOffer ? `报价 ${message.priceOffer.toFixed(0)}` : '无报价'}</span>
                </div>
                <p className="text-sm text-slate-200">{message.content}</p>
              </article>
            ))}
            <div ref={bottomRef} />
          </div>
        </section>
      </div>
    </main>
  );
}
