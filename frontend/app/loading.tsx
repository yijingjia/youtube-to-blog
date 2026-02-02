export default function Loading() {
  return (
    <div className="space-y-12 animate-pulse">
      <section>
        <div className="mb-8 flex items-baseline justify-between border-b border-border pb-4">
          <div className="h-10 w-48 bg-muted rounded"></div>
          <div className="h-5 w-32 bg-muted rounded"></div>
        </div>
        
        <div className="mb-12">
          <div className="h-[400px] w-full bg-muted rounded-2xl"></div>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col h-full rounded-xl border border-border/50 overflow-hidden">
              <div className="aspect-[16/9] w-full bg-muted"></div>
              <div className="flex flex-1 flex-col p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-20 bg-muted rounded"></div>
                  <div className="h-3 w-12 bg-muted rounded"></div>
                </div>
                <div className="h-6 w-full bg-muted rounded"></div>
                <div className="h-6 w-2/3 bg-muted rounded"></div>
                <div className="h-4 w-full bg-muted rounded mt-2"></div>
                <div className="h-4 w-full bg-muted rounded"></div>
                <div className="mt-auto pt-3 border-t border-border/50 flex justify-between">
                  <div className="h-3 w-16 bg-muted rounded"></div>
                  <div className="h-3 w-16 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
