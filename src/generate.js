import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { CANONICAL_BASENAME, DEFAULT_MONGODB_OPTIONS, DEFAULT_SQL_OPTIONS } from './defaults.js';

export async function readCanonicalRecords(outputDir) {
  const filePath = path.join(outputDir, `${CANONICAL_BASENAME}.json`);
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function writeCanonicalRecords(records, outputDir) {
  await mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${CANONICAL_BASENAME}.json`);
  await writeFile(filePath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  return filePath;
}

export async function generateOutputs(records, options = {}) {
  const outputDir = options.outputDir ?? 'dist';
  const formats = normalizeFormats(options.formats);
  const written = [];

  if (options.cleanOutput) {
    await rm(outputDir, { recursive: true, force: true });
  }

  await mkdir(outputDir, { recursive: true });

  for (const format of formats) {
    if (format === 'json') {
      written.push(...await writeJsonOutputs(records, outputDir));
    } else if (format === 'jsonl') {
      written.push(...await writeJsonlOutputs(records, outputDir));
    } else if (format === 'csv') {
      written.push(...await writeCsvOutputs(records, outputDir));
    } else if (format === 'txt') {
      written.push(...await writeTxtOutputs(records, outputDir));
    } else if (format === 'yaml') {
      written.push(...await writeYamlOutputs(records, outputDir));
    } else if (format === 'postgresql') {
      written.push(...await writePostgresqlOutputs(records, outputDir, options.sql));
    } else if (format === 'mysql') {
      written.push(...await writeMysqlOutputs(records, outputDir, options.sql));
    } else if (format === 'mongodb') {
      written.push(...await writeMongodbOutputs(records, outputDir, options.mongodb));
    } else {
      throw new Error(`Unsupported output format: ${format}`);
    }
  }

  return written;
}

function normalizeFormats(formats) {
  if (!formats || formats.length === 0) {
    return ['json', 'jsonl', 'csv', 'txt', 'yaml', 'postgresql', 'mysql', 'mongodb'];
  }
  return Array.isArray(formats) ? formats : String(formats).split(',').map((format) => format.trim()).filter(Boolean);
}

async function writeJsonOutputs(records, outputDir) {
  const data = toRelationalData(records);
  return [
    await writeFileOutput(outputDir, `${CANONICAL_BASENAME}.json`, `${JSON.stringify(records, null, 2)}\n`),
    ...await writeRelationalDataOutputs(outputDir, 'json', data, (rows) => `${JSON.stringify(rows, null, 2)}\n`)
  ];
}

async function writeJsonlOutputs(records, outputDir) {
  const data = toRelationalData(records);
  return [
    await writeFileOutput(outputDir, `${CANONICAL_BASENAME}.jsonl`, records.map((record) => JSON.stringify(record)).join('\n') + '\n'),
    ...await writeRelationalDataOutputs(outputDir, 'jsonl', data, (rows) => rows.map((row) => JSON.stringify(row)).join('\n') + '\n')
  ];
}

async function writeCsvOutputs(records, outputDir) {
  const data = toRelationalData(records);
  return [
    await writeFileOutput(outputDir, `${CANONICAL_BASENAME}.csv`, toCsv(records, combinedColumns())),
    ...await writeRelationalDataOutputs(outputDir, 'csv', data, (rows, columns) => toCsv(rows, columns))
  ];
}

async function writeTxtOutputs(records, outputDir) {
  const data = toRelationalData(records);
  return [
    await writeFileOutput(outputDir, `${CANONICAL_BASENAME}.txt`, toPlainText(records)),
    ...await writeRelationalDataOutputs(outputDir, 'txt', data, (rows, columns) => toDelimitedText(rows, columns))
  ];
}

async function writeYamlOutputs(records, outputDir) {
  const data = toRelationalData(records);
  return [
    await writeFileOutput(outputDir, `${CANONICAL_BASENAME}.yaml`, YAML.stringify(records)),
    ...await writeRelationalDataOutputs(outputDir, 'yaml', data, (rows) => YAML.stringify(rows))
  ];
}

async function writeRelationalDataOutputs(outputDir, extension, data, serialize) {
  const directory = path.join(outputDir, 'relational');
  const files = [
    ['provinces', data.provinces, ['id', 'name', 'nameEn', 'slug']],
    ['districts', data.districts, ['id', 'provinceId', 'name', 'nameEn', 'slug']],
    ['subdistricts', data.subdistricts, ['id', 'districtId', 'name', 'nameEn', 'slug']],
    ['postal-codes', data.postalCodes, ['id', 'subdistrictId', 'postalCode']]
  ];
  const written = [];

  for (const [name, rows, columns] of files) {
    written.push(await writeFileOutput(directory, `${name}.${extension}`, serialize(rows, columns)));
  }

  return written;
}

async function writeFileOutput(directory, filename, content) {
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, filename);
  await writeFile(filePath, content, 'utf8');
  return filePath;
}

function combinedColumns() {
  return ['id', 'province', 'provinceEn', 'district', 'districtEn', 'subdistrict', 'subdistrictEn', 'postalCode', 'provinceSlug', 'districtSlug', 'subdistrictSlug'];
}

function toCsv(records, columns) {
  const lines = [columns.join(',')];
  for (const record of records) {
    lines.push(columns.map((column) => csvCell(record[column])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function toPostgresqlRelational(records, options = {}) {
  const sqlOptions = mergeSqlOptions(options);
  const data = toRelationalData(records);
  const tableNames = relationalTableNames(sqlOptions.relationalTables, pgIdentifier);
  const lines = ['-- Generated by thai-geo-db'];

  if (sqlOptions.dropTable) {
    lines.push(
      `DROP TABLE IF EXISTS ${tableNames.postalCodes};`,
      `DROP TABLE IF EXISTS ${tableNames.subdistricts};`,
      `DROP TABLE IF EXISTS ${tableNames.districts};`,
      `DROP TABLE IF EXISTS ${tableNames.provinces};`
    );
  }

  if (sqlOptions.createTable) {
    lines.push(
      `CREATE TABLE IF NOT EXISTS ${tableNames.provinces} (`,
      '  id INTEGER PRIMARY KEY,',
      '  name TEXT NOT NULL UNIQUE,',
      '  name_en TEXT NOT NULL,',
      '  slug TEXT NOT NULL',
      ');',
      `CREATE TABLE IF NOT EXISTS ${tableNames.districts} (`,
      '  id INTEGER PRIMARY KEY,',
      `  province_id INTEGER NOT NULL REFERENCES ${tableNames.provinces}(id),`,
      '  name TEXT NOT NULL,',
      '  name_en TEXT NOT NULL,',
      '  slug TEXT NOT NULL,',
      '  UNIQUE (province_id, name)',
      ');',
      `CREATE TABLE IF NOT EXISTS ${tableNames.subdistricts} (`,
      '  id INTEGER PRIMARY KEY,',
      `  district_id INTEGER NOT NULL REFERENCES ${tableNames.districts}(id),`,
      '  name TEXT NOT NULL,',
      '  name_en TEXT NOT NULL,',
      '  slug TEXT NOT NULL,',
      '  UNIQUE (district_id, name)',
      ');',
      `CREATE TABLE IF NOT EXISTS ${tableNames.postalCodes} (`,
      '  id INTEGER PRIMARY KEY,',
      `  subdistrict_id INTEGER NOT NULL REFERENCES ${tableNames.subdistricts}(id),`,
      '  postal_code VARCHAR(5) NOT NULL,',
      '  UNIQUE (subdistrict_id, postal_code)',
      ');'
    );
  }

  if (sqlOptions.insertRows) {
    pushRelationalInserts(lines, data, tableNames, pgIdentifier);
  }

  return `${lines.join('\n')}\n`;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toPlainText(records) {
  return records.map((record) => `${record.subdistrict}\t${record.district}\t${record.province}\t${record.postalCode}`).join('\n') + '\n';
}

function toDelimitedText(records, columns) {
  return [
    columns.join('\t'),
    ...records.map((record) => columns.map((column) => String(record[column] ?? '')).join('\t'))
  ].join('\n') + '\n';
}

export function toPostgresql(records, options = {}) {
  const sqlOptions = mergeSqlOptions(options);
  const table = pgIdentifier(sqlOptions.tableName);
  const columns = sqlColumnList(sqlOptions.columns, pgIdentifier);
  const lines = ['-- Generated by thai-geo-db'];

  if (sqlOptions.dropTable) {
    lines.push(`DROP TABLE IF EXISTS ${table};`);
  }

  if (sqlOptions.createTable) {
    lines.push(
      `CREATE TABLE IF NOT EXISTS ${table} (`,
      `  ${pgIdentifier(sqlOptions.columns.id)} INTEGER PRIMARY KEY,`,
      `  ${pgIdentifier(sqlOptions.columns.province)} TEXT NOT NULL,`,
      `  ${pgIdentifier(sqlOptions.columns.provinceEn)} TEXT NOT NULL,`,
      `  ${pgIdentifier(sqlOptions.columns.district)} TEXT NOT NULL,`,
      `  ${pgIdentifier(sqlOptions.columns.districtEn)} TEXT NOT NULL,`,
      `  ${pgIdentifier(sqlOptions.columns.subdistrict)} TEXT NOT NULL,`,
      `  ${pgIdentifier(sqlOptions.columns.subdistrictEn)} TEXT NOT NULL,`,
      `  ${pgIdentifier(sqlOptions.columns.postalCode)} VARCHAR(5) NOT NULL`,
      ');'
    );
  }

  if (sqlOptions.insertRows && records.length > 0) {
    lines.push(`INSERT INTO ${table} (${columns}) VALUES`);
    lines.push(records.map((record) => `  (${record.id}, ${sqlString(record.province)}, ${sqlString(record.provinceEn)}, ${sqlString(record.district)}, ${sqlString(record.districtEn)}, ${sqlString(record.subdistrict)}, ${sqlString(record.subdistrictEn)}, ${sqlString(record.postalCode)})`).join(',\n') + ';');
  }

  return `${lines.join('\n')}\n`;
}

export function toMysqlRelational(records, options = {}) {
  const sqlOptions = mergeSqlOptions(options);
  const data = toRelationalData(records);
  const tableNames = relationalTableNames(sqlOptions.relationalTables, mysqlIdentifier);
  const lines = ['-- Generated by thai-geo-db'];

  if (sqlOptions.dropTable) {
    lines.push(
      `DROP TABLE IF EXISTS ${tableNames.postalCodes};`,
      `DROP TABLE IF EXISTS ${tableNames.subdistricts};`,
      `DROP TABLE IF EXISTS ${tableNames.districts};`,
      `DROP TABLE IF EXISTS ${tableNames.provinces};`
    );
  }

  if (sqlOptions.createTable) {
    lines.push(
      `CREATE TABLE IF NOT EXISTS ${tableNames.provinces} (`,
      '  `id` INT PRIMARY KEY,',
      '  `name` TEXT NOT NULL,',
      '  `name_en` TEXT NOT NULL,',
      '  `slug` TEXT NOT NULL,',
      '  UNIQUE KEY `provinces_name_unique` (`name`(191))',
      ') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
      `CREATE TABLE IF NOT EXISTS ${tableNames.districts} (`,
      '  `id` INT PRIMARY KEY,',
      '  `province_id` INT NOT NULL,',
      '  `name` TEXT NOT NULL,',
      '  `name_en` TEXT NOT NULL,',
      '  `slug` TEXT NOT NULL,',
      '  UNIQUE KEY `districts_province_name_unique` (`province_id`, `name`(191)),',
      `  CONSTRAINT \`districts_province_id_fk\` FOREIGN KEY (\`province_id\`) REFERENCES ${tableNames.provinces}(\`id\`)`,
      ') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
      `CREATE TABLE IF NOT EXISTS ${tableNames.subdistricts} (`,
      '  `id` INT PRIMARY KEY,',
      '  `district_id` INT NOT NULL,',
      '  `name` TEXT NOT NULL,',
      '  `name_en` TEXT NOT NULL,',
      '  `slug` TEXT NOT NULL,',
      '  UNIQUE KEY `subdistricts_district_name_unique` (`district_id`, `name`(191)),',
      `  CONSTRAINT \`subdistricts_district_id_fk\` FOREIGN KEY (\`district_id\`) REFERENCES ${tableNames.districts}(\`id\`)`,
      ') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
      `CREATE TABLE IF NOT EXISTS ${tableNames.postalCodes} (`,
      '  `id` INT PRIMARY KEY,',
      '  `subdistrict_id` INT NOT NULL,',
      '  `postal_code` VARCHAR(5) NOT NULL,',
      '  UNIQUE KEY `postal_codes_subdistrict_code_unique` (`subdistrict_id`, `postal_code`),',
      `  CONSTRAINT \`postal_codes_subdistrict_id_fk\` FOREIGN KEY (\`subdistrict_id\`) REFERENCES ${tableNames.subdistricts}(\`id\`)`,
      ') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
    );
  }

  if (sqlOptions.insertRows) {
    pushRelationalInserts(lines, data, tableNames, mysqlIdentifier);
  }

  return `${lines.join('\n')}\n`;
}

export function toMysql(records, options = {}) {
  const sqlOptions = mergeSqlOptions(options);
  const table = mysqlIdentifier(sqlOptions.tableName);
  const columns = sqlColumnList(sqlOptions.columns, mysqlIdentifier);
  const lines = ['-- Generated by thai-geo-db'];

  if (sqlOptions.dropTable) {
    lines.push(`DROP TABLE IF EXISTS ${table};`);
  }

  if (sqlOptions.createTable) {
    lines.push(
      `CREATE TABLE IF NOT EXISTS ${table} (`,
      `  ${mysqlIdentifier(sqlOptions.columns.id)} INT PRIMARY KEY,`,
      `  ${mysqlIdentifier(sqlOptions.columns.province)} TEXT NOT NULL,`,
      `  ${mysqlIdentifier(sqlOptions.columns.provinceEn)} TEXT NOT NULL,`,
      `  ${mysqlIdentifier(sqlOptions.columns.district)} TEXT NOT NULL,`,
      `  ${mysqlIdentifier(sqlOptions.columns.districtEn)} TEXT NOT NULL,`,
      `  ${mysqlIdentifier(sqlOptions.columns.subdistrict)} TEXT NOT NULL,`,
      `  ${mysqlIdentifier(sqlOptions.columns.subdistrictEn)} TEXT NOT NULL,`,
      `  ${mysqlIdentifier(sqlOptions.columns.postalCode)} VARCHAR(5) NOT NULL`,
      ') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
    );
  }

  if (sqlOptions.insertRows && records.length > 0) {
    lines.push(`INSERT INTO ${table} (${columns}) VALUES`);
    lines.push(records.map((record) => `  (${record.id}, ${sqlString(record.province)}, ${sqlString(record.provinceEn)}, ${sqlString(record.district)}, ${sqlString(record.districtEn)}, ${sqlString(record.subdistrict)}, ${sqlString(record.subdistrictEn)}, ${sqlString(record.postalCode)})`).join(',\n') + ';');
  }

  return `${lines.join('\n')}\n`;
}

export function toMongodb(records, options = {}) {
  const collectionName = options.collectionName ?? DEFAULT_MONGODB_OPTIONS.collectionName;
  return [
    '// Generated by thai-geo-db',
    `db.getCollection(${JSON.stringify(collectionName)}).insertMany(${JSON.stringify(records, null, 2)});`,
    ''
  ].join('\n');
}

export function toMongodbRelational(records, options = {}) {
  const data = toRelationalData(records);
  const collections = {
    ...DEFAULT_MONGODB_OPTIONS.relationalCollections,
    ...(options.relationalCollections ?? {})
  };
  return [
    '// Generated by thai-geo-db',
    `db.getCollection(${JSON.stringify(collections.provinces)}).insertMany(${JSON.stringify(data.provinces, null, 2)});`,
    `db.getCollection(${JSON.stringify(collections.districts)}).insertMany(${JSON.stringify(data.districts, null, 2)});`,
    `db.getCollection(${JSON.stringify(collections.subdistricts)}).insertMany(${JSON.stringify(data.subdistricts, null, 2)});`,
    `db.getCollection(${JSON.stringify(collections.postalCodes)}).insertMany(${JSON.stringify(data.postalCodes, null, 2)});`,
    ''
  ].join('\n');
}

export function toRelationalData(records) {
  const provinces = [];
  const districts = [];
  const subdistricts = [];
  const postalCodes = [];
  const provinceIds = new Map();
  const districtIds = new Map();
  const subdistrictIds = new Map();
  const postalCodeIds = new Set();

  for (const record of records) {
    const provinceKey = record.province;
    let provinceId = provinceIds.get(provinceKey);
    if (!provinceId) {
      provinceId = provinces.length + 1;
      provinceIds.set(provinceKey, provinceId);
      provinces.push({ id: provinceId, name: record.province, nameEn: record.provinceEn, slug: record.provinceSlug });
    }

    const districtKey = `${provinceId}\u001f${record.district}`;
    let districtId = districtIds.get(districtKey);
    if (!districtId) {
      districtId = districts.length + 1;
      districtIds.set(districtKey, districtId);
      districts.push({ id: districtId, provinceId, name: record.district, nameEn: record.districtEn, slug: record.districtSlug });
    }

    const subdistrictKey = `${districtId}\u001f${record.subdistrict}`;
    let subdistrictId = subdistrictIds.get(subdistrictKey);
    if (!subdistrictId) {
      subdistrictId = subdistricts.length + 1;
      subdistrictIds.set(subdistrictKey, subdistrictId);
      subdistricts.push({ id: subdistrictId, districtId, name: record.subdistrict, nameEn: record.subdistrictEn, slug: record.subdistrictSlug });
    }

    const postalCodeKey = `${subdistrictId}\u001f${record.postalCode}`;
    if (!postalCodeIds.has(postalCodeKey)) {
      postalCodeIds.add(postalCodeKey);
      postalCodes.push({ id: postalCodes.length + 1, subdistrictId, postalCode: record.postalCode });
    }
  }

  return { provinces, districts, subdistricts, postalCodes };
}

async function writePostgresqlOutputs(records, outputDir, options = {}) {
  const layout = dbLayout(options);
  const sqlDir = path.join(outputDir, 'sql');
  const written = [];
  if (layout === 'combined' || layout === 'both') {
    written.push(await writeFileOutput(sqlDir, 'postgresql.sql', toPostgresql(records, options)));
  }
  if (layout === 'relational' || layout === 'both') {
    written.push(await writeFileOutput(sqlDir, 'postgresql-relational.sql', toPostgresqlRelational(records, options)));
  }
  return written;
}

async function writeMysqlOutputs(records, outputDir, options = {}) {
  const layout = dbLayout(options);
  const sqlDir = path.join(outputDir, 'sql');
  const written = [];
  if (layout === 'combined' || layout === 'both') {
    written.push(await writeFileOutput(sqlDir, 'mysql.sql', toMysql(records, options)));
  }
  if (layout === 'relational' || layout === 'both') {
    written.push(await writeFileOutput(sqlDir, 'mysql-relational.sql', toMysqlRelational(records, options)));
  }
  return written;
}

async function writeMongodbOutputs(records, outputDir, options = {}) {
  const layout = dbLayout(options);
  const mongoDir = path.join(outputDir, 'mongodb');
  const written = [];
  if (layout === 'combined' || layout === 'both') {
    written.push(await writeFileOutput(mongoDir, `${CANONICAL_BASENAME}.mongodb.js`, toMongodb(records, options)));
  }
  if (layout === 'relational' || layout === 'both') {
    written.push(await writeFileOutput(mongoDir, `${CANONICAL_BASENAME}.relational.mongodb.js`, toMongodbRelational(records, options)));
  }
  return written;
}

function dbLayout(options = {}) {
  const layout = options.dbLayout ?? 'both';
  if (!['combined', 'relational', 'both'].includes(layout)) {
    throw new Error(`Unsupported DB layout: ${layout}`);
  }
  return layout;
}

function relationalTableNames(names, quoteIdentifier) {
  return {
    provinces: quoteIdentifier(names.provinces),
    districts: quoteIdentifier(names.districts),
    subdistricts: quoteIdentifier(names.subdistricts),
    postalCodes: quoteIdentifier(names.postalCodes)
  };
}

function pushRelationalInserts(lines, data, tableNames, quoteIdentifier) {
  if (data.provinces.length > 0) {
    lines.push(`INSERT INTO ${tableNames.provinces} (${quoteIdentifier('id')}, ${quoteIdentifier('name')}, ${quoteIdentifier('name_en')}, ${quoteIdentifier('slug')}) VALUES`);
    lines.push(data.provinces.map((row) => `  (${row.id}, ${sqlString(row.name)}, ${sqlString(row.nameEn)}, ${sqlString(row.slug)})`).join(',\n') + ';');
  }
  if (data.districts.length > 0) {
    lines.push(`INSERT INTO ${tableNames.districts} (${quoteIdentifier('id')}, ${quoteIdentifier('province_id')}, ${quoteIdentifier('name')}, ${quoteIdentifier('name_en')}, ${quoteIdentifier('slug')}) VALUES`);
    lines.push(data.districts.map((row) => `  (${row.id}, ${row.provinceId}, ${sqlString(row.name)}, ${sqlString(row.nameEn)}, ${sqlString(row.slug)})`).join(',\n') + ';');
  }
  if (data.subdistricts.length > 0) {
    lines.push(`INSERT INTO ${tableNames.subdistricts} (${quoteIdentifier('id')}, ${quoteIdentifier('district_id')}, ${quoteIdentifier('name')}, ${quoteIdentifier('name_en')}, ${quoteIdentifier('slug')}) VALUES`);
    lines.push(data.subdistricts.map((row) => `  (${row.id}, ${row.districtId}, ${sqlString(row.name)}, ${sqlString(row.nameEn)}, ${sqlString(row.slug)})`).join(',\n') + ';');
  }
  if (data.postalCodes.length > 0) {
    lines.push(`INSERT INTO ${tableNames.postalCodes} (${quoteIdentifier('id')}, ${quoteIdentifier('subdistrict_id')}, ${quoteIdentifier('postal_code')}) VALUES`);
    lines.push(data.postalCodes.map((row) => `  (${row.id}, ${row.subdistrictId}, ${sqlString(row.postalCode)})`).join(',\n') + ';');
  }
}

function mergeSqlOptions(options = {}) {
  return {
    ...DEFAULT_SQL_OPTIONS,
    ...options,
    relationalTables: {
      ...DEFAULT_SQL_OPTIONS.relationalTables,
      ...(options.relationalTables ?? {})
    },
    columns: {
      ...DEFAULT_SQL_OPTIONS.columns,
      ...(options.columns ?? {})
    }
  };
}

function sqlColumnList(columns, quoteIdentifier) {
  return [columns.id, columns.province, columns.provinceEn, columns.district, columns.districtEn, columns.subdistrict, columns.subdistrictEn, columns.postalCode]
    .map(quoteIdentifier)
    .join(', ');
}

function pgIdentifier(value) {
  return /^[a-z_][a-z0-9_]*$/.test(value) ? value : `"${String(value).replace(/"/g, '""')}"`;
}

function mysqlIdentifier(value) {
  return `\`${String(value).replace(/`/g, '``')}\``;
}

function sqlString(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}
