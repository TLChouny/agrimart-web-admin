/**
 * Format number to Vietnamese Dong with explicit VND unit.
 */
export const formatCurrencyVND = (
  value?: number | null,
  options?: {
    unit?: string
    fallback?: string
  }
) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return options?.fallback ?? "—"
  }

  const formatted = new Intl.NumberFormat("vi-VN").format(value)
  const unit = options?.unit ?? "VND"

  return unit ? `${formatted} ${unit}` : formatted
}


