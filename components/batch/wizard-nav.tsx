import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface WizardNavProps {
  currentStep: number
}

export function WizardNav({ currentStep }: WizardNavProps) {
  const steps = [
    { id: 1, name: "Upload Files" },
    { id: 2, name: "Configure Prompts" },
    { id: 3, name: "Review & Submit" },
  ]

  return (
    <nav aria-label="Progress" className="w-full mb-8">
      <ol role="list" className="flex items-center justify-center">
        {steps.map((step, stepIdx) => (
          <li
            key={step.name}
            className={cn(
              stepIdx !== steps.length - 1 ? "pr-8 sm:pr-20" : "",
              "relative flex flex-col items-center"
            )}
          >
            {currentStep > step.id ? (
              <>
                <div className="absolute inset-0 top-1/2 -translate-y-1/2 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-black" />
                </div>
                <div
                  className="relative flex h-8 w-8 items-center justify-center rounded-full bg-black transition-colors duration-300 ease-in-out"
                >
                  <Check className="h-5 w-5 text-white" aria-hidden="true" />
                  <span className="sr-only">{step.name} - Completed</span>
                </div>
              </>
            ) : currentStep === step.id ? (
              <>
                <div className="absolute inset-0 top-1/2 -translate-y-1/2 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-200 dark:bg-neutral-700" />
                </div>
                <div
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-background transition-colors duration-300 ease-in-out"
                  aria-current="step"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-black" aria-hidden="true" />
                  <span className="sr-only">{step.name} - Current</span>
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 top-1/2 -translate-y-1/2 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-200 dark:bg-neutral-700" />
                </div>
                <div
                  className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-background dark:border-neutral-700 transition-colors duration-300 ease-in-out hover:border-gray-400 dark:hover:border-neutral-500"
                >
                  <span className="sr-only">{step.name} - Upcoming</span>
                </div>
              </>
            )}
            <p className={cn("pt-2 text-xs font-medium text-center whitespace-nowrap",
              currentStep === step.id ? "text-black" : "text-muted-foreground"
            )}>
              {step.name}
            </p>
          </li>
        ))}
      </ol>
    </nav>
  )
}
