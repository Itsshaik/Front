import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarWithStatusProps {
  name: string;
  isOnline?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function AvatarWithStatus({
  name,
  isOnline = false,
  size = "md",
  className,
}: AvatarWithStatusProps) {
  // Get initials from name
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
  
  // Determine size classes
  const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
    xl: "h-24 w-24 text-3xl",
  };
  
  const statusSizeClasses = {
    sm: "w-3 h-3 -bottom-0.5 -right-0.5",
    md: "w-3.5 h-3.5 -bottom-0.5 -right-0.5",
    lg: "w-4 h-4 -bottom-1 -right-1",
    xl: "w-6 h-6 -bottom-1 -right-1",
  };
  
  return (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], "bg-secondary text-white", className)}>
        <AvatarFallback className="bg-secondary text-white">
          {initials}
        </AvatarFallback>
      </Avatar>
      {isOnline && (
        <div 
          className={cn(
            statusSizeClasses[size],
            "absolute bg-accent rounded-full border-2 border-white"
          )}
        />
      )}
    </div>
  );
}
