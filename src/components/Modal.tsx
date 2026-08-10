"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const noopSubscribe = () => () => {};

// Portals must not render during SSR/hydration — this reads `false` on the server
// and the first client pass, then `true` once mounted, without the extra
// render-triggering setState an effect would need for the same result.
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mounted = useMounted();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="m-auto w-[min(520px,92vw)] rounded-lg border border-border bg-surface p-0 text-text-primary backdrop:bg-transparent"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {open && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-[15px] font-semibold text-text-primary">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text-primary"
            >
              <X className="h-4.5 w-4.5" strokeWidth={2} />
            </button>
          </div>
          <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
            {children}
          </div>
        </div>
      )}
    </dialog>,
    document.body,
  );
}
