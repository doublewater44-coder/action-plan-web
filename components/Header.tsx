'use client';
import { useRouter } from 'next/navigation';

export default function Header({ displayName }: { displayName: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <h1 className="text-base font-bold text-gray-800">🎯 アクションプラン管理</h1>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">👤 {displayName}</span>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 transition-colors hover:bg-gray-50"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}
