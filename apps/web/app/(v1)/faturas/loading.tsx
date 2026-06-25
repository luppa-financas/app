function Bone({ className }: { className: string }) {
  return <div className={`bg-slate-200 rounded-lg animate-pulse ${className}`} />;
}

export default function FaturasLoading() {
  return (
    <div className="max-w-3xl mx-auto p-5 lg:p-7">
      {/* Upload zone */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center gap-3">
          <Bone className="h-12 w-12 rounded-xl" />
          <Bone className="h-4 w-40" />
          <Bone className="h-3 w-56" />
        </div>
      </div>

      {/* Section label */}
      <Bone className="h-3 w-36 mb-3" />

      {/* Invoice list */}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-slate-200 p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <Bone className="h-4 w-24" />
                  <Bone className="h-5 w-16 rounded-full" />
                </div>
                <Bone className="h-7 w-32 mb-2" />
                <Bone className="h-3 w-20" />
              </div>
              <Bone className="h-4 w-4 flex-shrink-0 ml-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
