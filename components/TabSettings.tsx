'use client';

import { useState } from 'react';

type Goal = { id: number; name: string; description?: string; deadline?: string };
type Action = {
  id: number;
  goal_id: number;
  name: string;
  target_count: number;
  unit: string;
  period: string;
  deadline?: string;
  goal_name: string;
};

interface Props {
  goals: Goal[];
  actions: Action[];
  onRefresh: () => void;
}

interface EditForm {
  name: string;
  targetCount: number;
  unit: string;
  deadline: string;
}

export default function TabSettings({ goals, actions, onRefresh }: Props) {
  // 追加フォームの state
  const [goalId, setGoalId] = useState<number>(goals[0]?.id ?? 0);
  const [newName, setNewName] = useState('');
  const [newTargetCount, setNewTargetCount] = useState<number>(0);
  const [newUnit, setNewUnit] = useState('件');
  const [newDeadline, setNewDeadline] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // 編集フォームの state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', targetCount: 0, unit: '件', deadline: '' });
  const [editLoading, setEditLoading] = useState(false);

  // ゴール別にアクションをグループ化
  const actionsByGoal: Record<number, Action[]> = {};
  for (const goal of goals) {
    actionsByGoal[goal.id] = [];
  }
  for (const action of actions) {
    if (!actionsByGoal[action.goal_id]) actionsByGoal[action.goal_id] = [];
    actionsByGoal[action.goal_id].push(action);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      setAddError('アクション名を入力してください。');
      return;
    }
    if (!goalId) {
      setAddError('ゴールを選択してください。');
      return;
    }
    setAddError('');
    setAddLoading(true);
    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId,
          name: newName.trim(),
          targetCount: newTargetCount,
          unit: newUnit || '件',
          deadline: newDeadline || null,
        }),
      });
      if (!res.ok) throw new Error('追加に失敗しました。');
      setNewName('');
      setNewTargetCount(0);
      setNewUnit('件');
      setNewDeadline('');
      onRefresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : '追加に失敗しました。');
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(action: Action) {
    setEditingId(action.id);
    setEditForm({
      name: action.name,
      targetCount: action.target_count,
      unit: action.unit,
      deadline: action.deadline ?? '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSave(id: number) {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/actions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          targetCount: editForm.targetCount,
          unit: editForm.unit || '件',
          deadline: editForm.deadline || null,
        }),
      });
      if (!res.ok) throw new Error('保存に失敗しました。');
      setEditingId(null);
      onRefresh();
    } catch {
      // エラーは静かに処理（必要であればトースト追加可）
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await fetch(`/api/actions/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-6">
      {/* アクション追加フォーム */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-blue-700 mb-4 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">+</span>
          アクションを追加
        </h2>
        <form onSubmit={handleAdd} className="space-y-3">
          {/* ゴール選択 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ゴール</label>
            <select
              value={goalId}
              onChange={(e) => setGoalId(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* アクション名 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">アクション名</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: 英単語を覚える"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
            />
          </div>

          {/* 目標数値 + 単位 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">目標数値</label>
              <input
                type="number"
                min={0}
                value={newTargetCount}
                onChange={(e) => setNewTargetCount(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-600 mb-1">単位</label>
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="件"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
              />
            </div>
          </div>

          {/* 期日 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">期日（任意）</label>
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
            />
          </div>

          {addError && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{addError}</p>
          )}

          <button
            type="submit"
            disabled={addLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
          >
            {addLoading ? '追加中...' : '追加する'}
          </button>
        </form>
      </div>

      {/* 登録済みアクション一覧 */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-gray-700">登録済みアクション一覧</h2>
        {goals.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">ゴールが登録されていません。</p>
        )}
        {goals.map((goal) => {
          const goalActions = actionsByGoal[goal.id] ?? [];
          return (
            <div key={goal.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* ゴールヘッダー */}
              <div className="bg-gradient-to-r from-green-600 to-teal-600 px-4 py-2.5">
                <span className="text-white text-xs font-bold">{goal.name}</span>
              </div>

              {/* アクション行 */}
              {goalActions.length === 0 ? (
                <p className="text-xs text-gray-400 px-4 py-3">アクションがありません。</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {goalActions.map((action) =>
                    editingId === action.id ? (
                      /* 編集フォーム */
                      <li key={action.id} className="px-4 py-3 bg-blue-50">
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">アクション名</label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                              className="w-full rounded-lg border border-blue-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 mb-0.5">目標数値</label>
                              <input
                                type="number"
                                min={0}
                                value={editForm.targetCount}
                                onChange={(e) => setEditForm((f) => ({ ...f, targetCount: Number(e.target.value) }))}
                                className="w-full rounded-lg border border-blue-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                              />
                            </div>
                            <div className="w-24">
                              <label className="block text-xs text-gray-500 mb-0.5">単位</label>
                              <input
                                type="text"
                                value={editForm.unit}
                                onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
                                className="w-full rounded-lg border border-blue-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">期日</label>
                            <input
                              type="date"
                              value={editForm.deadline}
                              onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))}
                              className="w-full rounded-lg border border-blue-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleSave(action.id)}
                              disabled={editLoading}
                              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-xs font-medium rounded-lg py-1.5 transition-colors"
                            >
                              {editLoading ? '保存中...' : '保存'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg py-1.5 transition-colors"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      </li>
                    ) : (
                      /* 通常行 */
                      <li key={action.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{action.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            目標: {action.target_count} {action.unit}
                            {action.deadline && (
                              <span className="ml-2 text-teal-600">期日: {action.deadline}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => startEdit(action)}
                            className="text-xs text-blue-600 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(action.id)}
                            className="text-xs text-red-500 border border-red-200 rounded-lg px-2.5 py-1 hover:bg-red-50 transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
