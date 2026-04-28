#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { Command } from 'commander';
import { checkbox, confirm, input } from '@inquirer/prompts';
import { ALL_FORMATS, DEFAULT_OUTPUT_DIR, DEFAULT_SLUG_STYLE, DEFAULT_SOURCE, DEFAULT_SQL_OPTIONS, DEFAULT_TABLE_NAME, SLUG_STYLES } from './defaults.js';
import { extractPostalCodesFromXlsx } from './extract.js';
import { generateOutputs, readCanonicalRecords, writeCanonicalRecords } from './generate.js';

const program = new Command();

program
  .name('thai-geo-db')
  .description('Extract Thai postal-code geography data from XLSX and generate reusable database/data files.')
  .version('0.1.0');

program
  .command('extract')
  .description('Extract canonical JSON from the source XLSX table.')
  .option('-s, --source <path>', 'source XLSX path', DEFAULT_SOURCE)
  .option('-t, --table <name>', 'Excel table name', DEFAULT_TABLE_NAME)
  .option('-o, --output-dir <dir>', 'output directory', DEFAULT_OUTPUT_DIR)
  .option('--slug-style <style>', `slug style: ${SLUG_STYLES.join(', ')}`, DEFAULT_SLUG_STYLE)
  .action(async (options) => {
    await requireExistingFile(options.source);
    const records = await extractPostalCodesFromXlsx(options.source, { tableName: options.table, slugStyle: options.slugStyle });
    const filePath = await writeCanonicalRecords(records, options.outputDir);
    console.log(`Extracted ${records.length} records to ${filePath}`);
  });

program
  .command('build')
  .description('Build output files from canonical JSON.')
  .option('-o, --output-dir <dir>', 'output directory', DEFAULT_OUTPUT_DIR)
  .option('-f, --format <formats...>', 'formats to generate', ALL_FORMATS)
  .option('--table <name>', 'SQL table name', DEFAULT_SQL_OPTIONS.tableName)
  .option('--column-id <name>', 'SQL id column name', DEFAULT_SQL_OPTIONS.columns.id)
  .option('--column-province <name>', 'SQL province column name', DEFAULT_SQL_OPTIONS.columns.province)
  .option('--column-province-en <name>', 'SQL province English column name', DEFAULT_SQL_OPTIONS.columns.provinceEn)
  .option('--column-district <name>', 'SQL district column name', DEFAULT_SQL_OPTIONS.columns.district)
  .option('--column-district-en <name>', 'SQL district English column name', DEFAULT_SQL_OPTIONS.columns.districtEn)
  .option('--column-subdistrict <name>', 'SQL subdistrict column name', DEFAULT_SQL_OPTIONS.columns.subdistrict)
  .option('--column-subdistrict-en <name>', 'SQL subdistrict English column name', DEFAULT_SQL_OPTIONS.columns.subdistrictEn)
  .option('--column-postal-code <name>', 'SQL postal code column name', DEFAULT_SQL_OPTIONS.columns.postalCode)
  .option('--db-layout <layout>', 'DB output layout: combined, relational, or both', DEFAULT_SQL_OPTIONS.dbLayout)
  .option('--table-provinces <name>', 'relational provinces table/collection name', DEFAULT_SQL_OPTIONS.relationalTables.provinces)
  .option('--table-districts <name>', 'relational districts table/collection name', DEFAULT_SQL_OPTIONS.relationalTables.districts)
  .option('--table-subdistricts <name>', 'relational subdistricts table/collection name', DEFAULT_SQL_OPTIONS.relationalTables.subdistricts)
  .option('--table-postal-codes <name>', 'relational postal codes table/collection name', DEFAULT_SQL_OPTIONS.relationalTables.postalCodes)
  .option('--drop-table', 'include DROP TABLE statements', false)
  .option('--no-create-table', 'skip CREATE TABLE statements')
  .option('--no-insert-rows', 'skip INSERT statements')
  .option('--mongo-collection <name>', 'MongoDB collection name', 'thai_postal_codes')
  .action(async (options) => {
    const records = await readCanonicalRecords(options.outputDir);
    const written = await generateOutputs(records, { ...buildGenerateOptions(options), cleanOutput: true });
    console.log(`Generated ${written.length} file(s):`);
    for (const filePath of written) {
      console.log(`- ${filePath}`);
    }
  });

program
  .command('wizard')
  .description('Run an interactive helper for extraction and output generation.')
  .action(async () => {
    const source = await input({ message: 'Source XLSX path', default: DEFAULT_SOURCE });
    const tableName = await input({ message: 'Excel table name', default: DEFAULT_TABLE_NAME });
    const slugStyle = await input({ message: `Slug style (${SLUG_STYLES.join(', ')})`, default: DEFAULT_SLUG_STYLE });
    const outputDir = await input({ message: 'Output directory', default: DEFAULT_OUTPUT_DIR });
    const shouldExtract = await confirm({ message: 'Extract canonical JSON before building outputs?', default: true });

    if (shouldExtract) {
      await requireExistingFile(source);
      const records = await extractPostalCodesFromXlsx(source, { tableName, slugStyle });
      await writeCanonicalRecords(records, outputDir);
      console.log(`Extracted ${records.length} records.`);
    }

    const formats = await checkbox({
      message: 'Output formats',
      choices: ALL_FORMATS.map((format) => ({ name: format, value: format, checked: true }))
    });

    const table = await input({ message: 'SQL table name', default: DEFAULT_SQL_OPTIONS.tableName });
    const columnId = await input({ message: 'SQL id column', default: DEFAULT_SQL_OPTIONS.columns.id });
    const columnProvince = await input({ message: 'SQL province column', default: DEFAULT_SQL_OPTIONS.columns.province });
    const columnProvinceEn = await input({ message: 'SQL province English column', default: DEFAULT_SQL_OPTIONS.columns.provinceEn });
    const columnDistrict = await input({ message: 'SQL district column', default: DEFAULT_SQL_OPTIONS.columns.district });
    const columnDistrictEn = await input({ message: 'SQL district English column', default: DEFAULT_SQL_OPTIONS.columns.districtEn });
    const columnSubdistrict = await input({ message: 'SQL subdistrict column', default: DEFAULT_SQL_OPTIONS.columns.subdistrict });
    const columnSubdistrictEn = await input({ message: 'SQL subdistrict English column', default: DEFAULT_SQL_OPTIONS.columns.subdistrictEn });
    const columnPostalCode = await input({ message: 'SQL postal code column', default: DEFAULT_SQL_OPTIONS.columns.postalCode });
    const dropTable = await confirm({ message: 'Include DROP TABLE?', default: false });
    const createTable = await confirm({ message: 'Include CREATE TABLE?', default: true });
    const insertRows = await confirm({ message: 'Include seed INSERT rows?', default: true });
    const dbLayout = await input({ message: 'DB layout: combined, relational, or both', default: DEFAULT_SQL_OPTIONS.dbLayout });
    const tableProvinces = await input({ message: 'Relational provinces table/collection name', default: DEFAULT_SQL_OPTIONS.relationalTables.provinces });
    const tableDistricts = await input({ message: 'Relational districts table/collection name', default: DEFAULT_SQL_OPTIONS.relationalTables.districts });
    const tableSubdistricts = await input({ message: 'Relational subdistricts table/collection name', default: DEFAULT_SQL_OPTIONS.relationalTables.subdistricts });
    const tablePostalCodes = await input({ message: 'Relational postal codes table/collection name', default: DEFAULT_SQL_OPTIONS.relationalTables.postalCodes });
    const mongoCollection = await input({ message: 'MongoDB collection name', default: 'thai_postal_codes' });

    const records = await readCanonicalRecords(outputDir);
    const written = await generateOutputs(records, {
      ...buildGenerateOptions({
      outputDir,
      format: formats,
      table,
      columnId,
      columnProvince,
      columnProvinceEn,
      columnDistrict,
      columnDistrictEn,
      columnSubdistrict,
      columnSubdistrictEn,
      columnPostalCode,
      dropTable,
      createTable,
      insertRows,
      dbLayout,
      tableProvinces,
      tableDistricts,
      tableSubdistricts,
      tablePostalCodes,
      mongoCollection
      }),
      cleanOutput: true
    });

    console.log(`Generated ${written.length} file(s).`);
  });

program.parseAsync().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function requireExistingFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
}

function buildGenerateOptions(options) {
  return {
    outputDir: options.outputDir,
    formats: options.format,
    sql: {
      tableName: options.table,
      dbLayout: options.dbLayout,
      relationalTables: {
        provinces: options.tableProvinces,
        districts: options.tableDistricts,
        subdistricts: options.tableSubdistricts,
        postalCodes: options.tablePostalCodes
      },
      columns: {
        id: options.columnId,
        province: options.columnProvince,
        provinceEn: options.columnProvinceEn,
        district: options.columnDistrict,
        districtEn: options.columnDistrictEn,
        subdistrict: options.columnSubdistrict,
        subdistrictEn: options.columnSubdistrictEn,
        postalCode: options.columnPostalCode
      },
      dropTable: options.dropTable,
      createTable: options.createTable,
      insertRows: options.insertRows
    },
    mongodb: {
      collectionName: options.mongoCollection,
      dbLayout: options.dbLayout,
      relationalCollections: {
        provinces: options.tableProvinces,
        districts: options.tableDistricts,
        subdistricts: options.tableSubdistricts,
        postalCodes: options.tablePostalCodes
      }
    }
  };
}
