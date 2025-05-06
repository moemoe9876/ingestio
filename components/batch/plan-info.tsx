import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { InfoIcon } from "lucide-react"

interface PlanInfoProps {
  plan: string
  fileLimit: number
}

export function PlanInfo({ plan, fileLimit }: PlanInfoProps) {
  return (
    <div className="flex items-center gap-3 text-sm bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-md border border-gray-200 dark:border-neutral-700/60">
      <InfoIcon className="h-5 w-5 text-gray-500 dark:text-neutral-400 flex-shrink-0" />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-700 dark:text-neutral-300">
          Your current plan
        </span>
        <Badge
          variant="secondary" 
          className={cn(
            "px-2 py-0.5 text-xs hover:bg-gray-200/80 dark:hover:bg-neutral-700/80 bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-neutral-200 font-medium border border-gray-300 dark:border-neutral-600",
            plan === "plus" && "bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200/80 dark:hover:bg-blue-500/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-500/50",
            plan === "growth" && "bg-purple-100 dark:bg-purple-500/20 hover:bg-purple-200/80 dark:hover:bg-purple-500/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-500/50"
          )}
        >
          {plan.charAt(0).toUpperCase() + plan.slice(1)}
        </Badge>
        <span className="text-gray-700 dark:text-neutral-300">
          allows up to <span className="font-semibold text-gray-800 dark:text-neutral-100">{fileLimit} files</span> per batch.
        </span>
      </div>
    </div>
  )
}
