"use client"

import { useEffect, useState } from "react"
import {
  X,
  MapPin,
  Users,
  Clock3,
  Phone,
  FileText,
  ShieldAlert,
  HeartPulse,
  Droplets,
  Utensils,
  Home,
} from "lucide-react"

import {
  Icon,
  Panel,
  SectionHeader,
  StatusBadge,
} from "@/components/ui/shared"

const API_URL =
  process.env.NEXT_PUBLIC_FLOODGAURD_API_URL || "http://127.0.0.1:8000"

type SOSRequest = {
  id: string
  created_at: string
  status: string
  dispatch_status?: string
  dispatch_message?: string
  original_message: string
  extracted_data: ExtractedData | string
}

type ExtractedData = {
  source_type?: string
  priority?: {
    priority_level?: string
    priority_score?: number
  }

  location?: {
    text?: string | null
    latitude?: number | null
    longitude?: number | null
  }

  people?: {
    total?: string | number | null
    children?: string | number | null
    elderly?: string | number | null
    pregnant?: string | number | null
    injured?: string | number | null
    missing?: string | number | null
    deceased?: string | number | null
    mobility_impaired?: string | number | null
  }

  situation?: string | null

  request?: {
    type?: string | null
    resources?: string[] | null
  }

  needs?: {
    food?: boolean | null
    water?: boolean | null
    medicine?: boolean | null
    shelter?: boolean | null
    rescue?: boolean | null
    medical_transfer?: boolean | null
  }

  contact_info?: string[] | null
  original_message?: string
}


function parseExtractedData(
  data: ExtractedData | string
): ExtractedData {
  if (typeof data === "string") {
    try {
      return JSON.parse(data)
    } catch {
      return {}
    }
  }

  return data || {}
}


function formatDate(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}


function formatLabel(value?: string | null) {
  if (!value) return ""

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}


function getPriority(data: ExtractedData) {
  const people = data.people

  if (
    people?.deceased &&
    String(people.deceased) !== "0"
  ) {
    return "CRITICAL"
  }

  if (
    people?.injured &&
    String(people.injured) !== "0"
  ) {
    return "CRITICAL"
  }

  if (
    people?.missing &&
    String(people.missing) !== "0"
  ) {
    return "CRITICAL"
  }

  if (data.needs?.rescue) {
    return "HIGH"
  }

  if (data.needs?.medical_transfer) {
    return "HIGH"
  }

  return "MEDIUM"
}


const priorityTone: Record<
  string,
  "critical" | "high" | "medium" | "good" | "neutral"
> = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "neutral",
}


export default function SOSPage() {

  const [requests, setRequests] =
    useState<SOSRequest[]>([])

  const [selectedRequest, setSelectedRequest] =
    useState<SOSRequest | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState("")


  async function loadRequests() {

    try {

      setLoading(true)
      setError("")

      const response = await fetch(
        `${API_URL}/sos`,
        {
          cache: "no-store",
        }
      )

      if (!response.ok) {
        throw new Error(
          "Unable to load SOS requests."
        )
      }

      const data = await response.json()

      setRequests(data.requests || [])

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load SOS requests."
      )

    } finally {

      setLoading(false)

    }
  }


  useEffect(() => {
    loadRequests()
  }, [])


  return (

    <div className="space-y-6">

      <Panel className="p-5">

        <SectionHeader
          eyebrow="Incoming alerts"
          title="Emergency request queue"
          icon="Siren"
          action={
            <button
              onClick={loadRequests}
              className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-[#2563eb]"
            >
              Refresh
            </button>
          }
        />


        {loading && (

          <div className="py-12 text-center text-sm text-slate-500">
            Loading SOS requests...
          </div>

        )}


        {error && !loading && (

          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {error}
          </div>

        )}


        {!loading &&
          !error &&
          requests.length === 0 && (

            <div className="py-12 text-center text-sm text-slate-500">
              No SOS requests received yet.
            </div>

          )}


        {!loading &&
          !error &&
          requests.length > 0 && (

            <div className="overflow-x-auto">

              {/* TABLE HEADER */}

              <div className="grid min-w-205 grid-cols-[1.1fr_1.4fr_.6fr_.8fr_1.4fr] gap-4 border-b border-slate-200 px-4 pb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">

                <span>Priority / ID</span>
                <span>Location</span>
                <span>People</span>
                <span>Time</span>
                <span>Status / action</span>

              </div>


              {/* REQUESTS */}

              <div className="min-w-205 divide-y divide-slate-200">

                {requests.map((request) => {

                  const extracted =
                    parseExtractedData(
                      request.extracted_data
                    )

                  const priority =
                    extracted.priority?.priority_level ||
                    getPriority(extracted)

                  const location =
                    extracted.location?.text ||
                    "Location unavailable"

                  const people =
                    extracted.people?.total ||
                    "—"

                  const resources =
                    extracted.request?.resources || []


                  return (

                    <button
                      key={request.id}
                      type="button"
                      onClick={() =>
                        setSelectedRequest(request)
                      }
                      className={`grid w-full grid-cols-[1.1fr_1.4fr_.6fr_.8fr_1.4fr] items-center gap-4 px-4 py-4 text-left transition hover:bg-blue-50 ${
                        priority === "CRITICAL"
                          ? "bg-red-50"
                          : "bg-white"
                      }`}
                    >

                      {/* PRIORITY / ID */}

                      <div className="flex items-center gap-2">

                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            priority === "CRITICAL"
                              ? "bg-[#d92d20]"
                              : priority === "HIGH"
                                ? "bg-[#e58a00]"
                                : "bg-[#2563eb]"
                          }`}
                        />

                        <div className="flex items-center gap-2">

                          <span className="text-sm font-semibold text-[#102A43]">
                            {request.id}
                          </span>

                          <StatusBadge
                            label={priority}
                            tone={
                              priorityTone[priority] ??
                              "neutral"
                            }
                          />

                        </div>

                      </div>


                      {/* LOCATION */}

                      <div className="flex items-center gap-2 text-sm text-slate-700">

                        <MapPin size={15} />

                        <span className="truncate">
                          {location}
                        </span>

                      </div>


                      {/* PEOPLE */}

                      <span className="text-sm font-semibold text-[#0f2742]">
                        {people}
                      </span>


                      {/* TIME */}

                      <span className="text-xs text-slate-500">
                        {formatDate(
                          request.created_at
                        )}
                      </span>


                      {/* STATUS */}

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">

                        <StatusBadge
                          label={request.dispatch_status || request.status}
                          tone={
                            request.dispatch_status === "DISPATCH_ERROR"
                              ? "critical"
                              : request.dispatch_status === "WAITING_FOR_RESOURCES" || request.status === "PENDING"
                              ? "warning"
                              : request.dispatch_status === "ASSIGNED" || request.status === "ASSIGNED"
                                ? "medium"
                                : "good"
                          }
                        />

                        <span className="hidden xl:inline">
                          {request.dispatch_message || resources
                            .slice(0, 4)
                            .map(formatLabel)
                            .join(" · ")}
                        </span>

                      </div>

                    </button>

                  )

                })}

              </div>

            </div>

          )}

      </Panel>


      {/* ============================================================
          FULL SOS DETAILS MODAL
      ============================================================ */}

      {selectedRequest && (

        <SOSDetailsModal
          request={selectedRequest}
          onClose={() =>
            setSelectedRequest(null)
          }
        />

      )}

    </div>
  )
}


/* ================================================================
   SOS DETAILS MODAL
================================================================ */

function SOSDetailsModal({
  request,
  onClose,
}: {
  request: SOSRequest
  onClose: () => void
}) {

  const data =
    parseExtractedData(
      request.extracted_data
    )

  const people =
    data.people

  const needs =
    data.needs

  const resources =
    data.request?.resources || []

  const contacts =
    data.contact_info || []

  const location =
    data.location

  const originalMessage =
    request.original_message ||
    data.original_message ||
    ""


  return (

    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f2742]/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >

      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        {/* HEADER */}

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">

          <div>

            <div className="flex items-center gap-3">

              <h2 className="text-lg font-semibold text-[#0f2742]">
                SOS-{request.id}
              </h2>

              <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-semibold uppercase text-orange-600">
                {request.status}
              </span>

            </div>

            <p className="mt-1 text-xs text-slate-400">
              {formatDate(request.created_at)}
            </p>

          </div>


          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>

        </div>


        <div className="space-y-7 p-6">


          {/* ======================================================
              LOCATION
          ====================================================== */}

          {location && (

            <ModalSection
              title="Location"
              icon={<MapPin size={16} />}
            >

              <p className="text-sm font-semibold text-[#0f2742]">
                {location.text ||
                  "Location unavailable"}
              </p>

              {(location.latitude != null ||
                location.longitude != null) && (

                <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  {location.latitude != null && (
                    <p className="text-xs font-medium text-slate-600">
                      Latitude: {location.latitude}
                    </p>
                  )}

                  {location.longitude != null && (
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      Longitude: {location.longitude}
                    </p>
                  )}
                </div>

              )}

            </ModalSection>

          )}


          {/* ======================================================
              PEOPLE
          ====================================================== */}

          {people && (

            <ModalSection
              title="People"
              icon={<Users size={16} />}
            >

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

                <DetailBox
                  label="Total"
                  value={people.total}
                />

                <DetailBox
                  label="Children"
                  value={people.children}
                />

                <DetailBox
                  label="Elderly"
                  value={people.elderly}
                />

                <DetailBox
                  label="Injured"
                  value={people.injured}
                />

                <DetailBox
                  label="Missing"
                  value={people.missing}
                />

                <DetailBox
                  label="Pregnant"
                  value={people.pregnant}
                />

                <DetailBox
                  label="Deceased"
                  value={people.deceased}
                />

                <DetailBox
                  label="Mobility impaired"
                  value={people.mobility_impaired}
                />

              </div>

            </ModalSection>

          )}


          {/* ======================================================
              SOS TYPE
          ====================================================== */}

          {data.request?.type && (

            <ModalSection
              title="SOS category"
              icon={<ShieldAlert size={16} />}
            >

              <p className="text-sm font-semibold text-[#0f2742]">
                {formatLabel(
                  data.request.type
                )}
              </p>

            </ModalSection>

          )}


          {/* ======================================================
              RESOURCES
          ====================================================== */}

          {resources.length > 0 && (

            <ModalSection
              title="Requested resources"
              icon={<HeartPulse size={16} />}
            >

              <div className="flex flex-wrap gap-2">

                {resources.map(
                  (resource, index) => (

                    <span
                      key={`${resource}-${index}`}
                      className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"
                    >
                      {formatLabel(resource)}
                    </span>

                  )
                )}

              </div>

            </ModalSection>

          )}


          {/* ======================================================
              ASSISTANCE NEEDED
          ====================================================== */}

          {needs && (

            <ModalSection
              title="Assistance needed"
              icon={<ShieldAlert size={16} />}
            >

              <div className="flex flex-wrap gap-2">

                {needs.rescue && (
                  <NeedBadge
                    icon={<ShieldAlert size={14} />}
                    label="Rescue"
                  />
                )}

                {needs.medicine && (
                  <NeedBadge
                    icon={<HeartPulse size={14} />}
                    label="Medicine"
                  />
                )}

                {needs.water && (
                  <NeedBadge
                    icon={<Droplets size={14} />}
                    label="Water"
                  />
                )}

                {needs.food && (
                  <NeedBadge
                    icon={<Utensils size={14} />}
                    label="Food"
                  />
                )}

                {needs.shelter && (
                  <NeedBadge
                    icon={<Home size={14} />}
                    label="Shelter"
                  />
                )}

                {needs.medical_transfer && (
                  <NeedBadge
                    icon={<HeartPulse size={14} />}
                    label="Medical transfer"
                  />
                )}

              </div>

            </ModalSection>

          )}


          {/* ======================================================
              SITUATION
          ====================================================== */}

          {data.situation && (

            <ModalSection
              title="Situation"
              icon={<FileText size={16} />}
            >

              <p className="text-sm leading-6 text-slate-600">
                {data.situation}
              </p>

            </ModalSection>

          )}


          {/* ======================================================
              CONTACT
          ====================================================== */}

          {contacts.length > 0 && (

            <ModalSection
              title="Contact"
              icon={<Phone size={16} />}
            >

              <div className="space-y-2">

                {contacts.map(
                  (contact, index) => (

                    <p
                      key={`${contact}-${index}`}
                      className="text-sm font-semibold text-[#0f2742]"
                    >
                      {contact}
                    </p>

                  )
                )}

              </div>

            </ModalSection>

          )}


          {/* ======================================================
              ORIGINAL MESSAGE
          ====================================================== */}

          {originalMessage && (

            <ModalSection
              title="Original SOS message"
              icon={<FileText size={16} />}
            >

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <p className="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-slate-600">
                  {originalMessage}
                </p>

              </div>

            </ModalSection>

          )}

        </div>

      </div>

    </div>

  )
}


/* ================================================================
   MODAL SECTION
================================================================ */

function ModalSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {

  return (

    <section>

      <div className="mb-3 flex items-center gap-2">

        <div className="text-slate-400">
          {icon}
        </div>

        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {title}
        </h3>

      </div>

      {children}

    </section>

  )
}


/* ================================================================
   DETAIL BOX
================================================================ */

function DetailBox({
  label,
  value,
}: {
  label: string
  value?: string | number | null
}) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null
  }

  return (

    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">

      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold text-[#0f2742]">
        {String(value)}
      </div>

    </div>

  )
}


/* ================================================================
   NEED BADGE
================================================================ */

function NeedBadge({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {

  return (

    <span className="flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">

      {icon}

      {label}

    </span>

  )
}