import { useToast } from "@/hooks/use-toast"
import { CircleCheck } from "lucide-react"
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
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isInformation = variant === "information"
        return (
          <Toast
            key={id}
            variant={variant}
            data-testid={isInformation ? "toast-information" : undefined}
            role={isInformation ? "status" : undefined}
            {...props}
          >
            {isInformation && (
              <div
                className="flex min-w-0 flex-1 items-start"
                style={{
                  gap: "var(--roads-spacing-component-l)",
                  padding: "var(--roads-spacing-component-l) 0 var(--roads-spacing-component-l) var(--roads-spacing-component-l)",
                }}
              >
                <CircleCheck
                  aria-hidden="true"
                  className="shrink-0"
                  data-testid="icon-toast-information"
                  style={{
                    width: "20px",
                    height: "20px",
                    color: "var(--roads-text-information)",
                  }}
                />
                <div
                  className="flex min-w-0 flex-1 flex-col"
                  style={{ gap: "var(--roads-spacing-component-xs)" }}
                >
                  {title && (
                    <ToastTitle
                      style={{
                        color: "var(--roads-text-primary)",
                        fontFamily: "var(--roads-font-family)",
                        fontSize: "16px",
                        fontWeight: 600,
                        lineHeight: "20px",
                      }}
                    >
                      {title}
                    </ToastTitle>
                  )}
                  {description && (
                    <ToastDescription
                      style={{
                        color: "var(--roads-text-secondary)",
                        fontFamily: "var(--roads-font-family)",
                        fontSize: "16px",
                        fontWeight: 400,
                        lineHeight: "20px",
                        opacity: 1,
                      }}
                    >
                      {description}
                    </ToastDescription>
                  )}
                </div>
              </div>
            )}
            {!isInformation && (
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            )}
            {action}
            <ToastClose
              aria-label="Dismiss notification"
              className={
                isInformation
                  ? "relative right-auto top-auto m-4 h-5 w-5 shrink-0 p-0 text-[var(--roads-text-primary)] opacity-100"
                  : undefined
              }
            />
          </Toast>
        )
      })}
      <ToastViewport data-testid="toast-viewport" />
    </ToastProvider>
  )
}
