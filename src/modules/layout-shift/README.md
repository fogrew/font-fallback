# layout-shift

Estimates the layout shift a font swap causes. `layoutShiftScore` follows the Layout Instability definition: elements whose top-left moved (half a pixel or more) are unstable; the impact fraction is the union of their before and after regions clipped to the viewport over the viewport area, the distance fraction is the largest horizontal or vertical move over the larger viewport dimension, and the score is their product.

`simulateLayoutShift` renders a sample document in a hidden, sandboxed same-origin iframe per viewport (360, 768, 1280 and an optional custom width), first with the generated fallback fonts only and then with the uploaded web font, and scores the difference; it also reports line counts, document height and elements whose line breaks changed. The fallback `local()` fonts are the ones installed on the user's device, so the result reflects this device. The iframe styles are applied through `adoptedStyleSheets` to stay within the CSP. `LayoutShiftPanel` reruns the simulation debounced to an animation frame, aborts stale runs and announces results only after they settle.

Known simplification: the distance fraction uses the full movement of an element, not the movement of its visible part.
