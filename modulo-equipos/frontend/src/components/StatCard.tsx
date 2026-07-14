interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
}

export default function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: color + '22', color }}>
        {icon}
      </div>
      <div className="stat-card-info">
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
    </div>
  )
}
