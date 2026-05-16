import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className = "" }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc leading-relaxed">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal leading-relaxed">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        h1: ({ children }) => <h1 className="mb-2 text-lg font-bold leading-tight">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 text-md font-bold leading-tight">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 text-base font-bold leading-tight">{children}</h3>,
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800 transition-colors"
          >
            {children}
          </a>
        ),
        hr: () => <hr className="my-3 border-t border-gray-200" />,
        code: ({ children }) => (
          <code className="bg-gray-100 border border-gray-200 rounded px-1 py-0.5 text-[0.92em]">
            {children}
          </code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
    );
    }

