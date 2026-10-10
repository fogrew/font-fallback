import type { ComponentChildren } from 'preact';

export function Disclosure({
  summary,
  children,
  open = false,
  onToggle,
}: {
  summary: string;
  children: ComponentChildren;
  open?: boolean;
  onToggle?: (open: boolean) => void;
}) {
  return (
    <details
      class="ff-disclosure"
      open={open}
      onToggle={(event) => onToggle?.(event.currentTarget.open)}
    >
      <summary>{summary}</summary>
      <div>{children}</div>
    </details>
  );
}
