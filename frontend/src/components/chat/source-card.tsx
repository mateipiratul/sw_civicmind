import { ExternalLink } from "lucide-react";

export interface Fragment {
  id: string;
  label: string;
  law: string;
  excerpt: string;
  href?: string;
  similarity?: string;
}

interface SourceCardProps {
  fragment: Fragment;
}

export function SourceCard({ fragment }: SourceCardProps) {
  return (
    <div className="source-card">
      <div className="source-header">
        <div>
          <div className="source-label">{fragment.label}</div>
          {fragment.similarity && <div className="source-sim">{fragment.similarity}</div>}
        </div>
        {fragment.href && (
          <a href={fragment.href} target="_blank" rel="noopener noreferrer" style={{ color: "#888", flexShrink: 0 }}>
            <ExternalLink size={13} />
          </a>
        )}
      </div>
      <div className="source-law">{fragment.law}</div>
      <p className="source-excerpt">{fragment.excerpt}</p>
    </div>
  );
}
