import { type ReactNode } from "react";

interface DetailSectionProps {
  eyebrow?: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function DetailSection({ eyebrow, title, icon, children }: DetailSectionProps) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="flex flex-col gap-1">
          {eyebrow && (
            <div className="text-[10.5px] font-semibold tracking-wider uppercase text-gray-400">
              {eyebrow}
            </div>
          )}
          <h2 className="text-[15px] font-bold leading-tight text-gray-900">{title}</h2>
        </div>
        {icon && (
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-900 flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
