/**
 * API Route: GET /api/shelters
 * 
 * Proxies shelter search requests to the FastAPI backend.
 * The frontend calls this endpoint instead of calling the backend directly.
 * This keeps the Google Maps API key and other backend details secure.
 * 
 * Query parameters:
 * - latitude: number (required)
 * - longitude: number (required)
 */

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const latitude = url.searchParams.get('latitude')
    const longitude = url.searchParams.get('longitude')

    // Validate required parameters
    if (!latitude || !longitude) {
      return Response.json(
        { success: false, error: 'Missing latitude or longitude' },
        { status: 400 }
      )
    }

    // Call the FastAPI backend
    // Update the URL if your backend is running on a different port or host
    const backendBaseUrl =
      process.env.FLOODGUARD_BACKEND_URL ||
      process.env.NEXT_PUBLIC_FLOODGAURD_API_URL ||
      'http://localhost:8000'
    const backendUrl = `${backendBaseUrl}/shelters?latitude=${latitude}&longitude=${longitude}`

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.text()
      console.error('Backend error:', backendResponse.status, errorData)
      return Response.json(
        { success: false, error: `Backend error: ${backendResponse.status}` },
        { status: backendResponse.status }
      )
    }

    const data = await backendResponse.json()
    return Response.json(data)
  } catch (error) {
    console.error('API route error:', error)
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
