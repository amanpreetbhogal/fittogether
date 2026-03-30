import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#141414' }}>
      <Sidebar />
      <main style={{ marginLeft: '256px', flex: 1, minHeight: '100vh', backgroundColor: '#141414' }}>
        {children}
      </main>
    </div>
  )
}
