export function Marca({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="12" y="8" width="40" height="48" rx="6" fill="none" stroke="var(--color-nevoa)" strokeWidth="3" />
      <path d="M20 40c6-10 12 6 18-4 3-5 5-2 6 0" fill="none" stroke="var(--color-sol)" strokeWidth="4" strokeLinecap="round" />
      <path d="M20 20h24M20 28h16" stroke="var(--color-nevoa)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
