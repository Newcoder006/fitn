"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Activity, Play, Clock, Flame, Plus, ArrowRight, Dumbbell } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Workout {
  _id: string
  name: string
  exercises: Array<{
    exerciseId: string
    name: string
    sets: number
    reps: number
    duration?: number
    restTime: number
  }>
  totalDuration: number
  estimatedCalories: number
  difficulty: string
  createdAt?: string
  isSample?: boolean
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null)
  const [workoutTimer, setWorkoutTimer] = useState(0)
  const [isWorkoutActive, setIsWorkoutActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  // Fetch workouts function - made reusable with useCallback
  const fetchWorkouts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/workouts", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Error fetching workouts: ${response.status}`)
      }

      const data = await response.json()
      setWorkouts(data)
    } catch (error) {
      console.error("Error fetching workouts:", error)
      toast({
        title: "Error",
        description: "Failed to load workouts. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Check authentication and fetch workouts on mount
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetchWorkouts()
  }, [router, fetchWorkouts])

  // Timer effect for active workout
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isWorkoutActive) {
      interval = setInterval(() => {
        setWorkoutTimer((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isWorkoutActive])

  // Start workout function
  const startWorkout = async (workout: Workout) => {
    try {
      // If it's a sample workout, save it to the database first
      if (workout.isSample) {
        const saveResponse = await fetch("/api/workouts/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            name: workout.name,
            exercises: workout.exercises,
            totalDuration: workout.totalDuration,
            estimatedCalories: workout.estimatedCalories,
            difficulty: workout.difficulty,
          }),
        })

        if (saveResponse.ok) {
          const savedWorkout = await saveResponse.json()
          workout._id = savedWorkout.workoutId
          workout.isSample = false
        } else {
          throw new Error("Failed to save workout")
        }
      }

      setActiveWorkout(workout)
      setIsWorkoutActive(true)
      setWorkoutTimer(0)
      toast({
        title: "Workout Started!",
        description: `Started ${workout.name}`,
      })
    } catch (error) {
      console.error("Error starting workout:", error)
      toast({
        title: "Error",
        description: "Failed to start workout",
        variant: "destructive",
      })
    }
  }

  // End workout function
  const endWorkout = async () => {
    if (!activeWorkout) return

    try {
      const response = await fetch("/api/workouts/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          workoutId: activeWorkout._id,
          duration: workoutTimer,
          caloriesBurned: Math.round(
            (workoutTimer / 60) * (activeWorkout.estimatedCalories / activeWorkout.totalDuration || 1),
          ),
        }),
      })

      if (response.ok) {
        toast({
          title: "Workout Completed!",
          description: `Great job! You worked out for ${Math.floor(workoutTimer / 60)} minutes.`,
        })

        // Important: Refresh workouts after completing one
        await fetchWorkouts()
      } else {
        throw new Error("Failed to complete workout")
      }
    } catch (error) {
      console.error("Error completing workout:", error)
      toast({
        title: "Error",
        description: "Failed to record workout completion",
        variant: "destructive",
      })
    } finally {
      // Always reset the active workout state
      setActiveWorkout(null)
      setIsWorkoutActive(false)
      setWorkoutTimer(0)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner":
        return "bg-green-100 text-green-800"
      case "intermediate":
        return "bg-yellow-100 text-yellow-800"
      case "advanced":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Create new workout function
  const goToExercises = () => {
    router.push("/exercises")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-spin" />
          <p className="text-purple-800 dark:text-purple-200 font-medium">Loading your workouts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Dumbbell className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
              FitTracker
            </span>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Link href="/dashboard" className="text-gray-600 hover:text-purple-600 transition-colors">
              Dashboard
            </Link>
            <Link href="/exercises" className="text-gray-600 hover:text-purple-600 transition-colors">
              Exercises
            </Link>
            <Link href="/workouts" className="text-purple-600 font-medium">
              Workouts
            </Link>
            <Link href="/progress" className="text-gray-600 hover:text-purple-600 transition-colors">
              Progress
            </Link>
            <Link href="/profile" className="text-gray-600 hover:text-purple-600 transition-colors">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Workouts</h1>
          <p className="text-gray-600 dark:text-gray-300">Track your workout sessions and monitor your progress</p>
        </div>

        {/* Active Workout Timer */}
        {isWorkoutActive && activeWorkout && (
          <Card className="mb-8 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Active Workout: {activeWorkout.name}</span>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-lg px-3 py-1">
                  {formatTime(workoutTimer)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-300">Keep going! You're doing great.</div>
                <Button
                  onClick={endWorkout}
                  variant="destructive"
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all"
                >
                  End Workout
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Workout Button */}
        <div className="mb-8">
          <Button
            onClick={goToExercises}
            className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Workout
          </Button>
        </div>

        {/* Workout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workouts.map((workout) => (
            <Card
              key={workout._id}
              className="hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden group"
            >
              <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <span>{workout.name}</span>
                    {workout.isSample && (
                      <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">
                        Try it
                      </Badge>
                    )}
                  </CardTitle>
                  <Badge className={getDifficultyColor(workout.difficulty)}>{workout.difficulty}</Badge>
                </div>
                <CardDescription>{workout.exercises.length} exercises</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-purple-500" />
                      <span>{workout.totalDuration} min</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span>{workout.estimatedCalories} cal</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Exercises:</h4>
                    <div className="space-y-1">
                      {workout.exercises.slice(0, 3).map((exercise, index) => (
                        <div key={index} className="text-xs text-gray-600 dark:text-gray-300 flex items-center">
                          <ArrowRight className="h-3 w-3 mr-1 text-purple-400" />
                          {exercise.name} - {exercise.sets}×{exercise.reps}
                        </div>
                      ))}
                      {workout.exercises.length > 3 && (
                        <div className="text-xs text-purple-500 font-medium">
                          +{workout.exercises.length - 3} more exercises
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => startWorkout(workout)}
                      disabled={isWorkoutActive}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white shadow-sm group-hover:shadow-md transition-all"
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      {workout.isSample ? "Try Workout" : "Start"}
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-purple-200 hover:border-purple-300 transition-colors bg-transparent"
                        >
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-xl text-purple-800 dark:text-purple-300">
                            {workout.name}
                          </DialogTitle>
                          <DialogDescription>Workout details and exercises</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                              <span className="font-medium text-purple-700 dark:text-purple-300">Duration:</span>{" "}
                              {workout.totalDuration} min
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                              <span className="font-medium text-orange-700 dark:text-orange-300">Calories:</span>{" "}
                              {workout.estimatedCalories}
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                              <span className="font-medium text-blue-700 dark:text-blue-300">Difficulty:</span>{" "}
                              {workout.difficulty}
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                              <span className="font-medium text-green-700 dark:text-green-300">Exercises:</span>{" "}
                              {workout.exercises.length}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-200">Exercise List:</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                              {workout.exercises.map((exercise, index) => (
                                <div
                                  key={index}
                                  className="text-sm border-l-2 border-purple-300 pl-3 py-1 hover:bg-purple-50 dark:hover:bg-purple-900/10 rounded-r-lg transition-colors"
                                >
                                  <div className="font-medium text-purple-700 dark:text-purple-300">
                                    {exercise.name}
                                  </div>
                                  <div className="text-gray-600 dark:text-gray-400 text-xs">
                                    {exercise.sets} sets × {exercise.reps} reps
                                    {exercise.duration && ` × ${exercise.duration}s`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <Button
                            onClick={() => {
                              startWorkout(workout)
                              document.querySelector('[role="dialog"] button[data-state="open"]')?.click()
                            }}
                            disabled={isWorkoutActive}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {workout.isSample ? "Try This Workout" : "Start Workout"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {workouts.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <Dumbbell className="h-16 w-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No workouts yet</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Create your first workout to get started</p>
            <Button
              onClick={goToExercises}
              className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Workout
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
