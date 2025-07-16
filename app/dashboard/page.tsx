"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Navigation } from "@/components/ui/navigation"
import { StatCard } from "@/components/ui/stat-card"
import { FloatingActionButton } from "@/components/ui/floating-action-button"
import { Activity, Target, TrendingUp, Calendar, Dumbbell, Flame, Plus, Zap, Heart } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface User {
  name: string
  email: string
  age: number
  height: number
  weight: number
  activityLevel: string
}

interface DashboardStats {
  totalWorkouts: number
  weeklyGoal: number
  caloriesBurned: number
  currentStreak: number
  bmi: number
  dailyCalorieGoal: number
  totalMinutes: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasWorkouts, setHasWorkouts] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/login")
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    fetchUserStats(parsedUser)
  }, [router])

  const fetchUserStats = async (userData: User) => {
    try {
      const response = await fetch("/api/progress?range=3months", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      const progressData = await response.json()

      const bmi = userData.weight / (userData.height / 100) ** 2
      const bmr =
        userData.gender === "male"
          ? 88.362 + 13.397 * userData.weight + 4.799 * userData.height - 5.677 * userData.age
          : 447.593 + 9.247 * userData.weight + 3.098 * userData.height - 4.33 * userData.age

      const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        very: 1.725,
        extra: 1.9,
      }

      const dailyCalorieGoal = Math.round(
        bmr * activityMultipliers[userData.activityLevel as keyof typeof activityMultipliers],
      )

      const actualStats = progressData.workoutStats || {}
      const hasAnyWorkouts = actualStats.totalWorkouts > 0

      setHasWorkouts(hasAnyWorkouts)
      setStats({
        totalWorkouts: actualStats.totalWorkouts || 0,
        weeklyGoal: 5,
        caloriesBurned: actualStats.totalCalories || 0,
        currentStreak: hasAnyWorkouts ? Math.min(actualStats.totalWorkouts, 7) : 0,
        bmi: Math.round(bmi * 10) / 10,
        dailyCalorieGoal,
        totalMinutes: actualStats.totalMinutes || 0,
      })

      setLoading(false)
    } catch (error) {
      console.error("Error fetching user stats:", error)
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <Activity className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          </div>
          <p className="text-lg font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <Navigation onLogout={handleLogout} />

      <div className="container mx-auto px-4 py-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{user?.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-muted-foreground">
                {hasWorkouts
                  ? "Here's your fitness overview for today"
                  : "Start your fitness journey by completing your first workout!"}
              </p>
            </div>
          </div>
        </div>

        {/* No Data State */}
        {!hasWorkouts && (
          <Card className="mb-8 border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent animate-slide-up">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-6">
                <Dumbbell className="h-20 w-20 text-primary/60" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Ready to start your journey?</h3>
              <p className="text-muted-foreground text-center mb-8 max-w-md">
                Complete your first workout to start tracking your fitness progress. Your personalized stats will appear
                here once you begin exercising.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/workouts">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                  >
                    <Dumbbell className="mr-2 h-5 w-5" />
                    Start First Workout
                  </Button>
                </Link>
                <Link href="/exercises">
                  <Button variant="outline" size="lg" className="border-primary/30 hover:bg-primary/10 bg-transparent">
                    Browse Exercises
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Workouts"
            value={stats?.totalWorkouts || 0}
            subtitle={hasWorkouts ? "Completed workouts" : "Start your first workout"}
            icon={<Dumbbell className="h-4 w-4" />}
            gradient={true}
            trend={hasWorkouts ? { value: 12, isPositive: true } : undefined}
          />

          <StatCard
            title="Weekly Goal"
            value={`${stats?.totalWorkouts || 0}/${stats?.weeklyGoal || 5}`}
            subtitle="This week's progress"
            icon={<Target className="h-4 w-4" />}
            className="relative"
          >
            <div className="mt-3">
              <Progress
                value={hasWorkouts ? ((stats?.totalWorkouts || 0) / (stats?.weeklyGoal || 5)) * 100 : 0}
                className="h-2"
              />
            </div>
          </StatCard>

          <StatCard
            title="Calories Burned"
            value={stats?.caloriesBurned || 0}
            subtitle={hasWorkouts ? "Total calories burned" : "Start burning calories"}
            icon={<Flame className="h-4 w-4" />}
            trend={hasWorkouts ? { value: 8, isPositive: true } : undefined}
          />

          <StatCard
            title="Workout Time"
            value={`${Math.round((stats?.totalMinutes || 0) / 60)}h`}
            subtitle={`${stats?.totalMinutes || 0} minutes total`}
            icon={<Calendar className="h-4 w-4" />}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Health Metrics */}
          <Card className="lg:col-span-2 gradient-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-primary" />
                <span>Health Metrics</span>
              </CardTitle>
              <CardDescription>Your current health indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                    <span className="font-medium">BMI</span>
                    <span className="text-xl font-bold text-primary">{stats?.bmi}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                    <span className="font-medium">Weight</span>
                    <span className="text-xl font-bold">{user?.weight} kg</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                    <span className="font-medium">Height</span>
                    <span className="text-xl font-bold">{user?.height} cm</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                    <span className="font-medium">Daily Goal</span>
                    <span className="text-xl font-bold">{stats?.dailyCalorieGoal}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="gradient-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-primary" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>Start your fitness activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/workouts">
                <Button
                  className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                  size="lg"
                >
                  <Dumbbell className="mr-2 h-4 w-4" />
                  {hasWorkouts ? "Continue Workouts" : "Start First Workout"}
                </Button>
              </Link>
              <Link href="/exercises">
                <Button
                  variant="outline"
                  className="w-full border-primary/30 hover:bg-primary/10 bg-transparent"
                  size="lg"
                >
                  Browse Exercises
                </Button>
              </Link>
              {hasWorkouts && (
                <Link href="/progress">
                  <Button
                    variant="outline"
                    className="w-full border-primary/30 hover:bg-primary/10 bg-transparent"
                    size="lg"
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View Progress
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        {hasWorkouts && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-primary" />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription>Your latest workout sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Recent workout sessions will appear here</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Floating Action Button */}
      <Link href="/workouts">
        <FloatingActionButton className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
          <Plus className="h-6 w-6" />
        </FloatingActionButton>
      </Link>
    </div>
  )
}
