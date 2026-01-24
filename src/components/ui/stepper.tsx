import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

interface StepperProps {
  steps: {
    title: string
    description?: string
  }[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("flex w-full items-center justify-between", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep

        return (
          <div key={step.title} className="flex flex-1 flex-col items-center group">
            <div className="flex items-center w-full">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors duration-200",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                    ? "border-primary text-primary"
                    : "border-muted-foreground/30 text-muted-foreground/30"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-[2px] w-full mx-2 transition-colors duration-200",
                    index < currentStep ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
            <div className={`mt-2 w-full text-center ${index !== 0 && index !== steps.length - 1 ? "mr-auto ml-auto" : index === 0 ? "mr-auto text-left" : "ml-auto text-right"}`}>
                <div className="flex flex-col">
                    <span className={cn(
                        "text-sm font-medium",
                         isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}>
                        {step.title}
                    </span>
                    {step.description && (
                        <span className="text-xs text-muted-foreground hidden md:block">
                            {step.description}
                        </span>
                    )}
                </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
