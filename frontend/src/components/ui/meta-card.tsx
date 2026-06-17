import { type ReactNode } from "react";

interface MetaCardProps {
  icon: ReactNode;
  label: string;
  value: string;
}

export function MetaCard({ icon, label, value }: MetaCardProps) {
  return (
    <div className="meta-card">
      <div className="meta-card-icon">{icon}</div>
      <div className="meta-card-copy">
        <div className="meta-card-label">
          {label}
        </div>
        <div className="meta-card-value">
          {value}
        </div>
      </div>
    </div>
  );
}
