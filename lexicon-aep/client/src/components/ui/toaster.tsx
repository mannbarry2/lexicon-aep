import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={8000}>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Add enhanced styling for destructive toasts (error messages)
        const isError = variant === "destructive";
        
        return (
          <Toast 
            key={id} 
            data-toast-id={id} 
            {...props}
            // Make error toasts much more visible
            className={`${props.className || ''} ${isError ? 'border-2 border-red-600 shadow-lg shadow-red-300' : ''}`}
          >
            <div className="grid gap-1">
              {title && (
                <ToastTitle className={isError ? "text-red-600 font-semibold text-base" : ""}>
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription className={isError ? "text-sm whitespace-pre-line" : ""}>
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
            <div className="mt-2 flex justify-end">
              <button 
                onClick={() => {
                  document.querySelector(`[data-toast-id="${id}"] [toast-close]`)?.dispatchEvent(
                    new MouseEvent('click', { bubbles: true })
                  );
                }}
                className={isError 
                  ? "bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                  : "bg-[#2563eb] hover:bg-[#2563eb]/90 text-white text-xs px-3 py-1 rounded"
                }
              >
                {isError ? "Acknowledge" : "Dismiss"}
              </button>
            </div>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
