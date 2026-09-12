"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/shared'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Drone Intelligence', href: '/drone-intelligence', icon: 'ScanLine' },
  { label: 'SOS Requests', href: '/sos-requests', icon: 'Siren' },
  { label: 'Safe Route', href: '/safe-route', icon: 'Navigation' },
  { label: 'Risk Analysis', href: '/risk-analysis', icon: 'Activity' },
  { label: 'Rescue', href: '/rescue', icon: 'Users' },
  { label: 'Shelter Allocation', href: '/shelter-allocation', icon: 'Home' },
  { label: 'Relief', href: '/relief', icon: 'Zap' },
]

const getPageTitle = (pathname: string | null) => {
  if (!pathname || pathname === '/' || pathname === '/dashboard') return 'Disaster Response Command Center'
  const labels: Record<string, string> = {
    '/drone-intelligence': 'Drone Intelligence',
    '/sos-requests': 'SOS Requests',
    '/shelters': 'Shelter Network',
    '/safe-route': 'Safe Route Planner',
    '/risk-analysis': 'Risk Analysis',
    '/budget': 'Budget & Resources',
    '/rescue': 'Rescue Resources',
    '/shelter-allocation': 'Shelter Allocation',
    '/relief': 'Relief Planning',
  }
  return labels[pathname] ?? 'FloodGuard'
}

export default function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentTitle = getPageTitle(pathname)

  return (
    <div className="min-h-screen bg-[#EEF5F8] text-[#102A43]">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 border-r border-[#183B5B] bg-[#0B1D2D] p-5 text-white lg:flex lg:flex-col">
          <div className="mb-9 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4FAFC] text-[#0B1D2D] shadow-sm">
              <Icon name="Waves" size={20} />
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight">FloodGuard</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#9FC3DD]">Emergency Operations</div>
            </div>
          </div>

          <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6F9AB8]">Operations desk</div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-[#1769AA] text-white shadow-[0_8px_18px_rgba(23,105,170,0.25)]'
                      : 'text-[#B7CDDC] hover:bg-[#123A56] hover:text-white'
                  }`}
                >
                  <span className={active ? 'text-white' : 'text-[#79A5C1]'}>
                    <Icon name={item.icon} size={17} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto space-y-4 pt-6">
            <div className="flex items-center justify-between rounded-xl border border-[#315372] bg-[#102E47] px-3 py-3 text-xs text-[#D5E7F1]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <span>All systems operational</span>
              </div>
              <Icon name="ChevronRight" size={14} />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#315372] bg-[#102E47] px-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-700/70 text-xs font-bold text-sky-50">AK</div>
              <div>
                <div className="text-sm font-semibold text-white">Arjun Kapoor</div>
                <div className="text-[11px] text-slate-400">Operations lead</div>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-[#D7E3EC] bg-white/95 shadow-[0_2px_12px_rgba(15,39,66,0.04)]">
            <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6 xl:px-8">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1769AA]">Emergency operations / {currentTitle.toUpperCase()}</div>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#0f2742] md:text-2xl">{currentTitle}</h1>
              </div>

              <div className="hidden items-center gap-4 md:flex">
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-green-700">
                  <span className="h-2 w-2 rounded-full bg-green-600" />
                  Live system
                </div>
                <button className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-400 hover:text-[#0f2742]">
                  <Icon name="Bell" size={16} />
                </button>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Icon name="CalendarDays" size={15} />
                  Aug 24, 2026
                </div>
              </div>
            </div>

          </header>

          <main className="p-4 md:p-7 xl:p-9">{children}</main>
        </div>
      </div>
    </div>
  )
}