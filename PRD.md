# PRD — Armada Control 104 Group

**Status:** Draft untuk validasi stakeholder  
**Versi:** 0.1  
**Tanggal:** 25 September 2026  
**Sumber:** Observasi repository `Armada-Apps`

> Dokumen ini dibuat berdasarkan observasi langsung terhadap kode frontend, backend, database migrations, konfigurasi, dan rencana implementasi UI terbaru.

---

## 1. Ringkasan Eksekutif

**Armada Control 104 Group** adalah aplikasi operasional untuk mengelola data kendaraan, memantau masa berlaku pajak tahunan dan pajak lima tahunan, KEUR, serta jadwal servis. Aplikasi Replacement ini menggunakan React + Vite di frontend dan Express + PostgreSQL di backend.

Nilai utama produk:

1. Mengurangi keterlambatan pemeriksaan dan pajak.
2. Memberikan visibility cepat terhadap kendaraan yang aman, segera jatuh tempo, dan terlambat.
3. Menyimpan histori servis agar target_interval_service dapat dihitung.
4. Membantu admin mengelola pengguna dan data armada secara aman.

## 2. Hasil Observasi Produk Saat Ini

### Yang sudah tersedia

- Autentikasi register, login, logout, dan session check.
- Role `admin` dan `user`; role admin memiliki akses edit, user read-only.
- CRUD kendaraan dengan data:
  - merk, nomor polisi, tahun, lokasi;
  - pajak tahunan dan pajak lima tahunan;
  - KEUR;
  - odometer, interval KM, interval bulan, catatan, dan foto.
- CRUD histori servis kendaraan.
- Perhitungan status kendaraan dan reminder jatuh tempo.
- Dashboard statistik: total kendaraan, overdue, due soon, dan safe.
- Filter berdasarkan teks, status, dan lokasi.
- Trend chart snapshot status armada.
- Notifikasi browser dan opsi berbagi melalui WhatsApp.
- Impor dan ekspor JSON/CSV.
- Endpoint statistik, reminder, snapshot, audit log, dan health check.
- PostgreSQL migrations, CSRF protection, rate limiting, audit log, dan backup script.
- Dukungan Docker untuk development dan production frontend.

### Gap/risiko yang teridentifikasi

- Belum ada automated test pada root project maupun backend package.
- `UI_REVISION_PLAN.md` mencatat status implementasi UI dan pekerjaan tersisa.
- Fitur user management sudah memiliki komponen dan endpoint, tetapi komponen tersebut belum terlihat terpasang pada halaman utama `App`.
- Registrasi terbuka untuk pengguna internal. Akun pertama otomatis menjadi admin; akun berikutnya menjadi user.
- Endpoint kendaraan sudah memiliki pagination/filter server-side, tetapi `App.tsx` masih melakukan filtering dan perhitungan pada data yang diterima. Perlu dipastikan UI menggunakan paginasi dengan benar.
- Belum ada dokumentasi deployment, operating model, dan recovery backup yang mendetail.
- Secret development masih ada di konfigurasi Docker Compose dan harus tidak digunakan di production.

## 3. Masalah yang Ingin Diselesaikan

- Admin tidak memiliki satu tampilan yang cepat untuk mengetahui kendaraan bermasalah.
- Data kertas atau spreadsheet sulit ditelusuri dan mudah tidak sinkron.
- Riwayat servis dan tanggal jatuh tempo mudah terlewat.
- Perubahan data armada perlu memiliki jejak audit dan kontrol akses.
- Data armada dapat diimpor/diekspor, tetapi belum ada laporan PDF siap tanda tangan atau arsip.

## 4. Tujuan dan Metrik

### Tujuan MVP

1. Menyediakan dashboard armada yang selalu menampilkan status terkini.
2. Membantu admin menyelesaikan CRUD kendaraan dan histori servis dengan aman.
3. Menegakkan hak akses admin versus user read-only.
4. Menyediakan pengingat untuk pajak, KEUR, dan servis yang segera jatuh tempo.
5. Memastikan data dapat diimpor, diekspor, dicadangkan, dan diaudit.

### Metrik keberhasilan

| Metrik | Target awal |
|---|---:|
| Kendaraan dengan data wajib lengkap | ≥ 95% |
| Kendaraan overdue yang ditindaklanjuti | ≥ 80% dalam 7 hari |
| Waktu menemukan kendaraan terlambat | < 30 detik |
| Keberhasilan impor data valid | ≥ 99% |
| Waktu login hingga dashboard tampil | < 3 detik pada kondisi normal |
| Error API yang tidak tertangani | 0 pada alur kritis |
| Time-to-detect kegagalan health check | < 2 menit |

## 5. Pengguna dan Peran

### Admin

- Mengelola seluruh data kendaraan.
- Menambah, mengubah, dan menghapus kendaraan serta histori servis.
- Mengimpor data dan mengekspor laporan.
- Mengelola pengguna dan role.
- Melihat audit log.
- Registrasi user internal secara langsung.

### User / Viewer

- Melihat dashboard dan daftar kendaraan.
- Melihat detail kendaraan dan histori servis.
- Menggunakan filter dan reminder.
- Tidak dapat melakukan mutasi data.

### Future: Supervisor/PIC lokasi (opsional)

- Melihat kendaraan berdasarkan lokasi.
- Mengonfirmasi tindak lanjut pengingat.
- Tidak memiliki akses ke pengelolaan pengguna.

## 6. Kebutuhan Fungsional

### FR-01 — Autentikasi dan sesi

- Pengguna dapat register, login, dan logout.
- Password disimpan dalam bentuk hash.
- Session/JWT invalid mengarahkan pengguna ke halaman login.
- Error kredensial tidak membocorkan informasi apakah email terdaftar.
- Login dibatasi rate limit.
- Akun pertama menjadi admin; akun berikutnya dapat didaftarkan langsung sebagai user.

**Acceptance criteria**

- Login valid membuat sesi dan cookie autentikasi yang valid.
- Request tanpa session ke endpoint terproteksi menghasilkan `401`.
- Request mutasi dengan token CSRF yang tidak valid ditolak.
- Logout menghapus cookie autentikasi dan CSRF.

### FR-02 — Dashboard status armada

Dashboard harus menampilkan:

- jumlah total kendaraan;
- jumlah overdue;
- jumlah due soon;
- jumlah safe;
- panel reminder;
- trend status dari snapshot sebelumnya;
- tombol aksi untuk menambah kendaraan, impor, dan ekspor.

**Acceptance criteria**

- Angka dashboard konsisten dengan data kendaraan yang sedang difilter/diambil dari server.
- Reminder diurutkan berdasarkan tingkat urgensi.
- State loading, kosong, dan error memiliki UI yang jelas.

### FR-03 — Manajemen kendaraan

Admin dapat:

- membuat kendaraan baru;
- melihat daftar kendaraan;
- mencari berdasarkan merk atau plat;
- memfilter berdasarkan status dan lokasi;
- melihat detail kendaraan;
- mengubah data kendaraan;
- menghapus kendaraan dengan konfirmasi.

Validasi wajib:

- plat tidak boleh kosong dan harus unik;
- tahun, odometer, interval KM, dan interval bulan harus valid;
- tanggal validity tidak boleh diformat ambigu.

### FR-04 — Histori servis

- Admin dapat menambah histori servis pada detail kendaraan.
- Data histori mencakup tanggal, KM, dan catatan/service yang relevan.
- Status servis dihitung dari histori terbaru, interval KM, dan interval bulan.
- Admin dapat menghapus histori dengan konfirmasi.
- User hanya dapat membaca histori.

### FR-05 — Reminder dan notifikasi

- Sistem menghitung reminder pajak tahunan, pajak lima tahunan, KEUR, dan servis.
- Reminder memiliki label `red` untuk terlambat dan `amber` untuk segera jatuh tempo.
- Pengguna dapat mengaktifkan/menonaktifkan notifikasi browser.
- Pengguna dapat membuka/share ringkasan armada melalui WhatsApp.
- Notifikasi real-time melalui WebSocket adalah enhancement, bukan-blocking untuk MVP.

### FR-06 — Impor dan ekspor

- Impor menerima JSON hasil ekspor aplikasi.
- Impor harus mendeteksi duplikasi berdasarkan plat.
- Impor menampilkan jumlah data berhasil, dilewati, dan gagal.
- Ekspor mendukung JSON dan CSV dengan seluruh kolom penting.
- Data hasil ekspor dapat diimpor kembali tanpa kehilangan field yang didukung.
- Export PDF menjadi fase berikutnya dengan format laporan resmi.

### FR-07 — Manajemen pengguna

- Admin dapat melihat daftar pengguna.
- Admin dapat mengubah role `user`/`admin`.
- Admin dapat menghapus pengguna lain.
- Admin tidak dapat menghapus akunnya sendiri.
- Sistem mencegah penghapusan admin terakhir jika masih ada user aktif.
- Invite token dapat dibuat, dilihat, dan dicabut.
- Form registrasi menerima email, password, dan nama tanpa invite token.

### FR-08 — Audit dan keamanan operasional

- Request mutasi dan akses penting tercatat pada audit log.
- Audit memuat user, aksi, resource, waktu, dan hasil.
- CSRF protection berlaku pada seluruh mutasi.
- Rate limit berlaku pada login dan import.
- Health check memeriksa server dan koneksi database.
- Password/JWT secret hanya berasal dari environment variable.

### FR-09 — Backup dan pemulihan

- Backup PostgreSQL dapat dijalankan terjadwal atau manual.
- Backup menggunakan format custom `pg_dump` dan diberi timestamp.
- Backup disimpan di lokasi yang tidak tercampur dengan source code.
- Restore terdokumentasi dan diuji secara berkala.

## 7. Kebutuhan Non-Fungsional

### Security

- Password hash dengan bcrypt atau mekanisme setara.
- JWT secret acak dan panjang, tidak menggunakan secret development di production.
- Cookie autentikasi menggunakan `HttpOnly`, `Secure` di production, dan `SameSite` sesuai arsitektur.
- Input divalidasi di backend menggunakan schema terpusat.
- Tidak mengekspos data sensitif di response atau log.

### Reliability

- Endpoint health check mengembalikan status database.
- Migration harus dapat dijalankan berulang kali dengan aman atau terdokumentasi sebagai one-time migration.
- Operasi mutasi data utama harus idempotent atau memiliki handling duplikasi.

### Performance

- List kendaraan menggunakan pagination server-side.
- Query filter menggunakan index yang sesuai.
- Endpoint list untuk armada besar tidak memuat seluruh histori tanpa kebutuhan.
- Target response API reguler < 500 ms pada data normal.

### Observability

- Structured logging dengan request ID.
- Error tracking untuk exception frontend/backend.
- Metrics minimal: request count, latency, error rate, auth failure, dan jumlah reminder overdue.
- Audit log dapat dicari dan difilter.

### UX dan aksesibilitas

- Layout responsif untuk desktop dan mobile.
- Form memiliki label, fokus state, pesan error, dan loading state.
- Semua tombol icon memiliki accessible name/tooltip.
- Error boundary mencegah seluruh aplikasi menjadi blank screen.

## 8. Prioritas dan Roadmap

### Fase 0 — Hardening sebelum release

1. Tambahkan automated tests untuk status computation, auth, CRUD kendaraan, dan reminder.
2. Aktifkan dan pasang user management di UI.
3. Finalisasi kebijakan registrasi user internal.
4. Pastikan pagination/filter server-side digunakan konsisten di UI.
5. Hapus atau dokumentasikan secret development.
6. Tambahkan request ID, structured logs, dan error monitoring.
7. Dokumentasikan deployment, backup, dan restore.

### Fase 1 — MVP operasional

- Dashboard stabil.
- CRUD kendaraan dan histori servis tervalidasi.
- Reminder dan statistik akurat.
- Import/export JSON/CSV stabil.
- Role admin/user dan audit log terverifikasi.

### Fase 2 — Reporting dan collaboration

- Export PDF.
- Template laporan resmi.
- Scheduled reminder melalui email/WhatsApp.
- Filter dan laporan per lokasi.
- Konfirmasi tindak lanjut reminder.

### Fase 3 — Real-time dan automation

- WebSocket untuk notifikasi perubahan armada.
- Otomasi snapshot dan scheduled backup.
- Integrasi eksternal seperti WA Business API atau email.
- Audit report/export.

## 9. Acceptance Criteria Release

MVP dinyatakan siap digunakan jika:

1. Admin dapat login dan membuat kendaraan.
2. User dapat login dan hanya melihat data.
3. User tidak dapat melakukan mutasi melalui UI maupun API langsung.
4. Status kendaraan dan reminder dihitung konsisten antara frontend dan backend.
5. Toda kendaraan dapat ditambahkan, diedit, dihapus, dan memiliki histori servis.
6. Dashboard menampilkan statistik dan reminder yang benar.
7. Import CSV/JSON atau JSON yang didukung dapat dipakai tanpa merusak data.
8. Ekspor JSON dapat diimpor kembali dengan mempertahankan data inti.
9. Semua mutasi sensitif tercatat di audit log.
10. Health check menandakan database unavailable dengan status yang jelas.
11. Automated test kritis lulus.
12. Deployment production, backup, dan restore telah didokumentasikan dan diuji.

## 10. Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Data armada duplikat saat import | Validasi plat unik, preview, dan reporting hasil import |
| Perhitungan status berbeda antar client/server | Gunakan shared/fleet.ts dan unit test golden cases |
| Registrasi terbuka oleh mistake | Invite token wajib setelah user pertama |
| Kehilangan data | Soft delete atau arsip, backup rutin, restore drill |
| Secret production bocor | Secret manager/env production dan secret scanning |
| Dependency frontend tanpa test | Tambahkan smoke test dan E2E untuk alur kritis |
| Data terlalu besar | Pagination, index, query filter, dan batas upload |
| Perbedaan timezone tanggal validitas | Standarisasi timezone dan contract test tanggal |

## 11. Pertanyaan yang Perlu Divalidasi

1. Apakah registrasi user internal perlu dibatasi oleh role atau domain email tertentu?
2. Apakah user read-only boleh melihat audit log dan data pengguna?
3. Apakah data kendaraan boleh dihapus permanen atau perlu soft delete?
4. Apakah `foto` disimpan sebagai file eksternal, base64, atau object storage?
5. Apa definisi resmi status `amber` dan `red` per jenis pemeriksaan?
6. Apakah snapshot harian harus immutable atau dapat dihitung ulang?
7. Berapa jumlah kendaraan dan concurrency yang harus didukung?
8. Apakah export PDF perlu tanda tangan, logo, dan format legal tertentu?
9. Channel reminder resmi: browser, email, WhatsApp, atau kombinasi?
10. Siapa yang harus dapat melakukan restore backup?

## 12. Sumber Observasi

- `src/App.tsx`
- `src/context/AuthContext.tsx`
- `src/api/client.ts`
- `src/components/AppNavbar.tsx`
- `src/components/UserManagement.tsx`
- `server/src/index.ts`
- `server/src/routes/auth.ts`
- `server/src/routes/vehicles.ts`
- `server/src/routes/users.ts`
- `server/src/routes/import.ts`
- `server/src/routes/stats.ts`
- `server/src/migrations/`
- `server/src/middleware/`
- `shared/fleet.ts`
- `UI_REVISION_PLAN.md`
- `README.md`
- `docker-compose.yml`
- `package.json` dan `server/package.json`
