import { CardsSkeleton, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b pb-4">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>
      <CardsSkeleton />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
