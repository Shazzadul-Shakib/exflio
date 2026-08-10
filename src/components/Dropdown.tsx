"use client";

import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "@/components/cx";

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

function parseOptions(children: ReactNode): DropdownOption[] {
  const options: DropdownOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== "option") return;
    const props = child.props as { value?: string | number; disabled?: boolean; children?: ReactNode };
    options.push({
      value: String(props.value ?? ""),
      label: typeof props.children === "string" ? props.children : String(props.children ?? ""),
      disabled: props.disabled,
    });
  });
  return options;
}

interface Position {
  left: number;
  width: number;
  top: number;
  bottom: number;
  openUp: boolean;
}

export interface DropdownProps {
  id?: string;
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  variant?: "default" | "ghost";
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  children: ReactNode;
}

export const Dropdown = forwardRef<HTMLButtonElement, DropdownProps>(function Dropdown(
  {
    id,
    name,
    value,
    defaultValue,
    onChange,
    disabled,
    required,
    className,
    variant = "default",
    "aria-label": ariaLabel,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedby,
    children,
  },
  forwardedRef
) {
  const options = useMemo(() => parseOptions(children), [children]);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const currentValue = isControlled ? String(value) : internalValue;

  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [pos, setPos] = useState<Position | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();
  const typeaheadRef = useRef("");
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedIndex = options.findIndex((o) => o.value === currentValue);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  function setRef(node: HTMLButtonElement | null) {
    triggerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
  }

  function commit(newValue: string) {
    if (!isControlled) setInternalValue(newValue);
    onChange?.({ target: { value: newValue } });
    setOpen(false);
    triggerRef.current?.focus();
  }

  function place() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const estimate = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimate && rect.top > estimate;
    setPos({
      left: rect.left,
      width: rect.width,
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      openUp,
    });
  }

  function openList() {
    if (disabled || options.length === 0) return;
    place();
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onScrollOrResize(e: Event) {
      if (listRef.current && e.target instanceof Node && listRef.current.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  function moveHighlight(delta: number) {
    if (options.length === 0) return;
    let next = highlight;
    for (let i = 0; i < options.length; i++) {
      next = (next + delta + options.length) % options.length;
      if (!options[next].disabled) break;
    }
    setHighlight(next);
  }

  function typeahead(char: string) {
    typeaheadRef.current += char.toLowerCase();
    if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
    typeaheadTimer.current = setTimeout(() => {
      typeaheadRef.current = "";
    }, 500);
    const match = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typeaheadRef.current));
    if (match >= 0) setHighlight(match);
  }

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (open) moveHighlight(1);
        else openList();
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) moveHighlight(-1);
        else openList();
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          const first = options.findIndex((o) => !o.disabled);
          if (first >= 0) setHighlight(first);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          for (let i = options.length - 1; i >= 0; i--) {
            if (!options[i].disabled) {
              setHighlight(i);
              break;
            }
          }
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!open) openList();
        else if (options[highlight] && !options[highlight].disabled) commit(options[highlight].value);
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) typeahead(e.key);
    }
  }

  const triggerBase =
    variant === "ghost"
      ? "h-8 rounded-md px-1 text-[13px] font-medium text-text-primary hover:bg-surface-2"
      : cx(
          "h-10 w-full rounded-lg border bg-surface px-3 text-sm text-text-primary focus:ring-2",
          ariaInvalid
            ? "border-status-critical focus:border-status-critical focus:ring-status-critical/20"
            : "border-border focus:border-brand focus:ring-brand/20"
        );

  return (
    <div ref={rootRef} className={cx("relative min-w-0", className)}>
      <button
        ref={setRef}
        id={id}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        aria-label={ariaLabel}
        aria-required={required}
        aria-activedescendant={open && options[highlight] ? `${listboxId}-${highlight}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        className={cx(
          "flex min-w-0 items-center justify-between gap-2 text-left outline-none transition-colors disabled:pointer-events-none disabled:opacity-50",
          triggerBase
        )}
      >
        <span className={cx("min-w-0 truncate", !selectedOption && "text-text-muted")}>{selectedOption?.label ?? ""}</span>
        <ChevronDown
          className={cx("h-4 w-4 shrink-0 text-text-muted transition-transform", open && "rotate-180")}
          strokeWidth={2}
        />
      </button>

      {name && <input type="hidden" name={name} value={currentValue} readOnly />}

      {open && pos && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          style={{
            position: "fixed",
            left: pos.left,
            minWidth: pos.width,
            maxWidth: 320,
            ...(pos.openUp ? { bottom: pos.bottom } : { top: pos.top }),
          }}
          className="z-50 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {options.map((opt, i) => (
            <li
              key={opt.value || i}
              id={`${listboxId}-${i}`}
              role="option"
              aria-selected={opt.value === currentValue}
              aria-disabled={opt.disabled}
              data-index={i}
              onMouseEnter={() => !opt.disabled && setHighlight(i)}
              onClick={() => !opt.disabled && commit(opt.value)}
              className={cx(
                "px-3 py-2 text-sm",
                opt.disabled ? "cursor-not-allowed text-text-muted" : "cursor-pointer text-text-primary",
                !opt.disabled && i === highlight && "bg-surface-2",
                opt.value === currentValue && !opt.disabled && "font-medium text-brand"
              )}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
