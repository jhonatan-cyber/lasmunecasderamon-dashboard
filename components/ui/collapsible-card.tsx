"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface CollapsibleCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode
  description?: string
  children: React.ReactNode
  defaultOpen?: boolean
  headerAction?: React.ReactNode
  headerRight?: React.ReactNode
  headerClassName?: string
}

export function CollapsibleCard({
  title,
  description,
  children,
  defaultOpen = false,
  headerAction,
  headerRight,
  headerClassName,
  className,
  ...props
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className={cn("flex flex-row items-center justify-between space-y-0 pb-2", headerClassName)}>
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              {typeof title === 'string' ? (
                <CardTitle className="text-base font-medium">{title}</CardTitle>
              ) : (
                <div className="flex items-center gap-2 font-medium">{title}</div>
              )}
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {headerRight}
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-2">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
