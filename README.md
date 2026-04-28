# Thai Geo DB

ฐานข้อมูลจังหวัดประเทศไทย อำเภอ ตำบล และรหัสไปรษณีย์ พร้อม export เป็น JSON, CSV, YAML, SQL, MongoDB และ plain text สำหรับนำไปใช้ในเว็บ แอป API backend ระบบค้นหาที่อยู่ ระบบสมาชิก ระบบจัดส่ง หรือ seed database เริ่มต้นของโปรเจกต์

โปรเจกต์นี้ช่วยแปลงไฟล์ Excel ต้นทางของข้อมูลภูมิศาสตร์ไทยให้เป็น format ที่นำไปใช้งานต่อได้ง่าย ทั้งแบบรวม table เดียวและแบบ relational แยกเป็น `provinces`, `districts`, `subdistricts`, และ `postal_codes`

English README: [README.en.md](README.en.md)

## เหมาะสำหรับค้นหาและใช้งานเรื่อง

- ฐานข้อมูลจังหวัดประเทศไทย
- ฐานข้อมูลจังหวัด อำเภอ ตำบล
- ฐานข้อมูลรหัสไปรษณีย์ไทย
- รายชื่อจังหวัด อำเภอ ตำบล ภาษาไทยและภาษาอังกฤษ
- Thai province district subdistrict database
- Thailand postal code database
- seed data จังหวัด อำเภอ ตำบล สำหรับ PostgreSQL, MySQL, MongoDB
- JSON / CSV / YAML รายชื่อจังหวัดไทย

## ข้อมูลที่มี

แต่ละ record หลักประกอบด้วย:

- จังหวัด ภาษาไทยและภาษาอังกฤษ
- อำเภอ/เขต ภาษาไทยและภาษาอังกฤษ
- ตำบล/แขวง ภาษาไทยและภาษาอังกฤษ
- รหัสไปรษณีย์
- slug ของจังหวัด อำเภอ และตำบล

ตัวอย่าง canonical JSON:

```json
{
  "id": 1,
  "province": "กระบี่",
  "provinceEn": "Krabi",
  "district": "เกาะลันตา",
  "districtEn": "Ko Lanta",
  "subdistrict": "เกาะกลาง",
  "subdistrictEn": "Ko Klang",
  "postalCode": "81120",
  "provinceSlug": "krabi",
  "districtSlug": "ko-lanta",
  "subdistrictSlug": "ko-klang"
}
```

รหัสไปรษณีย์เก็บเป็น string เสมอ และชื่อภาษาไทย/อังกฤษจะคงตามต้นฉบับ ยกเว้นการ normalize whitespace

## Output ที่สร้างได้

ไฟล์แบบรวม:

- `dist/thai-postal-codes.json`
- `dist/thai-postal-codes.jsonl`
- `dist/thai-postal-codes.csv`
- `dist/thai-postal-codes.txt`
- `dist/thai-postal-codes.yaml`

ไฟล์แบบแยก entity:

- `dist/relational/provinces.*`
- `dist/relational/districts.*`
- `dist/relational/subdistricts.*`
- `dist/relational/postal-codes.*`

Database seed:

- `dist/sql/postgresql.sql`
- `dist/sql/postgresql-relational.sql`
- `dist/sql/mysql.sql`
- `dist/sql/mysql-relational.sql`
- `dist/mongodb/thai-postal-codes.mongodb.js`
- `dist/mongodb/thai-postal-codes.relational.mongodb.js`

ทุกครั้งที่ใช้ `build` ระบบจะล้าง output directory เดิมก่อนสร้างไฟล์ใหม่ เพื่อไม่ให้มีไฟล์เก่าค้างอยู่ใน `dist/`

## แหล่งข้อมูลและเครดิตข้อมูล

ข้อมูลตั้งต้นนำมาจาก ThepExcel: [ฐานข้อมูลตำบล อำเภอ จังหวัด รหัสไปรษณีย์ ของประเทศไทย V3](https://www.thepexcel.com/thailand-tambon-database/)

ไฟล์ Excel ตัวอย่างจาก ThepExcel:

```text
https://github.com/ThepExcel/download/blob/master/ThepExcel-Thailand-Tambon.xlsx
```

โปรเจกต์นี้เป็นเครื่องมือแปลง format เพื่อให้นำข้อมูลไปใช้ต่อได้ง่ายขึ้น ไม่ใช่แหล่งข้อมูลราชการหรือ official government database โปรดตรวจสอบความถูกต้องกับแหล่งข้อมูลที่เหมาะสมก่อนใช้ในงานสำคัญ

## ติดตั้ง

```bash
npm install
```

วางไฟล์ต้นฉบับไว้ที่:

```text
sources/thai-postal-codes.xlsx
```

## Extract จาก XLSX

```bash
npm run extract
```

หรือระบุ path เอง:

```bash
npx thai-geo-db extract --source sources/thai-postal-codes.xlsx --table "รหัสไปรษณีย์"
```

Extractor จะอ่าน table/worksheet `รหัสไปรษณีย์` และอ่าน `TambonDatabase` เพิ่มเพื่อ join ชื่อภาษาอังกฤษผ่าน `TambonID`

## Build Output ทั้งหมด

```bash
npm run build:outputs
```

หรือเลือกเฉพาะ format:

```bash
npx thai-geo-db build --format json csv yaml
npx thai-geo-db build --format postgresql mysql mongodb
```

## Slug Style

ค่า default คือ `slug-case` โดยใช้ชื่อภาษาอังกฤษก่อน ถ้าไม่มีจึง fallback เป็นภาษาไทย

เลือก style ได้:

```bash
npx thai-geo-db extract --slug-style slug-case
npx thai-geo-db extract --slug-style snake_case
npx thai-geo-db extract --slug-style camelCase
npx thai-geo-db extract --slug-style PascalCase
npx thai-geo-db extract --slug-style UPPER_UNDERSCORE_CASE
npx thai-geo-db extract --slug-style lowercase
npx thai-geo-db extract --slug-style UPPERCASE
```

## Interactive CLI

```bash
npm run wizard
```

Wizard ใช้เลือก output format, output directory, slug style, SQL table name, SQL column name, relational table/collection name และตัวเลือก SQL เช่น `DROP TABLE`, `CREATE TABLE`, และ `INSERT`

## DB Output Layout

ค่า default ของ DB output คือ `both` เพื่อสร้างทั้งแบบรวม table เดียวและแบบ relational

```bash
npx thai-geo-db build --format postgresql --db-layout both
npx thai-geo-db build --format postgresql --db-layout combined
npx thai-geo-db build --format postgresql --db-layout relational
```

แบบรวม table เดียว:

- `thai_postal_codes`

แบบ relational:

- `provinces`
- `districts`
- `subdistricts`
- `postal_codes`

## ปรับชื่อ Table และ Column

ตัวอย่างเปลี่ยนชื่อ table/column สำหรับ output แบบรวม:

```bash
npx thai-geo-db build \
  --format postgresql \
  --table locations \
  --column-postal-code zip_code
```

ตัวอย่างเปลี่ยนชื่อ relational table หรือ MongoDB collection:

```bash
npx thai-geo-db build \
  --format postgresql mongodb \
  --db-layout relational \
  --table-provinces geo_provinces \
  --table-districts geo_districts \
  --table-subdistricts geo_subdistricts \
  --table-postal-codes geo_postal_codes
```

ค่า default ของ combined SQL:

- Table: `thai_postal_codes`
- Columns: `id`, `province`, `province_en`, `district`, `district_en`, `subdistrict`, `subdistrict_en`, `postal_code`

## Development

```bash
npm test
```

ห้ามแก้ไฟล์ใน `dist/` ด้วยมือ ให้แก้ logic ใน `src/` แล้ว generate ใหม่

## License

MIT

## Credit

โค้ดชุดนี้พัฒนาโดย NakornCode โดยใช้ GPT-5.5 ช่วย generate และปรับปรุง code
