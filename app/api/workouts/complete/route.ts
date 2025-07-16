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

    const { workoutId, duration, caloriesBurned } = await request.json()

    if (!workoutId) {
      return NextResponse.json({ message: "Workout ID is required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("fittracker")
    const workoutSessions = db.collection("workout_sessions")

    // Handle sample workouts (they have string IDs that start with "sample-")
    const workoutObjectId = workoutId.startsWith("sample-") ? workoutId : new ObjectId(workoutId)

    // Record the completed workout session
    await workoutSessions.insertOne({
      userId: new ObjectId(decoded.userId),
      workoutId: workoutObjectId,
      duration,
      caloriesBurned,
      completedAt: new Date(),
    })

    return NextResponse.json({
      message: "Workout completed successfully",
      success: true,
    })
  } catch (error) {
    console.error("Error completing workout:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
