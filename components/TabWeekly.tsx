'use client';

import { useState, useEffect } from 'react';

type Goal = { id: number; name: string };
type Action = { id: number; goal_id: number; name: string; target_count: number; unit: string };
type Reflection = {
  id: number;
  goal_id: number;
  week_start: string;
  good_points: string;
  bad_points: string;
  next_goal: string;
  score: number;
};

interface Props {
  goals: Goal[];
  actions: Action[];
  reflections: Reflection[];
  weekTotals: Record<number, number>;
  onRefresh: () => void;
}

/** 月曜日のISO日付文字列（JST）を返す。offsetWeeks=0:今週, -1:先週 */
function getMondayISO(offsetWeeks: number = 0): string {
  const now = new Date();
  // JST オフセット適用
  const jstOffset = 9 * 60;
  const jstMs = now.getTime() + (jstOffset - now.getTimezoneOffset()) * 60 * 1000;
  const jst = new Date(jstMs);

  const day = jst.getDay(); // 0=日, 1=月 …
  const diffToMonday = day === 0 ? -6 : 1 - day;
  jst.setDate(jst.getDate() + diffToMonday + offsetWeeks * 7);
  return jst.toISOString().split('T')[0];
}

/** ISO日付文字列を MM/DD 形式にフォーマット */
function toMMDD(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${m}/${d}`;
}

/** 月曜日から日曜日の範囲文字列を返す */
function weekRange(mondayISO: string): string {
  const mon = new Date(mondayISO + 'T00:00:00');
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  return `${fmt(mon)}～${fmt(sun)}`;
}

/** スコアに応じたバッジの色クラスを返す */
function scoreBadgeClass(score: number): string {
  if (score <= 3) return 'bg-red-100 text-red-700 border-red-200';
  if (score <= 5) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (score <= 7) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (score <= 9) return 'bg-lime-100 text-lime-700 border-lime-200';
  return 'bg-green-100 text-green-700 border-green-200';
}

const thisMonday = getMondayISO(0);
const lastMonday = getMondayISO(-1);

const WEEK_OPTIONS = [
  { label: `今週 (${weekRange(thisMonday)})`, value: thisMonday },
  { label: `先週 (${weekRange(lastMonday)})`, value: lastMonday },
];

export default function TabWeekly({
  goals,
  actions,
  reflections,
  weekTotals,
  onRefresh,
}: Props) {
  // ── セレクト状態 ───────────────────────────────────
  const [selectedGoalId, setSelectedGoalId] = useState<number>(goals[0]?.id ?? 0);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(thisMonday);

  // ── フォーム状態 ───────────────────────────────────
  const [goodPoints, setGoodPoints] = useState('');
  const [badPoints, setBadPoints] = useState('');
  const [nextGoal, setNextGoal] = useState('');
  const [score, setScore] = useState(5);
  const [saving, setSaving] = useState(false);

  // ── 履歴トグル・編集状態 ───────────────────────────
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editGoodPoints, setEditGoodPoints] = useState('');
  const [editBadPoints, setEditBadPoints] = useState('');
  const [editNextGoal, setEditNextGoal] = useState('');
  const [editScore, setEditScore] = useState(5);

  // ── 既存データがあればフォームに反映 ───────────────
  useEffect(() => {
    const existing = reflections.find(
      (r) => r.goal_id === selectedGoalId && r.week_start === selectedWeekStart
    );
    if (existing) {
      setGoodPoints(existing.good_points);
      setBadPoints(existing.bad_points);
      setNextGoal(existing.next_goal);
      setScore(existing.score);
    } else {
      setGoodPoints('');
      setBadPoints('');
      setNextGoal('');
      setScore(5);
    }
  }, [selectedGoalId, selectedWeekStart, reflections]);

  // ── 絞り込みデータ ─────────────────────────────────
  const goalActions = actions.filter((a) => a.goal_id === selectedGoalId);
  const goalReflections = reflections
    .filter((r) => r.goal_id === selectedGoalId)
    .sort((a, b) => (a.week_start < b.week_start ? 1 : -1));

  // ── 保存（新規 or 上書き） ─────────────────────────
  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: selectedGoalId,
          weekStart: selectedWeekStart,
          goodPoints,
          badPoints,
          nextGoal,
          score,
        }),
      });
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  // ── インライン編集の開始 ───────────────────────────
  function startEdit(r: Reflection) {
    setEditingId(r.id);
    setEditGoodPoints(r.good_points);
    setEditBadPoints(r.bad_points);
    setEditNextGoal(r.next_goal);
    setEditScore(r.score);
  }

  // ── インライン編集の保存 ───────────────────────────
  async function handleEditSave(id: number) {
    await fetch(`/api/reflections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goodPoints: editGoodPoints,
        badPoints: editBadPoints,
        nextGoal: editNextGoal,
        score: editScore,
      }),
    });
    setEditingId(null);
    onRefresh();
  }

  // ── 削除 ───────────────────────────────────────────
  async function handleDelete(id: number) {
    if (!confirm('この振り返りを削除しますか？')) return;
    await fetch(`/api/reflections/${id}`, { method: 'DELETE' });
    setEditingId(null);
    onRefresh();
  }

  // ── トグル ─────────────────────────────────────────
  function toggleOpen(id: number) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      {/* ── セレクト行 ── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">ゴール</label>
          <select
            value={selectedGoalId}
            onChange={(e) => setSelectedGoalId(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">週</label>
          <select
            value={selectedWeekStart}
            onChange={(e) => setSelectedWeekStart(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {WEEK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 今週のアクション実績 ── */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-3">
          📊 アクション実績（{weekRange(selectedWeekStart)}）
        </h2>
        {goalActions.length === 0 ? (
          <p className="text-xs text-gray-400">このゴールにアクションがありません。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {goalActions.map((a) => {
              const actual = weekTotals[a.id] ?? 0;
              const pct =
                a.target_count > 0 ? Math.min(Math.round((actual / a.target_count) * 100), 999) : 0;
              const barPct = Math.min(pct, 100);
              return (
                <div
                  key={a.id}
                  className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2"
                >
                  <p className="text-xs font-semibold text-gray-700 leading-tight">{a.name}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {actual}
                    <span className="text-sm font-normal text-gray-500 ml-1">{a.unit}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    目標比{' '}
                    <span
                      className={
                        pct >= 100 ? 'text-green-600 font-bold' : 'text-orange-500 font-semibold'
                      }
                    >
                      {pct}%
                    </span>
                  </p>
                  {/* プログレスバー */}
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 100 ? 'bg-green-400' : 'bg-blue-400'
                      }`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    目標: {a.target_count} {a.unit}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 振り返り記録フォーム ── */}
      <section className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-4">
          📝 振り返り記録（{weekRange(selectedWeekStart)}）
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              ✅ 良かった点・できたこと
            </label>
            <textarea
              value={goodPoints}
              onChange={(e) => setGoodPoints(e.target.value)}
              placeholder="今週できたこと、うまくいったことを書きましょう…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              style={{ height: '120px' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              ⚠️ 課題・改善したいこと
            </label>
            <textarea
              value={badPoints}
              onChange={(e) => setBadPoints(e.target.value)}
              placeholder="うまくいかなかったこと、次に改善したいことを書きましょう…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              style={{ height: '120px' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              🎯 来週がんばること
            </label>
            <textarea
              value={nextGoal}
              onChange={(e) => setNextGoal(e.target.value)}
              placeholder="来週の目標・チャレンジしたいことを書きましょう…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              style={{ height: '120px' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              ⭐ 今週の自己評価（1〜10）
              <span className="ml-2 text-blue-600 font-bold text-sm">{score}</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-all shadow-sm"
          >
            {saving ? '保存中…' : '保存する'}
          </button>
        </div>
      </section>

      {/* ── 振り返り履歴 ── */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-3">🗂️ 振り返り履歴</h2>
        {goalReflections.length === 0 ? (
          <p className="text-xs text-gray-400">まだ振り返りの記録がありません。</p>
        ) : (
          <div className="space-y-2">
            {goalReflections.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* ヘッダー行 */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs text-gray-500 font-medium flex-shrink-0">
                    {weekRange(r.week_start)}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${scoreBadgeClass(
                      r.score
                    )}`}
                  >
                    ⭐ {r.score}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => toggleOpen(r.id)}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors flex-shrink-0"
                  >
                    {openIds.has(r.id) ? '閉じる ▲' : '内容を見る ▼'}
                  </button>
                  <button
                    onClick={() => {
                      if (editingId === r.id) {
                        setEditingId(null);
                      } else {
                        startEdit(r);
                        // 開いていなければ開く
                        setOpenIds((prev) => new Set([...prev, r.id]));
                      }
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors flex-shrink-0"
                  >
                    {editingId === r.id ? 'キャンセル' : '修正'}
                  </button>
                </div>

                {/* 内容表示 or 編集フォーム */}
                {openIds.has(r.id) && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    {editingId === r.id ? (
                      /* ── インライン編集フォーム ── */
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            ✅ 良かった点・できたこと
                          </label>
                          <textarea
                            value={editGoodPoints}
                            onChange={(e) => setEditGoodPoints(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                            style={{ height: '100px' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            ⚠️ 課題・改善したいこと
                          </label>
                          <textarea
                            value={editBadPoints}
                            onChange={(e) => setEditBadPoints(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                            style={{ height: '100px' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            🎯 来週がんばること
                          </label>
                          <textarea
                            value={editNextGoal}
                            onChange={(e) => setEditNextGoal(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                            style={{ height: '100px' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-2">
                            ⭐ 自己評価
                            <span className="ml-2 text-blue-600 font-bold text-sm">{editScore}</span>
                          </label>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            value={editScore}
                            onChange={(e) => setEditScore(Number(e.target.value))}
                            className="w-full accent-blue-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditSave(r.id)}
                            className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold rounded-xl py-2 text-sm transition-all shadow-sm"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex-1 border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium rounded-xl py-2 text-sm transition-colors"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="border border-red-200 text-red-500 hover:bg-red-50 font-medium rounded-xl px-4 py-2 text-sm transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── 内容表示 ── */
                      <div className="space-y-3 text-sm">
                        {r.good_points && (
                          <div>
                            <p className="text-xs font-semibold text-green-600 mb-0.5">
                              ✅ 良かった点・できたこと
                            </p>
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {r.good_points}
                            </p>
                          </div>
                        )}
                        {r.bad_points && (
                          <div>
                            <p className="text-xs font-semibold text-orange-500 mb-0.5">
                              ⚠️ 課題・改善したいこと
                            </p>
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {r.bad_points}
                            </p>
                          </div>
                        )}
                        {r.next_goal && (
                          <div>
                            <p className="text-xs font-semibold text-blue-600 mb-0.5">
                              🎯 来週がんばること
                            </p>
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {r.next_goal}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
