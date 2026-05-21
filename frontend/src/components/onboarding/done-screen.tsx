interface DoneScreenProps {
  county: string | null;
  interests: string[];
}

export function DoneScreen({ county, interests }: DoneScreenProps) {
  const summary = [county, ...interests.slice(0, 2)].filter(Boolean).join(", ");
  const hasMore = interests.length > 2;

  return (
    <div className="text-center py-8 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
      <div className="text-5xl mb-6 scale-110">🎉</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">Profil configurat!</h2>
      <p className="text-[15px] text-gray-500 leading-relaxed max-w-sm mb-8">
        {county || interests.length > 0 ? (
          <>
            Am salvat preferințele tale: <strong className="text-gray-900">{summary}</strong>
            {hasMore && <span> și altele</span>}.
          </>
        ) : (
          "Poți seta preferințele oricând din pagina de Profil."
        )}
      </p>
      
      <div className="flex items-center gap-3 text-sm text-gray-400 font-medium bg-gray-50 px-4 py-2 rounded-full">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
        Ești redirecționat către feed...
      </div>
    </div>
  );
}
