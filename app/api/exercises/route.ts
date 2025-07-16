import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// Sample exercise data - in a real app, this would come from a fitness API
const sampleExercises = [
  {
    name: "Push-ups",
    category: "strength",
    muscle: "chest",
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Start in a plank position with hands shoulder-width apart",
      "Lower your body until chest nearly touches the floor",
      "Push back up to starting position",
      "Keep your core tight throughout the movement",
    ],
    caloriesPerMinute: 8,
  },
  {
    name: "Squats",
    category: "strength",
    muscle: "legs",
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Stand with feet shoulder-width apart",
      "Lower your body as if sitting back into a chair",
      "Keep your chest up and knees behind toes",
      "Return to starting position",
    ],
    caloriesPerMinute: 6,
  },
  {
    name: "Burpees",
    category: "cardio",
    muscle: "full body",
    equipment: "bodyweight",
    difficulty: "intermediate",
    instructions: [
      "Start in standing position",
      "Drop into squat and place hands on floor",
      "Jump feet back into plank position",
      "Do a push-up, jump feet forward, then jump up",
    ],
    caloriesPerMinute: 12,
  },
  {
    name: "Plank",
    category: "strength",
    muscle: "core",
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Start in push-up position",
      "Lower to forearms",
      "Keep body straight from head to heels",
      "Hold position while breathing normally",
    ],
    caloriesPerMinute: 4,
  },
  {
    name: "Mountain Climbers",
    category: "cardio",
    muscle: "core",
    equipment: "bodyweight",
    difficulty: "intermediate",
    instructions: [
      "Start in plank position",
      "Bring one knee toward chest",
      "Quickly switch legs",
      "Continue alternating at a fast pace",
    ],
    caloriesPerMinute: 10,
  },
  {
    name: "Lunges",
    category: "strength",
    muscle: "legs",
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Stand with feet hip-width apart",
      "Step forward with one leg",
      "Lower hips until both knees are at 90 degrees",
      "Return to starting position and repeat",
    ],
    caloriesPerMinute: 7,
  },
  {
    name: "Jumping Jacks",
    category: "cardio",
    muscle: "full body",
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Start with feet together, arms at sides",
      "Jump while spreading legs shoulder-width apart",
      "Simultaneously raise arms overhead",
      "Jump back to starting position",
    ],
    caloriesPerMinute: 9,
  },
  {
    name: "Deadlifts",
    category: "strength",
    muscle: "back",
    equipment: "barbell",
    difficulty: "intermediate",
    instructions: [
      "Stand with feet hip-width apart, bar over mid-foot",
      "Bend at hips and knees to grip the bar",
      "Keep chest up and back straight",
      "Drive through heels to lift the bar",
    ],
    caloriesPerMinute: 8,
  },
  {
    name: "Yoga Flow",
    category: "flexibility",
    muscle: "full body",
    equipment: "mat",
    difficulty: "beginner",
    instructions: [
      "Start in mountain pose",
      "Flow through sun salutation sequence",
      "Hold each pose for 5-8 breaths",
      "Focus on smooth transitions",
    ],
    caloriesPerMinute: 3,
  },
  {
    name: "High Knees",
    category: "cardio",
    muscle: "legs",
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Stand with feet hip-width apart",
      "Run in place lifting knees high",
      "Aim to bring knees to waist level",
      "Pump arms naturally",
    ],
    caloriesPerMinute: 11,
  },
]

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("fittracker")
    const exercises = db.collection("exercises")

    // Check if exercises collection is empty and seed it
    const count = await exercises.countDocuments()
    if (count === 0) {
      await exercises.insertMany(sampleExercises)
    }

    const allExercises = await exercises.find({}).toArray()
    return NextResponse.json(allExercises)
  } catch (error) {
    console.error("Error fetching exercises:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
