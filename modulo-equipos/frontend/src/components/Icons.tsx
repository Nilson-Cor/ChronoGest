// Iconos SVG inline — estilo Lucide (stroke, no fill)
// Uso: <Icon name="laptop" size={18} />

interface IconProps {
  size?: number
  color?: string
  style?: React.CSSProperties
  className?: string
}

type IconComponent = (props: IconProps) => JSX.Element

const paths: Record<string, string> = {
  // Tipos de equipo
  laptop:      'M4 16H20M4 16V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v10M4 16l-1 3h18l-1-3',
  tablet:      'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm5 15h.01',
  plug:        'M7 2v5m10-5v5M5 9a7 7 0 0 0 14 0H5zm7 7v6m0 0H9m3 0h3',
  mouse:       'M5 10a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0v-4zm7-7v4',
  keyboard:    'M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8zm3 3h.01M7 11h.01M9 11h.01M11 11h.01M13 11h.01M15 11h.01M17 11h.01M7 14h10M5 14h.01',
  harddrive:   'M22 12H2M2 8h20v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8zM6 12h.01M10 12h.01',
  box:         'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7l8.7 5 8.7-5M12 22V12',
  // Navegación
  dashboard:   'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  door:        'M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zm9 3v2m-9-5l9-6 9 6',
  monitor:     'M20 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-8 16v2m-4 0h8',
  arrowsUpDown:'M8 3L4 7l4 4M4 7h16M16 21l4-4-4-4m4 4H4',
  userPlus:    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m14-8a4 4 0 1 0-8 0 4 4 0 0 0 8 0zm4-2v6m3-3h-6',
  alertTriangle:'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01',
  // Acciones
  plus:        'M12 5v14M5 12h14',
  edit:        'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7m-1.5-9.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  trash:       'M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6',
  check:       'M20 6L9 17l-5-5',
  x:           'M18 6 6 18M6 6l12 12',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp:   'M18 15l-6-6-6 6',
  search:      'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z',
  eye:         'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeOff:      'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22',
  logout:      'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9',
  moon:        'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  sun:         'M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  user:        'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  menu:        'M3 12h18M3 6h18M3 18h18',
  qrCode:      'M3 3h7v7H3zm0 11h7v7H3zm11-11h7v7h-7zm2 2v3h3V5zm-2 9h2v2h-2zm2 2h2v2h-2zm2-2h2v2h-2zm0 4h2v2h-2zm-4 0h2v2h-2zm0-4h2v2h-2z',
  camera:      'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zm-11-3a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  refresh:     'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  // Estado / info
  circleCheck: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  info:        'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-7v-4m0-4h.01',
  warning:     'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01',
  clipboardList:'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-3 7h3m-3 4h3m-6-4h.01m0 4h.01',
  scanFace:    'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0',
}

function Svg({ d, size = 18, color, style, className }: IconProps & { d: string }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
    >
      <path d={d} />
    </svg>
  )
}

export function Icon({ name, ...props }: IconProps & { name: string }) {
  const d = paths[name]
  if (!d) return null
  return <Svg d={d} {...props} />
}

// Atajos tipados para los más usados
export const IcoLaptop      = (p: IconProps) => <Icon name="laptop"       {...p} />
export const IcoTablet      = (p: IconProps) => <Icon name="tablet"       {...p} />
export const IcoPlug        = (p: IconProps) => <Icon name="plug"         {...p} />
export const IcoMouse       = (p: IconProps) => <Icon name="mouse"        {...p} />
export const IcoKeyboard    = (p: IconProps) => <Icon name="keyboard"     {...p} />
export const IcoHarddrive   = (p: IconProps) => <Icon name="harddrive"    {...p} />
export const IcoBox         = (p: IconProps) => <Icon name="box"          {...p} />
export const IcoDashboard   = (p: IconProps) => <Icon name="dashboard"    {...p} />
export const IcoDoor        = (p: IconProps) => <Icon name="door"         {...p} />
export const IcoMonitor     = (p: IconProps) => <Icon name="monitor"      {...p} />
export const IcoArrows      = (p: IconProps) => <Icon name="arrowsUpDown" {...p} />
export const IcoUserPlus    = (p: IconProps) => <Icon name="userPlus"     {...p} />
export const IcoAlert       = (p: IconProps) => <Icon name="alertTriangle"{...p} />
export const IcoPlus        = (p: IconProps) => <Icon name="plus"         {...p} />
export const IcoEdit        = (p: IconProps) => <Icon name="edit"         {...p} />
export const IcoTrash       = (p: IconProps) => <Icon name="trash"        {...p} />
export const IcoCheck       = (p: IconProps) => <Icon name="check"        {...p} />
export const IcoX           = (p: IconProps) => <Icon name="x"           {...p} />
export const IcoChevronDown = (p: IconProps) => <Icon name="chevronDown"  {...p} />
export const IcoChevronUp   = (p: IconProps) => <Icon name="chevronUp"    {...p} />
export const IcoSearch      = (p: IconProps) => <Icon name="search"       {...p} />
export const IcoEye         = (p: IconProps) => <Icon name="eye"          {...p} />
export const IcoEyeOff      = (p: IconProps) => <Icon name="eyeOff"       {...p} />
export const IcoLogout      = (p: IconProps) => <Icon name="logout"       {...p} />
export const IcoMoon        = (p: IconProps) => <Icon name="moon"         {...p} />
export const IcoSun         = (p: IconProps) => <Icon name="sun"          {...p} />
export const IcoUser        = (p: IconProps) => <Icon name="user"         {...p} />
export const IcoMenu        = (p: IconProps) => <Icon name="menu"         {...p} />
export const IcoQr          = (p: IconProps) => <Icon name="qrCode"       {...p} />
export const IcoCamera      = (p: IconProps) => <Icon name="camera"       {...p} />
export const IcoRefresh     = (p: IconProps) => <Icon name="refresh"      {...p} />
export const IcoCircleCheck = (p: IconProps) => <Icon name="circleCheck"  {...p} />
export const IcoInfo        = (p: IconProps) => <Icon name="info"         {...p} />
export const IcoWarning     = (p: IconProps) => <Icon name="warning"      {...p} />
export const IcoClipboard   = (p: IconProps) => <Icon name="clipboardList"{...p} />
export const IcoScanFace    = (p: IconProps) => <Icon name="scanFace"      {...p} />

// Icono SVG por tipo de equipo (devuelve componente JSX)
export function TipoEquipoIcon({ tipo, size = 18 }: { tipo: string; size?: number }) {
  const map: Record<string, string> = {
    portatil:  'laptop',
    tablet:    'tablet',
    cargador:  'plug',
    mouse:     'mouse',
    teclado:   'keyboard',
    disco_duro:'harddrive',
    otro:      'box',
  }
  return <Icon name={map[tipo] ?? 'box'} size={size} />
}
