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
  const [qualitative, setQualitative] = useState('');
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [gRes, aRes, tRes, sRes] = await Promise.all([
      fetch('/api/goals'),
      fetch('/api/actions'),
      fetch('/api/progress/totals'),
      fetch('/api/settings?key=qualitative_goal'),
    ]);
    const [g, a, t, s] = await Promise.all([gRes.json(), aRes.json(), tRes.json(), sRes.json()]);
    setGoals(Array.isArray(g) ? g : []);
    setActions(Array.isArray(a) ? a : []);
    setTotals(t ?? { totals: {}, weekTotals: {}, today: {}, chart: [] });
    setQualitative(s?.value ?? '');

    // 全ゴールの振り返りを一括取得
    const goalList: Goal[] = Array.isArray(g) ? g : [];
    if (goalList.length > 0) {
      const rResults = await Promise.all(goalList.map((gl) => fetch(`/api/reflections?goalId=${gl.id}`).then((r) => r.json())));
      setReflections(rResults.flat());
    } else {
      setReflections([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    );
  }

  return (
    <div>
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
          onRefresh={fetchAll}
          onSaved={setQuote}
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
