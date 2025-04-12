import { Skeleton } from "@/components/ui/skeleton"

interface ProgressMetricProps {
  label: string
  value: number | string
  percentage: number
  color?: string
  isLoading?: boolean
}

export function ProgressMetric({
  label,
  value,
  percentage,
  color = "bg-primary",
  isLoading = false
}: ProgressMetricProps) {
  return (
    <div className="space-y-2">
      {isLoading ? (
        <>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{label}</div>
            <div className="text-sm text-muted-foreground">{value}</div>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${color} transition-all duration-500 ease-in-out`} 
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            ></div>
          </div>
        </>
      )}
    </div>
  )
} 