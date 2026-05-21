import { type ReactNode } from "react";

interface MetaCardProps {
  icon: ReactNode;
  label: string;
  value: string;
}

export function MetaCard({ icon, label, value }: MetaCardProps) {
  return (
    <div className="min-w-0 flex items-start gap-3 p-3 rounded-lg bg-white border border-gray-200">
      <div className="mt-1 color-gray-500 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[9px] font-semibold tracking-wider uppercase text-gray-400 mb-1">
          {label}
        </div>
        <div className="text-sm font-bold text-gray-900 truncate">
          {value}
        </div>
      </div>
    </div>
  );
}
