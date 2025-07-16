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

    const workoutData = await request.json()

    // Ensure required fields are present
    if (!workoutData.name || !workoutData.exercises || !Array.isArray(workoutData.exercises)) {
      return NextResponse.json({ message: "Invalid workout data" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("fittracker")
    const workouts = db.collection("workouts")

    // Convert string IDs to ObjectIds if needed
    const processedExercises = workoutData.exercises.map((exercise: any) => {
      if (typeof exercise.exerciseId === "string" && !exercise.exerciseId.startsWith("sample-")) {
        return {
          ...exercise,
          exerciseId: new ObjectId(exercise.exerciseId),
        }
      }
      return exercise
    })

    // Create the workout document
    const workoutDoc = {
      userId: new ObjectId(decoded.userId),
      name: workoutData.name,
      exercises: processedExercises,
      totalDuration: workoutData.totalDuration || 0,
      estimatedCalories: workoutData.estimatedCalories || 0,
      difficulty: workoutData.difficulty || "beginner",
      createdAt: new Date(),
    }

    const result = await workouts.insertOne(workoutDoc)

    return NextResponse.json({
      message: "Workout saved successfully",
      workoutId: result.insertedId,
    })
  } catch (error) {
    console.error("Error saving workout:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
