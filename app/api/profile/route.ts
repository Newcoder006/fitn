import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function PUT(request: NextRequest) {
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

    const profileData = await request.json()
    const { name, email, age, gender, height, weight, activityLevel, fitnessGoal } = profileData

    const client = await clientPromise
    const db = client.db("fittracker")
    const users = db.collection("users")

    // Update user profile
    await users.updateOne(
      { _id: new ObjectId(decoded.userId) },
      {
        $set: {
          name,
          email,
          age: Number.parseInt(age),
          gender,
          height: Number.parseInt(height),
          weight: Number.parseInt(weight),
          activityLevel,
          fitnessGoal,
          updatedAt: new Date(),
        },
      },
    )

    return NextResponse.json({ message: "Profile updated successfully" })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
