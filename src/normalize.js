export function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function normalizePostalCode(value) {
  const text = normalizeText(value).replace(/\.0$/, '');
  const digits = text.replace(/\D/g, '');
  return digits.length > 0 ? digits.padStart(5, '0') : text;
}

export function toSlug(value, style = 'slug-case') {
  const words = slugWords(value);
  if (words.length === 0) {
    return '';
  }

  if (style === 'snake_case') {
    return words.map((word) => word.toLowerCase()).join('_');
  }
  if (style === 'camelCase') {
    return words.map((word, index) => (index === 0 ? word.toLowerCase() : capitalize(word))).join('');
  }
  if (style === 'PascalCase') {
    return words.map(capitalize).join('');
  }
  if (style === 'UPPER_UNDERSCORE_CASE') {
    return words.map((word) => word.toUpperCase()).join('_');
  }
  if (style === 'lowercase') {
    return words.join('').toLowerCase();
  }
  if (style === 'UPPERCASE') {
    return words.join('').toUpperCase();
  }

  return words.map((word) => word.toLowerCase()).join('-');
}

export function normalizeRecords(rows, options = {}) {
  const slugStyle = options.slugStyle ?? 'slug-case';
  const seen = new Set();
  const records = [];

  for (const row of rows) {
    const province = normalizeText(row.province);
    const provinceEn = normalizeText(row.provinceEn);
    const district = normalizeText(row.district);
    const districtEn = normalizeText(row.districtEn);
    const subdistrict = normalizeText(row.subdistrict);
    const subdistrictEn = normalizeText(row.subdistrictEn);
    const postalCode = normalizePostalCode(row.postalCode);

    if (!province || !district || !subdistrict || !postalCode) {
      continue;
    }

    const key = [province, district, subdistrict, postalCode].join('\u001f');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    records.push({
      province,
      provinceEn,
      district,
      districtEn,
      subdistrict,
      subdistrictEn,
      postalCode
    });
  }

  records.sort((a, b) => (
    a.province.localeCompare(b.province, 'th') ||
    a.district.localeCompare(b.district, 'th') ||
    a.subdistrict.localeCompare(b.subdistrict, 'th') ||
    a.postalCode.localeCompare(b.postalCode)
  ));

  return records.map((record, index) => ({
    id: index + 1,
    ...record,
    provinceSlug: toSlug(record.provinceEn || record.province, slugStyle),
    districtSlug: toSlug(record.districtEn || record.district, slugStyle),
    subdistrictSlug: toSlug(record.subdistrictEn || record.subdistrict, slugStyle)
  }));
}

function slugWords(value) {
  return normalizeText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
}

function capitalize(value) {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
