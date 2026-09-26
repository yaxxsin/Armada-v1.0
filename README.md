# Armada Control 104 Group

Aplikasi operasional untuk mengelola armada kendaraan, masa berlaku pajak tahunan dan lima tahunan, KEUR, serta jadwal servis.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript
- Database: PostgreSQL
- Chart: Chart.js
- Deployment lokal: Docker Compose

## Menjalankan secara lokal

### Dependency

```bash
npm install
cd server && npm install && cd ..
```

### Development dengan Docker Compose

Salin konfigurasi environment terlebih dahulu:

```bash
cp .env.example .env
# Ganti placeholder BOOTSTRAP_TOKEN dan REGISTRATION_INVITE_CODE dengan nilai random.
docker compose up --build
```

Frontend tersedia di `http://localhost:5174`, backend di `http://localhost:4001`, dan PostgreSQL di port `5433`.

Untuk preview frontend production di browser:

```bash
docker compose --profile preview up --build
```

Preview frontend tersedia di `http://localhost:8081`. Service ini memakai hasil `vite build` dan Nginx, sehingga endpoint `/api` diproxy ke backend container. Pastikan `CLIENT_ORIGIN`, `JWT_SECRET`, dan credential database pada `.env` sudah dikonfigurasi.

Alias `production` tetap tersedia:

```bash
docker compose --profile production up --build
```

### Deployment production di server VM (akses via IP)

Secara default semua port di-bind ke `127.0.0.1`, jadi hanya bisa diakses dari
localhost server. Untuk dapat diakses dari IP VM, ubah `HOST_BIND` di `.env`:

```env
HOST_BIND=0.0.0.0
CLIENT_ORIGIN=http://<IP_VM>:8081
CSRF_SECURE=false
```

Lalu jalankan:

```bash
docker compose --profile production up -d --build
```

Akses `http://<IP_VM>:8081`.

Catatan:

- `HOST_BIND=0.0.0.0` hanya mengubah interface tempat port di-publish. Komunikasi
  antar container tetap lewat DNS internal Docker (`db`, `backend`), bukan IP container.
- Port database (5433) dan backend (4001) tetap di-bind ke `127.0.0.1` sehingga
  tidak terekspos ke jaringan. Pastikan tidak ada proses lain yang memakai
  `VITE_API_TARGET` atau `nginx.conf` yang mengarah ke IP container secara hardcoded.
- `CLIENT_ORIGIN` harus persis sama dengan URL di address bar, termasuk port,
  karena CORS backend memblokir origin yang tidak cocok.
- `CSRF_SECURE=false` diperlukan hanya saat memakai HTTP biasa. Jika diakses lewat
  HTTPS (misalnya di belakang reverse proxy), biarkan `true`.

#### Alternatif: reverse proxy di host

Lebih aman daripada `0.0.0.0` adalah membiarkan `HOST_BIND=127.0.0.1` dan
meneruskan port ke host pakai Nginx Proxy Manager / Caddy / Nginx di host.
Dengan begitu container tetap privat, traffic masuk lewat HTTPS, dan
`CSRF_SECURE` tetap `true`.

### Development tanpa Docker

Jalankan backend dan frontend secara terpisah:

```bash
cd server
npm run dev
```

```bash
npm run dev
```

Frontend Vite memakai konfigurasi proxy dari `vite.config.ts` untukvelopment lokal.

## Scripts frontend

```bash
npm run dev       # Development server
npm run build     # Production bundle
npm run preview   # Preview production bundle
npm run lint      # Oxlint
npm run typecheck # TypeScript frontend
```

## Environment backend

Salin `server/.env.example` menjadi konfigurasi lokal dan ganti seluruh secret development sebelum digunakan di production. Jangan commit credential, token, atau password database.

Untuk mendaftarkan user baru, admin dapat membuka menu **Pengguna** lalu memilih **Buat token**. Token bersifat sekali pakai, memiliki masa berlaku 24 jam, dan hanya ditampilkan sekali.

## Bulk import Excel

Pada halaman **Armada**, admin dapat menggunakan tombol **Impor Excel**. File yang didukung adalah `.xlsx` dengan header kolom pada baris pertama:

```text
Merk | Plat | Tahun | Lokasi | PIC | Pajak Tahunan Berlaku | Pajak 5 Tahun Berlaku | Keur Berlaku | Interval KM | Interval Bulan | Odometer | Catatan
```

`Merk` dan `Plat` wajib diisi. Import selalu menambahkan data baru dan melewati plat yang sudah terdaftar.

Untuk import odometer, gunakan sheet bernama **Odometer** (nama sheet tidak sensitif terhadap huruf besar-kecil). Jika workbook hanya memiliki satu sheet, sheet tersebut juga dapat digunakan otomatis. Header yang diperlukan:

```text
Plat | Tanggal | Odometer | Sumber | Catatan | Koreksi | Alasan Koreksi
```

`Tanggal` menggunakan format `YYYY-MM-DD`. Odometer yang lebih kecil dari pembacaan sebelumnya hanya dapat diimpor jika `Koreksi` diisi `Ya` dan alasan koreksi tersedia.

## Foto kendaraan

Setiap kendaraan dapat menyimpan hingga **4 foto** dari sudut berbeda (depan, samping, belakang, interior).

- Form tambah/edit kendaraan menerima beberapa file sekaligus.
- Foto pertama pada daftar menjadi **foto utama** dan dipakai pada kartu armada.
- Tombol `Utama` pada thumbnail memindahkan foto tersebut menjadi foto utama.
- Detail kendaraan menampilkan galeri dengan strip thumbnail dan navigasi `Sebelumnya` / `Berikutnya`.
- Semua foto dikompres di browser (JPEG, lebar maksimal 960 px) dan disimpan pada kolom `vehicles.photos` (JSONB).
- Batas server: maksimal 4 foto per kendaraan, maksimal 500.000 karakter per foto. Foto yang melebihi batas otomatis dikompres ulang sebelum disimpan.

Foto struk service tetap terpisah dan hanya bisa ditambahkan lewat halaman detail kendaraan pada tabel riwayat servis.

## Laporan

Halaman **Laporan** menyediakan pratinjau dan unduhan laporan armada. Semua pengguna dapat melihat pratinjau, tetapi hanya admin yang dapat mengunduh berkas.

### Filter

- **Pencarian** — plat, merk, lokasi, atau PIC
- **Lokasi** — satu lokasi atau semua lokasi
- **Status** — semua, terlambat, perlu perhatian, aman, atau perlu tindakan
- **Urutan** — paling mendesak, plat, lokasi, atau odometer tertinggi

### Export Excel (`.xlsx`) — rekomendasi

Workbook berisi 6 sheet, masing-masing dengan header beku, autofilter, dan lebar kolom yang disesuaikan:

| Sheet | Isi |
| --- | --- |
| `Ringkasan` | Metadata laporan, total armada, distribusi status, kepatuhan per aspek |
| `Rincian Kendaraan` | Tabel utama 35 kolom |
| `Tindakan Prioritas` | Kendaraan tidak aman dengan rincian isu per aspek |
| `Per Lokasi` | Ringkasan dan baris `TOTAL` |
| `Riwayat Servis` | Satu baris per riwayat servis |
| `Riwayat Odometer` | Satu baris per pembacaan odometer |

Kolom A–L pada sheet `Rincian Kendaraan` memakai urutan dan nama header yang sama persis dengan template import Excel, sehingga hasil laporan dapat disunting di Excel dan diimpor kembali. Kolom M dan seterusnya hanya untuk analisis dan akan diabaikan saat import.

Nilai numerik ditulis sebagai tipe angka (bukan teks) dengan format pemisah ribuan, dan tanggal ditulis sebagai teks `YYYY-MM-DD` agar konsisten dengan format import.

Writer XLSX dibuat sendiri di `server/src/services/xlsxWriter.ts` tanpa dependensi eksternal, karena pustaka spreadsheet yang tersedia saat ini membawa advisory keamanan pada dependency tree-nya.

### Export PDF

Template PDF resmi berisi:

1. **Sampul** — judul, periode, kartu ringkasan status, dan metadata laporan
2. **Ringkasan eksekutif** — total kendaraan, total odometer, total biaya servis, grafik kepatuhan per aspek
3. **Ringkasan per lokasi** — total, aman, perlu perhatian, terlambat per lokasi
4. **Rincian kendaraan** — plat, merk, lokasi, PIC, pajak, keur, odometer, dan status
5. **Daftar tindakan prioritas** — hanya kendaraan yang tidak aman, diurutkan paling mendesak
6. **Riwayat servis** — tanggal, KM, jenis, bengkel, dan biaya
7. **Riwayat odometer** — pembacaan per kendaraan beserta penanda koreksi

Setiap halaman memiliki footer dengan nomor halaman dan penanda internal dokumen.

### Export CSV

CSV disusun sebagai **satu grid persegi penuh**: seluruh baris memiliki jumlah kolom yang sama sehingga tidak terpecah atau bergeser saat dibuka di Excel. Baris yang lebih pendek otomatis dilengkapi sel kosong.

Struktur:

```text
LAPORAN ARMADA 104 GROUP
Tanggal Laporan | 2026-09-25
Waktu Dibuat | 25 September 2026 14:30 WIB
Total Armada | 42
...
(blank)
RINGKASAN PER LOKASI
Lokasi | Total | Aman | Perlu Perhatian | Terlambat | Total Odometer (km) | Total Biaya Servis
...
(blank)
RINCIAN KENDARAAN
Kolom 1-12 sesuai template import Excel. Kolom 13+ hanya untuk analisis.
Merk | Plat | Tahun | Lokasi | PIC | Pajak Tahunan Berlaku | ... | Dibuat Pada
```

Baris `Rincian Kendaraan` disusun dalam dua blok:

**Blok 1 — sama persis dengan template import Excel**, sehingga hasil laporan dapat disunting di Excel lalu diimpor kembali:

```text
Merk | Plat | Tahun | Lokasi | PIC | Pajak Tahunan Berlaku | Pajak 5 Tahun Berlaku | Keur Berlaku | Interval KM | Interval Bulan | Odometer | Catatan
```

**Blok 2 — kolom analisis tambahan** (hanya untuk dibaca, diabaikan saat import):

```text
Status Keseluruhan | Pajak Tahunan Status | Pajak Tahunan Sisa Hari | Pajak 5 Tahun Status |
Pajak 5 Tahun Sisa Hari | Keur Status | Keur Sisa Hari | Servis Terakhir | Servis Terakhir KM |
Servis Terakhir Jenis | Servis Terakhir Bengkel | Servis Terakhir Biaya | Servis Berikutnya Tanggal |
Servis Berikutnya KM | Sisa KM Servis | Servis Status | Servis Sisa Hari | Jumlah Riwayat Servis |
Total Biaya Servis | Jumlah Pembacaan Odometer | Odometer Terakhir (Tanggal) | Jumlah Foto |
Dibuat Pada
```

Berkas CSV memakai BOM UTF-8, pemisah koma, akhir baris CRLF, dan seluruh sel diapit tanda kutip. Nilai yang diawali `=`, `+`, `-`, atau `@` diberi awalan kutip tunggal agar tidak dieksekusi sebagai formula spreadsheet.

Bila butuh tabel terpisah per topik dengan filter dan beku header, gunakan **Export Excel** sebagai gantinya.

### Endpoint

```text
GET /api/reports/fleet                        # pratinjau (semua pengguna)
GET /api/reports/fleet/export?format=xlsx      # workbook 6 sheet (admin)
GET /api/reports/fleet/export?format=pdf       # laporan cetak (admin)
GET /api/reports/fleet/export?format=csv       # dataprocessing (admin)
GET /api/reports/fleet?lokasi=&scope=&sort=&text=
POST /api/reports/fleet/snapshot               # catat komposisi status hari ini
```

Format di luar `xlsx`, `pdf`, dan `csv` otomatis ditolak dan jatuh ke `pdf`.

Ekspor JSON yang sebelumnya tersedia sudah dihapus. Gunakan Export Excel bila membutuhkan format yang dapat diproses ulang.

### Pengujian render

```bash
cd server
npm run test:report          # 3 kendaraan
npx tsx scripts/test-report.ts 20   # 60 kendaraan
```

Skrip membuat CSV, PDF, dan XLSX dari data sintetis, memvalidasi header PDF, jumlah halaman, dan kelengkapan EOF, lalu memverifikasi keenam sheet XLSX dengan parser Excel yang independen.

## Struktur utama

- `src/App.tsx` — application shell dan routing view lokal.
- `src/components/` — komponen UI dashboard, armada, modal, laporan, dan admin.
- `src/components/ReportView.tsx` — pratinjau laporan, filter, dan tombol ekspor.
- `src/hooks/useFleet.ts` — orchestration data armada dan mutasi CRUD.
- `src/api/client.ts` — API client dan CSRF handling.
- `server/src/` — backend, middleware, migrations, dan routes.
- `server/src/services/reportService.ts` — pengumpulan data laporan, filter, dan agregasi.
- `server/src/services/reportXlsx.ts` — workbook 6 sheet untuk Excel.
- `server/src/services/xlsxWriter.ts` — writer OOXML/ZIP minimal tanpa dependensi.
- `server/src/services/reportPdf.ts` — template PDF laporan.
- `server/src/services/reportCsv.ts` — ekspor CSV laporan.
- `server/src/services/reportFormat.ts` — helper format teks bersama (tanpa dependensi database).
- `server/scripts/test-report.ts` — smoke test render PDF, CSV, dan XLSX.
- `shared/fleet.ts` — perhitungan status armada yang dipakai bersama.
- `PRD.md` — konteks produk dan requirements.
- `UI_REVISION_PLAN.md` — status implementasi UI dan pekerjaan yang tersisa.

## CatatanProduksi

Build production frontend memakai `Dockerfile.prod` dan dilayani oleh `nginx.conf`. Gunakan secret manager atau environment injection untuk `JWT_SECRET`, credential database, dan konfigurasi production lainnya. Jangan memakai secret development pada deployment production.
