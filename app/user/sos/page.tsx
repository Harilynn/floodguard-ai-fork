"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Cross,
  Droplets,
  Flame,
  HeartPulse,
  Home,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Send,
  ShieldAlert,
  Utensils,
  Users,
} from "lucide-react"

const API_URL = "https://floodguard-ai-fork.onrender.com"

type Need =
  | "RESCUE"
  | "MEDICAL"
  | "WATER"
  | "FOOD"
  | "SHELTER"
  | "OTHER"

type SosResponse = {
  id?: string
  status?: string
  dispatch_status?: string
  dispatch_message?: string
  source_type?: string

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

type NearbyShelter = {
  id?: string
  shelter_id?: string
  name: string
  address?: string
  latitude: number
  longitude: number
  distanceKm?: number
}

const needOptions: {
  id: Need
  label: string
  description: string
  icon: React.ElementType
}[] = [
  {
    id: "RESCUE",
    label: "Rescue",
    description: "Trapped or stranded",
    icon: ShieldAlert,
  },
  {
    id: "MEDICAL",
    label: "Medical",
    description: "Injury or medical help",
    icon: HeartPulse,
  },
  {
    id: "WATER",
    label: "Water",
    description: "Drinking water needed",
    icon: Droplets,
  },
  {
    id: "FOOD",
    label: "Food",
    description: "Food supplies needed",
    icon: Utensils,
  },
  {
    id: "SHELTER",
    label: "Shelter",
    description: "Safe place needed",
    icon: Home,
  },
  {
    id: "OTHER",
    label: "Other",
    description: "Something else",
    icon: Flame,
  },
]

export default function UserSOSPage() {
  const [step, setStep] = useState<
    "home" | "form" | "submitted"
  >("home")

  const [selectedNeeds, setSelectedNeeds] =
    useState<Need[]>([])

  const [people, setPeople] = useState(1)

  const [message, setMessage] = useState("")

  const [locationText, setLocationText] = useState("")


  const [submitting, setSubmitting] =
    useState(false)

  const [error, setError] = useState("")

  const [result, setResult] =
    useState<SosResponse | null>(null)

  const [nearbyShelters, setNearbyShelters] =
    useState<NearbyShelter[]>([])

  const [sheltersLoading, setSheltersLoading] =
    useState(false)

  useEffect(() => {
    if (step !== "submitted" || !result?.id) {
      return
    }

    let active = true

    const refreshStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/sos`, { cache: "no-store" })
        if (!response.ok) return
        const data = await response.json()
        const current = data?.requests?.find(
          (request: { id?: string }) => request.id === result.id
        )
        if (!active || !current) return

        setResult((previous) => ({
          ...previous,
          status: current.status,
          dispatch_status: current.dispatch_status,
          dispatch_message: current.dispatch_message,
        }))
      } catch {
      }
    }

    const interval = window.setInterval(refreshStatus, 10000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [step, result?.id])


  function toggleNeed(need: Need) {
    setSelectedNeeds((current) =>
      current.includes(need)
        ? current.filter((item) => item !== need)
        : [...current, need]
    )
  }


  function buildMessage() {
    const needsText =
      selectedNeeds.length > 0
        ? selectedNeeds.join(", ")
        : "EMERGENCY ASSISTANCE"

    const description =
      message.trim() ||
      "Emergency assistance required."

    const location = locationText.trim() || "not provided"

    return `${people} ${
      people === 1 ? "person" : "people"
    } need help. Needs: ${needsText}. Location: ${location}. Situation: ${description}`
  }


  async function submitSOS() {
    setError("")

    if (selectedNeeds.length === 0) {
      setError(
        "Please select at least one type of help."
      )
      return
    }

    if (!message.trim()) {
      setError(
        "Please briefly describe what happened."
      )
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(
        `${API_URL}/sos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: buildMessage(),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to send SOS request."
        )
      }
      
      /*
       * Backend may return the extracted information either:
       *
       * 1. Directly:
       *    {
       *      location: {...},
       *      people: {...},
       *      request: {...}
       *    }
       *
       * 2. Inside extracted_data:
       *    {
       *      extracted_data: {
       *        location: {...},
       *        people: {...},
       *        request: {...}
       *      }
       *    }
       *
       * Handle both formats.
       */
      
      let extracted = data?.extracted_data ?? data
      
      // extracted_data may also arrive as a JSON string
      if (typeof extracted === "string") {
        try {
          extracted = JSON.parse(extracted)
        } catch {
          extracted = {}
        }
      }
      
      // Keep the original message available on the result screen
      const finalResult: SosResponse = {
        ...extracted,
        id: data?.id,
        status: data?.status,
        dispatch_status: data?.dispatch_status,
        dispatch_message: data?.dispatch_message,
        original_message:
          data?.original_message ??
          extracted?.original_message ??
          buildMessage(),
      }
      
      setResult(finalResult)

      if (
        (finalResult.needs?.shelter || finalResult.needs?.rescue) &&
        finalResult.location?.latitude !== null &&
        finalResult.location?.latitude !== undefined &&
        finalResult.location?.longitude !== null &&
        finalResult.location?.longitude !== undefined
      ) {
        setSheltersLoading(true)
        try {
          const shelterResponse = await fetch(
            `${API_URL}/shelters?latitude=${finalResult.location.latitude}&longitude=${finalResult.location.longitude}`
          )
          const shelterData = await shelterResponse.json()
          setNearbyShelters(
            Array.isArray(shelterData?.shelters)
              ? shelterData.shelters.slice(0, 5)
              : []
          )
        } catch {
          setNearbyShelters([])
        } finally {
          setSheltersLoading(false)
        }
      } else {
        setNearbyShelters([])
      }
      
      // Feature 3 has successfully analyzed the request.
      // Only now move to the submitted/result screen.
      setStep("submitted")

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send SOS request."
      )
    } finally {
      setSubmitting(false)
    }
  }


  function reset() {
    setStep("home")
    setSelectedNeeds([])
    setPeople(1)
    setMessage("")
    setLocationText("")
    setResult(null)
    setNearbyShelters([])
    setError("")
  }


  return (
    <main className="min-h-screen bg-[#f7fafc] text-[#102a43]">

      {/* ============================================================
          HEADER
      ============================================================ */}

      <header className="border-b border-[#183B5B] bg-[#0B1D2D] text-white">

        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4FAFC] text-[#0B1D2D]">

              <Cross
                size={18}
                strokeWidth={2.5}
              />

            </div>

            <div>

              <div className="text-base font-semibold tracking-tight">
                FloodGuard
              </div>

              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                <div className="text-[#9FC3DD]">Emergency assistance</div>
              </div>

            </div>

          </div>

          <div className="hidden items-center gap-2 text-xs text-[#C4D7E8] sm:flex">

            <span className="h-2 w-2 rounded-full bg-green-500" />

            Emergency network online

          </div>

        </div>

      </header>


      {/* ============================================================
          SCREEN 1 — HOME
      ============================================================ */}

      {step === "home" && (

        <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-4xl items-center justify-center px-5 py-12 sm:px-8">

          <div className="w-full max-w-xl text-center">

            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">

              <ShieldAlert size={28} />

            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Emergency assistance
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-[#0f2742] sm:text-4xl">
              Need help?
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              Send an emergency request to the response team.
              We&apos;ll share the information you provide to help
              responders understand your situation.
            </p>

            <button
              onClick={() => setStep("form")}
              className="mx-auto mt-9 flex h-20 w-20 items-center justify-center rounded-full bg-[#c62828] text-sm font-bold tracking-wide text-white shadow-lg shadow-red-200 transition hover:bg-[#ad2020] hover:shadow-xl active:scale-95 sm:h-24 sm:w-24"
            >
              SOS
            </button>

            <p className="mt-5 text-xs text-slate-400">
              Press only when you need emergency assistance
            </p>

            <div className="mx-auto mt-10 grid max-w-md grid-cols-2 gap-3 sm:grid-cols-3">

              <InfoItem
                icon={<MapPin size={16} />}
                label="Location"
                value="Shared securely"
              />

              <InfoItem
                icon={<Users size={16} />}
                label="Response"
                value="Live network"
              />

              <InfoItem
                icon={<Navigation size={16} />}
                label="Dispatch"
                value="24 / 7"
              />

            </div>

          </div>

        </section>

      )}


      {/* ============================================================
          SCREEN 2A — ANALYZING
      ============================================================ */}

      {step === "form" && submitting && (

        <section className="flex min-h-[70vh] items-center justify-center px-5">

          <div className="w-full max-w-md text-center">

            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">

              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />

            </div>

            <h1 className="text-xl font-semibold tracking-tight text-[#0f2742]">
              Analyzing emergency request
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
              FloodGuard is processing your information and preparing
              the emergency response.
            </p>

            <p className="mt-6 text-xs font-medium text-slate-400">
              Please keep this screen open.
            </p>

          </div>

        </section>

      )}


      {/* ============================================================
          SCREEN 2B — FORM
      ============================================================ */}

      {step === "form" && !submitting && (

        <section className="mx-auto max-w-2xl px-5 py-8 sm:px-8 sm:py-12">

          <button
            onClick={() => setStep("home")}
            className="mb-7 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#0f2742]"
          >
            <ArrowLeft size={16} />
            Back
          </button>


          {/* FORM HEADER */}

          <div className="mb-8 rounded-2xl border border-[#CBE5F2] bg-gradient-to-br from-white to-[#EAF6FB] p-6 sm:p-8">

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1769AA]">
              Emergency request / step 1
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0f2742] sm:text-3xl">
              Tell us what you need
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#526D82]">
              A few details help the response team act faster.
            </p>

          </div>


          {/* NEEDS */}

          <div>

            <label className="text-sm font-semibold text-[#0f2742]">
              What do you need help with?
            </label>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">

              {needOptions.map((option) => {

                const selected =
                  selectedNeeds.includes(option.id)

                const IconComponent = option.icon

                return (

                  <button
                    key={option.id}
                    onClick={() =>
                      toggleNeed(option.id)
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-[#2563eb] bg-blue-50 ring-1 ring-[#2563eb]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >

                    <IconComponent
                      size={19}
                      className={
                        selected
                          ? "text-[#2563eb]"
                          : "text-slate-500"
                      }
                    />

                    <div className="mt-3 text-sm font-semibold text-[#0f2742]">
                      {option.label}
                    </div>

                    <div className="mt-1 text-[11px] leading-4 text-slate-400">
                      {option.description}
                    </div>

                  </button>

                )

              })}

            </div>

          </div>

          <div className="mt-6">
            <label htmlFor="location" className="text-sm font-semibold text-[#0f2742]">
              Where are you?
            </label>
            <input
              id="location"
              value={locationText}
              onChange={(event) => setLocationText(event.target.value)}
              placeholder="For example: Kuttanad, Kerala"
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#102a43] outline-none transition placeholder:text-slate-400 focus:border-[#1769AA] focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-2 text-[11px] text-slate-400">
              A place name helps the response team locate you and find nearby shelters.
            </p>
          </div>


          {/* PEOPLE */}

          <div className="mt-8">

            <label className="text-sm font-semibold text-[#0f2742]">
              How many people need help?
            </label>

            <div className="mt-3 flex w-fit items-center overflow-hidden rounded-xl border border-slate-200 bg-white">

              <button
                onClick={() =>
                  setPeople((value) =>
                    Math.max(1, value - 1)
                  )
                }
                className="flex h-12 w-12 items-center justify-center text-slate-500 transition hover:bg-slate-50"
              >
                <Minus size={17} />
              </button>

              <div className="flex h-12 min-w-16 items-center justify-center border-x border-slate-200 text-lg font-semibold">
                {people}
              </div>

              <button
                onClick={() =>
                  setPeople((value) =>
                    Math.min(999, value + 1)
                  )
                }
                className="flex h-12 w-12 items-center justify-center text-slate-500 transition hover:bg-slate-50"
              >
                <Plus size={17} />
              </button>

            </div>

          </div>


          {/* DESCRIPTION */}

          <div className="mt-8">

            <label
              htmlFor="situation"
              className="text-sm font-semibold text-[#0f2742]"
            >
              What happened?
            </label>

            <textarea
              id="situation"
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              placeholder="For example: We are trapped inside our house and the water level is rising..."
              rows={5}
              className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-[#102a43] outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
            />

          </div>


          {/* ERROR */}

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}


          {/* SUBMIT */}

          <button
            onClick={submitSOS}
            disabled={submitting}
            className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c62828] px-5 text-sm font-semibold text-white transition hover:bg-[#ad2020] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={16} />
            Send emergency request
          </button>

          <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
            Your request will be analyzed and forwarded to
            the emergency response team.
          </p>

        </section>

      )}


      {/* ============================================================
          SCREEN 3 — SUBMITTED / FEATURE 3 RESULT
      ============================================================ */}

      {step === "submitted" && (

        <section className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">

          {/* SUCCESS HEADER */}

          <div className="text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">

              <Check
                size={28}
                strokeWidth={2.5}
              />

            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-green-600">
              Request received
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0f2742]">
              SOS sent successfully
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              Your emergency request has been sent to the
              response team. Keep your phone available.
            </p>

          </div>


          {/* ========================================================
              REQUEST DETAILS
          ======================================================== */}

          <div className="mt-9 overflow-hidden rounded-xl border border-slate-200 bg-white">

            <div className="border-b border-slate-200 px-5 py-4">

              <div className="text-sm font-semibold text-[#0f2742]">
                Request details
              </div>

            </div>

            <div className="divide-y divide-slate-100">

              {/* LOCATION */}

              {(
                result?.location?.text ||
                result?.location?.latitude !== null ||
                result?.location?.longitude !== null
              ) && (

                <SummaryRow
                  icon={<MapPin size={17} />}
                  label="Location"
                  value={[
                    result?.location?.text,
                    result?.location?.latitude !== null &&
                    result?.location?.latitude !== undefined
                      ? String(
                          result.location.latitude
                        )
                      : null,
                    result?.location?.longitude !== null &&
                    result?.location?.longitude !== undefined
                      ? String(
                          result.location.longitude
                        )
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                />

              )}


              {/* PEOPLE */}

              {result?.people?.total !== null &&
                result?.people?.total !== undefined && (

                  <SummaryRow
                    icon={<Users size={17} />}
                    label="People"
                    value={String(
                      result.people.total
                    )}
                  />

                )}


              {/* HELP REQUESTED */}

              {result?.request?.resources &&
                result.request.resources.length > 0 && (

                  <SummaryRow
                    icon={<ShieldAlert size={17} />}
                    label="Help requested"
                    value={result.request.resources.join(
                      " • "
                    )}
                  />

                )}


              {/* REQUEST TYPE */}

              {result?.request?.type && (

                <SummaryRow
                  icon={<ShieldAlert size={17} />}
                  label="Emergency type"
                  value={result.request.type}
                />

              )}


              {/* CONTACT */}

              {result?.contact_info &&
                result.contact_info.length > 0 && (

                  <SummaryRow
                    icon={<Navigation size={17} />}
                    label="Contact"
                    value={result.contact_info.join(
                      " • "
                    )}
                  />

                )}

            </div>

          </div>

          {result?.dispatch_status && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                Response status
              </div>
              <div className="mt-2 text-lg font-semibold text-amber-950">
                {result.dispatch_status.replaceAll("_", " ")}
              </div>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                {result.dispatch_message || "Your request is in the emergency queue."}
              </p>
            </div>
          )}

          {(result?.needs?.shelter || result?.needs?.rescue) && (
            <div className="mt-5 rounded-xl border border-blue-100 bg-[#F3F8FC] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0f2742]">
                    Nearby shelter options
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Use your coordinates to choose a shelter and open directions.
                  </p>
                </div>
                <MapPin size={18} className="text-blue-600" />
              </div>

              {sheltersLoading ? (
                <div className="mt-4 text-sm text-slate-500">Finding nearby shelters…</div>
              ) : nearbyShelters.length === 0 ? (
                <div className="mt-4 text-sm text-slate-500">No nearby shelter options are available yet.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {nearbyShelters.map((shelter) => (
                    <div key={shelter.shelter_id || shelter.id || shelter.name} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-[#0f2742]">{shelter.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{shelter.address || "Address unavailable"}</div>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${result.location?.latitude},${result.location?.longitude}&destination=${shelter.latitude},${shelter.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1769AA] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#125788]"
                      >
                        <Navigation size={14} />
                        View route
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* ========================================================
              EXTRACTED INFORMATION
          ======================================================== */}

          {result && (

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">

              <div className="text-sm font-semibold text-[#0f2742]">
                Extracted information
              </div>


              {/* PEOPLE DETAILS */}

              {result.people && (

                <div className="mt-5">

                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    People
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">

                    {result.people.children != null && (
                      <DetailItem
                        label="Children"
                        value={String(
                          result.people.children
                        )}
                      />
                    )}

                    {result.people.elderly != null && (
                      <DetailItem
                        label="Elderly"
                        value={String(
                          result.people.elderly
                        )}
                      />
                    )}

                    {result.people.injured != null && (
                      <DetailItem
                        label="Injured"
                        value={String(
                          result.people.injured
                        )}
                      />
                    )}

                    {result.people.missing != null && (
                      <DetailItem
                        label="Missing"
                        value={String(
                          result.people.missing
                        )}
                      />
                    )}

                    {result.people.pregnant != null && (
                      <DetailItem
                        label="Pregnant"
                        value={String(
                          result.people.pregnant
                        )}
                      />
                    )}

                    {result.people.deceased != null && (
                      <DetailItem
                        label="Deceased"
                        value={String(
                          result.people.deceased
                        )}
                      />
                    )}

                    {result.people.mobility_impaired != null && (
                      <DetailItem
                        label="Mobility impaired"
                        value={String(
                          result.people.mobility_impaired
                        )}
                      />
                    )}

                  </div>

                </div>

              )}


              {/* ASSISTANCE NEEDED */}

              {result.needs && (

                <div className="mt-6">

                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Assistance needed
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">

                    {result.needs.rescue && (
                      <NeedBadge label="Rescue" />
                    )}

                    {result.needs.water && (
                      <NeedBadge label="Water" />
                    )}

                    {result.needs.food && (
                      <NeedBadge label="Food" />
                    )}

                    {result.needs.medicine && (
                      <NeedBadge label="Medicine" />
                    )}

                    {result.needs.shelter && (
                      <NeedBadge label="Shelter" />
                    )}
                    {result.needs.medical_transfer && (
                      <NeedBadge label="Medical transfer" />
                    )}

                  </div>

                </div>

              )}


              {/* SITUATION */}

              {result.situation && (

                <div className="mt-6">

                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Situation
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {result.situation}
                  </p>

                </div>

              )}

            </div>

          )}


          {/* ========================================================
              RESPONSE STATUS
          ======================================================== */}

          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">

            <div className="text-sm font-semibold text-[#0f2742]">
              Response status
            </div>

            <div className="mt-5 space-y-5">

              <StatusStep
                active
                title="Request sent"
                description="Your SOS has reached FloodGuard."
              />

              <StatusStep
                active
                title="Response team notified"
                description="Your request is available to emergency responders."
              />

              <StatusStep
                title="Help being dispatched"
                description="This will update when a response is assigned."
              />

              <StatusStep
                title="Help arriving"
                description="Stay somewhere safe and keep your phone available."
                last
              />

            </div>

          </div>


          {/* SEND ANOTHER */}

          <button
            onClick={reset}
            className="mx-auto mt-8 flex items-center gap-2 text-sm font-semibold text-[#2563eb] transition hover:text-blue-800"
          >
            Send another request
            <ChevronRight size={16} />
          </button>

          <div className="mt-4 flex justify-center">
            <Link
              href="/user"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-[#0f2742] shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>

        </section>

      )}

    </main>
  )
}


/* ================================================================
   INFO ITEM
================================================================ */

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {

  return (

    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left">

      <div className="flex items-center gap-2 text-slate-400">

        {icon}

        <span className="text-[10px] font-semibold uppercase tracking-wider">
          {label}
        </span>

      </div>

      <div className="mt-1 text-xs font-medium text-[#0f2742]">
        {value}
      </div>

    </div>

  )
}


/* ================================================================
   SUMMARY ROW
================================================================ */

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {

  return (

    <div className="flex items-center gap-4 px-5 py-4">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
        {icon}
      </div>

      <div className="min-w-0">

        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </div>

        <div className="mt-1 wrap-break-word text-sm font-medium leading-5 text-[#0f2742]">
          {value}
        </div>

      </div>

    </div>

  )
}


/* ================================================================
   DETAIL ITEM
================================================================ */

function DetailItem({
  label,
  value,
}: {
  label: string
  value: string
}) {

  return (

    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">

      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold text-[#0f2742]">
        {value}
      </div>

    </div>

  )
}


/* ================================================================
   NEED BADGE
================================================================ */

function NeedBadge({
  label,
}: {
  label: string
}) {

  return (

    <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
      {label}
    </span>

  )
}


/* ================================================================
   STATUS STEP
================================================================ */

function StatusStep({
  active = false,
  title,
  description,
  last = false,
}: {
  active?: boolean
  title: string
  description: string
  last?: boolean
}) {

  return (

    <div className="relative flex gap-3">

      {!last && (
        <div className="absolute left-1.75 top-4 h-[calc(100%+8px)] w-px bg-slate-200" />
      )}

      <div
        className={`relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
          active
            ? "border-green-600 bg-green-600"
            : "border-slate-300 bg-white"
        }`}
      >

        {active && (
          <Check
            size={9}
            strokeWidth={3}
            className="absolute left-0.5 top-0.5 text-white"
          />
        )}

      </div>

      <div>

        <div
          className={`text-sm font-semibold ${
            active
              ? "text-[#0f2742]"
              : "text-slate-400"
          }`}
        >
          {title}
        </div>

        <div className="mt-0.5 text-xs leading-5 text-slate-400">
          {description}
        </div>

      </div>

    </div>

  )
}