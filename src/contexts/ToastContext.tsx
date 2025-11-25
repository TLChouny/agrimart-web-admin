import { createContext, useContext, type PropsWithChildren } from "react"
import { useToast } from "../hooks/use-toast"
import { ToastContainer } from "../components/ui/ToastContainer"

type ToastContextValue = ReturnType<typeof useToast>

const fallbackContext: ToastContextValue = {
  toast: ({ title, description }) => {
    console.warn("[ToastProvider] Provider chưa được khởi tạo. Message:", title, description)
  },
  dismiss: () => {},
  toasts: [],
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: PropsWithChildren) {
  const toastState = useToast()

  return (
    <ToastContext.Provider value={toastState}>
      {children}
      <ToastContainer toasts={toastState.toasts} dismiss={toastState.dismiss} />
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const context = useContext(ToastContext)
  return context ?? fallbackContext
}


