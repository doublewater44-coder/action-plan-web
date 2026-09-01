'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import QuoteBox from '@/components/QuoteBox';

const TabProgress = dynamic(() => import('@/components/TabProgress'), { ssr: false });
const TabSettings = dynamic(() => import('@/components/TabSettings'), { ssr: false });
const TabDaily = dynamic(() => import('@/components/TabDaily'), { ssr: false });
const TabWeekly = dynamic(() => import('@/components/TabWeekly'), { ssr: false });

type Tab = 'progress' | 'settings' | 'daily' | 'weekly';

type Goal = { id: number; name: string; description?: string; deadline?: string };
type Action = { id: number; goal_id: number; name: string; target_count: number; unit: string; period: string; deadline?: string; goal_name: string };
type Totals = { totals: Record<number, number>; weekTotals: Record<number, number>; today: Record<number, { count: number; note: string }>; chart: Array<{ action_id: number; progress_date: string; count: number; note: string }> };
type Reflection = { id: number; goal_id: number; week_start: string; good_points: string; bad_points: string; next_goal: string; score: number };
type Achievement = { id: number; goal_id: number; name: string; description?: string; deadline?: string; achieved_at: string };

const TABS: { key: Tab; label: string }[] = [
  { key: 'progress', label: '📊 進捗状況' },
  { key: 'settings', label: '📋 設定' },
  { key: 'daily', label: '✅ 日次入力' },
  { key: 'weekly', label: '📝 週次振り返り' },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('progress');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [totals, setTotals] = useState<Totals>({ totals: {}, weekTotals: {}, today: {}, chart: [] });
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [qualitative, setQualitative] = useState('');
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showWeeklyPopup, setShowWeeklyPopup] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) {
        const text = await res.text();
        setFetchError(`API エラー: ${text.slice(0, 200)}`);
        setLoading(false);
        return;
      }
      const d = await res.json();
      setGoals(d.goals ?? []);
      setActions(d.actions ?? []);
      setTotals({
        totals: d.totals ?? {},
        weekTotals: d.weekTotals ?? {},
        today: d.today ?? {},
        chart: d.chart ?? [],
      });
      setQualitative(d.qualitative ?? '');
      setReflections(d.reflections ?? []);
      setAchievements(d.achievements ?? []);
      setFetchError(null);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
    const day = new Date(today + 'T00:00:00').getDay();
    const dismissed = sessionStorage.getItem('weeklyPopupDismissed');
    if (day === 0 && !dismissed) setShowWeeklyPopup(true);
  }, []);

  function dismissWeeklyPopup(goToWeekly = false) {
    sessionStorage.setItem('weeklyPopupDismissed', '1');
    setShowWeeklyPopup(false);
    if (goToWeekly) setActiveTab('weekly');
  }

  async function handleAchieve(goalId: number, achievedAt: string) {
    await fetch(`/api/goals/${goalId}/achieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ achievedAt }),
    });
    fetchAll();
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex border-b border-gray-200 mb-4 -mx-4 px-4 bg-white sticky top-[53px] z-10 gap-2">
          {['w-24', 'w-16', 'w-24', 'w-28'].map((w, i) => (
            <div key={i} className={`${w} h-10 my-1.5 rounded bg-gray-200`} />
          ))}
        </div>
        <div className="rounded-xl bg-gray-100 h-16 mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-4 mb-3">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-full mb-2" />
            <div className="h-2 bg-gray-200 rounded-full w-full" />
          </div>
        ))}
        <div className="rounded-xl bg-gray-100 h-48 mt-2" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-4 mt-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 whitespace-pre-wrap">
        <div className="font-bold mb-1">データ読み込みエラー</div>
        {fetchError}
      </div>
    );
  }

  return (
    <div>
      {/* 日曜ポップアップ */}
      {showWeeklyPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-4xl text-center mb-3">📝</div>
            <h2 className="text-lg font-bold text-center text-gray-800 mb-2">週次振り返りをしましょう！</h2>
            <p className="text-sm text-gray-500 text-center mb-6">今週を振り返って、来週につなげましょう。</p>
            <div className="flex gap-3">
              <button
                onClick={() => dismissWeeklyPopup(true)}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700"
              >
                振り返りへ →
              </button>
              <button
                onClick={() => dismissWeeklyPopup(false)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                後で
              </button>
            </div>
          </div>
        </div>
      )}

      {/* タブナビ */}
      <div className="flex border-b border-gray-200 mb-4 -mx-4 px-4 bg-white sticky top-[53px] z-10 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 名言ボックス（保存後に表示） */}
      {quote && (
        <div onClick={() => setQuote(null)} className="cursor-pointer">
          <QuoteBox text={quote.text} author={quote.author} />
        </div>
      )}

      {/* タブコンテンツ */}
      {activeTab === 'progress' && (
        <TabProgress
          goals={goals}
          actions={actions}
          totals={totals}
          chart={totals.chart}
          reflections={reflections}
          qualitative={qualitative}
          achievements={achievements}
          onRefresh={fetchAll}
          onSaved={setQuote}
          onAchieve={handleAchieve}
        />
      )}

      {activeTab === 'settings' && (
        <TabSettings goals={goals} actions={actions} onRefresh={fetchAll} />
      )}

      {activeTab === 'daily' && (
        <TabDaily
          actions={actions}
          onSaved={(q) => { setQuote(q); fetchAll(); }}
        />
      )}

      {activeTab === 'weekly' && (
        <TabWeekly
          goals={goals}
          actions={actions}
          reflections={reflections}
          weekTotals={totals.weekTotals}
          onRefresh={fetchAll}
        />
      )}
    </div>
  );
}
