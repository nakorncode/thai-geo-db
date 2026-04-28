export function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function normalizePostalCode(value) {
  const text = normalizeText(value).replace(/\.0$/, '');
  const digits = text.replace(/\D/g, '');
  return digits.length > 0 ? digits.padStart(5, '0') : text;
}

export function toSlug(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeRecords(rows) {
  const seen = new Set();
  const records = [];

  for (const row of rows) {
    const province = normalizeText(row.province);
    const district = normalizeText(row.district);
    const subdistrict = normalizeText(row.subdistrict);
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
      district,
      subdistrict,
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
    provinceSlug: toSlug(record.province),
    districtSlug: toSlug(record.district),
    subdistrictSlug: toSlug(record.subdistrict)
  }));
}
