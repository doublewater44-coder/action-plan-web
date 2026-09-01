'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const ProgressChart = dynamic(() => import('./ProgressChart'), { ssr: false });

type Goal = { id: number; name: string; description?: string; deadline?: string };
type Action = { id: number; goal_id: number; name: string; target_count: number; unit: string; deadline?: string; goal_name: string };
type Totals = { totals: Record<number, number>; weekTotals: Record<number, number>; today: Record<number, { count: number; note: string }> };
type ChartRow = { action_id: number; progress_date: string; count: number; note: string };
type Reflection = { id: number; goal_id: number; week_start: string; good_points: string; bad_points: string; next_goal: string; score: number };
type Achievement = { id: number; goal_id: number; name: string; description?: string; deadline?: string; achieved_at: string };
type GoalAchievementAction = { id: number; goal_achievement_id: number; action_name: string; target_count: number; unit: string; actual_count: number };
type ActionAchievement = { id: number; action_id: number; action_name: string; target_count: number; unit: string; actual_count: number; achieved_at: string };

interface Props {
  goals: Goal[];
  actions: Action[];
  totals: Totals;
  chart: ChartRow[];
  reflections: Reflection[];
  qualitative: string;
  achievements: Achievement[];
  goalAchievementActions: GoalAchievementAction[];
  actionAchievements: ActionAchievement[];
  onRefresh: () => void;
  onSaved: (quote: { text: string; author: string }) => void;
  onAchieve: (goalId: number, achievedAt: string) => Promise<void>;
  onActionAchieve: (actionId: number, achievedAt: string) => Promise<void>;
}

function daysLabel(deadline?: string) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 86400000);
  const color = days < 0 ? '#ef4444' : days <= 7 ? '#f59e0b' : '#9ca3af';
  const label = days < 0 ? `${Math.abs(days)}日超過` : `あと${days}日`;
  const fmt = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  return <span className="text-xs ml-2" style={{ color }}>期日: {fmt}（{label}）</span>;
}

function scoreBadge(score: number) {
  const color = score <= 3 ? '#ef4444' : score <= 5 ? '#f97316' : score <= 7 ? '#eab308' : score <= 9 ? '#84cc16' : '#22c55e';
  return <span className="ml-2 text-xs text-white font-bold px-2 py-0.5 rounded-full" style={{ background: color }}>⭐{score}/10</span>;
}

const QUOTES = [
  { text: '千里の道も一歩から。', author: '老子' },
  { text: '継続は力なり。', author: '日本のことわざ' },
  { text: '小さなことを重ねることが、とんでもないところへ行くただ一つの道。', author: 'イチロー' },
  { text: '努力は裏切らない。', author: '日本のことわざ' },
  { text: '今日の積み重ねが明日の自分を作る。', author: '日本のことわざ' },
];

export default function TabProgress({ goals, actions, totals, chart, reflections, qualitative, achievements, goalAchievementActions, actionAchievements, onRefresh, onSaved, onAchieve, onActionAchieve }: Props) {
  const [editQ, setEditQ] = useState(false);
  const [qVal, setQVal] = useState(qualitative);
  const [manageGoals, setManageGoals] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editGoalId, setEditGoalId] = useState<number | null>(null);
  const [showInline, setShowInline] = useState(false);
  const [inlineVals, setInlineVals] = useState<Record<number, number>>({});
  const [inlineNotes, setInlineNotes] = useState<Record<number, string>>({});
  const [openCharts, setOpenCharts] = useState(false);
  const [openMemos, setOpenMemos] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [openReflIds, setOpenReflIds] = useState<Set<number>>(new Set());
  const [achieveConfirmId, setAchieveConfirmId] = useState<number | null>(null);
  const [achieveDate, setAchieveDate] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }));
  const [nextGoalSetIds, setNextGoalSetIds] = useState<Set<number>>(new Set());
  const [openAchievements, setOpenAchievements] = useState(false);

  // ゴール追加・編集フォーム
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalDl, setNewGoalDl] = useState('');
  const [editGoalName, setEditGoalName] = useState('');
  const [editGoalDesc, setEditGoalDesc] = useState('');
  const [editGoalDl, setEditGoalDl] = useState('');

  // アクション達成・編集フォーム
  const [actionAchieveConfirmId, setActionAchieveConfirmId] = useState<number | null>(null);
  const [actionAchieveDate, setActionAchieveDate] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }));
  const [actionNextGoalSetIds, setActionNextGoalSetIds] = useState<Set<number>>(new Set());
  const [editActionId, setEditActionId] = useState<number | null>(null);
  const [editActionName, setEditActionName] = useState('');
  const [editActionTarget, setEditActionTarget] = useState(0);
  const [editActionUnit, setEditActionUnit] = useState('');
  const [editActionDl, setEditActionDl] = useState('');

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const goalMap = Object.fromEntries(goals.map((g) => [g.id, g]));
  const achievedGoalIds = new Set(achievements.map((a) => a.goal_id));
  const actionAchievedIds = new Set(actionAchievements.map((aa) => aa.action_id));

  async function saveQualitative() {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'qualitative_goal', value: qVal }),
    });
    setEditQ(false);
    onRefresh();
  }

  async function addGoal() {
    if (!newGoalName.trim()) return;
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGoalName.trim(), description: newGoalDesc.trim(), deadline: newGoalDl || null }),
    });
    setNewGoalName(''); setNewGoalDesc(''); setNewGoalDl('');
    setShowAddGoal(false);
    onRefresh();
  }

  function startEditGoal(g: Goal) {
    setEditGoalId(g.id);
    setEditGoalName(g.name);
    setEditGoalDesc(g.description ?? '');
    setEditGoalDl(g.deadline ?? '');
  }

  async function saveGoal(id: number) {
    await fetch(`/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editGoalName, description: editGoalDesc, deadline: editGoalDl || null }),
    });
    setEditGoalId(null);
    setManageGoals(false);
    onRefresh();
  }

  async function deleteGoal(id: number) {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    setEditGoalId(null);
    onRefresh();
  }

  async function saveInline() {
    const records = actions.map((a) => ({
      actionId: a.id, date: today,
      count: inlineVals[a.id] ?? (totals.today[a.id]?.count ?? 0),
      note: inlineNotes[a.id] ?? (totals.today[a.id]?.note ?? ''),
    }));
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(records),
    });
    setShowInline(false);
    onRefresh();
    onSaved(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }

  async function saveActionEdit(id: number) {
    await fetch(`/api/actions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editActionName, targetCount: editActionTarget, unit: editActionUnit, deadline: editActionDl || null }),
    });
    setEditActionId(null);
    onRefresh();
  }

  const inputCls = 'px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className="space-y-4">
      {/* 定性ゴール */}
      {editQ ? (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-4">
          <p className="text-xs font-bold text-blue-600 mb-2">🌟 定性ゴール</p>
          <input className={`${inputCls} w-full mb-2`} value={qVal} onChange={(e) => setQVal(e.target.value)} placeholder="例：お客様に信頼されるトップ営業として自信を持って働けるようになる" />
          <div className="flex gap-2">
            <button onClick={saveQualitative} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">保存</button>
            <button onClick={() => setEditQ(false)} className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">キャンセル</button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="flex-1 bg-gradient-to-r from-blue-50 to-sky-50 border-l-4 border-blue-500 rounded-r-xl p-4">
            <p className="text-xs font-bold text-blue-600 mb-1">🌟 定性ゴール</p>
            <p className="text-base font-semibold text-blue-900">{qualitative || '（未設定）'}</p>
          </div>
          <button onClick={() => { setQVal(qualitative); setEditQ(true); }} className="text-gray-400 hover:text-gray-600 text-lg mt-3">✏️</button>
        </div>
      )}

      {/* 定量ゴール管理パネル */}
      {manageGoals && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-green-700">🎯 定量ゴール</p>
            <button onClick={() => { setManageGoals(false); setShowAddGoal(false); setEditGoalId(null); }} className="text-xs text-gray-500 hover:text-gray-700">✖ 閉じる</button>
          </div>
          {goals.map((g) =>
            editGoalId === g.id ? (
              <div key={g.id} className="border border-blue-200 rounded-lg p-3 mb-2 bg-blue-50">
                <input className={`${inputCls} w-full mb-2`} value={editGoalName} onChange={(e) => setEditGoalName(e.target.value)} placeholder="ゴール名" />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">期限</label>
                    <input className={inputCls} type="date" value={editGoalDl} onChange={(e) => setEditGoalDl(e.target.value)} />
                  </div>
                  <input className={inputCls} value={editGoalDesc} onChange={(e) => setEditGoalDesc(e.target.value)} placeholder="補足" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveGoal(g.id)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">保存</button>
                  <button onClick={() => setEditGoalId(null)} className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">キャンセル</button>
                  <button onClick={() => deleteGoal(g.id)} className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 ml-auto">🗑️ 削除</button>
                </div>
              </div>
            ) : (
              <div key={g.id} className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-green-50 border-l-4 border-green-500 rounded-r-lg px-3 py-2">
                  <span className="font-semibold text-green-800 text-sm">🎯 {g.name}</span>
                  {daysLabel(g.deadline)}
                </div>
                <button onClick={() => startEditGoal(g)} className="text-gray-400 hover:text-gray-600">✏️</button>
              </div>
            )
          )}
          {showAddGoal ? (
            <div className="border border-green-200 rounded-lg p-3 bg-green-50 mt-2">
              <input className={`${inputCls} w-full mb-2`} value={newGoalName} onChange={(e) => setNewGoalName(e.target.value)} placeholder="ゴール名（例：今月20件の新規契約）" />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">期限</label>
                  <input className={inputCls} type="date" value={newGoalDl} onChange={(e) => setNewGoalDl(e.target.value)} />
                </div>
                <input className={inputCls} value={newGoalDesc} onChange={(e) => setNewGoalDesc(e.target.value)} placeholder="補足（任意）" />
              </div>
              <div className="flex gap-2">
                <button onClick={addGoal} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">追加</button>
                <button onClick={() => setShowAddGoal(false)} className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">キャンセル</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddGoal(true)} className="mt-2 w-full py-2 border-2 border-dashed border-green-300 text-green-600 rounded-lg text-sm hover:border-green-400 hover:bg-green-50">＋ 定量ゴールを追加</button>
          )}
        </div>
      )}

      <hr className="border-gray-200" />

      {/* アクション進捗ヘッダー */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <h2 className="font-bold text-gray-800">📊 アクション進捗状況</h2>
          <p className="text-xs text-gray-500">今日: {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</p>
        </div>
        {!manageGoals && (
          <button onClick={() => setManageGoals(true)} className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50">🎯 定量ゴール追加・修正</button>
        )}
        {!manageGoals && actions.length > 0 && (
          <button
            onClick={() => {
              if (!showInline) {
                const vals: Record<number, number> = {};
                const notes: Record<number, string> = {};
                actions.forEach((a) => {
                  vals[a.id] = totals.today[a.id]?.count ?? 0;
                  notes[a.id] = totals.today[a.id]?.note ?? '';
                });
                setInlineVals(vals);
                setInlineNotes(notes);
              }
              setShowInline(!showInline);
            }}
            className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700"
          >
            {showInline ? '✖ 閉じる' : '✅ 進捗を入力する'}
          </button>
        )}
      </div>

      {/* インライン進捗入力 */}
      {showInline && !manageGoals && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-bold text-blue-700 mb-3">✅ {new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}の進捗を入力</p>
          <div className="space-y-2">
            {actions.map((a) => {
              const existing = totals.today[a.id];
              return (
                <div key={a.id} className="grid grid-cols-[2fr_80px_50px_3fr] gap-2 items-center">
                  <span className="text-sm font-medium text-gray-800">
                    {a.name}
                    {existing && existing.count > 0 && <span className="ml-1 text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">記入済み</span>}
                  </span>
                  <input type="number" min={0} className={inputCls} value={inlineVals[a.id] ?? existing?.count ?? 0}
                    onChange={(e) => setInlineVals((v) => ({ ...v, [a.id]: Number(e.target.value) }))} />
                  <span className="text-sm text-gray-500">{a.unit}</span>
                  <input className={inputCls} placeholder="メモ（任意）" value={inlineNotes[a.id] ?? existing?.note ?? ''}
                    onChange={(e) => setInlineNotes((v) => ({ ...v, [a.id]: e.target.value }))} />
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={saveInline} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">💾 保存する</button>
            <button onClick={() => setShowInline(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">キャンセル</button>
          </div>
        </div>
      )}

      {/* アクション進捗バー */}
      {!manageGoals && actions.length === 0 && (
        <p className="text-sm text-gray-500 bg-gray-100 rounded-xl p-4 text-center">
          アクションプランがまだ登録されていません。「アクションプラン設定」タブから追加してください。
        </p>
      )}

      {!manageGoals && (() => {
        const actionsByGoal: Record<number, Action[]> = {};
        actions.forEach((a) => { (actionsByGoal[a.goal_id] ??= []).push(a); });
        return Object.entries(actionsByGoal).map(([gid, gActions]) => {
          const goal = goalMap[Number(gid)];
          const isGoalConfirming = achieveConfirmId === Number(gid);
          return (
            <div key={gid}>
              {/* ゴールヘッダー */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-r-lg px-3 py-2 mb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-green-700 font-bold">定量ゴール</p>
                    <p className="text-sm font-bold text-green-800 truncate">🎯 {goal?.name ?? '不明'}{goal && daysLabel(goal.deadline)}</p>
                  </div>
                  <div className="shrink-0 flex gap-1 items-center">
                    {!isGoalConfirming && (
                      <>
                        {achievedGoalIds.has(Number(gid)) && !nextGoalSetIds.has(Number(gid)) && (
                          <button
                            onClick={() => {
                              setNextGoalSetIds((s) => new Set(s).add(Number(gid)));
                              setManageGoals(true);
                              setEditGoalId(Number(gid));
                              setEditGoalName(goal?.name ?? '');
                              setEditGoalDesc(goal?.description ?? '');
                              setEditGoalDl(goal?.deadline ?? '');
                            }}
                            className="text-xs text-green-700 border border-green-400 rounded-lg px-2 py-1 hover:bg-green-100 whitespace-nowrap"
                          >
                            次の目標を立てる
                          </button>
                        )}
                        <button
                          onClick={() => { setAchieveConfirmId(Number(gid)); setAchieveDate(today); }}
                          className="text-xs text-amber-600 border border-amber-300 rounded-lg px-2 py-1 hover:bg-amber-50 whitespace-nowrap"
                        >
                          🏆 達成
                        </button>
                      </>
                    )}
                    {isGoalConfirming && (
                      <button onClick={() => setAchieveConfirmId(null)} className="text-xs border border-gray-300 px-2 py-1 rounded-lg hover:bg-gray-50">×</button>
                    )}
                  </div>
                </div>
                {isGoalConfirming && (
                  <div className="mt-2 pt-2 border-t border-green-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-700 font-medium">達成日:</span>
                      <input type="date" value={achieveDate} onChange={(e) => setAchieveDate(e.target.value)} className="text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-400" />
                    </div>
                    <p className="text-xs font-semibold text-green-800">次のゴールを設定しますか？</p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={async () => {
                          await onAchieve(Number(gid), achieveDate);
                          setNextGoalSetIds((s) => new Set(s).add(Number(gid)));
                          setAchieveConfirmId(null);
                          setManageGoals(true);
                          setEditGoalId(Number(gid));
                          setEditGoalName(goal?.name ?? '');
                          setEditGoalDesc(goal?.description ?? '');
                          setEditGoalDl(goal?.deadline ?? '');
                        }}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 whitespace-nowrap"
                      >
                        はい、今すぐ設定
                      </button>
                      <button
                        onClick={async () => { await onAchieve(Number(gid), achieveDate); setAchieveConfirmId(null); }}
                        className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 whitespace-nowrap"
                      >
                        後で設定する
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* アクション行 */}
              {gActions.map((a) => {
                const total = totals.totals[a.id] ?? 0;
                const target = Number(a.target_count);
                const pct = target > 0 ? Math.min((total / target) * 100, 100) : 0;
                const barColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
                const pctColor = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
                const isActionConfirming = actionAchieveConfirmId === a.id;

                if (editActionId === a.id) {
                  return (
                    <div key={a.id} className="border border-blue-200 rounded-lg p-3 mb-1 bg-blue-50">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-0.5">アクション名</label>
                          <input className={`${inputCls} w-full`} value={editActionName} onChange={(e) => setEditActionName(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">目標数値</label>
                          <input type="number" min={0} className={`${inputCls} w-full`} value={editActionTarget} onChange={(e) => setEditActionTarget(Number(e.target.value))} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">単位</label>
                          <input className={`${inputCls} w-full`} value={editActionUnit} onChange={(e) => setEditActionUnit(e.target.value)} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-0.5">期限</label>
                          <input type="date" className={`${inputCls} w-full`} value={editActionDl} onChange={(e) => setEditActionDl(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveActionEdit(a.id)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">保存</button>
                        <button onClick={() => setEditActionId(null)} className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">キャンセル</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={a.id} className="border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex-1 text-sm font-semibold text-gray-800 truncate">
                        {a.name}{daysLabel(a.deadline)}
                      </div>
                      <div className="w-28 bg-gray-200 rounded-full h-2 flex-shrink-0">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                      <span className="w-10 text-right text-sm font-bold flex-shrink-0" style={{ color: pctColor }}>{Math.round(pct)}%</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{Math.round(total)}/{Math.round(target)} {a.unit}</span>
                      <div className="shrink-0 flex gap-1 items-center">
                        {!isActionConfirming && (
                          <>
                            {actionAchievedIds.has(a.id) && !actionNextGoalSetIds.has(a.id) && (
                              <button
                                onClick={() => {
                                  setActionNextGoalSetIds((s) => new Set(s).add(a.id));
                                  setEditActionId(a.id);
                                  setEditActionName(a.name);
                                  setEditActionTarget(a.target_count);
                                  setEditActionUnit(a.unit);
                                  setEditActionDl(a.deadline ?? '');
                                }}
                                className="text-xs text-blue-700 border border-blue-300 rounded-lg px-2 py-1 hover:bg-blue-50 whitespace-nowrap"
                              >
                                次の目標
                              </button>
                            )}
                            <button
                              onClick={() => { setActionAchieveConfirmId(a.id); setActionAchieveDate(today); }}
                              className="text-xs text-amber-600 border border-amber-300 rounded-lg px-1.5 py-1 hover:bg-amber-50"
                            >
                              🏆
                            </button>
                          </>
                        )}
                        {isActionConfirming && (
                          <button onClick={() => setActionAchieveConfirmId(null)} className="text-xs border border-gray-300 px-2 py-1 rounded-lg hover:bg-gray-50">×</button>
                        )}
                      </div>
                    </div>
                    {isActionConfirming && (
                      <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-amber-700 font-medium">達成日:</span>
                          <input type="date" value={actionAchieveDate} onChange={(e) => setActionAchieveDate(e.target.value)} className="text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                        </div>
                        <p className="text-xs font-semibold text-amber-800">次のアクション目標を設定しますか？</p>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={async () => {
                              await onActionAchieve(a.id, actionAchieveDate);
                              setActionNextGoalSetIds((s) => new Set(s).add(a.id));
                              setActionAchieveConfirmId(null);
                              setEditActionId(a.id);
                              setEditActionName(a.name);
                              setEditActionTarget(a.target_count);
                              setEditActionUnit(a.unit);
                              setEditActionDl(a.deadline ?? '');
                            }}
                            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 whitespace-nowrap"
                          >
                            はい、今すぐ設定
                          </button>
                          <button
                            onClick={async () => { await onActionAchieve(a.id, actionAchieveDate); setActionAchieveConfirmId(null); }}
                            className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 whitespace-nowrap"
                          >
                            後で設定する
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        });
      })()}

      {/* グラフ */}
      {actions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button onClick={() => setOpenCharts(!openCharts)} className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50">
            <span>📅 日次推移グラフを見る</span>
            <span>{openCharts ? '▲' : '▼'}</span>
          </button>
          {openCharts && (
            <div className="px-4 pb-4">
              {actions.map((a) => {
                const rows = chart.filter((r) => r.action_id === a.id);
                return (
                  <div key={a.id} className="mb-4">
                    <p className="text-xs text-gray-600 font-medium mb-1">{a.goal_name} › {a.name}</p>
                    {rows.length === 0 ? (
                      <p className="text-xs text-gray-400">まだ進捗データがありません</p>
                    ) : (
                      <ProgressChart rows={rows} target={Number(a.target_count)} unit={a.unit} deadline={a.deadline} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 気づきログ */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setOpenMemos(!openMemos)} className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50">
          <span>📓 気づきログ（日次メモの記録）</span>
          <span>{openMemos ? '▲' : '▼'}</span>
        </button>
        {openMemos && (
          <div className="px-4 pb-4">
            {(() => {
              const memos = chart
                .filter((r) => r.note?.trim())
                .map((r) => { const a = actions.find((x) => x.id === r.action_id); return { date: r.progress_date, action: a?.name ?? '', count: r.count, unit: a?.unit ?? '', note: r.note }; })
                .sort((a, b) => b.date.localeCompare(a.date));
              if (memos.length === 0) return <p className="text-xs text-gray-400">まだメモがありません。</p>;
              return (
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 border-b"><th className="py-1 text-left">日付</th><th className="text-left">アクション</th><th className="text-left">件数</th><th className="text-left">気づき・メモ</th></tr></thead>
                  <tbody>
                    {memos.map((m, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-1 pr-2">{m.date}</td>
                        <td className="pr-2">{m.action}</td>
                        <td className="pr-2">{m.count} {m.unit}</td>
                        <td>{m.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}
      </div>

      {/* 週次振り返り履歴 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setOpenHistory(!openHistory)} className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50">
          <span>📝 週次振り返り履歴を見る</span>
          <span>{openHistory ? '▲' : '▼'}</span>
        </button>
        {openHistory && (
          <div className="px-4 pb-4">
            <p className="text-xs text-gray-400 mb-2">編集・削除は「週次振り返り」タブで行えます</p>
            {goals.map((g) => {
              const gRefls = reflections.filter((r) => r.goal_id === g.id);
              if (gRefls.length === 0) return null;
              return (
                <div key={g.id} className="mb-3">
                  <p className="text-sm font-bold text-gray-700 mb-1">{g.name}</p>
                  {gRefls.map((r) => {
                    const end = new Date(r.week_start);
                    end.setDate(end.getDate() + 6);
                    const weekEnd = `${end.getMonth() + 1}/${end.getDate()}`;
                    const isOpen = openReflIds.has(r.id);
                    return (
                      <div key={r.id} className="border border-gray-100 rounded-lg mb-1 overflow-hidden">
                        <button
                          onClick={() => setOpenReflIds((s) => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50"
                        >
                          <span><span className="font-semibold">📅 {r.week_start} 〜 {weekEnd}</span>{scoreBadge(r.score)}</span>
                          <span>{isOpen ? '▲ 閉じる' : '▼ 内容を見る'}</span>
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-2 text-xs text-gray-600 space-y-1 bg-gray-50">
                            <p><strong>✅ 良かった点</strong><br />{r.good_points || '記録なし'}</p>
                            <p><strong>⚠️ 課題・改善点</strong><br />{r.bad_points || '記録なし'}</p>
                            <p><strong>🎯 来週の目標</strong><br />{r.next_goal || '記録なし'}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 達成したゴール・アクション */}
      {(achievements.length > 0 || actionAchievements.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button onClick={() => setOpenAchievements(!openAchievements)} className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50">
            <span>🏆 達成したゴール・アクション（{achievements.length + actionAchievements.length}件）</span>
            <span>{openAchievements ? '▲' : '▼'}</span>
          </button>
          {openAchievements && (
            <div className="px-4 pb-4 space-y-3">
              {/* ゴール達成履歴 */}
              {achievements.length > 0 && (
                <>
                  <p className="text-xs font-bold text-gray-500 mt-2">🎯 ゴール達成履歴</p>
                  {achievements.map((a) => {
                    const snapshots = goalAchievementActions.filter((gaa) => gaa.goal_achievement_id === a.id);
                    const relatedActions = actions.filter((ac) => ac.goal_id === a.goal_id);
                    return (
                      <div key={a.id} className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-amber-800 text-sm">🏆 {a.name}</p>
                          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium shrink-0">達成済</span>
                        </div>
                        {a.description && <p className="text-xs text-amber-700 mt-1">{a.description}</p>}
                        <div className="mt-2 text-xs text-amber-600 space-y-0.5">
                          {a.deadline && <p>期日: {String(a.deadline).slice(0, 10)}</p>}
                          <p>達成日: {String(a.achieved_at).slice(0, 10)}</p>
                        </div>
                        {snapshots.length > 0 ? (
                          <div className="mt-3 pt-2 border-t border-amber-200">
                            <p className="text-xs font-semibold text-amber-700 mb-1">📋 アクション実績</p>
                            <ul className="space-y-1">
                              {snapshots.map((s) => {
                                const actual = Number(s.actual_count);
                                const tgt = Number(s.target_count);
                                const p = tgt > 0 ? Math.round((actual / tgt) * 100) : 0;
                                const achieved = actual >= tgt;
                                return (
                                  <li key={s.id} className="text-xs text-amber-800 flex items-center gap-1">
                                    <span>{achieved ? '✅' : '❌'}</span>
                                    <span className="font-medium">{s.action_name}</span>
                                    <span className="text-amber-600">{actual}/{tgt} {s.unit}（{p}%）</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : relatedActions.length > 0 ? (
                          <div className="mt-3 pt-2 border-t border-amber-200">
                            <p className="text-xs font-semibold text-amber-700 mb-1">📋 アクション</p>
                            <ul className="space-y-0.5">
                              {relatedActions.map((ac) => (
                                <li key={ac.id} className="text-xs text-amber-700">・{ac.name}（目標: {ac.target_count} {ac.unit}）</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </>
              )}

              {/* アクション達成履歴 */}
              {actionAchievements.length > 0 && (
                <>
                  {achievements.length > 0 && <hr className="border-gray-100" />}
                  <p className="text-xs font-bold text-gray-500">📋 アクション達成履歴</p>
                  {actionAchievements.map((aa) => {
                    const actual = Number(aa.actual_count);
                    const tgt = Number(aa.target_count);
                    const p = tgt > 0 ? Math.round((actual / tgt) * 100) : 0;
                    const achieved = actual >= tgt;
                    return (
                      <div key={aa.id} className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-blue-800 text-sm">{achieved ? '✅' : '📋'} {aa.action_name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${achieved ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {achieved ? '目標達成' : '記録済'}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-blue-600 space-y-0.5">
                          <p>実績: {actual}/{tgt} {aa.unit}（{p}%）</p>
                          <p>達成日: {String(aa.achieved_at).slice(0, 10)}</p>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
