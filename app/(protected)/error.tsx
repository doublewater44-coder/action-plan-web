'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-6 mt-6 rounded-xl bg-red-50 border border-red-200 max-w-2xl mx-auto">
      <div className="font-bold text-red-700 mb-2">エラーが発生しました</div>
      <pre className="text-xs text-red-600 whitespace-pre-wrap break-all bg-red-100 rounded p-3 mb-4">
        {error.message || '不明なエラー'}
        {error.digest ? `\ndigest: ${error.digest}` : ''}
      </pre>
      <button
        onClick={reset}
        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
      >
        再試行
      </button>
    </div>
  );
}
