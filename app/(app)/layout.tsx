import ProtectedAppShell from '@/components/auth/ProtectedAppShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAppShell>{children}</ProtectedAppShell>
}
