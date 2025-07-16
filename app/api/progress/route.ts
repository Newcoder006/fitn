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

    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "3months"

    const client = await clientPromise
    const db = client.db("fittracker")
    const workoutSessions = db.collection("workout_sessions")

    // Calculate date range
    const now = new Date()
    const startDate = new Date()

    switch (range) {
      case "1month":
        startDate.setMonth(now.getMonth() - 1)
        break
      case "3months":
        startDate.setMonth(now.getMonth() - 3)
        break
      case "6months":
        startDate.setMonth(now.getMonth() - 6)
        break
      case "1year":
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // Get actual workout sessions for the user in the date range
    const sessions = await workoutSessions
      .find({
        userId: new ObjectId(decoded.userId),
        completedAt: { $gte: startDate },
      })
      .sort({ completedAt: 1 })
      .toArray()

    // Calculate weekly workouts from actual data
    const weeklyWorkouts = []
    const weekMap = new Map()

    sessions.forEach((session) => {
      const weekStart = new Date(session.completedAt)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week
      const weekKey = weekStart.toISOString().split("T")[0]

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, 0)
      }
      weekMap.set(weekKey, weekMap.get(weekKey) + 1)
    })

    // Convert to array format for charts
    let weekCounter = 1
    for (const [weekStart, count] of weekMap.entries()) {
      weeklyWorkouts.push({
        week: `Week ${weekCounter}`,
        workouts: count,
      })
      weekCounter++
    }

    // If no data, show empty state
    if (weeklyWorkouts.length === 0) {
      weeklyWorkouts.push({ week: "No data", workouts: 0 })
    }

    // Calculate monthly calories from actual data
    const monthlyCalories = []
    const monthMap = new Map()

    sessions.forEach((session) => {
      const month = new Date(session.completedAt).toLocaleString("default", { month: "short" })
      if (!monthMap.has(month)) {
        monthMap.set(month, 0)
      }
      monthMap.set(month, monthMap.get(month) + (session.caloriesBurned || 0))
    })

    for (const [month, calories] of monthMap.entries()) {
      monthlyCalories.push({ month, calories })
    }

    if (monthlyCalories.length === 0) {
      monthlyCalories.push({ month: "No data", calories: 0 })
    }

    // Get Google Fit data for enhanced progress tracking
    const googleFitData = db.collection("google_fit_data")
    const recentGoogleFitData = await googleFitData
      .find({
        userId: new ObjectId(decoded.userId),
        date: { $gte: startDate.toISOString().split("T")[0] },
      })
      .sort({ date: -1 })
      .toArray()

    // Calculate totals from actual data
    const totalSteps = recentGoogleFitData.reduce((sum, data) => sum + (data.steps || 0), 0)
    const totalDistance = recentGoogleFitData.reduce((sum, data) => sum + (data.distance || 0), 0)
    const googleFitCalories = recentGoogleFitData.reduce((sum, data) => sum + (data.calories || 0), 0)

    // Real workout stats from actual user data
    const workoutStats = {
      totalWorkouts: sessions.length,
      totalCalories: sessions.reduce((sum, session) => sum + (session.caloriesBurned || 0), 0) + googleFitCalories,
      totalMinutes: sessions.reduce((sum, session) => sum + (session.duration || 0), 0),
      averageWorkoutsPerWeek:
        sessions.length > 0 ? Math.round(sessions.length / Math.max(1, weeklyWorkouts.length)) : 0,
      totalSteps,
      totalDistance: Math.round(totalDistance * 100) / 100,
      googleFitDays: recentGoogleFitData.length,
    }

    // Weight progress - for now empty, will be populated when user logs weight
    const weightProgress = [{ date: "No data", weight: 0 }]

    return NextResponse.json({
      weeklyWorkouts,
      monthlyCalories,
      weightProgress,
      workoutStats,
      googleFitSummary: {
        totalSteps,
        totalDistance: Math.round(totalDistance * 100) / 100,
        googleFitCalories,
        activeDays: recentGoogleFitData.length,
      },
    })
  } catch (error) {
    console.error("Error fetching progress:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
