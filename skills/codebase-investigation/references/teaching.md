# Explain a concrete flow

Match the user's audience and requested depth. Start with the user-visible behavior or caller contract, then walk one concrete input through the relevant components to its result. Explain state changes, boundaries, and failure behavior where they affect understanding.

Introduce unfamiliar terms beside the code that makes them concrete. Cite navigable source locations so the reader can continue the trace. Add a second example only when it exposes a meaningful branch or exception. A requested full walkthrough should retain the necessary detail even when a shorter answer would be easier to write.

Use a diagram when it makes relationships or timing clearer; use show-me when applicable. A small linear explanation may need only prose. Historical background belongs here only when it explains the current flow, and must meet the historical-evidence rules when used.

Keep observations, recorded rationale, and inference distinguishable. Finish with the boundaries of the explanation or the remaining question, without adding an unrelated redesign or implementation plan.
