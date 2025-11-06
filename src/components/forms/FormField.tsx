import { Input } from '../ui/input'
import { Label } from '../ui/label'

interface FormFieldProps {
  label: string
  id: string
  type?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
  disabled?: boolean
  description?: string
}

export function FormField({ label, id, type = 'text', placeholder, value, onChange, required = false, error, disabled = false, description }: FormFieldProps) {
  return (
    <div className="space-y-2 h-full">
      <Label htmlFor={id} className="flex items-center gap-1 text-sm sm:text-base h-6">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        variant={error ? "error" : "default"}
        className={`text-sm sm:text-base ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
      />
      {description && (
        <p className="text-xs sm:text-sm text-gray-500">{description}</p>
      )}
      {error && (
        <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
          <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
          {error}
        </p>
      )}
    </div>
  )
}

