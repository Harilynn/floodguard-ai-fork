"use client"

import { useEffect, useState } from 'react'
import { Panel, SectionHeader, StatusBadge, ProgressBar, Icon } from '@/components/ui/shared'
import { apiGet, apiPost } from '@/lib/api'

interface RescueResource {
  resource_id: string
  status: string
  capacity_remaining: number
  latitude?: number
  longitude?: number
  [key: string]: any
}

interface RescueIncident {
  incident_id: string
  people_remaining: number
  priority_level?: string
  status: string
  [key: string]: any
}

const statusTone: Record<string, 'good' | 'medium' | 'warning' | 'critical'> = {
  AVAILABLE: 'good',
  BUSY: 'critical',
  OFFLINE: 'warning',
}

export default function RescueResourcePage() {
  const [resources, setResources] = useState<RescueResource[]>([])
  const [incidents, setIncidents] = useState<RescueIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [releasing, setReleasing] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<{ resources: RescueResource[]; incidents: RescueIncident[] }>('/api/rescue-resources')
      setResources(data.resources || [])
      setIncidents(data.incidents || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const runOptimization = async () => {
    setRunning(true)
    setError(null)
    try {
      await apiPost('/api/module5/run')
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const releaseResource = async (resourceId: string) => {
    setReleasing(resourceId)
    setError(null)
    try {
      await apiPost(`/api/rescue-resources/${resourceId}/release`)
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setReleasing(null)
    }
  }

  const available = resources.filter(r => r.status === 'AVAILABLE').length
  const busy = resources.filter(r => r.status === 'BUSY').length
  const peopleWaiting = incidents.reduce((sum, i) => sum + (i.people_remaining || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={runOptimization}
          disabled={running}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {running ? 'Running…' : 'Run Rescue Allocation (Module 5)'}
        </button>
      </div>

      {error && (
        <Panel className="p-4 bg-red-950 border-red-800 text-red-300 text-sm">{error}</Panel>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <Panel className="p-5 bg-[#1a3a52] border-[#2d5a7b]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total Resources</div>
          <div className="mt-3 text-3xl font-bold text-white">{resources.length}</div>
        </Panel>
        <Panel className="p-5 bg-[#1a3a52] border-[#2d5a7b]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Busy</div>
          <div className="mt-3 text-3xl font-bold text-red-400">{busy}</div>
        </Panel>
        <Panel className="p-5 bg-[#1a3a52] border-[#2d5a7b]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Available</div>
          <div className="mt-3 text-3xl font-bold text-green-400">{available}</div>
        </Panel>
        <Panel className="p-5 bg-[#1a3a52] border-[#2d5a7b]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">People Waiting</div>
          <div className="mt-3 text-3xl font-bold text-blue-400">{peopleWaiting}</div>
        </Panel>
      </section>

      <Panel className="p-5 bg-[#1a3a52] border-[#2d5a7b]">
        <SectionHeader eyebrow="Resource deployment" title="Rescue resources (live)" icon="Users" />

        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : resources.length === 0 ? (
          <div className="text-sm text-slate-400">No rescue resources found in Supabase yet.</div>
        ) : (
          <div className="space-y-3">
            {resources.map((resource) => (
              <div key={resource.resource_id} className="rounded-lg border border-[#2d5a7b] bg-[#173b5e] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2d5a7b]">
                      <Icon name="Users" size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {resource.name || `Resource ${resource.resource_id}`}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        Capacity remaining: {resource.capacity_remaining}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge label={resource.status} tone={statusTone[resource.status] ?? 'medium'} />
                    {resource.status === 'BUSY' && (
                      <button
                        type="button"
                        onClick={() => releaseResource(resource.resource_id)}
                        disabled={releasing === resource.resource_id}
                        className="rounded-md border border-[#79B7D8] px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-[#2d5a7b] disabled:opacity-50"
                      >
                        {releasing === resource.resource_id ? 'Releasing…' : 'Mark available'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="p-5 bg-[#1a3a52] border-[#2d5a7b]">
        <SectionHeader eyebrow="Incident queue" title="Active rescue incidents" icon="Siren" />
        {incidents.length === 0 ? (
          <div className="text-sm text-slate-400">No active incidents.</div>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div key={incident.incident_id} className="rounded-lg border border-[#2d5a7b] bg-[#173b5e] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white">{incident.incident_id} — {incident.people_remaining} waiting</div>
                  <StatusBadge label={incident.priority_level || incident.status} tone={incident.priority_level === 'CRITICAL' ? 'critical' : 'medium'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}