"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  MapPin,
  ShieldAlert,
  Users,
  Clock3,
  RefreshCw,
  HeartPulse,
  Droplets,
  Utensils,
  LifeBuoy,
  Home,
  X,
} from "lucide-react"

const API_URL = "https://floodguard-ai-fork.onrender.com"

type ExtractedData = {
  source_type?: string | null
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
}

type SOSRequest = {
  id: number
  created_at: string
  status: string
  original_message: string
  extracted_data: ExtractedData
}

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false

  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return false
  }

  return true
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return value
  }
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
}

function statusClass(status: string) {
  switch (status.toLowerCase()) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700"

    case "rescue assigned":
      return "border-blue-200 bg-blue-50 text-blue-700"

    case "resolved":
      return "border-green-200 bg-green-50 text-green-700"

    default:
      return "border-slate-200 bg-slate-50 text-slate-600"
  }
}

export default function UserDashboard() {

  const [requests, setRequests] =
    useState<SOSRequest[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState("")

  const [selectedRequest, setSelectedRequest] =
    useState<SOSRequest | null>(null)

  const [refreshing, setRefreshing] =
    useState(false)

    async function loadRequests(refresh = false) {
      try {
        if (refresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }
    
        setError("")
    
        const controller = new AbortController()
    
        const timeout = setTimeout(() => {
          controller.abort()
        }, 60000)
    
        const response = await fetch(
          `${API_URL}/sos`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        )
    
        clearTimeout(timeout)
    
        if (!response.ok) {
          throw new Error(
            `GET /sos failed with status ${response.status}`
          )
        }
    
        const data = await response.json()
    
        console.log("SOS API response:", data)
    
        if (!Array.isArray(data.requests)) {
          throw new Error(
            "Invalid SOS response format."
          )
        }
    
        const parsedRequests: SOSRequest[] =
          data.requests.map((request: any) => {
    
            let extractedData = request.extracted_data
    
            // Backend may return extracted_data
            // as a JSON string or an object.
            if (typeof extractedData === "string") {
              try {
                extractedData = JSON.parse(extractedData)
              } catch {
                extractedData = {}
              }
            }
    
            return {
              ...request,
              extracted_data: extractedData || {},
            }
          })
    
        setRequests(parsedRequests)
    
      } catch (err: any) {
    
        console.error("SOS loading error:", err)
    
        if (err?.name === "AbortError") {
          setError(
            "The SOS server did not respond. Make sure the backend is running on port 8000."
          )
        } else {
          setError(
            "Unable to load your requests."
          )
        }
    
        setRequests([])
    
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }

  useEffect(() => {
    loadRequests()
  }, [])

  return (
    <main className="min-h-screen bg-[#f7fafc] text-[#102a43]">

      {/* ============================================================
          HEADER
      ============================================================ */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f2742] text-white">
              <ShieldAlert size={18} />
            </div>

            <div>

              <div className="text-base font-semibold tracking-tight">
                FloodGuard
              </div>

              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Emergency assistance
              </div>

            </div>

          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Network online
          </div>

        </div>

      </header>


      {/* ============================================================
          DASHBOARD
      ============================================================ */}

      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">

        {/* GREETING */}

        <div className="mb-8">

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Emergency dashboard
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0f2742]">
            How can we help?
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Request emergency assistance, check your requests,
            or access safety information.
          </p>

        </div>


        {/* ============================================================
            SOS CARD
        ============================================================ */}

        <div className="overflow-hidden rounded-2xl border border-red-100 bg-white">

          <div className="p-6 sm:p-8">

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <ShieldAlert size={24} />
                </div>

                <div>

                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-red-500">
                    Emergency
                  </p>

                  <h2 className="mt-1 text-xl font-semibold text-[#0f2742]">
                    Need immediate help?
                  </h2>

                  <p className="mt-1 max-w-lg text-sm leading-6 text-slate-500">
                    Send an SOS request to the FloodGuard response
                    network. Your location and situation can be
                    shared with emergency responders.
                  </p>

                </div>

              </div>


              <Link
                href="/user/sos"
                className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#c62828] px-6 text-sm font-semibold text-white transition hover:bg-[#ad2020] active:scale-[0.98]"
              >
                <ShieldAlert size={17} />
                Send SOS
              </Link>

            </div>

          </div>


          {/* STATUS STRIP */}

          <div className="grid border-t border-red-100 bg-red-50/40 sm:grid-cols-3">

            <DashboardStatus
              icon={<MapPin size={16} />}
              title="Location"
              value="Shared securely"
            />

            <DashboardStatus
              icon={<Users size={16} />}
              title="Response"
              value="Live network"
            />

            <DashboardStatus
              icon={<CheckCircle2 size={16} />}
              title="Availability"
              value="24 / 7"
            />

          </div>

        </div>


        {/* ============================================================
            OTHER USER OPTIONS
        ============================================================ */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">


          {/* ========================================================
              MY REQUESTS
          ======================================================== */}

          <button
            type="button"
            onClick={() =>
              document
                .getElementById("my-requests")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
            className="group rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm"
          >

            <div className="flex items-start justify-between">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <FileText size={18} />
              </div>

              <ArrowRight
                size={17}
                className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500"
              />

            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#0f2742]">
              My requests
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              View the status of emergency requests you have sent.
            </p>

            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-blue-600">
              {loading
                ? "Loading..."
                : `${requests.length} request${
                    requests.length === 1
                      ? ""
                      : "s"
                  }`}
            </p>

          </button>


          {/* SAFETY */}

          <button
            disabled
            className="group rounded-xl border border-slate-200 bg-white p-5 text-left opacity-90"
          >

            <div className="flex items-start justify-between">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <ShieldAlert size={18} />
              </div>

              <ArrowRight
                size={17}
                className="text-slate-300"
              />

            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#0f2742]">
              Safety information
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Access flood safety guidance and emergency instructions.
            </p>

            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Coming soon
            </p>

          </button>

        </div>


        {/* ============================================================
            MY REQUESTS SECTION
        ============================================================ */}

        <section
          id="my-requests"
          className="mt-10 scroll-mt-6"
        >

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Emergency history
              </p>

              <h2 className="mt-1 text-lg font-semibold text-[#0f2742]">
                My requests
              </h2>

            </div>

            <button
              type="button"
              onClick={() =>
                loadRequests(true)
              }
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 disabled:opacity-50"
            >

              <RefreshCw
                size={13}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh

            </button>

          </div>


          {/* LOADING */}

          {loading && (

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-8 text-center">

              <RefreshCw
                size={20}
                className="mx-auto animate-spin text-slate-400"
              />

              <p className="mt-3 text-xs text-slate-500">
                Loading your requests...
              </p>

            </div>

          )}


          {/* ERROR */}

          {!loading && error && (

            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5">

              <p className="text-sm font-medium text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  loadRequests()
                }
                className="mt-3 text-xs font-semibold text-red-700 underline"
              >
                Try again
              </button>

            </div>

          )}


          {/* EMPTY */}

          {!loading &&
            !error &&
            requests.length === 0 && (

              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">

                <FileText
                  size={22}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm font-medium text-[#0f2742]">
                  No emergency requests yet
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Requests you submit will appear here.
                </p>

              </div>

            )}


          {/* REQUEST LIST */}

          {!loading &&
            !error &&
            requests.length > 0 && (

              <div className="mt-4 space-y-3">

                {requests.map((request) => {

                  const data =
                    request.extracted_data

                  const location =
                    data.location?.text

                  const totalPeople =
                    data.people?.total

                  const requestType =
                    data.request?.type

                  return (

                    <button
                      key={request.id}
                      type="button"
                      onClick={() =>
                        setSelectedRequest(request)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-blue-200 hover:shadow-sm"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="text-sm font-semibold text-[#0f2742]">
                              SOS #{request.id}
                            </span>

                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(
                                request.status
                              )}`}
                            >
                              {request.status}
                            </span>

                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">

                            {hasValue(location) && (

                              <span className="flex items-center gap-1.5">
                                <MapPin size={12} />
                                {location}
                              </span>

                            )}

                            {hasValue(totalPeople) && (

                              <span className="flex items-center gap-1.5">
                                <Users size={12} />
                                {totalPeople} people
                              </span>

                            )}

                            {hasValue(requestType) && (

                              <span>
                                {formatLabel(
                                  String(requestType)
                                )}
                              </span>

                            )}

                            <span className="flex items-center gap-1.5">
                              <Clock3 size={12} />
                              {formatDate(
                                request.created_at
                              )}
                            </span>

                          </div>

                        </div>

                        <ArrowRight
                          size={16}
                          className="mt-1 shrink-0 text-slate-300"
                        />

                      </div>

                    </button>

                  )
                })}

              </div>

            )}

        </section>


        {/* ============================================================
            FOOTER NOTE
        ============================================================ */}

        <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4">

          <CheckCircle2
            size={17}
            className="mt-0.5 shrink-0 text-green-600"
          />

          <p className="text-xs leading-5 text-slate-500">
            FloodGuard emergency assistance is available around
            the clock. Only send an SOS when you genuinely need
            emergency assistance.
          </p>

        </div>

      </section>


      {/* ============================================================
          REQUEST DETAILS MODAL
      ============================================================ */}

      {selectedRequest && (

        <RequestDetails
          request={selectedRequest}
          onClose={() =>
            setSelectedRequest(null)
          }
        />

      )}

    </main>
  )
}


/* ================================================================
   REQUEST DETAILS
================================================================ */

function RequestDetails({
  request,
  onClose,
}: {
  request: SOSRequest
  onClose: () => void
}) {

  const data =
    request.extracted_data

  const people =
    data.people

  const needs =
    data.needs

  const resources =
    data.request?.resources || []

  const contacts =
    data.contact_info || []

  return (

    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f2742]/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-5">

      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">

        {/* HEADER */}

        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">

          <div>

            <div className="flex items-center gap-2">

              <h2 className="text-base font-semibold text-[#0f2742]">
                SOS #{request.id}
              </h2>

              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(
                  request.status
                )}`}
              >
                {request.status}
              </span>

            </div>

            <p className="mt-1 text-[11px] text-slate-400">
              {formatDate(request.created_at)}
            </p>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X size={17} />
          </button>

        </div>


        <div className="space-y-6 p-5">

          {/* LOCATION */}

          {hasValue(
            data.location?.text
          ) && (

            <DetailSection
              title="Location"
              icon={<MapPin size={15} />}
            >
              <p className="text-sm font-medium text-[#0f2742]">
                {data.location?.text}
              </p>
            </DetailSection>

          )}


          {/* PEOPLE */}

          {people && (

            <DetailSection
              title="People"
              icon={<Users size={15} />}
            >

              <div className="divide-y divide-slate-100">

                <PeopleValue
                  label="Total"
                  value={people.total}
                />

                <PeopleValue
                  label="Children"
                  value={people.children}
                />

                <PeopleValue
                  label="Elderly"
                  value={people.elderly}
                />

                <PeopleValue
                  label="Pregnant"
                  value={people.pregnant}
                />

                <PeopleValue
                  label="Injured"
                  value={people.injured}
                />

                <PeopleValue
                  label="Missing"
                  value={people.missing}
                />

                <PeopleValue
                  label="Deceased"
                  value={people.deceased}
                />

                <PeopleValue
                  label="Mobility impaired"
                  value={
                    people.mobility_impaired
                  }
                />

              </div>

            </DetailSection>

          )}


          {/* REQUEST */}

          {/* REQUEST */}

{(
  hasValue(data.source_type) ||
  hasValue(data.request?.type)
) && (

  <DetailSection
    title="Request"
    icon={<LifeBuoy size={15} />}
  >

    {/* SOS TYPE */}

    {hasValue(data.source_type) && (
      <div>

        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          SOS Type
        </div>

        <p className="mt-1 text-sm font-medium text-[#0f2742]">
          {formatLabel(
            String(data.source_type)
          )}
        </p>

      </div>
    )}


    {/* PRIMARY REQUEST */}

    {hasValue(data.request?.type) && (
      <div className="mt-4">

        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Primary Request
        </div>

        <p className="mt-1 text-sm font-medium text-[#0f2742]">
          {formatLabel(
            String(data.request?.type)
          )}
        </p>

      </div>
    )}

  </DetailSection>

)}


          {/* NEEDS */}

          {needs && (

            <DetailSection
              title="Assistance needed"
              icon={<HeartPulse size={15} />}
            >

              <div className="flex flex-wrap gap-2">

                {needs.rescue && (
                  <Need
                    label="Rescue"
                    icon={
                      <LifeBuoy size={13} />
                    }
                  />
                )}

                {needs.water && (
                  <Need
                    label="Water"
                    icon={
                      <Droplets size={13} />
                    }
                  />
                )}

                {needs.food && (
                  <Need
                    label="Food"
                    icon={
                      <Utensils size={13} />
                    }
                  />
                )}

                {needs.medicine && (
                  <Need
                    label="Medicine"
                    icon={
                      <HeartPulse size={13} />
                    }
                  />
                )}

                {needs.shelter && (
                  <Need
                    label="Shelter"
                    icon={
                      <Home size={13} />
                    }
                  />
                )}

                {needs.medical_transfer && (
                  <Need
                    label="Medical transfer"
                    icon={
                      <HeartPulse size={13} />
                    }
                  />
                )}

              </div>

            </DetailSection>

          )}


          {/* SITUATION */}

          {hasValue(data.situation) && (

            <DetailSection
              title="Situation"
              icon={
                <FileText size={15} />
              }
            >

              <p className="text-sm leading-6 text-slate-600">
                {data.situation}
              </p>

            </DetailSection>

          )}


          {/* CONTACT */}

          {contacts.length > 0 && (

            <DetailSection
              title="Contact"
              icon={
                <Users size={15} />
              }
            >

              <div className="space-y-1">

                {contacts.map(
                  (contact) => (

                    <p
                      key={contact}
                      className="text-sm font-medium text-[#0f2742]"
                    >
                      {contact}
                    </p>

                  )
                )}
                        {/* ORIGINAL SOS MESSAGE */}

          {hasValue(request.original_message) && (
              <div className="pt-2">
<DetailSection
  title="Original SOS message"
  icon={
    <FileText size={15} />
  }
>

  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

    <p className="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-slate-600">
      {request.original_message}
    </p>

  </div>

</DetailSection>
</div>
)}
              </div>

            </DetailSection>

          )}

        </div>

      </div>

    </div>

  )
}


/* ================================================================
   SMALL COMPONENTS
================================================================ */

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div>

      <div className="mb-3 flex items-center gap-2 text-slate-400">

        {icon}

        <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em]">
          {title}
        </h3>

      </div>

      {children}

    </div>
  )
}


function PeopleValue({
  label,
  value,
}: {
  label: string
  value?: string | number | null
}) {

  if (!hasValue(value)) {
    return null
  }

  return (

    <div className="flex items-center justify-between py-2">

      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span className="text-xs font-semibold text-[#0f2742]">
        {value}
      </span>

    </div>

  )
}


function Need({
  label,
  icon,
}: {
  label: string
  icon: ReactNode
}) {

  return (

    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600">
      {icon}
      {label}
    </span>

  )
}


function DashboardStatus({
  icon,
  title,
  value,
}: {
  icon: ReactNode
  title: string
  value: string
}) {

  return (

    <div className="flex items-center gap-3 border-b border-red-100 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">

      <div className="text-slate-400">
        {icon}
      </div>

      <div>

        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </div>

        <div className="mt-0.5 text-xs font-medium text-[#0f2742]">
          {value}
        </div>

      </div>

    </div>

  )
}