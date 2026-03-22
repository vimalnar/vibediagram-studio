# Claude Code Instructions (This Repo)

Create new educational animations as single-file implementations.

- Use `npm run new:implementation -- --id <id> --title "<Title>"` to scaffold.
- Implement the topic entirely in `src/implementations/<id>.impl.tsx`.
- Do not create `src/implementations/<id>/` folders.
- Keep metadata, stage labels, camera, timeline, and scene logic in-file.
- Maintain the framework visual style: white background, readable labels, educational stage flow.
- Validate with `npm run lint && npm run build`.

