import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { generateOutputs, toMongodb, toMongodbRelational, toMysql, toMysqlRelational, toPostgresql, toPostgresqlRelational, toRelationalData } from '../src/generate.js';

const records = [
  {
    id: 1,
    province: "กรุงเทพ'มหานคร",
    provinceEn: 'Bangkok',
    district: 'พระนคร',
    districtEn: 'Phra Nakhon',
    subdistrict: 'พระบรมมหาราชวัง',
    subdistrictEn: 'Phra Borom Maha Ratchawang',
    postalCode: '10200',
    provinceSlug: 'กรุงเทพ-มหานคร',
    districtSlug: 'พระนคร',
    subdistrictSlug: 'พระบรมมหาราชวัง'
  },
  {
    id: 2,
    province: "กรุงเทพ'มหานคร",
    provinceEn: 'Bangkok',
    district: 'พระนคร',
    districtEn: 'Phra Nakhon',
    subdistrict: 'วังบูรพาภิรมย์',
    subdistrictEn: 'Wang Burapha Phirom',
    postalCode: '10200',
    provinceSlug: 'กรุงเทพ-มหานคร',
    districtSlug: 'พระนคร',
    subdistrictSlug: 'วังบูรพาภิรมย์'
  },
  {
    id: 3,
    province: 'เชียงใหม่',
    provinceEn: 'Chiang Mai',
    district: 'เมืองเชียงใหม่',
    districtEn: 'Mueang Chiang Mai',
    subdistrict: 'ศรีภูมิ',
    subdistrictEn: 'Si Phum',
    postalCode: '50200',
    provinceSlug: 'เชียงใหม่',
    districtSlug: 'เมืองเชียงใหม่',
    subdistrictSlug: 'ศรีภูมิ'
  }
];

test('generates core text formats', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'thai-geo-db-'));

  try {
    await generateOutputs(records, { outputDir: directory, formats: ['json', 'jsonl', 'csv', 'txt', 'yaml'] });

    assert.match(await readFile(path.join(directory, 'thai-postal-codes.json'), 'utf8'), /"postalCode": "10200"/);
    assert.match(await readFile(path.join(directory, 'thai-postal-codes.jsonl'), 'utf8'), /"province"/);
    assert.match(await readFile(path.join(directory, 'thai-postal-codes.csv'), 'utf8'), /^id,province,provinceEn,district/m);
    assert.match(await readFile(path.join(directory, 'thai-postal-codes.txt'), 'utf8'), /^พระบรมมหาราชวัง\tพระนคร\tกรุงเทพ'มหานคร\t10200/m);
    assert.match(await readFile(path.join(directory, 'thai-postal-codes.yaml'), 'utf8'), /postalCode: "10200"/);
    assert.match(await readFile(path.join(directory, 'relational', 'provinces.json'), 'utf8'), /"name": "เชียงใหม่"/);
    assert.match(await readFile(path.join(directory, 'relational', 'districts.csv'), 'utf8'), /^id,provinceId,name,nameEn,slug/m);
    assert.match(await readFile(path.join(directory, 'relational', 'subdistricts.txt'), 'utf8'), /^id\tdistrictId\tname\tnameEn\tslug/m);
    assert.match(await readFile(path.join(directory, 'relational', 'postal-codes.yaml'), 'utf8'), /postalCode: "50200"/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('generates configurable postgresql sql with escaped strings', () => {
  const sql = toPostgresql(records, {
    tableName: 'locations',
    columns: { postalCode: 'zip_code' },
    dropTable: true
  });

  assert.match(sql, /DROP TABLE IF EXISTS locations;/);
  assert.match(sql, /zip_code VARCHAR\(5\) NOT NULL/);
  assert.match(sql, /'กรุงเทพ''มหานคร'/);
});

test('builds relational data with stable foreign keys', () => {
  const data = toRelationalData(records);

  assert.equal(data.provinces.length, 2);
  assert.equal(data.districts.length, 2);
  assert.equal(data.subdistricts.length, 3);
  assert.equal(data.postalCodes.length, 3);
  assert.deepEqual(data.districts[0], { id: 1, provinceId: 1, name: 'พระนคร', nameEn: 'Phra Nakhon', slug: 'พระนคร' });
  assert.deepEqual(data.postalCodes[0], { id: 1, subdistrictId: 1, postalCode: '10200' });
});

test('generates relational postgresql sql', () => {
  const sql = toPostgresqlRelational(records, { dropTable: true });

  assert.match(sql, /CREATE TABLE IF NOT EXISTS provinces/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS districts/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS subdistricts/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS postal_codes/);
  assert.match(sql, /name_en TEXT NOT NULL/);
  assert.match(sql, /province_id INTEGER NOT NULL REFERENCES provinces\(id\)/);
  assert.match(sql, /INSERT INTO postal_codes \(id, subdistrict_id, postal_code\) VALUES/);
});

test('generates relational postgresql sql with custom table names', () => {
  const sql = toPostgresqlRelational(records, {
    relationalTables: {
      provinces: 'geo_provinces',
      districts: 'geo_districts',
      subdistricts: 'geo_subdistricts',
      postalCodes: 'geo_postal_codes'
    }
  });

  assert.match(sql, /CREATE TABLE IF NOT EXISTS geo_provinces/);
  assert.match(sql, /REFERENCES geo_provinces\(id\)/);
  assert.match(sql, /INSERT INTO geo_postal_codes \(id, subdistrict_id, postal_code\) VALUES/);
});

test('generates mysql sql with backtick identifiers', () => {
  const sql = toMysql(records, {
    tableName: 'thai locations',
    columns: { postalCode: 'zip code' }
  });

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `thai locations`/);
  assert.match(sql, /`zip code` VARCHAR\(5\) NOT NULL/);
  assert.match(sql, /'กรุงเทพ''มหานคร'/);
});

test('generates relational mysql sql', () => {
  const sql = toMysqlRelational(records);

  assert.match(sql, /CREATE TABLE IF NOT EXISTS `provinces`/);
  assert.match(sql, /CONSTRAINT `districts_province_id_fk`/);
  assert.match(sql, /INSERT INTO `postal_codes` \(`id`, `subdistrict_id`, `postal_code`\) VALUES/);
});

test('generates mongodb insertMany script with custom collection', () => {
  const script = toMongodb(records, { collectionName: 'postal_codes' });

  assert.match(script, /db\.getCollection\("postal_codes"\)\.insertMany/);
  assert.match(script, /"postalCode": "10200"/);
});

test('generates relational mongodb seed script', () => {
  const script = toMongodbRelational(records);

  assert.match(script, /db\.getCollection\("provinces"\)\.insertMany/);
  assert.match(script, /db\.getCollection\("postal_codes"\)\.insertMany/);
  assert.match(script, /"provinceId": 1/);
});

test('generates relational mongodb seed script with custom collections', () => {
  const script = toMongodbRelational(records, {
    relationalCollections: {
      provinces: 'geo_provinces',
      districts: 'geo_districts',
      subdistricts: 'geo_subdistricts',
      postalCodes: 'geo_postal_codes'
    }
  });

  assert.match(script, /db\.getCollection\("geo_provinces"\)\.insertMany/);
  assert.match(script, /db\.getCollection\("geo_postal_codes"\)\.insertMany/);
});

test('generates combined and relational DB outputs by default', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'thai-geo-db-'));

  try {
    await generateOutputs(records, { outputDir: directory, formats: ['postgresql', 'mysql', 'mongodb'] });

    assert.match(await readFile(path.join(directory, 'sql', 'postgresql.sql'), 'utf8'), /thai_postal_codes/);
    assert.match(await readFile(path.join(directory, 'sql', 'postgresql-relational.sql'), 'utf8'), /CREATE TABLE IF NOT EXISTS provinces/);
    assert.match(await readFile(path.join(directory, 'sql', 'mysql.sql'), 'utf8'), /thai_postal_codes/);
    assert.match(await readFile(path.join(directory, 'sql', 'mysql-relational.sql'), 'utf8'), /CREATE TABLE IF NOT EXISTS `provinces`/);
    assert.match(await readFile(path.join(directory, 'mongodb', 'thai-postal-codes.mongodb.js'), 'utf8'), /thai_postal_codes/);
    assert.match(await readFile(path.join(directory, 'mongodb', 'thai-postal-codes.relational.mongodb.js'), 'utf8'), /postal_codes/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('cleans output directory before generating when requested', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'thai-geo-db-'));

  try {
    await writeFile(path.join(directory, 'stale.txt'), 'old', 'utf8');
    await generateOutputs(records, { outputDir: directory, formats: ['json'], cleanOutput: true });

    await assert.rejects(readFile(path.join(directory, 'stale.txt'), 'utf8'), /ENOENT/);
    assert.match(await readFile(path.join(directory, 'thai-postal-codes.json'), 'utf8'), /"postalCode": "10200"/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
