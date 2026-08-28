# C-VAL desktop entry landing — 2026-08-28

- **Participant situation:** a visitor opens `c-val.vercel.app` before joining
  the four-screen, phone-driven artwork.
- **Primary relation:** a phone's movement changes volatility, activity, and
  liquidity; those conditions alter agents' orders and executions rather than
  merely changing displayed values.
- **Perceptual job:** present the actual market workstation first, then place
  the work information and Korean statement below it as a gallery label.
- **Interaction job:** the single desktop action, `실제 경험 열기`, leads to
  `/whole`. Narrow viewports retain the description but do not offer that
  desktop experience action.
- **Wrapper justification:** the landing is a restrained black field with a
  small work header, an unframed whole-screen capture, a two-column gallery
  label, and one text link. It uses the same Geist sans and mono font tokens as
  C-VAL. No invented price, market status, interface chrome, decorative system
  styling, or accent colours appear on the landing.
- **Retained invariants:** `/whole`, mobile input, socket events, market state,
  and every actual screen remain unchanged. The root route no longer exposes
  its development route list.
- **Removal test:** removing the title would lose work identity; removing the
  screenshot would lose the view into the experience; removing the entry action
  would make the page unable to fulfil its only navigation job. No additional
  interface decoration is retained.
- **Observed result:** static type verification passes; browser inspection was
  not performed.
- **Unresolved question:** assess the physical balance of the capture and
  Korean statement on an installation desktop before changing the relationship
  between the landing and the actual four-screen experience.
