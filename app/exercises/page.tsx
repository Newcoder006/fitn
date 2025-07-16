"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Search, Filter, Dumbbell, Plus, Flame, Activity, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Exercise {
  _id: string
  name: string
  description: string
  muscle: string
  category: string
  equipment: string
  difficulty: string
  instructions: string[]
  caloriesPerMinute: number
  imageUrl?: string
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMuscle, setSelectedMuscle] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState("all")
  const [loading, setLoading] = useState(true)
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null)
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [restTime, setRestTime] = useState(60)
  const [duration, setDuration] = useState(0)
  const [addingToWorkout, setAddingToWorkout] = useState(false)
  const [currentWorkoutCount, setCurrentWorkoutCount] = useState(0)
  const router = useRouter()
  const { toast } = useToast()

  // Fetch exercises
  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/exercises", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Error fetching exercises: ${response.status}`)
      }

      const data = await response.json()
      setExercises(data)
      setFilteredExercises(data)
    } catch (error) {
      console.error("Error fetching exercises:", error)
      toast({
        title: "Error",
        description: "Failed to load exercises. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Fetch current workout status
  const fetchCurrentWorkout = useCallback(async () => {
    try {
      const response = await fetch("/api/workouts/current", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentWorkoutCount(data.exerciseCount || 0)
      }
    } catch (error) {
      console.error("Error fetching current workout:", error)
    }
  }, [])

  // Check authentication and fetch data on mount
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetchExercises()
    fetchCurrentWorkout()
  }, [router, fetchExercises, fetchCurrentWorkout])

  // Filter exercises when search or filter criteria change
  useEffect(() => {
    let result = [...exercises]

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      result = result.filter(
        (exercise) =>
          exercise.name.toLowerCase().includes(lowerSearchTerm) ||
          exercise.description.toLowerCase().includes(lowerSearchTerm) ||
          exercise.muscle.toLowerCase().includes(lowerSearchTerm),
      )
    }

    if (selectedMuscle !== "all") {
      result = result.filter((exercise) => exercise.muscle === selectedMuscle)
    }

    if (selectedCategory !== "all") {
      result = result.filter((exercise) => exercise.category === selectedCategory)
    }

    if (selectedDifficulty !== "all") {
      result = result.filter((exercise) => exercise.difficulty === selectedDifficulty)
    }

    setFilteredExercises(result)
  }, [exercises, searchTerm, selectedMuscle, selectedCategory, selectedDifficulty])

  // Get unique values for filter dropdowns
  const getUniqueValues = (key: keyof Exercise) => {
    return Array.from(new Set(exercises.map((exercise) => exercise[key])))
  }

  // Add exercise to workout
  const addToWorkout = async () => {
    if (!currentExercise) return

    try {
      setAddingToWorkout(true)

      const response = await fetch("/api/exercises/add-to-workout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          exerciseId: currentExercise._id,
          sets,
          reps,
          duration: duration > 0 ? duration : undefined,
          restTime,
        }),
      })

      if (!response.ok) {
        throw new Error(`Error adding exercise: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Exercise Added",
          description: `${currentExercise.name} added to your workout`,
        })

        // Update current workout count
        setCurrentWorkoutCount(data.exerciseCount || currentWorkoutCount + 1)
      } else {
        throw new Error(data.message || "Failed to add exercise")
      }
    } catch (error) {
      console.error("Error adding exercise to workout:", error)
      toast({
        title: "Error",
        description: "Failed to add exercise to workout",
        variant: "destructive",
      })
    } finally {
      setAddingToWorkout(false)
    }
  }

  // View current workout
  const viewCurrentWorkout = () => {
    router.push("/workouts")
  }

  // Get difficulty color
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

  // Get muscle group icon
  const getMuscleIcon = (muscle: string) => {
    switch (muscle.toLowerCase()) {
      case "chest":
        return "💪"
      case "back":
        return "🔙"
      case "shoulders":
        return "🏋️"
      case "arms":
        return "💪"
      case "legs":
        return "🦵"
      case "core":
        return "🧠"
      case "full body":
        return "👤"
      default:
        return "🏋️‍♀️"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-spin" />
          <p className="text-purple-800 dark:text-purple-200 font-medium">Loading exercises...</p>
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
            <Link href="/exercises" className="text-purple-600 font-medium">
              Exercises
            </Link>
            <Link href="/workouts" className="text-gray-600 hover:text-purple-600 transition-colors">
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
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Exercise Library</h1>
            <p className="text-gray-600 dark:text-gray-300">Browse exercises and add them to your workout</p>
          </div>

          {currentWorkoutCount > 0 && (
            <Button
              onClick={viewCurrentWorkout}
              className="mt-4 md:mt-0 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white shadow-md"
            >
              View Current Workout ({currentWorkoutCount})
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <Card className="mb-8 border-purple-100 dark:border-purple-900/20 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2 text-purple-500" />
              Search & Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search exercises..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Muscle Group
                  </label>
                  <Select value={selectedMuscle} onValueChange={setSelectedMuscle}>
                    <SelectTrigger className="border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                      <SelectValue placeholder="All Muscle Groups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Muscle Groups</SelectItem>
                      {getUniqueValues("muscle").map((muscle) => (
                        <SelectItem key={muscle as string} value={muscle as string}>
                          {muscle as string}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {getUniqueValues("category").map((category) => (
                        <SelectItem key={category as string} value={category as string}>
                          {category as string}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger className="border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                      <SelectValue placeholder="All Difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      {getUniqueValues("difficulty").map((difficulty) => (
                        <SelectItem key={difficulty as string} value={difficulty as string}>
                          {difficulty as string}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exercise Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise) => (
            <Card
              key={exercise._id}
              className="hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden group"
            >
              <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <span>{exercise.name}</span>
                  </CardTitle>
                  <Badge className={getDifficultyColor(exercise.difficulty)}>{exercise.difficulty}</Badge>
                </div>
                <CardDescription className="flex items-center">
                  <span className="mr-2 text-lg">{getMuscleIcon(exercise.muscle)}</span>
                  {exercise.muscle} • {exercise.category}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">{exercise.description}</p>

                <div className="flex justify-between text-sm mb-4">
                  <div className="flex items-center space-x-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span>{exercise.caloriesPerMinute} cal/min</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-purple-200 hover:border-purple-300 transition-colors bg-transparent"
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-xl text-purple-800 dark:text-purple-300">
                          {exercise.name}
                        </DialogTitle>
                        <DialogDescription>
                          {exercise.muscle} • {exercise.category}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge className={getDifficultyColor(exercise.difficulty)}>{exercise.difficulty}</Badge>
                          <div className="flex items-center space-x-1 text-sm">
                            <Flame className="h-4 w-4 text-orange-500" />
                            <span>{exercise.caloriesPerMinute} cal/min</span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-300">{exercise.description}</p>

                        <div>
                          <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-200">Instructions:</h4>
                          <ol className="space-y-2 list-decimal list-inside text-sm text-gray-600 dark:text-gray-300">
                            {exercise.instructions.map((instruction, index) => (
                              <li key={index}>{instruction}</li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white shadow-sm"
                        size="sm"
                        onClick={() => setCurrentExercise(exercise)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-xl text-purple-800 dark:text-purple-300">
                          Add to Workout
                        </DialogTitle>
                        <DialogDescription>Customize {exercise.name} for your workout</DialogDescription>
                      </DialogHeader>

                      <Tabs defaultValue="reps" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="reps">Reps Based</TabsTrigger>
                          <TabsTrigger value="time">Time Based</TabsTrigger>
                        </TabsList>

                        <TabsContent value="reps" className="space-y-4 pt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Sets: {sets}
                            </label>
                            <Slider
                              value={[sets]}
                              min={1}
                              max={10}
                              step={1}
                              onValueChange={(value) => setSets(value[0])}
                              className="py-4"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Reps per set: {reps}
                            </label>
                            <Slider
                              value={[reps]}
                              min={1}
                              max={30}
                              step={1}
                              onValueChange={(value) => setReps(value[0])}
                              className="py-4"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Rest between sets: {restTime} seconds
                            </label>
                            <Slider
                              value={[restTime]}
                              min={0}
                              max={180}
                              step={5}
                              onValueChange={(value) => setRestTime(value[0])}
                              className="py-4"
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="time" className="space-y-4 pt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Sets: {sets}
                            </label>
                            <Slider
                              value={[sets]}
                              min={1}
                              max={10}
                              step={1}
                              onValueChange={(value) => setSets(value[0])}
                              className="py-4"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Duration per set: {duration} seconds
                            </label>
                            <Slider
                              value={[duration]}
                              min={0}
                              max={300}
                              step={5}
                              onValueChange={(value) => setDuration(value[0])}
                              className="py-4"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Rest between sets: {restTime} seconds
                            </label>
                            <Slider
                              value={[restTime]}
                              min={0}
                              max={180}
                              step={5}
                              onValueChange={(value) => setRestTime(value[0])}
                              className="py-4"
                            />
                          </div>
                        </TabsContent>
                      </Tabs>

                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button
                            onClick={addToWorkout}
                            disabled={addingToWorkout}
                            className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white"
                          >
                            {addingToWorkout ? (
                              <>Adding...</>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                Add to Workout
                              </>
                            )}
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredExercises.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <Search className="h-16 w-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No exercises found</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Try adjusting your search or filters</p>
            <Button
              onClick={() => {
                setSearchTerm("")
                setSelectedMuscle("all")
                setSelectedCategory("all")
                setSelectedDifficulty("all")
              }}
              variant="outline"
              className="border-purple-200 hover:border-purple-300 transition-colors"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
