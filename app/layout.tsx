import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'アクションプラン管理',
  description: 'コーチング用アクションプラン管理システム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>{children}</body>
    </html>
  );
}
