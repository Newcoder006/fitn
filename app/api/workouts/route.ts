import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { ObjectId } from "mongodb"

// Sample workout data - only created when user has no workouts
const sampleWorkouts = [
  {
    name: "Full Body Beginner",
    exercises: [
      { exerciseId: "push-ups", name: "Push-ups", sets: 3, reps: 10, restTime: 60 },
      { exerciseId: "squats", name: "Squats", sets: 3, reps: 15, restTime: 60 },
      { exerciseId: "plank", name: "Plank", sets: 3, reps: 1, duration: 30, restTime: 60 },
      { exerciseId: "lunges", name: "Lunges", sets: 3, reps: 12, restTime: 60 },
    ],
    totalDuration: 25,
    estimatedCalories: 200,
    difficulty: "beginner",
  },
  {
    name: "HIIT Cardio Blast",
    exercises: [
      { exerciseId: "burpees", name: "Burpees", sets: 4, reps: 8, restTime: 45 },
      { exerciseId: "mountain-climbers", name: "Mountain Climbers", sets: 4, reps: 20, restTime: 45 },
      { exerciseId: "jumping-jacks", name: "Jumping Jacks", sets: 4, reps: 30, restTime: 45 },
      { exerciseId: "high-knees", name: "High Knees", sets: 4, reps: 20, restTime: 45 },
    ],
    totalDuration: 20,
    estimatedCalories: 300,
    difficulty: "intermediate",
  },
  {
    name: "Strength Training",
    exercises: [
      { exerciseId: "deadlifts", name: "Deadlifts", sets: 4, reps: 8, restTime: 90 },
      { exerciseId: "push-ups", name: "Push-ups", sets: 4, reps: 12, restTime: 60 },
      { exerciseId: "squats", name: "Squats", sets: 4, reps: 15, restTime: 60 },
      { exerciseId: "plank", name: "Plank", sets: 3, reps: 1, duration: 45, restTime: 60 },
    ],
    totalDuration: 35,
    estimatedCalories: 280,
    difficulty: "intermediate",
  },
  {
    name: "Flexibility & Recovery",
    exercises: [
      { exerciseId: "yoga-flow", name: "Yoga Flow", sets: 1, reps: 1, duration: 600, restTime: 0 },
      { exerciseId: "stretching", name: "Full Body Stretch", sets: 1, reps: 1, duration: 300, restTime: 0 },
    ],
    totalDuration: 15,
    estimatedCalories: 60,
    difficulty: "beginner",
  },
]

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
    const workouts = db.collection("workouts")

    // Check if user has any workouts
    const userWorkouts = await workouts.find({ userId: new ObjectId(decoded.userId) }).toArray()

    // If user has no workouts, provide sample workouts but don't save them to DB yet
    if (userWorkouts.length === 0) {
      // Return sample workouts without saving to database
      // They will be saved when user actually starts a workout
      return NextResponse.json(
        sampleWorkouts.map((workout) => ({
          ...workout,
          _id: `sample-${workout.name.toLowerCase().replace(/\s+/g, "-")}`,
          isSample: true,
        })),
      )
    }

    return NextResponse.json(userWorkouts)
  } catch (error) {
    console.error("Error fetching workouts:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
