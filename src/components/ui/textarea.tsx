import * as React from "react";

import { TEXTAREA_MAX_CHARS } from "@/lib/zod";
import { cn } from "@/lib/utils";

export { TEXTAREA_MAX_CHARS, isOverCharLimit } from "@/lib/zod";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** When true (default), show red message below when length exceeds TEXTAREA_MAX_CHARS. */
  showLimitMessage?: boolean;
}

const scrollbarHideClass =
  "[scrollbar-width:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:opacity-0";

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, maxLength, value, showLimitMessage = true, onScroll, ...props }, ref) => {
    const length = typeof value === "string" ? value.length : 0;
    const overLimit = length > TEXTAREA_MAX_CHARS;
    const [showScrollbar, setShowScrollbar] = React.useState(false);
    const scrollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    const mergedRef = (node: HTMLTextAreaElement | null) => {
      (internalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    };

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
      setShowScrollbar(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setShowScrollbar(false);
        scrollTimeoutRef.current = null;
      }, 800);
      onScroll?.(e);
    };

    React.useEffect(() => () => { if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current); }, []);

    return (
      <div className="w-full space-y-1.5">
        <textarea
          maxLength={maxLength}
          value={value}
          onScroll={handleScroll}
          className={cn(
            "flex min-h-[5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto transition-[scrollbar-color] duration-200",
            !showScrollbar && scrollbarHideClass,
            overLimit && "border-destructive",
            className,
            "resize-none",
          )}
          ref={mergedRef}
          {...props}
        />
        <p className="text-[0.625rem] text-muted-foreground">
          {length} / {TEXTAREA_MAX_CHARS} characters
        </p>
        {showLimitMessage && overLimit && (
          <p className="text-[0.625rem] text-destructive">
            Please write less than {TEXTAREA_MAX_CHARS} characters.
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
