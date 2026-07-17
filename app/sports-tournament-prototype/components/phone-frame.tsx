import type { ReactNode } from "react"

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-secondary p-0 sm:p-6">
      <div className="relative h-svh w-full max-w-[420px] overflow-hidden bg-background sm:h-[860px] sm:rounded-[3rem] sm:border-8 sm:border-foreground/90 sm:shadow-2xl">
        {/* Notch (solo en vista desktop) */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-50 hidden h-7 w-40 -translate-x-1/2 rounded-b-2xl bg-foreground/90 sm:block" />
        <div className="flex h-full flex-col">{children}</div>
      </div>
    </div>
  )
}
