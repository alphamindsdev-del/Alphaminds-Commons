export function BodySilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 220" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="body-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F3B6AA" />
          <stop offset="100%" stopColor="#E58F80" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="26" r="15" fill="url(#body-fill)" opacity="0.9" />
      <path
        d="M42 48c6-5 30-5 36 0 8 7 12 26 10 44l-6 48c-1 8-3 22-5 30h-8l-3-50-4 50h-8c-2-8-4-22-5-30l-6-48c-2-18 2-37 9-44Z"
        fill="url(#body-fill)"
        opacity="0.9"
      />
      <circle cx="49" cy="92" r="3" fill="#D24B3B" opacity="0.85" />
      <circle cx="71" cy="104" r="2.5" fill="#D24B3B" opacity="0.7" />
      <circle cx="58" cy="140" r="2.5" fill="#D24B3B" opacity="0.6" />
      <path d="M60 74v52" stroke="#FFFFFF" strokeWidth="2" opacity="0.45" />
    </svg>
  );
}
