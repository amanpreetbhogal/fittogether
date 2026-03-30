interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: React.ReactNode
  accent?: boolean
  change?: string
  changePositive?: boolean
}

export default function StatCard({ label, value, unit, icon, accent, change, changePositive }: StatCardProps) {
  return (
    <div style={{
      backgroundColor: '#1E1E1E',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#606060',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
        }}>{label}</span>
        {icon && (
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: accent ? 'rgba(232, 0, 45, 0.15)' : '#2A2A2A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent ? '#E8002D' : '#606060',
          }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        <span style={{
          fontSize: 36,
          fontWeight: 700,
          color: '#FFFFFF',
          letterSpacing: '-1px',
          lineHeight: 1,
        }}>{value}</span>
        {unit && (
          <span style={{ fontSize: 14, color: '#A0A0A0', fontWeight: 400, marginBottom: 2 }}>{unit}</span>
        )}
      </div>
      {change && (
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: changePositive ? '#4ade80' : '#E8002D',
        }}>
          {changePositive ? '↑' : '↓'} {change}
        </span>
      )}
    </div>
  )
}
