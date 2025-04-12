"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3, LineChart, PieChart } from "lucide-react"
import React from "react"

// Simple placeholder version - in a real app, we would use a charting library
// like Recharts, Chart.js, or D3.js

interface ChartProps {
  title: string
  description?: string
  data: any[]
  isLoading?: boolean
  icon?: React.ReactNode
  height?: number
}

export function BarChartComponent({
  title,
  description,
  data,
  isLoading = false,
  icon = <BarChart3 className="h-5 w-5 text-primary" />,
  height = 350
}: ChartProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className={`h-[${height}px]`}>
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-full h-[90%] rounded-md" />
          </div>
        ) : data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <div className="w-full h-full">
            <VisualizeBarChart data={data} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PieChartComponent({
  title,
  description,
  data,
  isLoading = false,
  icon = <PieChart className="h-5 w-5 text-primary" />,
  height = 350
}: ChartProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className={`h-[${height}px]`}>
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-[90%] h-[90%] rounded-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <div className="w-full h-full">
            <VisualizePieChart data={data} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function LineChartComponent({
  title,
  description,
  data,
  isLoading = false,
  icon = <LineChart className="h-5 w-5 text-primary" />,
  height = 350
}: ChartProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className={`h-[${height}px]`}>
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-full h-[90%] rounded-md" />
          </div>
        ) : data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <div className="w-full h-full">
            <VisualizeLineChart data={data} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Basic visualizations - in a real app, replace these with actual chart components
function VisualizeBarChart({ data }: { data: any[] }) {
  // For now, using basic CSS to visualize data
  // Maximum value for scaling the bars
  const maxValue = Math.max(...data.map(item => item.count || item.value || 0))
  
  return (
    <div className="w-full h-full flex flex-col justify-end space-y-2 p-4">
      <div className="flex flex-col space-y-2">
        {data.map((item, index) => {
          const value = item.count || item.value || 0
          const percentage = maxValue ? (value / maxValue) * 100 : 0
          return (
            <div key={index} className="relative h-10 w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="h-7 w-full bg-muted rounded-md">
                  <div
                    className="h-7 bg-primary rounded-md"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-between px-3">
                <span className="text-xs font-medium text-foreground z-10">
                  {item.label || item.status || item.mimeType || item.date || "Unknown"}
                </span>
                <span className="text-xs font-medium text-foreground z-10">{value}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VisualizePieChart({ data }: { data: any[] }) {
  // Simple CSS-based pie chart visualization
  const total = data.reduce((sum, item) => sum + (item.count || item.value || 0), 0)
  
  // Generate random colors for each segment (in a real app, use a color scale)
  const colors = data.map(() => {
    const hue = Math.floor(Math.random() * 360)
    return `hsl(${hue}, 70%, 50%)`
  })
  
  // For empty data, show placeholder
  if (total === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-muted-foreground">No data available</div>
      </div>
    )
  }
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="w-[200px] h-[200px] relative mb-4">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {data.map((item, index) => {
            const value = item.count || item.value || 0
            const percentage = (value / total) * 100
            
            // Calculate the position in the pie
            let cumulativePercentage = 0
            for (let i = 0; i < index; i++) {
              cumulativePercentage += (data[i].count || data[i].value || 0) / total * 100
            }
            
            // Calculate the arc parameters
            const startAngle = (cumulativePercentage / 100) * 360
            const endAngle = startAngle + (percentage / 100) * 360
            
            // Convert to radians
            const startRad = (startAngle * Math.PI) / 180
            const endRad = (endAngle * Math.PI) / 180
            
            // Calculate the end points
            const x1 = 50 + 50 * Math.cos(startRad)
            const y1 = 50 + 50 * Math.sin(startRad)
            const x2 = 50 + 50 * Math.cos(endRad)
            const y2 = 50 + 50 * Math.sin(endRad)
            
            // Large arc flag is 1 if the angle is > 180 degrees
            const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0
            
            return (
              <path
                key={index}
                d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                fill={colors[index]}
              />
            )
          })}
        </svg>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {data.map((item, index) => {
          const value = item.count || item.value || 0
          const percentage = Math.round((value / total) * 100)
          
          return (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: colors[index] }}
              ></div>
              <span className="text-xs">
                {item.label || item.status || item.mimeType || "Unknown"}: {percentage}% ({value})
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VisualizeLineChart({ data }: { data: any[] }) {
  // Simple CSS-based line chart visualization
  const values = data.map(item => item.count || item.value || 0)
  const maxValue = Math.max(...values, 1) // Avoid division by zero
  const minValue = Math.min(...values)
  
  // For empty data, show placeholder
  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-muted-foreground">No data available</div>
      </div>
    )
  }
  
  return (
    <div className="w-full h-full p-4">
      <svg 
        viewBox={`0 0 ${data.length * 10} 100`} 
        className="w-full h-[80%] overflow-visible"
        preserveAspectRatio="none"
      >
        <polyline
          points={data
            .map((item, index) => {
              const value = item.count || item.value || 0
              const x = index * 10
              // Normalize the y value between 10 and 90 (inverted because SVG y-axis)
              const normalized = 90 - ((value - minValue) / (maxValue - minValue)) * 80
              return `${x},${normalized}`
            })
            .join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
        />
        
        {/* Add dots for each data point */}
        {data.map((item, index) => {
          const value = item.count || item.value || 0
          const x = index * 10
          const normalized = 90 - ((value - minValue) / (maxValue - minValue)) * 80
          
          return (
            <circle
              key={index}
              cx={x}
              cy={normalized}
              r="1.5"
              className="fill-primary"
            />
          )
        })}
      </svg>
      
      {/* X-axis labels */}
      <div className="flex justify-between h-[20%] mt-2">
        {data.map((item, index) => (
          <div key={index} className="text-[10px] text-muted-foreground">
            {item.date || item.label || index + 1}
          </div>
        ))}
      </div>
    </div>
  )
} 