function Bone({ className }: { className: string }) {
  return <div className={`bg-slate-200 rounded-lg animate-pulse ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="flex">
      {/* Sidebar skeleton — lg only, fixed */}
      <aside
        className="w-48 flex-shrink-0 bg-white border-r border-slate-200 fixed left-0 bottom-0 py-5 px-3 hidden lg:flex flex-col gap-1"
        style={{ top: 'calc(3.5rem + 2.75rem)' }}
      >
        <Bone className="h-3 w-12 mb-3" />
        {[...Array(5)].map((_, i) => <Bone key={i} className="h-8 w-full" />)}
        <Bone className="h-3 w-16 mt-4 mb-3" />
        {[...Array(3)].map((_, i) => <Bone key={i} className="h-8 w-full" />)}
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-48 p-5 lg:p-7 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <Bone className="h-3 w-24 mb-2" />
          <Bone className="h-10 w-48" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div className="md:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 min-w-0">
            <Bone className="h-3 w-40 mb-4" />
            <Bone className="h-[200px] w-full rounded-xl" />
          </div>
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
            <Bone className="h-3 w-32 mb-4" />
            <Bone className="h-[180px] w-full rounded-full mx-auto max-w-[180px]" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[...Array(6)].map((_, i) => <Bone key={i} className="h-4 w-full" />)}
            </div>
          </div>
        </div>

        {/* Invoice cards */}
        <Bone className="h-3 w-32 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-slate-200 p-5">
              <Bone className="h-3 w-24 mb-1" />
              <Bone className="h-3 w-16 mb-6" />
              <Bone className="h-7 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
