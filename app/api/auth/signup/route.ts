import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { hashPassword, generateToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, age, gender, height, weight, activityLevel } = await request.json()

    if (!name || !email || !password || !age || !gender || !height || !weight || !activityLevel) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("fittracker")
    const users = db.collection("users")

    // Check if user already exists
    const existingUser = await users.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const result = await users.insertOne({
      name,
      email,
      password: hashedPassword,
      age: Number.parseInt(age),
      gender,
      height: Number.parseInt(height),
      weight: Number.parseInt(weight),
      activityLevel,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Generate token for immediate login
    const token = generateToken(result.insertedId.toString())

    // Get the created user (without password)
    const createdUser = await users.findOne({ _id: result.insertedId })
    const { password: _, ...userWithoutPassword } = createdUser

    return NextResponse.json(
      {
        message: "User created successfully",
        token,
        user: userWithoutPassword,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
