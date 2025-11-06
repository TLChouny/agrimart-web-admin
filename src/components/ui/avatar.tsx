function cn(...classes: Array<string | false | null | undefined>) { return classes.filter(Boolean).join(" ") }

type DivProps = React.HTMLAttributes<HTMLDivElement>
type ImgProps = React.ImgHTMLAttributes<HTMLImageElement>
type SpanProps = React.HTMLAttributes<HTMLSpanElement>

export function Avatar({ className, children, ...props }: DivProps) {
  return (
    <div className={cn("relative inline-flex h-10 w-10 overflow-hidden rounded-full bg-gray-100", className)} {...props}>
      {children}
    </div>
  )
}

export function AvatarImage({ className, ...props }: ImgProps) {
  return <img className={cn("h-full w-full object-cover", className)} {...props} />
}

export function AvatarFallback({ className, children, ...props }: SpanProps) {
  return (
    <span className={cn("flex h-full w-full items-center justify-center bg-gray-200 text-xs font-medium text-gray-600", className)} {...props}>
      {children}
    </span>
  )
}

export default Avatar

