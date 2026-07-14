import { useAuth } from '../contexts/AuthContext'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAuth()
  const initials = user
    ? `${user.nombre?.[0] ?? ''}${user.apellido?.[0] ?? ''}`.toUpperCase()
    : 'U'

  return (
    <header className="header">
      <h1 className="header-title">{title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="text-sm text-muted">
          {user ? `${user.nombre} ${user.apellido}` : ''}
        </span>
        <div
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--navy)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}
