import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#141414' }}>
      <Sidebar />
      <main className="app-main" style={{ flex: 1, minHeight: '100vh', backgroundColor: '#141414' }}>
        {children}
      </main>
      <style>{`
        .app-main { margin-left: 256px; }
        @media (max-width: 1023px) { .app-main { margin-left: 0; } }
      `}</style>
    </div>
  )
}
