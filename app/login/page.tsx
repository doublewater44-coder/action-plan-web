'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // ログイン
  const [lUser, setLUser] = useState('');
  const [lPass, setLPass] = useState('');

  // 新規登録
  const [rUser, setRUser] = useState('');
  const [rName, setRName] = useState('');
  const [rPass, setRPass] = useState('');
  const [rPass2, setRPass2] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: lUser, password: lPass }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/dashboard');
    } else {
      const data = await res.json();
      setError(data.error ?? 'ログインに失敗しました');
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (rPass !== rPass2) { setError('パスワードが一致しません'); return; }
    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: rUser, displayName: rName, password: rPass }),
    });
    setLoading(false);
    if (res.ok) {
      setSuccess('登録完了！ログインタブからログインしてください。');
      setTab('login');
    } else {
      const data = await res.json();
      setError(data.error ?? '登録に失敗しました');
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-1">🎯</div>
          <h1 className="text-xl font-bold text-gray-800">アクションプラン管理</h1>
        </div>

        {/* タブ */}
        <div className="flex mb-6 border-b border-gray-200">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'login' ? 'ログイン' : '新規登録'}
            </button>
          ))}
        </div>

        {error && <p className="text-red-500 text-xs mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-green-600 text-xs mb-3 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <input className={inputCls} placeholder="ユーザー名" value={lUser} onChange={(e) => setLUser(e.target.value)} required />
            <input className={inputCls} type="password" placeholder="パスワード" value={lPass} onChange={(e) => setLPass(e.target.value)} required />
            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <input className={inputCls} placeholder="ユーザー名（英数字）" value={rUser} onChange={(e) => setRUser(e.target.value)} required />
            <input className={inputCls} placeholder="表示名" value={rName} onChange={(e) => setRName(e.target.value)} required />
            <input className={inputCls} type="password" placeholder="パスワード（6文字以上）" value={rPass} onChange={(e) => setRPass(e.target.value)} required />
            <input className={inputCls} type="password" placeholder="パスワード（確認）" value={rPass2} onChange={(e) => setRPass2(e.target.value)} required />
            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? '登録中...' : '登録する'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
