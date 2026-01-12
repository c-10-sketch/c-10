import { Loader2 } from "lucide-react";

export function FullPageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <span className="text-sm font-medium uppercase tracking-widest text-white/50">Loading C10</span>
      </div>
    </div>
  );
}

export function SectionLoader() {
  return (
    <div className="flex w-full items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-white/50" />
    </div>
  );
}
