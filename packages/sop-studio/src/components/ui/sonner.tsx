import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-kp-panel group-[.toaster]:text-kp-text group-[.toaster]:border-kp-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-kp-muted",
          actionButton:
            "group-[.toast]:bg-kp-teal group-[.toast]:text-kp-heading",
          cancelButton:
            "group-[.toast]:bg-kp-navy group-[.toast]:text-kp-muted",
          success:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-kp-success",
          error:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-kp-error",
          warning:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-kp-warning",
          info:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-kp-info",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
