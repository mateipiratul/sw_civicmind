interface InfoRowProps {
  label: string;
  value: string;
  noBorder?: boolean;
}

export function InfoRow({ label, value, noBorder = false }: InfoRowProps) {
  return (
    <div
      className={`flex justify-between items-start gap-3 pb-3 ${
        noBorder ? "border-none" : "border-bottom border-gray-100"
      }`}
    >
      <span className="text-gray-400 text-xs">{label}</span>
      <span className="text-gray-900 text-xs font-semibold text-right">{value}</span>
    </div>
  );
}
