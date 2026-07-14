import { InputHTMLAttributes } from 'react'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
}

export default function SearchInput({ onClear, value, ...props }: SearchInputProps) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <svg
        width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        style={{ position: 'absolute', left: 10, color: 'var(--text-muted)', flexShrink: 0 }}
      >
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        {...props}
        value={value}
        className={`form-input ${props.className ?? ''}`}
        style={{ paddingLeft: 34, paddingRight: value ? 32 : 12, ...props.style }}
      />
      {value && onClear && (
        <button
          onClick={onClear}
          style={{
            position: 'absolute', right: 8, background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2,
          }}
          type="button"
          aria-label="Limpiar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
