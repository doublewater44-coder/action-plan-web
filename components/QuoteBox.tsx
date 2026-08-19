export default function QuoteBox({ text, author }: { text: string; author: string }) {
  return (
    <div className="rounded-xl p-4 mt-3 text-white" style={{ background: 'linear-gradient(135deg,#f093fb,#f5576c)' }}>
      <div className="font-bold text-base mb-1">💬 {text}</div>
      <div className="text-sm opacity-90 text-right">— {author}</div>
    </div>
  );
}
