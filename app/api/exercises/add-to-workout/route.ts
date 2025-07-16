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

    const { exerciseId, sets = 3, reps = 10, duration, restTime = 60 } = await request.json()

    if (!exerciseId) {
      return NextResponse.json({ message: "Exercise ID is required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("fittracker")
    const exercises = db.collection("exercises")
    const userWorkouts = db.collection("user_workouts")

    // Get exercise details
    const exercise = await exercises.findOne({ _id: new ObjectId(exerciseId) })
    if (!exercise) {
      return NextResponse.json({ message: "Exercise not found" }, { status: 404 })
    }

    // Check if user has an active workout being built
    let activeWorkout = await userWorkouts.findOne({
      userId: new ObjectId(decoded.userId),
      status: "building", // Status: building, saved, completed
    })

    // If no active workout, create one
    if (!activeWorkout) {
      const result = await userWorkouts.insertOne({
        userId: new ObjectId(decoded.userId),
        name: "My Custom Workout",
        exercises: [],
        status: "building",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      activeWorkout = await userWorkouts.findOne({ _id: result.insertedId })
    }

    // Check if exercise already exists in the workout
    const existingExerciseIndex = activeWorkout.exercises.findIndex(
      (ex: any) => ex.exerciseId.toString() === exerciseId,
    )

    const exerciseData = {
      exerciseId: new ObjectId(exerciseId),
      name: exercise.name,
      sets: Number(sets),
      reps: Number(reps),
      duration: duration ? Number(duration) : undefined,
      restTime: Number(restTime),
      category: exercise.category,
      muscle: exercise.muscle,
      caloriesPerMinute: exercise.caloriesPerMinute || 5, // Default value if not provided
    }

    if (existingExerciseIndex >= 0) {
      // Update existing exercise
      activeWorkout.exercises[existingExerciseIndex] = exerciseData
    } else {
      // Add new exercise
      activeWorkout.exercises.push(exerciseData)
    }

    // Calculate estimated duration and calories
    const totalDuration = activeWorkout.exercises.reduce((total: number, ex: any) => {
      const exerciseTime = ex.duration ? ex.duration * ex.sets : ex.sets * ex.reps * 3 // 3 seconds per rep estimate
      const restTime = ex.restTime * (ex.sets - 1)
      return total + exerciseTime + restTime
    }, 0)

    const estimatedCalories = activeWorkout.exercises.reduce((total: number, ex: any) => {
      const exerciseMinutes = ex.duration ? (ex.duration * ex.sets) / 60 : (ex.sets * ex.reps * 3) / 60
      return total + exerciseMinutes * (ex.caloriesPerMinute || 5)
    }, 0)

    // Update the workout
    await userWorkouts.updateOne(
      { _id: activeWorkout._id },
      {
        $set: {
          exercises: activeWorkout.exercises,
          totalDuration: Math.round(totalDuration / 60), // Convert to minutes
          estimatedCalories: Math.round(estimatedCalories),
          updatedAt: new Date(),
        },
      },
    )

    return NextResponse.json({
      message: "Exercise added to workout successfully",
      workoutId: activeWorkout._id,
      exerciseCount: activeWorkout.exercises.length,
      success: true,
    })
  } catch (error) {
    console.error("Error adding exercise to workout:", error)
    return NextResponse.json(
      {
        message: "Internal server error",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
