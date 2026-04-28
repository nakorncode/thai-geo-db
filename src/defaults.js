export const DEFAULT_SOURCE = 'sources/thai-postal-codes.xlsx';
export const DEFAULT_TABLE_NAME = 'รหัสไปรษณีย์';
export const DEFAULT_OUTPUT_DIR = 'dist';
export const CANONICAL_BASENAME = 'thai-postal-codes';
export const DEFAULT_SLUG_STYLE = 'slug-case';
export const SLUG_STYLES = ['slug-case', 'snake_case', 'camelCase', 'PascalCase', 'UPPER_UNDERSCORE_CASE', 'lowercase', 'UPPERCASE'];

export const DEFAULT_SQL_OPTIONS = {
  tableName: 'thai_postal_codes',
  dbLayout: 'both',
  relationalTables: {
    provinces: 'provinces',
    districts: 'districts',
    subdistricts: 'subdistricts',
    postalCodes: 'postal_codes'
  },
  columns: {
    id: 'id',
    province: 'province',
    provinceEn: 'province_en',
    district: 'district',
    districtEn: 'district_en',
    subdistrict: 'subdistrict',
    subdistrictEn: 'subdistrict_en',
    postalCode: 'postal_code'
  },
  dropTable: false,
  createTable: true,
  insertRows: true
};

export const DEFAULT_MONGODB_OPTIONS = {
  collectionName: 'thai_postal_codes',
  dbLayout: 'both',
  relationalCollections: {
    provinces: 'provinces',
    districts: 'districts',
    subdistricts: 'subdistricts',
    postalCodes: 'postal_codes'
  }
};

export const ALL_FORMATS = [
  'json',
  'jsonl',
  'csv',
  'txt',
  'yaml',
  'postgresql',
  'mysql',
  'mongodb'
];
