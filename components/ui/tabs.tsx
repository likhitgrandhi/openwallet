"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "rounded-lg p-[3px] group-data-[orientation=horizontal]/tabs:h-9 bg-muted text-muted-foreground",
        line: "gap-0 rounded-none bg-transparent border-b border-[#E4E4E4]",
        angellist: "gap-0 rounded-none bg-transparent border-b border-[#E4E4E4]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "focus-visible:outline-none relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-all duration-150 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=default]/tabs-list:text-foreground/60 group-data-[variant=default]/tabs-list:hover:text-foreground group-data-[variant=default]/tabs-list:data-[state=active]:bg-background group-data-[variant=default]/tabs-list:data-[state=active]:text-foreground group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=default]/tabs-list:h-[calc(100%-1px)]",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:text-[#8A8A8A] group-data-[variant=line]/tabs-list:hover:text-[#525252] group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:text-[#0A0A0A] group-data-[variant=line]/tabs-list:data-[state=active]:font-medium group-data-[variant=line]/tabs-list:data-[state=active]:border-b-2 group-data-[variant=line]/tabs-list:data-[state=active]:border-[#0A0A0A] group-data-[variant=line]/tabs-list:data-[state=active]:mb-[-1px] group-data-[variant=line]/tabs-list:pb-3 group-data-[variant=line]/tabs-list:pt-1 group-data-[variant=line]/tabs-list:px-4",
        "group-data-[variant=angellist]/tabs-list:bg-transparent group-data-[variant=angellist]/tabs-list:text-[#8A8A8A] group-data-[variant=angellist]/tabs-list:hover:text-[#525252] group-data-[variant=angellist]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=angellist]/tabs-list:data-[state=active]:text-[#0A0A0A] group-data-[variant=angellist]/tabs-list:data-[state=active]:font-medium group-data-[variant=angellist]/tabs-list:data-[state=active]:border-b-2 group-data-[variant=angellist]/tabs-list:data-[state=active]:border-[#0A0A0A] group-data-[variant=angellist]/tabs-list:data-[state=active]:mb-[-1px] group-data-[variant=angellist]/tabs-list:pb-3 group-data-[variant=angellist]/tabs-list:pt-1 group-data-[variant=angellist]/tabs-list:px-4",
        "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/20 focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
