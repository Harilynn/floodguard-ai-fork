import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FloodGuard AI — Disaster Response Command Center',
  description: 'Real-time flood monitoring and emergency response operations dashboard.',
  generator: 'FloodGuard AI',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#0B1D2D',
  userScalable: false,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
