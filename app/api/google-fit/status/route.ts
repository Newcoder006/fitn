import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
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

    const client = await clientPromise
    const db = client.db("fittracker")
    const googleFitTokens = db.collection("google_fit_tokens")
    const googleFitData = db.collection("google_fit_data")

    // Check if user has Google Fit connected
    const tokenDoc = await googleFitTokens.findOne({ userId: new ObjectId(decoded.userId) })
    const connected = !!tokenDoc

    let fitData = null
    if (connected) {
      // Get today's Google Fit data
      const today = new Date().toISOString().split("T")[0]
      const todayData = await googleFitData.findOne({
        userId: new ObjectId(decoded.userId),
        date: today,
      })
      fitData = todayData || null
    }

    return NextResponse.json({
      connected,
      fitData: fitData
        ? {
            steps: fitData.steps || 0,
            distance: fitData.distance || 0,
            calories: fitData.calories || 0,
            activeMinutes: fitData.activeMinutes || 0,
          }
        : null,
    })
  } catch (error) {
    console.error("Google Fit status error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
