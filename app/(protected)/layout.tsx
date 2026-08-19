import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Header from '@/components/Header';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const dayOfWeek = new Date(today).getDay();
  const isSaturday = dayOfWeek === 6;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header displayName={session.displayName} />
      {isSaturday && (
        <div className="mx-4 mt-3">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-xl flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <div>
              <div className="font-bold text-sm">今週の振り返りをしましょう！</div>
              <div className="text-xs opacity-90">「週次振り返り」タブから今週の振り返りを記録できます。</div>
            </div>
          </div>
        </div>
      )}
      <main className="max-w-4xl mx-auto px-4 py-4">{children}</main>
    </div>
  );
}
