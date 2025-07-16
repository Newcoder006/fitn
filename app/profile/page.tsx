"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, User, Save, Calculator } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface UserProfile {
  name: string
  email: string
  age: number
  gender: string
  height: number
  weight: number
  activityLevel: string
  fitnessGoal: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bmi, setBmi] = useState(0)
  const [bmr, setBmr] = useState(0)
  const [dailyCalories, setDailyCalories] = useState(0)
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
    setProfile({
      ...parsedUser,
      fitnessGoal: parsedUser.fitnessGoal || "maintain",
    })
    setLoading(false)
  }, [router])

  useEffect(() => {
    if (profile) {
      calculateMetrics()
    }
  }, [profile])

  const calculateMetrics = () => {
    if (!profile) return

    // Calculate BMI
    const bmiValue = profile.weight / (profile.height / 100) ** 2
    setBmi(Math.round(bmiValue * 10) / 10)

    // Calculate BMR (Basal Metabolic Rate)
    let bmrValue
    if (profile.gender === "male") {
      bmrValue = 88.362 + 13.397 * profile.weight + 4.799 * profile.height - 5.677 * profile.age
    } else {
      bmrValue = 447.593 + 9.247 * profile.weight + 3.098 * profile.height - 4.33 * profile.age
    }
    setBmr(Math.round(bmrValue))

    // Calculate daily calorie needs
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      very: 1.725,
      extra: 1.9,
    }

    const dailyCaloriesValue = bmrValue * activityMultipliers[profile.activityLevel as keyof typeof activityMultipliers]
    setDailyCalories(Math.round(dailyCaloriesValue))
  }

  const handleInputChange = (field: string, value: string | number) => {
    if (!profile) return

    setProfile((prev) => ({
      ...prev!,
      [field]: typeof value === "string" && !isNaN(Number(value)) ? Number(value) : value,
    }))
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(profile),
      })

      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(profile))
        toast({
          title: "Success",
          description: "Profile updated successfully!",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update profile",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return { category: "Underweight", color: "text-blue-600" }
    if (bmi < 25) return { category: "Normal", color: "text-green-600" }
    if (bmi < 30) return { category: "Overweight", color: "text-yellow-600" }
    return { category: "Obese", color: "text-red-600" }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const bmiInfo = getBmiCategory(bmi)

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
            <Link href="/progress" className="text-gray-600 hover:text-blue-600">
              Progress
            </Link>
            <Link href="/profile" className="text-blue-600 font-medium">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Profile Settings</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your personal information and fitness preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Personal Information</span>
                </CardTitle>
                <CardDescription>Update your personal details and fitness information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={profile.name} onChange={(e) => handleInputChange("name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={profile.age}
                      onChange={(e) => handleInputChange("age", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={profile.height}
                      onChange={(e) => handleInputChange("height", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      value={profile.weight}
                      onChange={(e) => handleInputChange("weight", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={profile.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="activityLevel">Activity Level</Label>
                    <Select
                      value={profile.activityLevel}
                      onValueChange={(value) => handleInputChange("activityLevel", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentary">Sedentary</SelectItem>
                        <SelectItem value="light">Lightly Active</SelectItem>
                        <SelectItem value="moderate">Moderately Active</SelectItem>
                        <SelectItem value="very">Very Active</SelectItem>
                        <SelectItem value="extra">Extra Active</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fitnessGoal">Fitness Goal</Label>
                  <Select
                    value={profile.fitnessGoal}
                    onValueChange={(value) => handleInputChange("fitnessGoal", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lose">Lose Weight</SelectItem>
                      <SelectItem value="maintain">Maintain Weight</SelectItem>
                      <SelectItem value="gain">Gain Weight</SelectItem>
                      <SelectItem value="muscle">Build Muscle</SelectItem>
                      <SelectItem value="endurance">Improve Endurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Health Metrics */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calculator className="h-5 w-5" />
                  <span>Health Metrics</span>
                </CardTitle>
                <CardDescription>Calculated based on your profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">BMI</span>
                    <span className={`text-lg font-bold ${bmiInfo.color}`}>{bmi}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    Category: <span className={bmiInfo.color}>{bmiInfo.category}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">BMR</span>
                    <span className="text-lg font-bold">{bmr}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">Basal Metabolic Rate (calories/day)</div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Daily Calories</span>
                    <span className="text-lg font-bold">{dailyCalories}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">Recommended daily intake</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>BMI Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Underweight</span>
                  <span className="text-blue-600">{"< 18.5"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Normal</span>
                  <span className="text-green-600">18.5 - 24.9</span>
                </div>
                <div className="flex justify-between">
                  <span>Overweight</span>
                  <span className="text-yellow-600">25.0 - 29.9</span>
                </div>
                <div className="flex justify-between">
                  <span>Obese</span>
                  <span className="text-red-600">{"≥ 30.0"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
