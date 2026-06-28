interface FeatureListProps {
  items: string[];
}

export function FeatureList({ items }: FeatureListProps) {
  return (
    <ul className="space-y-3">
      {items.map((text) => (
        <li key={text} className="flex items-center gap-3 text-slate-600 text-sm">
          <span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </span>
          {text}
        </li>
      ))}
    </ul>
  );
}
