import React from 'react'
import type { Toast } from '../../hooks/use-toast'

interface ToastContainerProps { toasts: Toast[]; dismiss: (id: string) => void }

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, dismiss }) => {
  return (
    <div
      style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '14px', pointerEvents: 'none' }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            minWidth: 280,
            maxWidth: 400,
            background: t.variant === 'destructive' ? '#fee2e2' : '#d1fae5',
            color: t.variant === 'destructive' ? '#b91c1c' : '#166534',
            border: t.variant === 'destructive' ? '1.5px solid #f87171' : '1.5px solid #34d399',
            borderRadius: 12,
            padding: '16px 20px',
            fontWeight: 'bold',
            boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
            cursor: 'pointer',
            pointerEvents: 'auto',
            transition: 'opacity 0.3s',
            opacity: 1
          }}
          onClick={() => dismiss(t.id)}
        >
          <div style={{fontSize: 16, marginBottom: t.description ? 5 : 0}}>{t.title}</div>
          {t.description && <div style={{fontSize: 14, fontWeight:'normal'}}>{t.description}</div>}
        </div>
      ))}
    </div>
  )
}

