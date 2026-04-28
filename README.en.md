# Thai Geo DB

Node.js tooling for converting Thai geographic data from Excel into reusable formats such as JSON, YAML, CSV, plain text, PostgreSQL/MySQL SQL, and MongoDB seed scripts.

The first version focuses on the Excel table named `รหัสไปรษณีย์`, which maps `subdistrict`, `district`, `province`, and `postalCode`.

## Install

```bash
npm install
```

Place the source workbook at:

```text
sources/thai-postal-codes.xlsx
```

## Extract Data from XLSX

```bash
npm run extract
```

Or pass a custom path:

```bash
npx thai-geo-db extract --source sources/thai-postal-codes.xlsx --table "รหัสไปรษณีย์"
```

This creates canonical data at `dist/thai-postal-codes.json`.

## Build All Outputs

```bash
npm run build:outputs
```

Generated files:

- `dist/thai-postal-codes.json`
- `dist/thai-postal-codes.jsonl`
- `dist/thai-postal-codes.csv`
- `dist/thai-postal-codes.txt`
- `dist/thai-postal-codes.yaml`
- `dist/relational/provinces.*`
- `dist/relational/districts.*`
- `dist/relational/subdistricts.*`
- `dist/relational/postal-codes.*`
- `dist/sql/postgresql.sql`
- `dist/sql/postgresql-relational.sql`
- `dist/sql/mysql.sql`
- `dist/sql/mysql-relational.sql`
- `dist/mongodb/thai-postal-codes.mongodb.js`
- `dist/mongodb/thai-postal-codes.relational.mongodb.js`

Every `build` run clears the output directory before writing new files, so stale files do not remain in `dist/`.

## Interactive CLI

```bash
npm run wizard
```

The wizard lets users choose output formats, output directory, SQL dialects, table name, column names, and SQL options such as `DROP TABLE`, `CREATE TABLE`, and `INSERT`.

## DB Output Layout

The default DB output layout is `both`, which generates both the combined single-table output and relational output.

```bash
npx thai-geo-db build --format postgresql --db-layout both
npx thai-geo-db build --format postgresql --db-layout combined
npx thai-geo-db build --format postgresql --db-layout relational
```

Combined single-table output:

- `thai_postal_codes`

Relational output:

- `provinces`
- `districts`
- `subdistricts`
- `postal_codes`

## Custom SQL Example

```bash
npx thai-geo-db build \
  --format postgresql \
  --table locations \
  --column-postal-code zip_code
```

Defaults:

- Table: `thai_postal_codes`
- Columns: `id`, `province`, `district`, `subdistrict`, `postal_code`

The `--table` and `--column-*` options apply to the combined single-table SQL output. Relational SQL uses the standard table names `provinces`, `districts`, `subdistricts`, and `postal_codes`.

Relational table or MongoDB collection names can be changed:

```bash
npx thai-geo-db build \
  --format postgresql mongodb \
  --db-layout relational \
  --table-provinces geo_provinces \
  --table-districts geo_districts \
  --table-subdistricts geo_subdistricts \
  --table-postal-codes geo_postal_codes
```

## Data Model

```json
{
  "id": 1,
  "province": "กรุงเทพมหานคร",
  "district": "พระนคร",
  "subdistrict": "พระบรมมหาราชวัง",
  "postalCode": "10200",
  "provinceSlug": "กรุงเทพมหานคร",
  "districtSlug": "พระนคร",
  "subdistrictSlug": "พระบรมมหาราชวัง"
}
```

Thai text is preserved from the source, except for whitespace normalization. Postal codes are always strings.

## Development

```bash
npm test
```

Do not hand-edit files in `dist/`. Update logic in `src/` and regenerate outputs.

## License

MIT
