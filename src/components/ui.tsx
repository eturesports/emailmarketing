import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// --- Botón -------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-[#04202a] hover:bg-brand-strong",
  secondary: "bg-surface-3 text-ink hover:bg-[#22304a] border border-line",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface-2",
  danger: "bg-[#3a1620] text-danger hover:bg-[#4a1a28] border border-[#5b2030]",
  success: "bg-[#0f3529] text-success hover:bg-[#14432f] border border-[#1c5a3d]",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9.5 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return <button className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)} {...props} />;
}

export type LinkButtonProps = React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function LinkButton({ className, variant = "primary", size = "md", ...props }: LinkButtonProps) {
  return <Link className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)} {...props} />;
}

// --- Contenedores ------------------------------------------------------------

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}

// --- Distintivos -------------------------------------------------------------

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-3 text-ink-muted border-line",
  brand: "bg-[#0b2f38] text-brand border-[#12414e]",
  success: "bg-[#0f3529] text-success border-[#1c5a3d]",
  warning: "bg-[#3a2e10] text-warning border-[#57451a]",
  danger: "bg-[#3a1620] text-danger border-[#5b2030]",
  info: "bg-[#1e2246] text-info border-[#2d3468]",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const CAMPAIGN_TONES: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  SCHEDULED: "info",
  SENDING: "brand",
  PAUSED: "warning",
  SENT: "success",
  FAILED: "danger",
};

const CONTACT_TONES: Record<string, BadgeTone> = {
  SUBSCRIBED: "success",
  UNSUBSCRIBED: "neutral",
  BOUNCED: "warning",
  COMPLAINED: "danger",
};

const RECIPIENT_TONES: Record<string, BadgeTone> = {
  PENDING: "neutral",
  SENDING: "brand",
  SENT: "success",
  FAILED: "danger",
  SKIPPED: "warning",
};

export function StatusBadge({
  status,
  kind,
  label,
}: {
  status: string;
  kind: "campaign" | "contact" | "recipient";
  label: string;
}) {
  const map = kind === "campaign" ? CAMPAIGN_TONES : kind === "contact" ? CONTACT_TONES : RECIPIENT_TONES;
  const tone = map[status] ?? "neutral";

  return (
    <Badge tone={tone}>
      {status === "SENDING" ? <span className="pulse-dot size-1.5 rounded-full bg-current" /> : null}
      {label}
    </Badge>
  );
}

// --- Formularios -------------------------------------------------------------

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label ? <span className="label">{label}</span> : null}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn("field", className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn("field", className)} {...props} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn("field appearance-none pr-8", className)} {...props}>
        {children}
      </select>
    );
  },
);

export function Checkbox({
  label,
  description,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; description?: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm", className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-line bg-surface-2 accent-brand"
        {...props}
      />
      <span className="min-w-0">
        <span className="text-ink">{label}</span>
        {description ? <span className="block text-xs text-ink-faint">{description}</span> : null}
      </span>
    </label>
  );
}

// --- Estados -----------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon ? <div className="text-ink-faint">{icon}</div> : null}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-[#2d3468] bg-[#171b3a] text-[#c7cbff]",
    warning: "border-[#57451a] bg-[#2e250d] text-[#f5d78a]",
    danger: "border-[#5b2030] bg-[#2e1119] text-[#fca5a5]",
    success: "border-[#1c5a3d] bg-[#0c2a21] text-[#8ee7c2]",
  } as const;

  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone])}>
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div className="[&_a]:underline">{children}</div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

// --- Métricas ----------------------------------------------------------------

export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
}) {
  const accents = {
    neutral: "text-ink",
    brand: "text-brand",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  } as const;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        {icon ? <span className="text-ink-faint">{icon}</span> : null}
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums tracking-tight", accents[tone])}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-ink-faint">{sub}</p> : null}
    </Card>
  );
}

/** Barra de progreso simple, con el porcentaje anunciado a lectores de pantalla. */
export function ProgressBar({
  value,
  max,
  tone = "brand",
  label,
}: {
  value: number;
  max: number;
  tone?: "brand" | "success" | "warning";
  label?: string;
}) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const colors = {
    brand: "bg-brand",
    success: "bg-success",
    warning: "bg-warning",
  } as const;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", colors[tone])} style={{ width: `${percent}%` }} />
    </div>
  );
}

// --- Tablas ------------------------------------------------------------------

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full min-w-[640px] text-sm", className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-line px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("border-b border-line-soft px-4 py-3 align-middle", className)} {...props}>
      {children}
    </td>
  );
}
