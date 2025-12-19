import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Stats Card Skeleton - matches StatsCards layout (3 cards)
export function StatsCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card 
          key={i} 
          className="animate-element"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-16" />
              </div>
              <Skeleton className="h-12 w-12 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Stats Card Skeleton for 4 cards layout
export function StatsCardsSkeleton4() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card 
          key={i} 
          className="animate-element"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-12 w-12 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Criteria Card Skeleton - matches CriteriaCards layout
export function CriteriaCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-4">
        {/* Header with checkbox and title */}
        <div className="flex items-start gap-3">
          <Skeleton className="h-5 w-5 rounded mt-1" />
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-10 rounded-full" />
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4" />
          </div>
        </div>

        {/* Type badge */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        {/* Usage info */}
        <div className="pt-3 border-t border-border/50">
          <Skeleton className="h-3 w-32" />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end pt-3 border-t border-border/50 gap-1">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// Grid of Criteria Cards Skeleton
export function CriteriaCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="animate-element"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <CriteriaCardSkeleton />
        </div>
      ))}
    </div>
  );
}

// Company Card Skeleton - matches CompanyCards layout
export function CompanyCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        {/* Info rows */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end pt-3 border-t border-border/50 gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// Grid of Company Cards Skeleton
export function CompanyCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="animate-element"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <CompanyCardSkeleton />
        </div>
      ))}
    </div>
  );
}

// Model Card Skeleton - matches ModelCard layout
export function ModelCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        {/* Senso badges */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 pt-3 border-t border-border/50">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// Grid of Model Cards Skeleton
export function ModelCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="animate-element"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <ModelCardSkeleton />
        </div>
      ))}
    </div>
  );
}

// Environment Card Skeleton - matches EnvironmentCard layout
export function EnvironmentCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// List of Environment Cards Skeleton
export function EnvironmentCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="animate-element"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <EnvironmentCardSkeleton />
        </div>
      ))}
    </div>
  );
}

// Company Card Skeleton for hierarchy view
export function CompanyCardSkeletonHierarchy() {
  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-24 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${i === 0 ? 'w-8' : i === 1 ? 'w-40' : 'w-20'}`} 
        />
      ))}
    </div>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <Card>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div 
            key={i} 
            className="animate-element"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <TableRowSkeleton columns={columns} />
          </div>
        ))}
      </div>
    </Card>
  );
}

// Page Header Skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2 animate-element">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-96" />
    </div>
  );
}

// Breadcrumb Skeleton
export function BreadcrumbSkeleton() {
  return (
    <div className="flex items-center gap-2 animate-element">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

// Search Bar Skeleton
export function SearchBarSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 animate-element animate-delay-300">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}
