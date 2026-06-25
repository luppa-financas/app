function Bone({ className }: { className: string }) {
  return <div className={`bg-slate-200 rounded-lg animate-pulse ${className}`} />;
}

export default function TransacoesLoading() {
  return (
    <div className="p-5 lg:p-7">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Bone className="h-9 flex-1 min-w-48" />
        <Bone className="h-9 w-36" />
        <Bone className="h-9 w-32" />
        <Bone className="h-9 w-40" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100">
          <Bone className="h-3 w-10" />
          <Bone className="h-3 w-32 flex-1" />
          <Bone className="h-3 w-20" />
          <Bone className="h-3 w-16 hidden lg:block" />
          <Bone className="h-3 w-14 ml-auto" />
        </div>

        {/* Rows */}
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 last:border-0">
            <Bone className="h-4 w-16 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Bone className="h-4 w-48 mb-1.5" />
              <Bone className={`h-3 w-32 ${i % 3 === 0 ? 'block' : 'hidden'}`} />
            </div>
            <Bone className="h-4 w-24 flex-shrink-0" />
            <Bone className="h-4 w-16 hidden lg:block flex-shrink-0" />
            <Bone className="h-4 w-20 ml-auto flex-shrink-0" />
          </div>
        ))}

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <Bone className="h-3 w-32" />
          <div className="flex items-center gap-2">
            <Bone className="h-7 w-20" />
            <Bone className="h-3 w-10" />
            <Bone className="h-7 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
