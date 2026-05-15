import { Button } from "@/components/ui/button";

type SearchEmptyStateProps = {
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export function SearchEmptyState({ message, actionLabel, onAction }: SearchEmptyStateProps) {
  return (
    <div className="search-empty-state">
      <p>{message}</p>
      <Button onClick={onAction}>{actionLabel}</Button>
    </div>
  );
}
