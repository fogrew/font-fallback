# Stack resolver

`resolveStack(faces, preferences)` models the ordered adjusted **fallback** aliases,
not the target web font. Each face has a unique ID and exact platform/version keys
where at least one of its `local()` sources is known to resolve. Preferences name
one desired face already present in the input stack for each platform key.

Keys are opaque, case-sensitive identifiers; `windows:11` and `Windows:11` differ.
No version ranges, OS guessing or availability data are invented here. The caller
supplies dataset results. Installed fonts must also cover the relevant glyphs and
have matching local names for this simulation to represent browser selection;
this function alone does not establish those facts or resolve generic families.

Each platform reports the first available `winner`, the `preferredFace`, and a
`matched`, `shadowed` or `unavailable` preference status. An unavailable preference
can still have another actual winner. No available face produces a null winner.

An already matching stack returns no suggestion. Otherwise, a desired face must
precede all other available faces for that platform. Contradictory constraints
return `blockedBy: 'cycle'`; unavailable preferences return `'unavailable'`.
Neither result suggests a reorder that claims to solve the complete audience.

The suggested order minimizes the number of **adjacent swaps** from the original
order (the inversion count), over all orders satisfying every constraint.
Subset dynamic programming computes minimum remaining costs; reconstruction
chooses the lexicographically earliest original-index sequence among equal-cost
orders. This is an exact deterministic result, not a greedy approximation.

Inputs are bounded at 16 faces, 128 preferences and 128 availability keys **per
face** (at most 2,048 total). Each ID/key has at most 128 UTF-16 code units; empty,
malformed Unicode, C0 controls, DEL, edge whitespace and duplicates are rejected.
One preference per platform is required. `StackResolveError.code` reports input
failures. The algorithm uses at most 65,536 subset states and 192 KiB of typed-array
storage, with at most 16 candidate transitions per state.

Tests cover cross-platform shadowing, impossible preferences, cycles and exact
key matching. Property tests compare both minimum inversion count and tie-breaking
against an independent exhaustive permutation oracle on small randomized stacks.
