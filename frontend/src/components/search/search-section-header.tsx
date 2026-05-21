import { Button } from "@/components/ui/button";

type SearchSectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SearchSectionHeader({ title, actionLabel, onAction }: SearchSectionHeaderProps) {
  return (
    <div className="search-section-header">
      <h2>{title}</h2>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
