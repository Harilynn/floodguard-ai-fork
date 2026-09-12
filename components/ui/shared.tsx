"use client"

import * as Icons from 'lucide-react'

export type Tone = 'critical' | 'high' | 'medium' | 'good' | 'neutral' | 'warning'

const iconMap = Icons as Record<string, any>

export function Icon({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) {
  const Component = iconMap[name]
  if (!Component) return null
  return <Component size={size} className={className} strokeWidth={1.8} />
}

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const styles: Record<Tone, string> = {
    critical: 'border-red-200 bg-red-50 text-red-700',
    high: 'border-amber-200 bg-amber-50 text-amber-700',
    medium: 'border-blue-200 bg-blue-50 text-blue-700',
    good: 'border-green-200 bg-green-50 text-green-700',
    neutral: 'border-[#D6E2EE] bg-[#EAF3F8] text-[#49657D]',
    warning: 'border-orange-200 bg-orange-50 text-orange-700',
  }

  return <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${styles[tone]}`}>{label}</span>
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-[#D7E3EC] bg-white shadow-[0_8px_24px_rgba(15,39,66,0.06)] ${className}`}>{children}</div>
}

export function SectionHeader({
  eyebrow,
  title,
  action,
  icon,
}: {
  eyebrow: string
  title: string
  action?: React.ReactNode
  icon?: string
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#D6E2EE] bg-[#EAF3F8] text-[#1261A0]">
            <Icon name={icon} size={16} />
          </div>
        )}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1769AA]">{eyebrow}</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-[#102A43]">{title}</h3>
        </div>
      </div>
      {action}
    </div>
  )
}

export function MetricCard({
  icon,
  label,
  value,
  meta,
  tone = 'neutral',
}: {
  icon: string
  label: string
  value: string
  meta?: string
  tone?: Tone
}) {
  const toneMap: Record<Tone, string> = {
    critical: 'text-[#d92d20]',
    high: 'text-[#e58a00]',
    medium: 'text-[#2563eb]',
    good: 'text-[#16803c]',
    neutral: 'text-[#0f2742]',
    warning: 'text-[#e58a00]',
  }

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#CBE5F2] bg-[#EAF6FB] text-[#1769AA]">
          <Icon name={icon} size={18} />
        </div>
        <StatusBadge label={meta ?? 'Live'} tone={tone} />
      </div>
      <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#526D82]">{label}</div>
      <div className={`mt-2 text-3xl font-bold tabular-nums ${toneMap[tone]}`}>{value}</div>
    </Panel>
  )
}

export function ProgressBar({ value, tone = 'blue' }: { value: number; tone?: 'blue' | 'amber' | 'red' | 'green' }) {
  const palette = {
    blue: 'bg-[#2563eb]',
    amber: 'bg-[#e58a00]',
    red: 'bg-[#d92d20]',
    green: 'bg-[#16803c]',
  }

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#EAF3F8]">
      <div className={`h-full rounded-full ${palette[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}
