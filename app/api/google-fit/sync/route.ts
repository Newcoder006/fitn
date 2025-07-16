import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ message: "Authorization required" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        {
          message: "Google Fit integration is not configured",
        },
        { status: 503 },
      )
    }

    const client = await clientPromise
    const db = client.db("fittracker")
    const googleFitTokens = db.collection("google_fit_tokens")
    const googleFitData = db.collection("google_fit_data")

    // Get user's Google Fit tokens
    const tokenDoc = await googleFitTokens.findOne({ userId: new ObjectId(decoded.userId) })
    if (!tokenDoc) {
      return NextResponse.json({ message: "Google Fit not connected" }, { status: 400 })
    }

    let accessToken = tokenDoc.accessToken

    // Check if token is expired and refresh if needed
    if (new Date() >= tokenDoc.expiresAt) {
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: tokenDoc.refreshToken,
          grant_type: "refresh_token",
        }),
      })

      const refreshData = await refreshResponse.json()
      if (refreshResponse.ok) {
        accessToken = refreshData.access_token
        await googleFitTokens.updateOne(
          { userId: new ObjectId(decoded.userId) },
          {
            $set: {
              accessToken: refreshData.access_token,
              expiresAt: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000),
              updatedAt: new Date(),
            },
          },
        )
      } else {
        console.error("Token refresh failed:", refreshData)
        return NextResponse.json({ message: "Failed to refresh Google Fit token" }, { status: 400 })
      }
    }

    // Get today's date range
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    const startTimeNanos = (startOfDay.getTime() * 1000000).toString()
    const endTimeNanos = (endOfDay.getTime() * 1000000).toString()

    // Fetch different types of fitness data
    const fitData = {
      steps: 0,
      distance: 0,
      calories: 0,
      activeMinutes: 0,
      heartRate: [],
      weight: null,
    }

    try {
      // Fetch steps data
      const stepsResponse = await fetch(`https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [
            {
              dataTypeName: "com.google.step_count.delta",
              dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
            },
          ],
          bucketByTime: { durationMillis: 86400000 }, // 1 day
          startTimeMillis: startOfDay.getTime(),
          endTimeMillis: endOfDay.getTime(),
        }),
      })

      if (stepsResponse.ok) {
        const stepsData = await stepsResponse.json()
        if (stepsData.bucket && stepsData.bucket[0] && stepsData.bucket[0].dataset[0].point.length > 0) {
          fitData.steps = stepsData.bucket[0].dataset[0].point[0].value[0].intVal || 0
        }
      } else {
        console.error("Steps API error:", await stepsResponse.text())
      }

      // Fetch distance data
      const distanceResponse = await fetch(`https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [
            {
              dataTypeName: "com.google.distance.delta",
              dataSourceId: "derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta",
            },
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startOfDay.getTime(),
          endTimeMillis: endOfDay.getTime(),
        }),
      })

      if (distanceResponse.ok) {
        const distanceData = await distanceResponse.json()
        if (distanceData.bucket && distanceData.bucket[0] && distanceData.bucket[0].dataset[0].point.length > 0) {
          const distanceMeters = distanceData.bucket[0].dataset[0].point[0].value[0].fpVal || 0
          fitData.distance = Math.round((distanceMeters / 1000) * 100) / 100 // Convert to km
        }
      } else {
        console.error("Distance API error:", await distanceResponse.text())
      }

      // Fetch calories data
      const caloriesResponse = await fetch(`https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [
            {
              dataTypeName: "com.google.calories.expended",
              dataSourceId: "derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended",
            },
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startOfDay.getTime(),
          endTimeMillis: endOfDay.getTime(),
        }),
      })

      if (caloriesResponse.ok) {
        const caloriesData = await caloriesResponse.json()
        if (caloriesData.bucket && caloriesData.bucket[0] && caloriesData.bucket[0].dataset[0].point.length > 0) {
          fitData.calories = Math.round(caloriesData.bucket[0].dataset[0].point[0].value[0].fpVal || 0)
        }
      } else {
        console.error("Calories API error:", await caloriesResponse.text())
      }

      // Fetch active minutes
      const activeMinutesResponse = await fetch(`https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [
            {
              dataTypeName: "com.google.active_minutes",
              dataSourceId: "derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes",
            },
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startOfDay.getTime(),
          endTimeMillis: endOfDay.getTime(),
        }),
      })

      if (activeMinutesResponse.ok) {
        const activeMinutesData = await activeMinutesResponse.json()
        if (
          activeMinutesData.bucket &&
          activeMinutesData.bucket[0] &&
          activeMinutesData.bucket[0].dataset[0].point.length > 0
        ) {
          fitData.activeMinutes = activeMinutesData.bucket[0].dataset[0].point[0].value[0].intVal || 0
        }
      } else {
        console.error("Active minutes API error:", await activeMinutesResponse.text())
      }
    } catch (apiError) {
      console.error("Google Fit API error:", apiError)
    }

    // Store the fetched data
    await googleFitData.updateOne(
      {
        userId: new ObjectId(decoded.userId),
        date: startOfDay.toISOString().split("T")[0],
      },
      {
        $set: {
          ...fitData,
          syncedAt: new Date(),
        },
      },
      { upsert: true },
    )

    return NextResponse.json({
      message: "Google Fit data synced successfully",
      fitData,
    })
  } catch (error) {
    console.error("Google Fit sync error:", error)
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
