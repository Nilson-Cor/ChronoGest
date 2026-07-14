type BadgeVariant = 'green' | 'red' | 'blue' | 'orange' | 'gray' | 'purple' | 'yellow'

interface BadgeProps {
  children: React.ReactNode
  variant: BadgeVariant
}

export default function Badge({ children, variant }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}

export function estadoEquipoBadge(estado: string) {
  const map: Record<string, BadgeVariant> = {
    activo: 'green',
    reportado: 'red',
    dado_de_baja: 'gray',
  }
  const labelMap: Record<string, string> = {
    activo: 'Activo',
    reportado: 'Reportado',
    dado_de_baja: 'Dado de baja',
  }
  return <Badge variant={map[estado] ?? 'gray'}>{labelMap[estado] ?? estado}</Badge>
}

export function movimientoBadge(tipo: string) {
  return (
    <Badge variant={tipo === 'ENTRADA' ? 'green' : 'orange'}>
      {tipo === 'ENTRADA' ? '↓ Entrada' : '↑ Salida'}
    </Badge>
  )
}

export function reporteEstadoBadge(estado: string) {
  return <Badge variant={estado === 'RESUELTO' ? 'green' : 'red'}>{estado === 'RESUELTO' ? 'Resuelto' : 'Activo'}</Badge>
}

export function reporteTipoBadge(tipo: string) {
  const map: Record<string, BadgeVariant> = {
    PERDIDA: 'orange',
    DANO: 'yellow',
    ROBO: 'red',
    OTRO: 'gray',
  }
  const labels: Record<string, string> = {
    PERDIDA: 'Pérdida',
    DANO: 'Daño',
    ROBO: 'Robo',
    OTRO: 'Otro',
  }
  return <Badge variant={map[tipo] ?? 'gray'}>{labels[tipo] ?? tipo}</Badge>
}
