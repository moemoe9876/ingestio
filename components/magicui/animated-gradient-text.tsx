/*
<ai_context>
This client component provides an animated gradient text.
</ai_context>
*/

import { ReactNode } from "react"

import { cn } from "@/lib/utils"

export default function AnimatedGradientText({
  children,
  className,
  gradientClasses,
  animationDuration
}: {
  children: ReactNode
  className?: string
  gradientClasses?: string
  animationDuration?: number
}) {
  return (
    <div
      className={cn(
        "group relative mx-auto flex max-w-fit flex-row items-center justify-center rounded-2xl bg-white/40 px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#8fdfff1f] backdrop-blur-sm transition-shadow duration-500 ease-out [--bg-size:300%] hover:shadow-[inset_0_-5px_10px_#8fdfff3f] dark:bg-black/40",
        className
      )}
      style={{ 
        "--animation-duration": `${animationDuration || 10}s`
      } as React.CSSProperties}
    >
      <div
        className={cn(
          `absolute inset-0 block size-full bg-gradient-to-r from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-[length:var(--bg-size)_100%] p-[1px] [border-radius:inherit] ![mask-composite:subtract] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] animate-[gradient_var(--animation-duration)_linear_infinite]`,
          gradientClasses
        )}
      />

      {children}
    </div>
  )
}
