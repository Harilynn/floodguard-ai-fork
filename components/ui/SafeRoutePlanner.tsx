"use client"

import { useEffect, useState } from "react"
import {
  Icon,
  Panel,
  ProgressBar,
  SectionHeader,
  StatusBadge,
} from "@/components/ui/shared"

// ============================================================
// TYPES
// ============================================================

interface Location {
  latitude: number
  longitude: number
}

interface Shelter {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  distanceKm?: number
}

interface Recommendation {
  shelter: Shelter
  score: number
  priority: "HIGH" | "MEDIUM" | "LOW"
  reasons: string[]
}

// ============================================================
// DISTANCE CALCULATION
// ============================================================

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371

  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )

  return R * c
}

// ============================================================
// ESTIMATE TRAVEL TIME
// ============================================================

function estimateTravelTime(distanceKm: number): number {
  return Math.max(1, Math.ceil(distanceKm / 0.3))
}

// ============================================================
// SHELTER RECOMMENDATION
// ============================================================

function recommendShelter(
  userLocation: Location,
  shelters: Shelter[]
): Recommendation | null {
  if (shelters.length === 0) {
    return null
  }

  const validShelters = shelters
    .filter(
      (shelter) =>
        Number.isFinite(Number(shelter.latitude)) &&
        Number.isFinite(Number(shelter.longitude))
    )
    .map((shelter) => {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        Number(shelter.latitude),
        Number(shelter.longitude)
      )

      /*
       * Distance is the primary factor.
       * The existing shelter API already gives us
       * nearby shelter candidates.
       */
      const distanceScore =
        Math.max(0, 1 - distance / 50) * 0.7

      const availabilityScore = 0.3

      const score =
        distanceScore + availabilityScore

      return {
        shelter,
        distance,
        score,
      }
    })

  if (validShelters.length === 0) {
    return null
  }

  validShelters.sort(
    (a, b) => a.distance - b.distance
  )

  const best = validShelters[0]

  let priority: "HIGH" | "MEDIUM" | "LOW" = "LOW"

  if (best.score >= 0.8) {
    priority = "HIGH"
  } else if (best.score >= 0.5) {
    priority = "MEDIUM"
  }

  return {
    shelter: best.shelter,
    score: Math.round(best.score * 100) / 100,
    priority,
    reasons: [
      "Nearest available shelter candidate",
      `Straight-line distance: ${best.distance.toFixed(
        1
      )} km`,
      `Estimated travel time: ~${estimateTravelTime(
        best.distance
      )} min`,
    ],
  }
}

// ============================================================
// LEAFLET MAP
// ============================================================

function ShelterMap({
  userLocation,
  shelter,
}: {
  userLocation: Location
  shelter: Shelter
}) {
  const [leaflet, setLeaflet] = useState<any>(null)

  const [mapComponents, setMapComponents] =
    useState<{
      MapContainer: any
      TileLayer: any
      Marker: any
      Popup: any
      Polyline: any
    } | null>(null)

  useEffect(() => {
    let mounted = true

    Promise.all([
      import("leaflet"),
      import("react-leaflet"),
    ])
      .then(([leafletModule, reactLeaflet]) => {
        if (!mounted) return

        setLeaflet(
          leafletModule.default ?? leafletModule
        )

        setMapComponents({
          MapContainer:
            reactLeaflet.MapContainer,
          TileLayer:
            reactLeaflet.TileLayer,
          Marker:
            reactLeaflet.Marker,
          Popup:
            reactLeaflet.Popup,
          Polyline:
            reactLeaflet.Polyline,
        })
      })
      .catch((error) => {
        console.error(
          "Failed to load Leaflet:",
          error
        )
      })

    return () => {
      mounted = false
    }
  }, [])

  if (!leaflet || !mapComponents) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-100"
        style={{ height: "430px" }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />

          <div className="text-sm text-slate-500">
            Loading map...
          </div>
        </div>
      </div>
    )
  }

  const {
    MapContainer: DynamicMapContainer,
    TileLayer: DynamicTileLayer,
    Marker: DynamicMarker,
    Popup: DynamicPopup,
    Polyline: DynamicPolyline,
  } = mapComponents

  // ==========================================================
  // CUSTOM USER LOCATION ICON
  // ==========================================================

  const userIcon = leaflet.divIcon({
    className: "floodguard-user-marker",
    html: `
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #2563eb;
        border: 3px solid white;
        box-shadow: 0 1px 6px rgba(0,0,0,.35);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })

  // ==========================================================
  // CUSTOM SHELTER ICON
  // ==========================================================

  const shelterIcon = leaflet.divIcon({
    className: "floodguard-shelter-marker",
    html: `
      <div style="
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #16a34a;
        border: 3px solid white;
        box-shadow: 0 1px 6px rgba(0,0,0,.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: 14px;
      ">S</div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

  const shelterLatitude = Number(
    shelter.latitude
  )

  const shelterLongitude = Number(
    shelter.longitude
  )

  // ==========================================================
  // MAP BOUNDS
  // ==========================================================

  const bounds = leaflet.latLngBounds([
    [
      userLocation.latitude,
      userLocation.longitude,
    ],
    [
      shelterLatitude,
      shelterLongitude,
    ],
  ])

  // ==========================================================
  // STRAIGHT VISUAL ROUTE
  //
  // This intentionally does NOT call a routing API.
  // It prevents the previous 401 route error while still
  // clearly showing the connection between the two points.
  // ==========================================================

  const routePositions = [
    [
      userLocation.latitude,
      userLocation.longitude,
    ],
    [
      shelterLatitude,
      shelterLongitude,
    ],
  ]

  return (
    <>
      {/* ======================================================
          LEAFLET CSS
          Kept inside this component so you do not need to
          modify globals.css just for this page.
      ====================================================== */}

      <style jsx global>{`
        .floodguard-map.leaflet-container {
          width: 100%;
          height: 430px;
          position: relative;
          overflow: hidden;
          background: #e8eef3;
          font-family: inherit;
        }

        .floodguard-map .leaflet-pane {
          position: absolute;
          left: 0;
          top: 0;
        }

        .floodguard-map .leaflet-tile-pane {
          z-index: 200;
        }

        .floodguard-map .leaflet-overlay-pane {
          z-index: 400;
        }

        .floodguard-map .leaflet-shadow-pane {
          z-index: 500;
        }

        .floodguard-map .leaflet-marker-pane {
          z-index: 600;
        }

        .floodguard-map .leaflet-tooltip-pane {
          z-index: 650;
        }

        .floodguard-map .leaflet-popup-pane {
          z-index: 700;
        }

        .floodguard-map .leaflet-tile-container {
          position: absolute;
          left: 0;
          top: 0;
        }

        .floodguard-map .leaflet-tile {
          position: absolute;
          left: 0;
          top: 0;
          width: 256px;
          height: 256px;
          max-width: none !important;
          user-select: none;
        }

        .floodguard-map .leaflet-marker-icon,
        .floodguard-map .leaflet-marker-shadow {
          display: block;
          position: absolute;
        }

        .floodguard-map .leaflet-control-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .floodguard-map .leaflet-top,
        .floodguard-map .leaflet-bottom {
          position: absolute;
          z-index: 1000;
          pointer-events: none;
        }

        .floodguard-map .leaflet-top {
          top: 0;
        }

        .floodguard-map .leaflet-bottom {
          bottom: 0;
        }

        .floodguard-map .leaflet-left {
          left: 0;
        }

        .floodguard-map .leaflet-right {
          right: 0;
        }

        .floodguard-map .leaflet-control {
          position: relative;
          z-index: 1000;
          float: left;
          clear: both;
          pointer-events: auto;
        }

        .floodguard-map .leaflet-right .leaflet-control {
          float: right;
        }

        .floodguard-map .leaflet-top .leaflet-control {
          margin-top: 10px;
        }

        .floodguard-map .leaflet-left .leaflet-control {
          margin-left: 10px;
        }

        .floodguard-map .leaflet-control-zoom {
          overflow: hidden;
          border-radius: 6px;
          box-shadow: 0 1px 5px rgba(0, 0, 0, 0.25);
        }

        .floodguard-map .leaflet-control-zoom a {
          display: block;
          width: 32px;
          height: 32px;
          line-height: 30px;
          text-align: center;
          background: white;
          color: #173b5e;
          text-decoration: none;
          font-size: 20px;
          font-weight: 600;
        }

        .floodguard-map .leaflet-control-zoom a:hover {
          background: #f1f5f9;
        }

        .floodguard-map .leaflet-control-zoom-in {
          border-bottom: 1px solid #dbe4ec;
        }

        .floodguard-map .leaflet-control-attribution {
          padding: 3px 6px;
          background: rgba(255, 255, 255, 0.85);
          color: #64748b;
          font-size: 10px;
        }

        .floodguard-map .leaflet-control-attribution a {
          color: #2563eb;
          text-decoration: none;
        }

        .floodguard-map .leaflet-popup {
          position: absolute;
          text-align: center;
          margin-bottom: 20px;
        }

        .floodguard-map .leaflet-popup-content-wrapper {
          padding: 1px;
          border-radius: 7px;
          background: white;
          box-shadow: 0 3px 14px rgba(0, 0, 0, 0.25);
        }

        .floodguard-map .leaflet-popup-content {
          margin: 10px 12px;
          font-size: 12px;
          line-height: 1.45;
          color: #173b5e;
        }

        .floodguard-map .leaflet-popup-tip {
          width: 17px;
          height: 17px;
          margin: -9px auto 0;
          transform: rotate(45deg);
          background: white;
        }

        .floodguard-map .leaflet-container a {
          color: inherit;
        }

        .floodguard-map .leaflet-interactive {
          cursor: pointer;
        }
      `}</style>

      <DynamicMapContainer
        className="floodguard-map"
        bounds={bounds}
        boundsOptions={{
          padding: [60, 60],
        }}
        scrollWheelZoom={true}
        zoomControl={true}
        style={{
          height: "430px",
          width: "100%",
        }}
      >
        {/* ====================================================
            OPENSTREETMAP
        ==================================================== */}

        <DynamicTileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ====================================================
            VISUAL CONNECTION BETWEEN LOCATION AND SHELTER
        ==================================================== */}

        <DynamicPolyline
          positions={routePositions}
          pathOptions={{
            color: "#2563eb",
            weight: 5,
            opacity: 0.85,
            dashArray: "10 8",
          }}
        />

        {/* ====================================================
            USER LOCATION
        ==================================================== */}

        <DynamicMarker
          position={[
            userLocation.latitude,
            userLocation.longitude,
          ]}
          icon={userIcon}
        >
          <DynamicPopup>
            <strong>
              Top-priority rescue location
            </strong>

            <br />

            {userLocation.latitude.toFixed(5)}
            {", "}
            {userLocation.longitude.toFixed(5)}
          </DynamicPopup>
        </DynamicMarker>

        {/* ====================================================
            RECOMMENDED SHELTER
        ==================================================== */}

        <DynamicMarker
          position={[
            shelterLatitude,
            shelterLongitude,
          ]}
          icon={shelterIcon}
        >
          <DynamicPopup>
            <strong>{shelter.name}</strong>

            <br />

            {shelter.address}
          </DynamicPopup>
        </DynamicMarker>
      </DynamicMapContainer>
    </>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SafeRoutePlanner() {
  const [userLocation, setUserLocation] =
    useState<Location | null>(null)

  const [shelters, setShelters] =
    useState<Shelter[]>([])

  const [recommendation, setRecommendation] =
    useState<Recommendation | null>(null)

  const [loading, setLoading] = useState(false)

  const [locationError, setLocationError] =
    useState<string | null>(null)

  const [sheltersError, setSheltersError] =
    useState<string | null>(null)

  // ==========================================================
  // GET TOP-PRIORITY RESCUE LOCATION
  // ==========================================================

  const getPriorityLocation = async () => {
    setLoading(true)
    setLocationError(null)

    const apiUrl =
      process.env.NEXT_PUBLIC_FLOODGAURD_API_URL || "http://127.0.0.1:8000"

    try {
      const response = await fetch(
        `${apiUrl}/priority-dashboard?flood_severity=1.0&match_radius_km=5`
      )

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`)
      }

      const data = await response.json()
      const emergencies = Array.isArray(data.emergencies)
        ? data.emergencies
        : []
      const emergency = emergencies.find((item: {
        latitude?: number | string | null
        longitude?: number | string | null
      }) => {
        const latitude = Number(item.latitude)
        const longitude = Number(item.longitude)
        return (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude)
        )
      })

      if (
        !emergency ||
        !Number.isFinite(Number(emergency.latitude)) ||
        !Number.isFinite(Number(emergency.longitude))
      ) {
        throw new Error("Top-priority rescue location is unavailable.")
      }

      setUserLocation({
        latitude: Number(emergency.latitude),
        longitude: Number(emergency.longitude),
      })
      setLocationError(null)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error"

      setLocationError(message)
    } finally {
      setLoading(false)
    }
  }

  // ==========================================================
  // FETCH SHELTERS
  // ==========================================================

  const fetchShelters = async (
    location: Location
  ) => {
    setSheltersError(null)
    setLoading(true)

    try {
      const response = await fetch(
        `/api/shelters?latitude=${location.latitude}&longitude=${location.longitude}`
      )

      if (!response.ok) {
        throw new Error(
          `HTTP error ${response.status}`
        )
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(
          "Shelter API returned an unsuccessful response."
        )
      }

      const shelterList =
        Array.isArray(data.shelters)
          ? data.shelters
          : []

      setShelters(shelterList)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error"

      setSheltersError(
        `Failed to fetch nearby shelters: ${message}`
      )
    } finally {
      setLoading(false)
    }
  }

  // ==========================================================
  // INITIAL LOCATION
  // ==========================================================

  useEffect(() => {
    getPriorityLocation()
  }, [])

  // ==========================================================
  // FETCH SHELTERS AFTER LOCATION IS AVAILABLE
  // ==========================================================

  useEffect(() => {
    if (!userLocation) {
      return
    }

    fetchShelters(userLocation)
  }, [userLocation])

  // ==========================================================
  // RECOMMEND SHELTER
  // ==========================================================

  useEffect(() => {
    if (
      !userLocation ||
      shelters.length === 0
    ) {
      setRecommendation(null)
      return
    }

    const result = recommendShelter(
      userLocation,
      shelters
    )

    setRecommendation(result)
  }, [
    userLocation,
    shelters,
  ])

  // ==========================================================
  // INITIAL LOADING
  // ==========================================================

  if (loading && !userLocation) {
    return (
      <div className="space-y-6">
        <Panel className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />

            <div>
              <div className="text-sm font-semibold text-[#0f2742]">
                Finding highest-priority rescue location
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Finding nearby emergency shelters...
              </div>
            </div>
          </div>
        </Panel>
      </div>
    )
  }

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <div className="space-y-6">

      {/* ======================================================
          LOCATION NOTICE
      ====================================================== */}

      {locationError && (
        <Panel className="border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <Icon
              name="AlertTriangle"
              size={17}
              className="mt-0.5 text-amber-700"
            />

            <div>
              <div className="text-sm font-semibold text-amber-900">
                Location notice
              </div>

              <div className="mt-1 text-xs text-amber-800">
                {locationError}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* ======================================================
          SHELTER ERROR
      ====================================================== */}

      {sheltersError && (
        <Panel className="border-red-200 bg-red-50 p-4">
          <div className="flex gap-3">
            <Icon
              name="AlertCircle"
              size={17}
              className="mt-0.5 text-red-700"
            />

            <div>
              <div className="text-sm font-semibold text-red-900">
                Unable to load shelters
              </div>

              <div className="mt-1 text-xs text-red-800">
                {sheltersError}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* ======================================================
          RECOMMENDATION
      ====================================================== */}

      {userLocation &&
        recommendation && (
          <Panel className="p-5">
            <SectionHeader
              eyebrow="Emergency recommendation"
              title="Nearest recommended shelter"
              icon="ShieldCheck"
            />

            <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">

              {/* =================================================
                  SHELTER DETAILS
              ================================================= */}

              <div className="rounded-lg border border-[#D6E2EE] bg-white p-5">
                <div className="flex items-start justify-between gap-4">

                  <div>
                    <div className="text-lg font-semibold text-[#0f2742]">
                      {
                        recommendation.shelter.name
                      }
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      {
                        recommendation.shelter.address
                      }
                    </div>
                  </div>

                  <StatusBadge
                    label={
                      recommendation.priority
                    }
                    tone={
                      recommendation.priority ===
                      "HIGH"
                        ? "good"
                        : recommendation.priority ===
                          "MEDIUM"
                        ? "warning"
                        : "neutral"
                    }
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">

                  {/* DISTANCE */}

                  <div className="rounded-md border border-[#D6E2EE] bg-[#EAF3F8] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Distance
                    </div>

                    <div className="mt-2 text-xl font-bold text-[#0f2742]">
                      {calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        Number(
                          recommendation
                            .shelter
                            .latitude
                        ),
                        Number(
                          recommendation
                            .shelter
                            .longitude
                        )
                      ).toFixed(1)}{" "}
                      km
                    </div>
                  </div>

                  {/* TIME */}

                  <div className="rounded-md border border-[#D6E2EE] bg-[#EAF3F8] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Estimated time
                    </div>

                    <div className="mt-2 text-xl font-bold text-[#0f2742]">
                      ~
                      {estimateTravelTime(
                        calculateDistance(
                          userLocation.latitude,
                          userLocation.longitude,
                          Number(
                            recommendation
                              .shelter
                              .latitude
                          ),
                          Number(
                            recommendation
                              .shelter
                              .longitude
                          )
                        )
                      )}{" "}
                      min
                    </div>
                  </div>
                </div>

                {/* WHY THIS SHELTER */}

                <div className="mt-5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Why this shelter?
                  </div>

                  <ul className="mt-3 space-y-2">
                    {recommendation.reasons.map(
                      (reason, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-[#486581]"
                        >
                          <Icon
                            name="CheckCircle2"
                            size={15}
                            className="mt-0.5 flex-shrink-0 text-green-600"
                          />

                          <span>
                            {reason}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>

              {/* =================================================
                  FLOODGUARD SCORE
              ================================================= */}

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">

                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                  FloodGuard recommendation
                </div>

                <div className="mt-3 text-2xl font-bold text-[#0f2742]">
                  {recommendation.priority}{" "}
                  PRIORITY
                </div>

                <div className="mt-2 text-sm leading-6 text-slate-600">
                  This shelter is currently the
                  strongest nearby candidate based
                  on the top-priority rescue location and
                  distance.
                </div>

                <div className="mt-5">

                  <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Recommendation score
                    </span>

                    <span>
                      {Math.round(
                        recommendation.score *
                          100
                      )}
                      %
                    </span>
                  </div>

                  <ProgressBar
                    value={
                      recommendation.score *
                      100
                    }
                    tone="green"
                  />
                </div>
              </div>
            </div>
          </Panel>
        )}

      {/* ======================================================
          MAP
      ====================================================== */}

      {userLocation &&
        recommendation && (
          <Panel className="overflow-hidden p-5">

            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#627D98]">
                  Location map
                </div>

                <h3 className="mt-1 text-lg font-semibold text-[#173B5E]">
                  Top-priority rescue location → recommended shelter
                </h3>
              </div>

              <div className="hidden text-xs text-slate-500 sm:block">
                Rescue starting location
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">

              <ShelterMap
                userLocation={userLocation}
                shelter={
                  recommendation.shelter
                }
              />

            </div>

            {/* ==================================================
                MAP LEGEND
            ================================================== */}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
                <span>Top-priority rescue location</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[8px] font-bold text-white">
                  S
                </span>
                <span>Recommended shelter</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-7 border-t-2 border-dashed border-blue-600" />
                <span>Route to shelter</span>
              </div>

            </div>

            {/* ==================================================
                GOOGLE MAPS
            ================================================== */}

            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[#D6E2EE] bg-[#F8FBFD] p-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <div className="text-sm font-semibold text-[#0f2742]">
                  Need turn-by-turn directions?
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Open the route in Google Maps using
                  the top-priority rescue location and the
                  recommended shelter.
                </div>
              </div>

              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${recommendation.shelter.latitude},${recommendation.shelter.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
              >
                <Icon
                  name="Navigation"
                  size={16}
                />

                Open in Google Maps
              </a>
            </div>
          </Panel>
        )}

      {/* ======================================================
          NO SHELTERS
      ====================================================== */}

      {userLocation &&
        !loading &&
        shelters.length === 0 &&
        !sheltersError && (
          <Panel className="p-6">
            <div className="text-center">

              <Icon
                name="House"
                size={32}
                className="mx-auto text-slate-400"
              />

              <div className="mt-3 text-sm font-semibold text-[#0f2742]">
                No nearby shelters found
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Try checking again later.
              </div>

            </div>
          </Panel>
        )}

    </div>
  )
}