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
      provinceEn: 'Bangkok',
      district: 'พระนคร',
      districtEn: 'Phra Nakhon',
      subdistrict: 'พระบรมมหาราชวัง',
      subdistrictEn: 'Phra Borom Maha Ratchawang',
      postalCode: '10200',
      provinceSlug: 'bangkok',
      districtSlug: 'phra-nakhon',
      subdistrictSlug: 'phra-borom-maha-ratchawang'
    },
    {
      id: 2,
      province: 'เชียงใหม่',
      provinceEn: 'Chiang Mai',
      district: 'เมืองเชียงใหม่',
      districtEn: 'Mueang Chiang Mai',
      subdistrict: 'ศรีภูมิ',
      subdistrictEn: 'Si Phum',
      postalCode: '50200',
      provinceSlug: 'chiang-mai',
      districtSlug: 'mueang-chiang-mai',
      subdistrictSlug: 'si-phum'
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
    provinceEn: 'Bangkok',
    district: 'สัมพันธวงศ์',
    districtEn: 'Samphanthawong',
    subdistrict: 'จักรวรรดิ',
    subdistrictEn: 'Chakkrawat',
    postalCode: '10100',
    provinceSlug: 'bangkok',
    districtSlug: 'samphanthawong',
    subdistrictSlug: 'chakkrawat'
  });
});

test('supports alternate slug styles', async () => {
  const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'postal-codes.fixture.xlsx');
  const records = await extractPostalCodesFromXlsx(fixturePath, { tableName: 'รหัสไปรษณีย์', slugStyle: 'PascalCase' });

  assert.equal(records[0].districtSlug, 'PhraNakhon');
  assert.equal(records[1].subdistrictSlug, 'SiPhum');
});
