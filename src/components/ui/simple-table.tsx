import * as React from "react"
import { cn } from "../../utils/cn"

// ===== SIMPLE TABLE WRAPPER =====
export const SimpleTable: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => (
  <div
    className={cn(
      "overflow-hidden rounded-3xl border border-emerald-50/80 bg-white/80 shadow-[0_20px_60px_rgba(15,118,110,0.08)] backdrop-blur",
      "transition-all duration-300",
      className
    )}
  >
    <table className="min-w-full divide-y divide-emerald-50/80 text-sm text-slate-700">{children}</table>
  </div>
)

// ===== HEADER =====
export const TableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-gradient-to-r from-emerald-50/90 via-white to-transparent text-[11px] uppercase tracking-[0.18em] text-emerald-600">
    {children}
  </thead>
)

// ===== HEADER CELL =====
export const TableHead: React.FC<{
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}> = ({ children, className, style }) => (
  <th
    style={style}
    className={cn(
      "px-6 py-4 text-left font-semibold text-[11px] tracking-[0.18em]",
      "text-emerald-700/80",
      className
    )}
  >
    {children}
  </th>
)

// ===== BODY =====
export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="divide-y divide-emerald-50 bg-white/90">{children}</tbody>
)

// ===== ROW =====
export const TableRow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => (
  <tr
    className={cn(
      "transition-all duration-200",
      "odd:bg-white even:bg-emerald-50/30",
      "hover:-translate-y-[1px] hover:bg-emerald-50/70 hover:shadow-[0_12px_30px_rgba(15,118,110,0.12)]",
      className
    )}
  >
    {children}
  </tr>
)

// ===== CELL =====
export const TableCell: React.FC<{
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}> = ({ children, className, style }) => (
  <td
    style={style}
    className={cn(
      "px-6 py-4 text-sm text-slate-700 align-middle",
      "first:pl-6 last:pr-6",
      "whitespace-nowrap",
      className
    )}
  >
    {children}
  </td>
)
