# Thai Geo DB

ชุดเครื่องมือ Node.js สำหรับแปลงข้อมูลภูมิศาสตร์ไทยจากไฟล์ Excel เป็นข้อมูลที่นำไปใช้ต่อได้ง่าย เช่น JSON, YAML, CSV, plain text, SQL สำหรับ PostgreSQL/MySQL และ MongoDB seed script

เวอร์ชันแรกโฟกัสที่ table ชื่อ `รหัสไปรษณีย์` ซึ่งจับคู่ `ตำบล`, `อำเภอ`, `จังหวัด`, และ `รหัสไปรษณีย์`

## ติดตั้ง

```bash
npm install
```

วางไฟล์ต้นฉบับไว้ที่:

```text
sources/thai-postal-codes.xlsx
```

## แหล่งข้อมูลและเครดิต

ข้อมูลตั้งต้นนำมาจาก ThepExcel: [ฐานข้อมูลตำบล อำเภอ จังหวัด รหัสไปรษณีย์ ของประเทศไทย V3](https://www.thepexcel.com/thailand-tambon-database/)

ไฟล์ Excel ตัวอย่างอยู่ที่ GitHub ของ ThepExcel:

```text
https://github.com/ThepExcel/download/blob/master/ThepExcel-Thailand-Tambon.xlsx
```

โปรเจกต์นี้เป็นเครื่องมือแปลง format เพื่อให้นำข้อมูลไปใช้ต่อได้ง่ายขึ้น ไม่ใช่แหล่งข้อมูลราชการหรือ official database โปรดตรวจสอบความถูกต้องกับแหล่งข้อมูลที่เหมาะสมก่อนใช้ในงานสำคัญ

## Extract ข้อมูลจาก XLSX

```bash
npm run extract
```

หรือระบุ path เอง:

```bash
npx thai-geo-db extract --source sources/thai-postal-codes.xlsx --table "รหัสไปรษณีย์"
```

คำสั่งนี้จะสร้าง canonical data ที่ `dist/thai-postal-codes.json`

## Build Output ทั้งหมด

```bash
npm run build:outputs
```

ไฟล์ที่สร้าง:

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

ทุกครั้งที่ใช้ `build` จะล้าง output directory เดิมก่อนสร้างไฟล์ใหม่ เพื่อไม่ให้มีไฟล์เก่าค้างอยู่ใน `dist/`

## Interactive CLI

```bash
npm run wizard
```

Wizard ใช้เลือก output format, output directory, SQL dialect, table name, column name และตัวเลือก SQL เช่น `DROP TABLE`, `CREATE TABLE`, และ `INSERT`

## DB Output Layout

ค่า default ของ DB output คือ `both` เพื่อสร้างทั้งแบบรวม table เดียว และแบบ relational

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

## ตัวอย่าง SQL แบบกำหนดชื่อ table/column

```bash
npx thai-geo-db build \
  --format postgresql \
  --table locations \
  --column-postal-code zip_code
```

ค่า default:

- Table: `thai_postal_codes`
- Columns: `id`, `province`, `district`, `subdistrict`, `postal_code`

ตัวเลือก `--table` และ `--column-*` ใช้กับไฟล์แบบรวม table เดียว ส่วนไฟล์ relational ใช้ชื่อ table มาตรฐาน `provinces`, `districts`, `subdistricts`, และ `postal_codes`

สามารถเปลี่ยนชื่อ relational table หรือ MongoDB collection ได้:

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

ข้อมูลภาษาไทยจะถูกคงไว้ตามต้นฉบับ ยกเว้นการ normalize whitespace และรหัสไปรษณีย์จะเป็น string เสมอ

## Development

```bash
npm test
```

ห้ามแก้ไฟล์ใน `dist/` ด้วยมือ ให้แก้ logic ใน `src/` แล้ว generate ใหม่

## License

MIT
