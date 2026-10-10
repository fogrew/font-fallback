import type { ComponentChildren } from 'preact';

export function Disclosure({
  summary,
  children,
  open = false,
}: {
  summary: string;
  children: ComponentChildren;
  open?: boolean;
}) {
  return (
    <details class="ff-disclosure" open={open}>
      <summary>{summary}</summary>
      <div>{children}</div>
    </details>
  );
}
