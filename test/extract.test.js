import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { extractPostalCodesFromXlsx } from '../src/extract.js';

test('extracts and normalizes rows from table named รหัสไปรษณีย์', async () => {
  const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'postal-codes.fixture.xlsx');
  const records = await extractPostalCodesFromXlsx(fixturePath, { tableName: 'รหัสไปรษณีย์' });

  assert.deepEqual(records, [
    {
      id: 1,
      province: 'กรุงเทพมหานคร',
      district: 'พระนคร',
      subdistrict: 'พระบรมมหาราชวัง',
      postalCode: '10200',
      provinceSlug: 'กรุงเทพมหานคร',
      districtSlug: 'พระนคร',
      subdistrictSlug: 'พระบรมมหาราชวัง'
    },
    {
      id: 2,
      province: 'เชียงใหม่',
      district: 'เมืองเชียงใหม่',
      subdistrict: 'ศรีภูมิ',
      postalCode: '50200',
      provinceSlug: 'เชียงใหม่',
      districtSlug: 'เมืองเชียงใหม่',
      subdistrictSlug: 'ศรีภูมิ'
    }
  ]);
});

test('extracts from worksheet named รหัสไปรษณีย์ when the table has a generic name', async () => {
  const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'postal-codes.fixture.xlsx');
  const records = await extractPostalCodesFromXlsx(fixturePath, { tableName: 'WorksheetFallback' });

  assert.equal(records.length, 1);
  assert.deepEqual(records[0], {
    id: 1,
    province: 'กรุงเทพมหานคร',
    district: 'สัมพันธวงศ์',
    subdistrict: 'จักรวรรดิ',
    postalCode: '10100',
    provinceSlug: 'กรุงเทพมหานคร',
    districtSlug: 'สัมพันธวงศ์',
    subdistrictSlug: 'จักรวรรดิ'
  });
});
