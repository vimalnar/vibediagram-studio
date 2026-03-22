# AI Agent Guide (Project-Specific)

Use this repo as an educational animation framework.

## Required implementation convention

- Every new scene must live in exactly one file: `src/implementations/<id>.impl.tsx`.
- Do not create new implementation folders under `src/implementations/`.
- Keep scene metadata, camera, timeline, labels, and rendering logic in that one file.
- Register the implementation in `src/implementations/index.ts` (or use the scaffold command below).

## Fast path for new work

1. Run `npm run new:implementation -- --id <id> --title "<Title>"`.
2. Edit only `src/implementations/<id>.impl.tsx`.
3. Run `npm run lint && npm run build`.

## UX and style consistency

- Preserve white-canvas default visual style.
- Keep clear educational labels and a 5-stage narrative in metadata.
- Ensure text remains readable over geometry.
- Keep the implementation compatible with toolbar controls (play/pause, scene switch, zoom, pitch lock, reset view, record).

## Recording/export expectations

- Browser `Record` should produce clean canvas-only capture.
- For deterministic production export, use `npm run export:video`.

