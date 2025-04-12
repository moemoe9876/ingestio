import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LucideIcon } from "lucide-react"

export interface MetricCardProps {
  title: string
  value: string | number
  description?: React.ReactNode
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
  }
  isLoading?: boolean
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  isLoading = false,
}: MetricCardProps) {
  const showTrendUp = trend?.value && trend.value > 0
  const showTrendDown = trend?.value && trend.value < 0
  const trendValue = trend?.value ? Math.abs(trend.value) : 0
  
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-7 w-24 mb-1" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-card-foreground">{value}</div>
            {(trend || description) && (
              <p className="text-xs text-muted-foreground">
                {trend ? (
                  <span 
                    className={
                      showTrendUp 
                        ? "text-green-500" 
                        : showTrendDown 
                          ? "text-red-500" 
                          : ""
                    }
                  >
                    {showTrendUp ? "↑" : showTrendDown ? "↓" : ""}
                    {` ${trendValue}%`}
                  </span>
                ) : null}
                {trend && trend.label ? ` ${trend.label}` : null}
                {!trend && description ? description : null}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
} 