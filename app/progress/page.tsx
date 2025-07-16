"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, TrendingUp, Target, Flame, Clock, Smartphone, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

interface ProgressData {
  weeklyWorkouts: Array<{ week: string; workouts: number }>
  monthlyCalories: Array<{ month: string; calories: number }>
  weightProgress: Array<{ date: string; weight: number }>
  workoutStats: {
    totalWorkouts: number
    totalCalories: number
    totalMinutes: number
    averageWorkoutsPerWeek: number
  }
}

export default function ProgressPage() {
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [timeRange, setTimeRange] = useState("3months")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [googleFitData, setGoogleFitData] = useState<any>(null)
  const [isGoogleFitConnected, setIsGoogleFitConnected] = useState(false)
  const [syncingGoogleFit, setSyncingGoogleFit] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetchProgressData()
  }, [router, timeRange])

  const fetchProgressData = async () => {
    try {
      const response = await fetch(`/api/progress?range=${timeRange}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      const data = await response.json()
      setProgressData(data)
    } catch (error) {
      console.error("Error fetching progress data:", error)
    } finally {
      setLoading(false)
    }
  }

  const connectGoogleFit = async () => {
    try {
      setSyncingGoogleFit(true)

      // Initialize Google Fit API
      const response = await fetch("/api/google-fit/auth", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      const data = await response.json()

      if (response.ok && data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else if (data.error === "GOOGLE_OAUTH_NOT_CONFIGURED") {
        toast({
          title: "Configuration Required",
          description: "Google Fit integration is not set up yet. Please configure Google OAuth credentials.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to connect to Google Fit",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error connecting to Google Fit:", error)
      toast({
        title: "Error",
        description: "Failed to connect to Google Fit",
        variant: "destructive",
      })
    } finally {
      setSyncingGoogleFit(false)
    }
  }

  const syncGoogleFitData = async () => {
    try {
      setSyncingGoogleFit(true)

      const response = await fetch("/api/google-fit/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        setGoogleFitData(data.fitData)
        setIsGoogleFitConnected(true)
        toast({
          title: "Success",
          description: "Google Fit data synced successfully!",
        })
        // Refresh progress data to include Google Fit data
        fetchProgressData()
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to sync Google Fit data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error syncing Google Fit data:", error)
      toast({
        title: "Error",
        description: "Failed to sync Google Fit data",
        variant: "destructive",
      })
    } finally {
      setSyncingGoogleFit(false)
    }
  }

  useEffect(() => {
    // Check if user has Google Fit connected
    const checkGoogleFitConnection = async () => {
      try {
        const response = await fetch("/api/google-fit/status", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        const data = await response.json()
        setIsGoogleFitConnected(data.connected)
        if (data.connected && data.fitData) {
          setGoogleFitData(data.fitData)
        }
      } catch (error) {
        console.error("Error checking Google Fit status:", error)
      }
    }

    const token = localStorage.getItem("token")
    if (token) {
      checkGoogleFitConnection()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p>Loading your progress...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">FitTracker</span>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Link href="/dashboard" className="text-gray-600 hover:text-blue-600">
              Dashboard
            </Link>
            <Link href="/exercises" className="text-gray-600 hover:text-blue-600">
              Exercises
            </Link>
            <Link href="/workouts" className="text-gray-600 hover:text-blue-600">
              Workouts
            </Link>
            <Link href="/progress" className="text-blue-600 font-medium">
              Progress
            </Link>
            <Link href="/profile" className="text-gray-600 hover:text-blue-600">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Progress Analytics</h1>
            <p className="text-gray-600 dark:text-gray-300">Track your fitness journey and see how far you've come</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressData?.workoutStats.totalWorkouts || 0}</div>
              <p className="text-xs text-muted-foreground">
                {progressData?.workoutStats.averageWorkoutsPerWeek || 0} per week avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calories Burned</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressData?.workoutStats.totalCalories || 0}</div>
              <p className="text-xs text-muted-foreground">Total calories burned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((progressData?.workoutStats.totalMinutes || 0) / 60)}h
              </div>
              <p className="text-xs text-muted-foreground">
                {progressData?.workoutStats.totalMinutes || 0} minutes total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consistency</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">85%</div>
              <p className="text-xs text-muted-foreground">Weekly goal achievement</p>
            </CardContent>
          </Card>
        </div>

        {/* Google Fit Integration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Google Fit Integration</span>
            </CardTitle>
            <CardDescription>
              Sync your Google Fit data to get a complete picture of your fitness activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${isGoogleFitConnected ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="text-sm">
                  {isGoogleFitConnected ? "Connected to Google Fit" : "Not connected to Google Fit"}
                </span>
              </div>
              <div className="space-x-2">
                {!isGoogleFitConnected ? (
                  <Button onClick={connectGoogleFit} disabled={syncingGoogleFit}>
                    {syncingGoogleFit ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      "Connect Google Fit"
                    )}
                  </Button>
                ) : (
                  <Button onClick={syncGoogleFitData} disabled={syncingGoogleFit} variant="outline">
                    {syncingGoogleFit ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      "Sync Data"
                    )}
                  </Button>
                )}
              </div>
            </div>

            {googleFitData && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{googleFitData.steps || 0}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Steps Today</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{googleFitData.distance || 0} km</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Distance Today</div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{googleFitData.calories || 0}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Calories from Google Fit</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Workouts</CardTitle>
              <CardDescription>Number of workouts completed each week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressData?.weeklyWorkouts || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="workouts" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Calories</CardTitle>
              <CardDescription>Calories burned each month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={progressData?.monthlyCalories || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="calories" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Weight Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Weight Progress</CardTitle>
            <CardDescription>Track your weight changes over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressData?.weightProgress || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
