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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [warmingUp, setWarmingUp] = useState(false);

  const fetchAll = useCallback(async (retry = 0) => {
    try {
      const responses = await Promise.all([
        fetch('/api/goals'),
        fetch('/api/actions'),
        fetch('/api/progress/totals'),
        fetch('/api/settings?key=qualitative_goal'),
      ]);
      const texts = await Promise.all(responses.map(r => r.text()));

      // DBが起動中のとき自動リトライ（ブラウザ側で最大5回 × 5秒）
      const isSchemaError = responses.some((r, i) =>
        !r.ok && (texts[i].includes('schema cache') || texts[i].includes('Retrying') || texts[i].includes('TIMEOUT'))
      );
      if (isSchemaError) {
        if (retry < 5) {
          setWarmingUp(true);
          setTimeout(() => fetchAll(retry + 1), 5000);
          return;
        }
        setFetchError('データベースの起動に時間がかかっています。ページを更新してください。');
        setLoading(false);
        return;
      }

      const failedRes = responses.find((r, i) => !r.ok && texts[i]);
      if (failedRes) {
        const i = responses.indexOf(failedRes);
        setFetchError(`API エラー: ${texts[i].slice(0, 200)}`);
        setLoading(false);
        return;
      }

      const [g, a, t, s] = texts.map(t => JSON.parse(t));
      setGoals(Array.isArray(g) ? g : []);
      setActions(Array.isArray(a) ? a : []);
      setTotals(t ?? { totals: {}, weekTotals: {}, today: {}, chart: [] });
      setQualitative(s?.value ?? '');

      const goalList: Goal[] = Array.isArray(g) ? g : [];
      if (goalList.length > 0) {
        const rResults = await Promise.all(goalList.map((gl) => fetch(`/api/reflections?goalId=${gl.id}`).then((r) => r.json())));
        setReflections(rResults.flat());
      } else {
        setReflections([]);
      }
      setWarmingUp(false);
      setFetchError(null);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="animate-pulse">
        {/* タブナビ skeleton */}
        <div className="flex border-b border-gray-200 mb-4 -mx-4 px-4 bg-white sticky top-[53px] z-10 gap-2">
          {['w-24', 'w-16', 'w-24', 'w-28'].map((w, i) => (
            <div key={i} className={`${w} h-10 my-1.5 rounded bg-gray-200`} />
          ))}
        </div>
        {/* 定性ゴール */}
        <div className="rounded-xl bg-gray-100 h-16 mb-4" />
        {/* アクションカード × 3 */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-4 mb-3">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-full mb-2" />
            <div className="h-2 bg-gray-200 rounded-full w-full" />
          </div>
        ))}
        {/* グラフ */}
        <div className="rounded-xl bg-gray-100 h-48 mt-2" />
        {warmingUp && (
          <div className="mt-4 text-center text-xs text-gray-400">
            データベース起動中... しばらくお待ちください
          </div>
        )}
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
