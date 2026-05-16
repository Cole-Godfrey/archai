"use client"

import type { ComponentProps, ReactNode } from "react"

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface EditorDialogPatternProps
  extends Omit<ComponentProps<typeof DialogContent>, "children" | "title"> {
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footerActions?: ReactNode
}

function EditorDialogPattern({
  title,
  description,
  children,
  footerActions,
  className,
  ...props
}: EditorDialogPatternProps) {
  return (
    <DialogContent
      className={cn(
        "border border-surface-border bg-elevated text-copy-primary shadow-xl",
        className
      )}
      {...props}
    >
      <DialogHeader>
        <DialogTitle className="text-copy-primary">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="text-copy-muted">
            {description}
          </DialogDescription>
        ) : null}
      </DialogHeader>

      {children}

      {footerActions ? (
        <DialogFooter className="border-surface-border bg-surface">
          {footerActions}
        </DialogFooter>
      ) : null}
    </DialogContent>
  )
}

export { EditorDialogPattern }
