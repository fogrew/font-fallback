import type { ComponentChildren } from 'preact';

export function LiveRegion({ children }: { children: ComponentChildren }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" class="ff-sr-only">
      {children}
    </div>
  );
}
