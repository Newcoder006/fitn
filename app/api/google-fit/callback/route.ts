import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state") // This is the userId
    const error = searchParams.get("error")

    if (error) {
      console.error("OAuth error:", error)
      return NextResponse.redirect(new URL("/progress?error=google_fit_denied", request.url))
    }

    if (!code || !state) {
      console.error("Missing code or state in callback")
      return NextResponse.redirect(new URL("/progress?error=invalid_callback", request.url))
    }

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
    const REDIRECT_URI =
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/google-fit/callback`

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("Google OAuth not configured in callback")
      return NextResponse.redirect(new URL("/progress?error=oauth_not_configured", request.url))
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error("Token exchange error:", tokenData)
      return NextResponse.redirect(new URL("/progress?error=token_exchange_failed", request.url))
    }

    // Store the tokens in database
    const client = await clientPromise
    const db = client.db("fittracker")
    const googleFitTokens = db.collection("google_fit_tokens")

    await googleFitTokens.updateOne(
      { userId: new ObjectId(state) },
      {
        $set: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    return NextResponse.redirect(new URL("/progress?success=google_fit_connected", request.url))
  } catch (error) {
    console.error("Google Fit callback error:", error)
    return NextResponse.redirect(new URL("/progress?error=callback_failed", request.url))
  }
}
