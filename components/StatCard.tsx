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
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{
        backgroundColor: '#1E1E1E',
        border: '1px solid #2A2A2A',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: '#A0A0A0' }}>{label}</span>
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: accent ? 'rgba(232, 0, 45, 0.15)' : '#252525' }}
          >
            <span style={{ color: accent ? '#E8002D' : '#A0A0A0' }}>{icon}</span>
          </div>
        )}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-black text-white">{value}</span>
        {unit && <span className="text-sm mb-1" style={{ color: '#A0A0A0' }}>{unit}</span>}
      </div>
      {change && (
        <span className="text-xs font-medium" style={{ color: changePositive ? '#22c55e' : '#ef4444' }}>
          {changePositive ? '↑' : '↓'} {change}
        </span>
      )}
    </div>
  )
}
