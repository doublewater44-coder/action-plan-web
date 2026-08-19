'use client';

import { useState, useEffect, useCallback } from 'react';

type Action = { id: number; name: string; unit: string; goal_name: string };
type Progress = { action_id: number; count: number; note: string; progress_date: string };

interface Props {
  actions: Action[];
  onSaved: (quote: { text: string; author: string }) => void;
}

const QUOTES = [
  { text: '千里の道も一歩から。', author: '老子' },
  { text: '継続は力なり。', author: '日本のことわざ' },
  { text: '成功とは、失敗を重ねても熱意を失わない能力のことである。', author: 'ウィンストン・チャーチル' },
  { text: '小さなことを重ねることが、とんでもないところへ行くただ一つの道。', author: 'イチロー' },
  { text: '努力は裏切らない。', author: '日本のことわざ' },
];

function todayISO(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

export default function TabDaily({ actions, onSaved }: Props) {
  const [date, setDate] = useState<string>(todayISO());

  // actionId -> { count, note }
  const [formData, setFormData] = useState<Record<number, { count: number; note: string }>>(() =>
    Object.fromEntries(actions.map((a) => [a.id, { count: 0, note: '' }]))
  );
  // 既存データが入っている actionId のセット
  const [filledIds, setFilledIds] = useState<Set<number>>(new Set());
  const [saveLoading, setSaveLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  const fetchProgress = useCallback(
    async (targetDate: string) => {
      setFetchLoading(true);
      try {
        const res = await fetch(`/api/progress?date=${targetDate}`);
        if (!res.ok) return;
        const rows: Progress[] = await res.json();

        // フォームを初期化（全アクション分 0/空で用意）
        const base: Record<number, { count: number; note: string }> = Object.fromEntries(
          actions.map((a) => [a.id, { count: 0, note: '' }])
        );
        const filled = new Set<number>();

        for (const row of rows) {
          if (base[row.action_id] !== undefined) {
            base[row.action_id] = { count: row.count, note: row.note ?? '' };
            filled.add(row.action_id);
          }
        }
        setFormData(base);
        setFilledIds(filled);
      } finally {
        setFetchLoading(false);
      }
    },
    [actions]
  );

  // 初回マウント & 日付変更時に fetch
  useEffect(() => {
    fetchProgress(date);
  }, [date, fetchProgress]);

  function handleCount(actionId: number, value: number) {
    setFormData((prev) => ({ ...prev, [actionId]: { ...prev[actionId], count: value } }));
  }

  function handleNote(actionId: number, value: string) {
    setFormData((prev) => ({ ...prev, [actionId]: { ...prev[actionId], note: value } }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const body = actions.map((a) => ({
        actionId: a.id,
        date,
        count: formData[a.id]?.count ?? 0,
        note: formData[a.id]?.note ?? '',
      }));

      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('保存に失敗しました。');

      // ランダム名言を選択して親に渡す
      const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      onSaved(quote);

      // 保存後に filled 状態を更新
      setFilledIds(new Set(actions.map((a) => a.id)));
    } finally {
      setSaveLoading(false);
    }
  }

  // ゴール別にグループ化
  const goalGroups: { goalName: string; actions: Action[] }[] = [];
  const seen = new Map<string, Action[]>();
  for (const action of actions) {
    if (!seen.has(action.goal_name)) {
      seen.set(action.goal_name, []);
      goalGroups.push({ goalName: action.goal_name, actions: seen.get(action.goal_name)! });
    }
    seen.get(action.goal_name)!.push(action);
  }

  return (
    <div className="space-y-5">
      {/* 日付選択 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 shrink-0">記録日</label>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
          />
          {fetchLoading && (
            <span className="text-xs text-gray-400 animate-pulse">読み込み中...</span>
          )}
        </div>
      </div>

      {/* 入力フォーム */}
      {actions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-10 text-center">
          <p className="text-sm text-gray-400">アクションが登録されていません。</p>
          <p className="text-xs text-gray-300 mt-1">「設定」タブからアクションを追加してください。</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {goalGroups.map(({ goalName, actions: groupActions }) => (
            <div key={goalName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* ゴールヘッダー */}
              <div className="bg-gradient-to-r from-blue-600 to-teal-600 px-4 py-2">
                <span className="text-white text-xs font-bold">{goalName}</span>
              </div>

              {/* テーブルヘッダー */}
              <div className="grid grid-cols-[1fr_80px_48px_1fr] gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500">アクション</span>
                <span className="text-xs font-medium text-gray-500 text-center">件数</span>
                <span className="text-xs font-medium text-gray-500 text-center">単位</span>
                <span className="text-xs font-medium text-gray-500">メモ</span>
              </div>

              {/* アクション行 */}
              <ul className="divide-y divide-gray-50">
                {groupActions.map((action) => {
                  const isFilled = filledIds.has(action.id);
                  const data = formData[action.id] ?? { count: 0, note: '' };
                  return (
                    <li
                      key={action.id}
                      className="grid grid-cols-[1fr_80px_48px_1fr] gap-2 items-center px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      {/* アクション名 */}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{action.name}</p>
                        {isFilled && (
                          <span className="inline-block text-[10px] font-medium text-green-700 bg-green-100 rounded-full px-1.5 py-0.5 mt-0.5 leading-none">
                            記入済
                          </span>
                        )}
                      </div>

                      {/* 件数 */}
                      <input
                        type="number"
                        min={0}
                        value={data.count}
                        onChange={(e) => handleCount(action.id, Number(e.target.value))}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                      />

                      {/* 単位 */}
                      <span className="text-xs text-gray-500 text-center">{action.unit}</span>

                      {/* メモ */}
                      <input
                        type="text"
                        value={data.note}
                        onChange={(e) => handleNote(action.id, e.target.value)}
                        placeholder="任意"
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <button
            type="submit"
            disabled={saveLoading || fetchLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 disabled:opacity-50 text-white text-sm font-bold rounded-2xl py-3 shadow-sm transition-all"
          >
            {saveLoading ? '保存中...' : '保存する'}
          </button>
        </form>
      )}
    </div>
  );
}
