// Structure grisée affichée dès le clic, le temps que la page se charge.

function Bar({ w, h = 12 }: { w: string; h?: number }) {
  return <span className="block rounded animate-pulse" style={{ width: w, height: h, background: 'var(--raised)' }} />
}

function Header() {
  return (
    <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
      <Bar w="120px" />
    </div>
  )
}

function Card({ lines, title = '40%' }: { lines: number; title?: string }) {
  return (
    <section className="ev-card px-5 py-4 flex flex-col gap-3" aria-hidden>
      <Bar w={title} h={10} />
      {Array.from({ length: lines }, (_, i) => <Bar key={i} w={`${90 - ((i * 17) % 35)}%`} />)}
    </section>
  )
}

export function ListSkeleton() {
  return (
    <div role="status" aria-label="Chargement">
      <Header />
      <div className="px-6 pt-4 flex gap-4 border-b pb-3" style={{ borderColor: 'var(--line)' }}>
        {[60, 90, 70, 80].map(w => <Bar key={w} w={`${w}px`} />)}
      </div>
      <div className="px-6 py-5 flex flex-col gap-4">
        <Bar w="20rem" h={36} />
        <section className="ev-card divide-y divide-[var(--line)]">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="px-4 py-3.5 flex gap-6"><Bar w="30%" /><Bar w="12%" /><Bar w="18%" /><Bar w="10%" /></div>
          ))}
        </section>
      </div>
    </div>
  )
}

export function FicheSkeleton() {
  return (
    <div role="status" aria-label="Chargement">
      <Header />
      <div className="px-6 py-5 flex flex-wrap gap-4 items-start">
        <div className="flex flex-col gap-4" style={{ flex: '1 1 280px', maxWidth: 340 }}><Card lines={2} title="70%" /><Card lines={8} /></div>
        <div className="flex flex-col gap-4 min-w-0" style={{ flex: '2 1 420px' }}><Card lines={5} /><Card lines={3} /><Card lines={4} /></div>
        <div className="flex flex-col gap-4" style={{ flex: '1 1 280px', maxWidth: 340 }}><Card lines={4} /><Card lines={2} /></div>
      </div>
    </div>
  )
}

export function BoardSkeleton() {
  return (
    <div role="status" aria-label="Chargement">
      <Header />
      <div className="px-6 py-5 flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => <div key={i} className="shrink-0 flex flex-col gap-2" style={{ width: 240 }}><Bar w="50%" /><Card lines={3} /><Card lines={3} /></div>)}
      </div>
    </div>
  )
}
