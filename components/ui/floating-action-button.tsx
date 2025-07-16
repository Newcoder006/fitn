import type React from "react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
}

export function FloatingActionButton({
  children,
  className,
  position = "bottom-right",
  ...props
}: FloatingActionButtonProps) {
  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  }

  return (
    <Button
      className={cn(
        "fixed z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110",
        positionClasses[position],
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  )
}
