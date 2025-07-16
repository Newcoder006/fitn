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
    const userWorkouts = db.collection("user_workouts")

    // Get user's current workout being built
    const currentWorkout = await userWorkouts.findOne({
      userId: new ObjectId(decoded.userId),
      status: "building",
    })

    return NextResponse.json({
      workout: currentWorkout,
      hasCurrentWorkout: !!currentWorkout,
      exerciseCount: currentWorkout?.exercises?.length || 0,
    })
  } catch (error) {
    console.error("Error fetching current workout:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

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

    const { action, workoutName } = await request.json()

    const client = await clientPromise
    const db = client.db("fittracker")
    const userWorkouts = db.collection("user_workouts")
    const workouts = db.collection("workouts")

    const currentWorkout = await userWorkouts.findOne({
      userId: new ObjectId(decoded.userId),
      status: "building",
    })

    if (!currentWorkout) {
      return NextResponse.json({ message: "No current workout found" }, { status: 404 })
    }

    if (action === "save") {
      // Save the workout to the main workouts collection
      const savedWorkout = await workouts.insertOne({
        userId: new ObjectId(decoded.userId),
        name: workoutName || currentWorkout.name,
        exercises: currentWorkout.exercises,
        totalDuration: currentWorkout.totalDuration,
        estimatedCalories: currentWorkout.estimatedCalories,
        difficulty:
          currentWorkout.exercises.length <= 3
            ? "beginner"
            : currentWorkout.exercises.length <= 6
              ? "intermediate"
              : "advanced",
        createdAt: new Date(),
      })

      // Mark current workout as saved
      await userWorkouts.updateOne(
        { _id: currentWorkout._id },
        { $set: { status: "saved", savedWorkoutId: savedWorkout.insertedId } },
      )

      return NextResponse.json({
        message: "Workout saved successfully",
        workoutId: savedWorkout.insertedId,
      })
    } else if (action === "clear") {
      // Clear the current workout
      await userWorkouts.deleteOne({ _id: currentWorkout._id })

      return NextResponse.json({
        message: "Workout cleared successfully",
      })
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error managing current workout:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
