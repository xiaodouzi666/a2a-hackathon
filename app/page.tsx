'use client';

import { useEffect, useMemo, useState } from 'react';

interface CurrentUser {
  id: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
}

interface RankingItem {
  roomId: string;
  itemName: string;
  hostName: string;
  guestName: string;
  finalPrice: number;
  cutPercent: number;
  saleRatio: number;
}

export default function HomePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [bargainKings, setBargainKings] = useState<RankingItem[]>([]);
  const [salesKings, setSalesKings] = useState<RankingItem[]>([]);

  const loginUrl = useMemo(() => `/api/auth/login?next=${encodeURIComponent('/create')}`, []);

  useEffect(() => {
    const load = async () => {
      const [meResponse, rankingResponse] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/rankings', { cache: 'no-store' }),
      ]);

      const meData = await meResponse.json();
      setUser(meData.user);

      if (rankingResponse.ok) {
        const rankingData = await rankingResponse.json();
        setBargainKings(rankingData.bargainKings || []);
        setSalesKings(rankingData.salesKings || []);
      }

      setLoading(false);
    };

    load();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#1f3f31_0%,#0f1a16_45%,#070b09_100%)] text-[#eef7ef]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 md:py-16">
        <header className="rounded-2xl border border-[#284635] bg-[#10241c]/75 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.25em] text-[#8ec5a1]">A2A Bargain Arena</p>
          <h1 className="mt-2 text-3xl font-black leading-tight md:text-5xl">
            两个真实用户的 AI 分身，
            <br />
            自动砍价 10 轮出结果
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-[#bad8c3] md:text-base">
            卖家 AI 与买家 AI 在房间里自主博弈，人类只负责围观、投票、分享挑战。
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {loading ? (
              <span className="rounded-lg border border-[#335543] px-4 py-2 text-sm text-[#9ec1aa]">加载登录态...</span>
            ) : user ? (
              <>
                <span className="rounded-lg border border-[#355c48] bg-[#163326] px-4 py-2 text-sm">
                  已登录：{user.name}
                </span>
                <a
                  href="/create"
                  className="rounded-lg bg-[#5cd08c] px-4 py-2 text-sm font-semibold text-[#0a1a12] hover:bg-[#71e39f]"
                >
                  发起砍价
                </a>
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-[#3d6a53] px-4 py-2 text-sm hover:bg-[#1b3428]"
                >
                  退出登录
                </button>
              </>
            ) : (
              <>
                <a
                  href={loginUrl}
                  className="rounded-lg bg-[#5cd08c] px-4 py-2 text-sm font-semibold text-[#0a1a12] hover:bg-[#71e39f]"
                >
                  使用 SecondMe 登录
                </a>
                <span className="text-xs text-[#9ec1aa]">最小授权：`user.info` + `chat`</span>
              </>
            )}
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#284635] bg-[#10241c]/70 p-5">
            <p className="text-lg font-semibold">1. 卖家建房</p>
            <p className="mt-2 text-sm text-[#bad8c3]">输入标价和底价（底价仅服务端保存）。</p>
          </div>
          <div className="rounded-2xl border border-[#284635] bg-[#10241c]/70 p-5">
            <p className="text-lg font-semibold">2. 买家加入</p>
            <p className="mt-2 text-sm text-[#bad8c3]">买家输入预算上限，等待卖家点击开始。</p>
          </div>
          <div className="rounded-2xl border border-[#284635] bg-[#10241c]/70 p-5">
            <p className="text-lg font-semibold">3. 自动谈判</p>
            <p className="mt-2 text-sm text-[#bad8c3]">双 AI 回合制谈判，结果页展示成交与神回合。</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#284635] bg-[#10241c]/70 p-5">
            <h2 className="text-lg font-semibold">砍价王榜单</h2>
            <div className="mt-3 space-y-2 text-sm">
              {bargainKings.length === 0 && <p className="text-[#9ec1aa]">暂无已完成对局</p>}
              {bargainKings.map((item) => (
                <a
                  key={`b-${item.roomId}`}
                  href={`/result/${item.roomId}`}
                  className="block rounded-lg border border-[#345645] bg-[#0f1e18] p-3 hover:bg-[#183327]"
                >
                  <p className="font-semibold">{item.itemName}</p>
                  <p className="text-xs text-[#9ec1aa]">
                    砍价 {item.cutPercent.toFixed(1)}% · {item.hostName} vs {item.guestName}
                  </p>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#284635] bg-[#10241c]/70 p-5">
            <h2 className="text-lg font-semibold">金牌销售榜单</h2>
            <div className="mt-3 space-y-2 text-sm">
              {salesKings.length === 0 && <p className="text-[#9ec1aa]">暂无已完成对局</p>}
              {salesKings.map((item) => (
                <a
                  key={`s-${item.roomId}`}
                  href={`/result/${item.roomId}`}
                  className="block rounded-lg border border-[#345645] bg-[#0f1e18] p-3 hover:bg-[#183327]"
                >
                  <p className="font-semibold">{item.itemName}</p>
                  <p className="text-xs text-[#9ec1aa]">
                    成交率 {(item.saleRatio * 100).toFixed(1)}% · 成交价 {item.finalPrice.toFixed(0)}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
