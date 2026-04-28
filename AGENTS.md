# AGENTS.md

## Project Rules

- Keep extraction reproducible from the committed workbook in `sources/`.
- Keep ThepExcel source attribution in public docs when changing source-data behavior.
- Treat canonical JSON as the source for every generated format after extraction.
- Do not hand-edit generated files under `dist/`; change extractors or generators instead.
- The `build` command cleans `dist/` before writing new outputs. Read canonical data before cleanup if the command needs `dist/thai-postal-codes.json`.
- Preserve Thai source text exactly except for whitespace normalization.
- Prefer small, focused changes. Avoid unrelated refactors.
- Keep public CLI behavior documented in both `README.md` and `README.en.md`.

## Data Rules

- Canonical fields are `id`, `province`, `district`, `subdistrict`, `postalCode`, `provinceSlug`, `districtSlug`, and `subdistrictSlug`.
- Postal codes must be stored as strings.
- Sort records by province, district, subdistrict, and postal code.
- Deduplicate exact province/district/subdistrict/postal-code combinations.
- DB generators should keep both combined and relational output modes unless a user explicitly narrows the scope.
- Relational DB output uses `provinces`, `districts`, `subdistricts`, and `postal_codes`.
- Core plain-data outputs should include both combined files and split relational files under `dist/relational/`.

## Verification

- Use `npm test` for unit tests.
- Use `npm run build:outputs` after placing the real source workbook at `sources/thai-postal-codes.xlsx`.
