"use client"

import { useEffect, useState } from "react"
import {
  Icon,
  Panel,
  ProgressBar,
  SectionHeader,
  StatusBadge,
} from "@/components/ui/shared"

type Detection = {
  x1: number
  y1: number
  x2: number
  y2: number
  confidence: number
}

type DetectionHistory = {
  id: string
  droneId: string
  filename: string
  peopleCount: number
  averageConfidence: number
  highestConfidence: number
  timestamp: string
  status: "Completed"
  latitude?: number | null
  longitude?: number | null
  location?: string | null
  modelName?: string
  analysisStatus?: string
}

const HISTORY_KEY = "floodguard_detection_history"

export default function DronePage() {
  // ============================================================
  // CURRENT IMAGE / ANALYSIS STATE
  // ============================================================

  const [selectedImage, setSelectedImage] =
    useState<string | null>(null)

  const [resultImage, setResultImage] =
    useState<string | null>(null)

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([])

  const [batchProgress, setBatchProgress] =
    useState({ current: 0, total: 0 })

  // ============================================================
  // LOCATION
  // ============================================================

  const [latitude, setLatitude] =
    useState<number | null>(null)

  const [longitude, setLongitude] =
    useState<number | null>(null)

  const [location, setLocation] =
    useState<string | null>(null)

  // ============================================================
  // DRONE / ANALYSIS
  // ============================================================

  const [droneId, setDroneId] =
    useState("DG-001")

  const [isAnalyzing, setIsAnalyzing] =
    useState(false)

  const [peopleCount, setPeopleCount] =
    useState<number | null>(null)

  const [detections, setDetections] =
    useState<Detection[]>([])

  const [error, setError] =
    useState<string | null>(null)

  // ============================================================
  // HISTORY
  // ============================================================

  const [history, setHistory] =
    useState<DetectionHistory[]>([])

  const [selectedHistoryItem, setSelectedHistoryItem] =
    useState<DetectionHistory | null>(null)

  // ============================================================
  // LOAD DETECTION HISTORY
  // ============================================================

  useEffect(() => {
    try {
      const savedHistory =
        localStorage.getItem(HISTORY_KEY)

      if (savedHistory) {
        setHistory(
          JSON.parse(savedHistory)
        )
      }
    } catch (error) {
      console.error(
        "Could not load detection history:",
        error
      )
    }
  }, [])


  // ============================================================
  // EXTRACT LOCATION FROM DRONE IMAGE FILENAME
  // ============================================================

  const extractLocationFromFilename = (
    filename: string
  ) => {
    /*
     * Expected filename:
     * location_state_latitude_longitude_flood.jpg
     *
     * Example:
     * supaul_bihar_26.1153_86.5951_flood.jpg
     */

    const stem = filename
      .replace(/\.[^/.]+$/, "")
      .trim()

    const match = stem.match(
      /^(.+?)_(-?\d+(?:\.\d+)?)_(-?\d+(?:\.\d+)?)_flood(?:_[^_]*)?$/i
    )

    if (!match) {
      return null
    }

    const locationPart = match[1]

    const parsedLatitude = Number(
      match[2]
    )

    const parsedLongitude = Number(
      match[3]
    )

    if (
      !Number.isFinite(parsedLatitude) ||
      !Number.isFinite(parsedLongitude) ||
      parsedLatitude < -90 ||
      parsedLatitude > 90 ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      return null
    }

    const parsedLocation =
      locationPart
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (character) =>
          character.toUpperCase()
        )

    return {
      location: parsedLocation,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
    }
  }

  // ============================================================
  // SELECT MULTIPLE IMAGES
  // ============================================================

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    const validFiles: File[] = []
    const invalidFiles: string[] = []

    for (const file of files) {
      if (extractLocationFromFilename(file.name)) validFiles.push(file)
      else invalidFiles.push(file.name)
    }

    setSelectedFiles((previous) => [...previous, ...validFiles])

    if (validFiles.length > 0) {
      const firstFile = validFiles[0]
      const firstLocation = extractLocationFromFilename(firstFile.name)
      setSelectedImage(URL.createObjectURL(firstFile))
      setResultImage(null)
      setPeopleCount(null)
      setDetections([])
      setLatitude(firstLocation?.latitude ?? null)
      setLongitude(firstLocation?.longitude ?? null)
      setLocation(firstLocation?.location ?? null)
      setError(null)
    }

    if (invalidFiles.length > 0) {
      setError(
        `${invalidFiles.length} image${invalidFiles.length > 1 ? "s" : ""} skipped. Use: location_state_latitude_longitude_flood.jpg`
      )
    }

    event.target.value = ""
  }

  // ============================================================
  // ANALYZE ALL SELECTED IMAGES
  // ============================================================

  const handleAnalyze = async () => {
    if (!selectedFiles.length) {
      setError("Please select at least one drone image first.")
      return
    }

    if (!droneId.trim()) {
      setError("Please enter a drone ID.")
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setBatchProgress({ current: 0, total: selectedFiles.length })

    let successful = 0
    let failed = 0

    // Sequential processing keeps CPU-based YOLO inference stable.
    for (let index = 0; index < selectedFiles.length; index++) {
      const file = selectedFiles[index]
      setBatchProgress({ current: index + 1, total: selectedFiles.length })

      try {
        const formData = new FormData()
        formData.append("file", file)

        // IMPORTANT: existing endpoint and model are unchanged.
        const apiBaseUrl =
          process.env.NEXT_PUBLIC_FLOODGAURD_API_URL || "http://127.0.0.1:8000"
        const response = await fetch(`${apiBaseUrl}/predict`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(errorText || "Drone analysis failed.")
        }

        const contentType = response.headers.get("content-type")
        if (!contentType) throw new Error("Backend did not return a content type.")

        const boundaryMatch = contentType.match(/boundary=([^;]+)/)
        if (!boundaryMatch) throw new Error("Could not find multipart boundary in response.")

        const boundary = boundaryMatch[1]
        const responseBuffer = await response.arrayBuffer()
        const responseText = new TextDecoder("latin1").decode(responseBuffer)
        const parts = responseText.split(`--${boundary}`)

        let metadata: {
          success: boolean
          filename: string
          people_count: number
          detections: Detection[]
          latitude?: number | null
          longitude?: number | null
          location?: string | null
          model_name?: string
          analysis_status?: string
        } | null = null

        for (const part of parts) {
          if (part.includes("application/json") && part.includes("metadata")) {
            const jsonStart = part.indexOf("\r\n\r\n")
            if (jsonStart !== -1) {
              try {
                metadata = JSON.parse(part.substring(jsonStart + 4).trim())
              } catch {
                throw new Error("Could not parse detection metadata.")
              }
            }
          }
        }

        if (!metadata) throw new Error("No detection metadata received from backend.")

        const averageConfidence = metadata.detections.length > 0
          ? Math.round(
              (metadata.detections.reduce((sum, detection) => sum + detection.confidence, 0) /
                metadata.detections.length) * 100
            )
          : 0

        const highestConfidence = metadata.detections.length > 0
          ? Math.round(
              Math.max(...metadata.detections.map((detection) => detection.confidence)) * 100
            )
          : 0

        const newHistoryItem: DetectionHistory = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          droneId: droneId.trim(),
          filename: file.name,
          peopleCount: metadata.people_count,
          averageConfidence,
          highestConfidence,
          timestamp: new Date().toISOString(),
          status: "Completed",
          latitude: metadata.latitude ?? null,
          longitude: metadata.longitude ?? null,
          location: metadata.location ?? null,
          modelName: metadata.model_name || "floodguard_person_v2.pt",
          analysisStatus: metadata.analysis_status || "COMPLETED",
        }

        setHistory((previousHistory) => {
          const updatedHistory = [newHistoryItem, ...previousHistory].slice(0, 20)
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory))
          return updatedHistory
        })

        setPeopleCount(metadata.people_count)
        setDetections(metadata.detections)
        setLatitude(metadata.latitude ?? null)
        setLongitude(metadata.longitude ?? null)
        setLocation(metadata.location ?? null)

        const bytes = new Uint8Array(responseBuffer)
        let jpegStart = -1
        let jpegEnd = -1

        for (let i = 0; i < bytes.length - 1; i++) {
          if (bytes[i] === 0xff && bytes[i + 1] === 0xd8) {
            jpegStart = i
            break
          }
        }

        if (jpegStart !== -1) {
          for (let i = jpegStart + 2; i < bytes.length - 1; i++) {
            if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) {
              jpegEnd = i + 2
              break
            }
          }
        }

        if (jpegStart !== -1 && jpegEnd !== -1) {
          const imageBytes = bytes.slice(jpegStart, jpegEnd)
          const blob = new Blob([imageBytes], { type: "image/jpeg" })
          const imageUrl = URL.createObjectURL(blob)
          setResultImage((previous) => {
            if (previous) URL.revokeObjectURL(previous)
            return imageUrl
          })
        }

        successful++
      } catch (err) {
        failed++
        console.error(`Drone analysis error for ${file.name}:`, err)
      }
    }

    setIsAnalyzing(false)
    setBatchProgress({ current: 0, total: 0 })

    if (failed > 0) {
      setError(
        `${successful} image${successful === 1 ? "" : "s"} analyzed successfully. ${failed} failed.`
      )
    }
  }

  // ============================================================
  // CURRENT AVERAGE CONFIDENCE
  // ============================================================

  const currentConfidence =
    detections.length > 0
      ? Math.round(
          (
            detections.reduce(
              (
                sum,
                detection
              ) =>
                sum +
                detection.confidence,
              0
            ) /
              detections.length
          ) * 100
        )
      : 0

  // ============================================================
  // HIGHEST CURRENT CONFIDENCE
  // ============================================================

  const highestDetectionConfidence =
    detections.length > 0
      ? Math.round(
          Math.max(
            ...detections.map(
              (detection) =>
                detection.confidence
            )
          ) * 100
        )
      : 0

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (
    timestamp: string
  ) => {
    return new Date(
      timestamp
    ).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    )
  }

  return (
    <div className="space-y-6">

      {/* ==================================================
          UPLOAD + RESULT
      ================================================== */}

      <div className="grid gap-5 xl:grid-cols-2">

        {/* ==================================================
            UPLOAD PANEL
        ================================================== */}

        <Panel className="flex min-h-90 flex-col items-center justify-center p-6 text-center">

          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-[#2563eb]">

            <Icon
              name="ScanLine"
              size={32}
            />

          </div>

          <h3 className="mt-5 text-2xl font-semibold text-[#0f2742]">
            Upload drone image
          </h3>

          <p className="mt-2 max-w-md text-sm text-[#486581]">
            Upload multiple drone images to run person detection for an active mission.
          </p>

          <p className="mt-2 max-w-md text-xs text-slate-500">
            Location is taken from the image filename:
            location_state_latitude_longitude_flood.jpg
          </p>

          {/* DRONE ID */}

          <div className="mt-4 w-full max-w-sm text-left">

            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-[#627D98]">
              Drone ID
            </label>

            <input
              type="text"
              value={droneId}
              onChange={(event) =>
                setDroneId(
                  event.target.value
                )
              }
              placeholder="Example: DG-001"
              className="w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#0f2742] outline-none transition placeholder:text-slate-400 focus:border-[#2563eb]"
            />

          </div>

          {/* LOCATION */}

          <div className="mt-3 w-full max-w-sm text-left text-sm">

            <span className="text-slate-500">
              Image location:{" "}
            </span>

            <span className="font-medium text-[#0f2742]">
              {location ||
                "Upload a correctly named drone image"}
            </span>

            {latitude !== null &&
              longitude !== null && (
                <div className="mt-1 text-xs text-slate-500">
                  {latitude.toFixed(6)},{" "}
                  {longitude.toFixed(6)}
                </div>
              )}

          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-4 w-full max-w-sm rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] p-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#627D98]">
                  Mission image queue
                </span>
                <span className="text-[10px] font-semibold text-[#2563EB]">
                  {selectedFiles.length} image{selectedFiles.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
                {selectedFiles.map((file, index) => {
                  const parsed = extractLocationFromFilename(file.name)
                  return (
                    <div key={`${file.name}-${index}`} className="rounded-md bg-white px-2.5 py-2">
                      <div className="truncate text-[10px] font-medium text-[#163A63]">{file.name}</div>
                      <div className="truncate text-[9px] text-[#829AB1]">{parsed?.location || "Invalid filename"}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* BUTTONS */}

          <div className="mt-4 flex w-full max-w-sm flex-col items-stretch gap-3 sm:flex-row">

            <label className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-md bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]">

              Upload Image

              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={
                  handleFileChange
                }
              />

            </label>

            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#0f2742]"
            >
              Mission Details
            </button>

          </div>

          {/* ANALYZE */}

          <button
            type="button"
            onClick={
              handleAnalyze
            }
            disabled={
              isAnalyzing ||
              selectedFiles.length === 0
            }
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
          >

            {isAnalyzing
              ? `Analyzing ${batchProgress.current} / ${batchProgress.total}`
              : selectedFiles.length > 1
                ? `Analyze ${selectedFiles.length} Images`
                : "Analyze Image"}

          </button>

          {selectedFiles.length > 0 && !isAnalyzing && (
            <button
              type="button"
              onClick={() => {
                setSelectedFiles([])
                setSelectedImage(null)
                setResultImage(null)
                setPeopleCount(null)
                setDetections([])
                setLatitude(null)
                setLongitude(null)
                setLocation(null)
              }}
              className="mt-2 text-xs font-medium text-[#627D98] hover:text-red-600"
            >
              Clear image queue
            </button>
          )}

          {error && (
            <div className="mt-4 max-w-sm rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

        </Panel>


        {/* ==================================================
            RESULT PANEL
        ================================================== */}

        <Panel className="p-5">

          <SectionHeader
            eyebrow="Latest result"
            title="Detection result"
            action={
              <StatusBadge
                label={
                  isAnalyzing
                    ? "Processing"
                    : peopleCount !== null
                      ? "Completed"
                      : "Waiting"
                }
                tone={
                  isAnalyzing
                    ? "medium"
                    : peopleCount !== null
                      ? "good"
                      : "medium"
                }
              />
            }
            icon="Radar"
          />

          <div className="relative mt-3 h-65 overflow-hidden rounded-lg border border-[#173B5E] bg-[#0B1F33]">

            {resultImage ? (

              <img
                src={resultImage}
                alt="FloodGuard AI detection result"
                className="h-full w-full object-contain"
              />

            ) : selectedImage ? (

              <img
                src={selectedImage}
                alt="Uploaded drone scene"
                className="h-full w-full object-cover"
              />

            ) : (

              <div className="flex h-full w-full items-center justify-center text-sm uppercase tracking-[0.18em] text-slate-500">
                No image selected
              </div>

            )}

          </div>


          {/* STATISTICS */}

          <div className="mt-5 grid gap-3 sm:grid-cols-4">

            {/* PEOPLE */}

            <div className="rounded-md border border-[#D6E2EE] bg-white p-3 text-center">

              <div className="text-2xl font-bold text-[#0f2742]">
                {peopleCount ?? 0}
              </div>

              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#627D98]">
                People detected
              </div>

            </div>


            {/* PRIORITY */}

            <div className="rounded-lg border border-red-200 bg-[#FFF1F2] p-3 text-center">

              <div className="text-2xl font-bold text-[#C62828]">

                {peopleCount !== null &&
                peopleCount > 0
                  ? "HIGH"
                  : "—"}

              </div>

              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#C62828]">
                Rescue priority
              </div>

            </div>


            {/* DETECTIONS */}

            <div className="rounded-lg border border-amber-200 bg-[#FFF7ED] p-3 text-center">

              <div className="text-2xl font-bold text-[#D97706]">
                {detections.length}
              </div>

              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#D97706]">
                Detections
              </div>

            </div>


            {/* CONFIDENCE */}

            <div className="rounded-lg border border-blue-200 bg-[#EAF3F8] p-3 text-center">

              <div className="text-2xl font-bold text-[#1261A0]">

                {peopleCount !== null
                  ? highestDetectionConfidence
                  : "—"}

                {peopleCount !== null &&
                  "%"}

              </div>

              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#1261A0]">
                Highest confidence
              </div>

            </div>

          </div>

        </Panel>

      </div>


      {/* ==================================================
          AI SUMMARY
      ================================================== */}

      <Panel className="p-5">

        <SectionHeader
          eyebrow="Analysis metrics"
          title="Person detection metrics"
          icon="ShieldCheck"
        />

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">

          {/* CONFIDENCE */}

          <div className="rounded-lg border border-slate-200 bg-white p-4">

            <div className="mb-3 flex items-center justify-between text-sm text-[#486581]">

              <span>
                Average detection confidence
              </span>

              <span className="font-semibold text-[#173B5E]">

                {peopleCount !== null
                  ? `${currentConfidence}%`
                  : "Awaiting analysis"}

              </span>

            </div>

            <ProgressBar
              value={
                peopleCount !== null
                  ? currentConfidence
                  : 0
              }
              tone="green"
            />

            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              This value represents the average confidence of the individual person detections. It is not the overall model accuracy.
            </p>

          </div>


          {/* OPERATIONAL NOTE */}

          <div className="rounded-lg border border-slate-200 bg-white p-4">

            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#627D98]">
              Operational note
            </div>

            <p className="mt-2 text-sm text-[#486581]">

              {peopleCount !== null
                ? peopleCount > 0
                  ? `${peopleCount} person${
                      peopleCount > 1
                        ? "s"
                        : ""
                    } detected. Review the location for rescue prioritization.`
                  : "No people detected in this image."
                : "Analyze an image to generate an operational result."}

            </p>

          </div>

        </div>

      </Panel>


      {/* ==================================================
          DETECTION HISTORY
      ================================================== */}

      <Panel className="p-5">

        <SectionHeader
          eyebrow="Historical detections"
          title="Detection history"
          icon="Plane"
        />

        {history.length === 0 ? (

          <div className="mt-4 rounded-lg border border-dashed border-[#D6E2EE] bg-[#EAF3F8] p-8 text-center">

            <Icon
              name="Radar"
              size={28}
            />

            <p className="mt-3 text-sm text-[#486581]">
              No drone detections recorded yet.
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Analyze a drone image to create the first detection record.
            </p>

          </div>

        ) : (

          <div className="mt-4 space-y-3">

            {history.map(
              (item) => (

                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                >

                  {/* LEFT */}

                  <div className="min-w-0">

                    <div className="flex items-center gap-3">

                      <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-[#1261A0]">
                        {item.droneId}
                      </div>

                      <StatusBadge
                        label={
                          item.status
                        }
                        tone="good"
                      />

                    </div>

                    <div className="mt-2 truncate text-sm font-semibold text-[#0f2742]">
                      {item.filename}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {formatDate(
                        item.timestamp
                      )}
                    </div>

                  </div>


                  {/* RIGHT */}

                  <div className="grid grid-cols-3 gap-3 lg:min-w-105">

                    {/* PEOPLE */}

                    <div className="rounded-md border border-[#D6E2EE] bg-white p-3 text-center">

                      <div className="text-lg font-bold text-[#0f2742]">
                        {item.peopleCount}
                      </div>

                      <div className="text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        People
                      </div>

                    </div>


                    {/* CONFIDENCE */}

                    <div className="rounded-md border border-[#D6E2EE] bg-white p-3 text-center">

                      <div className="text-lg font-bold text-[#1261A0]">
                        {item.highestConfidence ??
                          item.averageConfidence}
                        %
                      </div>

                      <div className="text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        Highest confidence
                      </div>

                    </div>


                    {/* REVIEW */}

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          item.peopleCount >
                          0
                        ) {
                          setSelectedHistoryItem(
                            item
                          )
                        }
                      }}
                      disabled={
                        item.peopleCount ===
                        0
                      }
                      className="rounded-md border border-[#D6E2EE] bg-white p-3 text-center transition hover:border-[#18864B] hover:bg-[#F0FDF4] disabled:cursor-default disabled:hover:border-[#D6E2EE] disabled:hover:bg-white"
                    >

                      <div className="text-lg font-bold text-[#18864B]">
                        {item.peopleCount >
                        0
                          ? "Review"
                          : "Clear"}
                      </div>

                      <div className="text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        Response
                      </div>

                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </Panel>


      {/* ==================================================
          DETECTION REVIEW MODAL
          NO IMAGE / IMAGE PATH
      ================================================== */}

      {selectedHistoryItem && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() =>
            setSelectedHistoryItem(
              null
            )
          }
        >

          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

              <div>

                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#627D98]">
                  Detection review
                </div>

                <h2 className="mt-1 text-xl font-semibold text-[#0f2742]">
                  {selectedHistoryItem.filename}
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedHistoryItem(
                    null
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#0f2742]"
              >
                ×
              </button>

            </div>


            {/* CONTENT */}

            <div className="space-y-4 p-6">

              {/* DETECTION INFORMATION */}

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">

                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#627D98]">
                  Detection information
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">

                  {/* DRONE ID */}

                  <div className="rounded-md border border-slate-200 bg-white p-3">

                    <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500">
                      Drone ID
                    </div>

                    <div className="mt-1 text-sm font-semibold text-[#0f2742]">
                      {selectedHistoryItem.droneId}
                    </div>

                  </div>


                  {/* STATUS */}

                  <div className="rounded-md border border-slate-200 bg-white p-3">

                    <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </div>

                    <div className="mt-1 text-sm font-semibold text-[#18864B]">
                      {selectedHistoryItem.analysisStatus ||
                        selectedHistoryItem.status}
                    </div>

                  </div>


                  {/* PEOPLE */}

                  <div className="rounded-md border border-slate-200 bg-white p-3">

                    <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500">
                      People detected
                    </div>

                    <div className="mt-1 text-xl font-bold text-[#0f2742]">
                      {selectedHistoryItem.peopleCount}
                    </div>

                  </div>


                  {/* AVERAGE */}

                  <div className="rounded-md border border-slate-200 bg-white p-3">

                    <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500">
                      Average confidence
                    </div>

                    <div className="mt-1 text-xl font-bold text-[#1261A0]">
                      {selectedHistoryItem.averageConfidence}%
                    </div>

                  </div>


                  {/* HIGHEST */}

                  <div className="rounded-md border border-slate-200 bg-white p-3">

                    <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500">
                      Highest confidence
                    </div>

                    <div className="mt-1 text-xl font-bold text-[#1261A0]">
                      {selectedHistoryItem.highestConfidence}%
                    </div>

                  </div>


                  {/* MODEL */}

                  <div className="rounded-md border border-slate-200 bg-white p-3">

                    <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500">
                      Model
                    </div>

                    <div className="mt-1 break-all text-sm font-semibold text-[#0f2742]">
                      {selectedHistoryItem.modelName ||
                        "floodguard_person_v2.pt"}
                    </div>

                  </div>

                </div>

              </div>


              {/* LOCATION */}

              <div className="rounded-lg border border-slate-200 bg-white p-4">

                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#627D98]">
                  Location
                </div>

                <div className="mt-3">

                  <div className="text-sm font-medium text-[#0f2742]">
                    {selectedHistoryItem.location ||
                      "Location unavailable"}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">

                    {/* LATITUDE */}

                    <div className="rounded-md border border-slate-200 p-3">

                      <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500">
                        Latitude
                      </div>

                      <div className="mt-1 text-sm font-semibold text-[#0f2742]">

                        {selectedHistoryItem.latitude !==
                          null &&
                        selectedHistoryItem.latitude !==
                          undefined
                          ? selectedHistoryItem.latitude.toFixed(
                              6
                            )
                          : "—"}

                      </div>

                    </div>


                    {/* LONGITUDE */}

                    <div className="rounded-md border border-slate-200 p-3">

                      <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500">
                        Longitude
                      </div>

                      <div className="mt-1 text-sm font-semibold text-[#0f2742]">

                        {selectedHistoryItem.longitude !==
                          null &&
                        selectedHistoryItem.longitude !==
                          undefined
                          ? selectedHistoryItem.longitude.toFixed(
                              6
                            )
                          : "—"}

                      </div>

                    </div>

                  </div>

                </div>

              </div>


              {/* ANALYSIS TIME */}

              <div className="rounded-lg border border-slate-200 bg-white p-4">

                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#627D98]">
                  Analysis time
                </div>

                <div className="mt-2 text-sm font-medium text-[#0f2742]">
                  {formatDate(
                    selectedHistoryItem.timestamp
                  )}
                </div>

              </div>

            </div>


            {/* FOOTER */}

            <div className="flex justify-end border-t border-slate-200 px-6 py-4">

              <button
                type="button"
                onClick={() =>
                  setSelectedHistoryItem(
                    null
                  )
                }
                className="rounded-md bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}