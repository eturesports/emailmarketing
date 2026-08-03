import { cn } from "@/lib/utils";

export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="url(#eture-gradient)" />
      <path
        d="M8 11.5h16M8 16h11M8 20.5h16"
        stroke="#04202a"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="eture-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0891b2" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo />
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight text-ink">Eture Mailer</p>
        <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Esports</p>
      </div>
    </div>
  );
}
