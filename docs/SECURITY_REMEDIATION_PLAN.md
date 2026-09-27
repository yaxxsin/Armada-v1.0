# Plan Perbaikan Security, E2E, dan ISO Readiness

**Aplikasi:** Armada Control 104 Group  
**Tanggal:** 25 September 2026  
**Status:** Draft implementasi  
**Basis:** Hasil audit backend, frontend, infrastructure, dependency, runtime smoke test, dan functional/E2E audit  
**Target utama:** Menuju release gate yang dapat direproduksi dan readiness ISO/IEC 27001:2022, bukan klaim langsung bahwa sistem telah certified.

---

## 1. Tujuan dan NON-GOALS

### Tujuan

1. Menutup release blocker pada build, typecheck, dependency, dan automated test.
2. Memperbaiki broken authorization dan broken functional flow.
3. Menguatkan authentication, session, CSRF, database privilege, dan audit trail.
4. Menyamakan perhitungan status armada antara frontend, backend, dan database.
5. Menambahkan CI/CD security gate dan test suite.
6. Menetapkan backup, restore drill, logging, monitoring, TLS, dan deployment hardening.
7. Menyediakan evidence untuk controls ISO 27001:2022 Annex A.

### Non-goals pada fase awal

- Tidak mengklaim aplikasi sudah ISO 27001 certified.
- Tidak melakukan redesign seluruh UI.
- Tidak mengganti PostgreSQL/Express/React sebelum blocker P0 selesai.
- Tidak menghapus spreadsheet lokal atau perubahan user tanpa persetujuan.

---

## 2. Severity dan Release Policy

| Severity | Arti | Release policy |
|---|---|---|
| P0 / Critical | Secret/data bocor, privilege bypass, build tidak dapat diverifikasi, backup/DR tidak ada | Harus selesai sebelum production |
| P1 / High | Broken access control, status bisnis salah, audit tidak trustworthy, tidak ada test security | Harus selesai sebelum MVP release |
| P2 / Medium | Hardening, performance, privacy, accessibility, monitoring tambahan | Completion plan dengan owner dan due date |
| P3 / Improvement | Optimization dan enhancement non-blocking | Backlog terencana |

### Release gate

Release hanya boleh berstatus `READY` jika:

```text
npm ci / frozen lockfile       PASS
npm audit --omit=dev            PASS atau disetujui risk acceptance
npm audit                       PASS atauFinding critical/high=0
npm run lint                    0 error
frontend typecheck              0 error
backend typecheck               0 error
unit tests                      PASS
integration tests               PASS
E2E critical flow               PASS
production build                PASS
container image scan            PASS
restore drill                   PASS
```

---

# 3. Dependency dan Urutan Kerja

Urutan berikut wajib dipertahankan karena beberapa phase bergantung pada phase sebelumnya.

```text
P0-A Freeze dan scope
  ↓
P0-B Build/dependency/typecheck
  ↓
P0-C Authorization dan data boundary
  ↓
P0-D Database integrity dan concurrency
  ↓
P0-E Audit, logging, security headers
  ↓
P0-F Docker, TLS, secret, backup
  ↓
P0-G Automated test dan CI/CD
  ↓
P1 H Hardening identity/session/privacy
  ↓
P1 I Performance, accessibility, monitoring
  ↓
P2 J ISO evidence, pentest, DR exercise
```

Jangan menandai phase selesai hanya karena source sudah berubah. Phase selesai jika acceptance test dan evidence tersimpan.

---

# 4. P0 — Blocking Sebelum Production

## P0-01 — Protect Docker build context dan source data

**Priority:** P0  
**Owner:** DevOps / Backend  
**ISO:** A.5.14, A.8.12, A.8.24, A.8.25

### Perubahan

1. Tambahkan ke root `.dockerignore`:

```text
.env
.env.*
!.env.example
*.xlsx
*.xls
~$*
.kilo
backups/
```

2. Pastikan hanya source frontend yang diperlukan yang masuk build context.
3. Jangan memasukkan `.env` ke image atau build cache.
4. Jangan commit spreadsheet dan file lock Excel.
5. Jika `.env` pernah masuk image, registry, CI cache, atau shared builder, rotasi seluruh credential/token.
6. Jalankan secret scan pada image history dan artifact.

### Acceptance criteria

- `docker build` tidak memiliki `.env`, `*.xlsx`, atau `~$*` dalam context/image.
- `docker history` tidak menunjukkan secret.
- Secret rotation terdokumentasi bila diperlukan.
- `git status` tidak memuat file operasional yang tidak disengaja.

---

## P0-02 — Pulihkan reproducibility build dan typecheck

**Priority:** P0  
**Owner:** Frontend / Backend  
**ISO:** A.8.8, A.8.9, A.8.25, A.8.28, A.8.29

### Perubahan

1. Reproseskan `npm ci` pada environment Windows dan Linux secara bersih.
2. Perbaiki import `read-excel-file/browser` atau pilih entry point yang kompatibel dengan Vite versi yang digunakan.
3. Pisahkan `tsconfig` frontend, backend, dan shared.
4. Tambahkan type dependencies backend yang hilang.
5. Tambahkan script:

```json
"typecheck": "tsc --noEmit",
"test": "vitest run",
"test:e2e": "playwright test"
```

Backend minimal harus memiliki:

```json
"typecheck": "tsc --noEmit",
"test": "vitest run"
```

6. Pastikan build memakai `npm ci`, bukan `npm install`, untuk production artifact.
7. Tambahkan deterministic version policy untuk Node, package manager, dan base image.

### Acceptance criteria

- `npm ci` berhasil dari lockfile.
- `npm run build` berhasil.
- Frontend dan backend typecheck 0 error.
- Tidak ada file generated atau dependency lokal yang tidak dapat direproduksi.

---

## P0-03 — Perbaiki dependency vulnerability

**Priority:** P0  
**Owner:** DevOps / Backend  
**ISO:** A.8.8, A.8.25

### Perubahan

1. Update `nanoid` sampai advisory high selesai.
2. Update `postcss` sampai advisory moderate selesai.
3. Jalankan:

```bash
npm audit
npm audit --omit=dev
```

4. Jika dependency transitive tidak bisa di-update, buat risk acceptance sementara yang berisi:
   - Package/advisory
   - Reachability analysis
   - Dampak
   - Owner
   - Tanggal remediation
   - Kontrol kompensasi jika terjadi breach
5. Tambahkan SCA ke CI.

### Acceptance criteria

- Tidak ada high/critical vulnerability tanpa exception yang disetujui.
- Moderate vulnerability memiliki owner dan due date.
- Lockfile diperbarui dan build tetap lulus.

---

## P0-04 — Perbaiki route export dan kontrak API

**Priority:** P0  
**Owner:** Frontend / Backend  
**ISO:** A.8.25, A.8.26, A.8.29

### Perubahan

Pilih satu kontrak tunggal:

- Rekomendasi: expose `GET /api/export?format=json|csv` dan update frontend; atau
- Mount export router pada path yang sama dengan frontend.

Jangan membiarkan dua kontrak berbeda aktif.

### Acceptance criteria

- `GET /api/export?format=json` unauthorized → `401`.
- `GET /api/export?format=csv` unauthorized → `401`.
- Admin valid → export JSON/CSV berhasil.
- User read-only → ditolak bila full export memang admin-only.
- Formula-like cell tetap di-escape.
- JSON export dapat di-import kembali tanpa kehilangan field yang didukung.
- WhatsApp/full-fleet lookup menggunakan endpoint yang benar.

---

## P0-05 — Terapkan authorization matrix

**Priority:** P0  
**Owner:** Backend / Product  
**ISO:** A.5.15, A.5.18, A.8.2, A.8.3

### Matrix minimum

| Endpoint | Anonymous | User | Admin |
|---|---:|---:|---:|
| Health | Ya | Ya | Ya |
| Login/register | Ya | Ya | Ya |
| Vehicle list/detail | Tidak | Ya, sesuai scope | Ya |
| Stats/reminders/snapshot | Tidak | Ya, sesuai scope | Ya |
| Vehicle create/update/delete | Tidak | Tidak | Ya |
| History create/delete | Tidak | Tidak | Ya |
| Import/odometer import | Tidak | Tidak | Ya |
| Full export | Tidak | Tidak/terbatas | Ya |
| User management | Tidak | Tidak | Ya |
| Audit log | Tidak | Tidak | Ya |

### Perubahan

1. Terapkan `requireAdmin` pada full export.
2. Tentukan apakah user memiliki akses seluruh armada atau hanya lokasi/department tertentu.
3. Jika scoped, terapkan filter di backend, bukan hanya di UI.
4. Tambahkan negative test untuk setiap endpoint mutation dan export.

### Acceptance criteria

- User tidak dapat melakukan mutation melalui UI maupun API langsung.
- User tidak dapat melakukan full export bila role tidak berwenang.
- Tidak ada data lintas lokasi/user yang terlihat tanpa izin.

---

## P0-06 — Perbaiki database integrity dan concurrency

**Priority:** P0  
**Owner:** Backend / DBA  
**ISO:** A.8.2, A.8.3, A.8.9, A.8.28

### Perubahan

1. Tambahkan unique constraint normalized plate:

```sql
CREATE UNIQUE INDEX ... ON vehicles (UPPER(TRIM(plat)));
```

2. Tangani duplicate key sebagai `409`.
3. Tambahkan idempotency key untuk create/import jika retry dapat terjadi.
4. Last-admin protection harus berjalan dalam transaction dengan row/advisory lock.
5. Pisahkan PostgreSQL migration role dan runtime role.
6. Runtime role hanya mendapat privilege terhadap schema/tabel aplikasi.
7. Tambahkan query timeout dan statement timeout.

### Acceptance criteria

- Dua request paralel dengan plat sama menghasilkan satu data dan satu conflict response yang benar.
- Dua demote admin paralel tidak dapat menghasilkan nol admin.
- Runtime compromised process tidak dapat membuat role/database/extension.
- Migration tetap repeatable.

---

## P0-07 — Perbaiki odometer import validation

**Priority:** P0  
**Owner:** Backend  
**ISO:** A.8.25, A.8.28

### Perubahan

1. Tentukan baseline berdasarkan `reading_date` terbaru, bukan nilai odometer tertinggi.
2. Update baseline ketika memvalidasi setiap row dalam batch.
3. Tetakkan aturan correction:
   - Tanggal tetap.
   - Odometer turun membutuhkan `isCorrection`.
   - `correctionReason` wajib.
4. Tolak duplicate per vehicle/date dengan contract yang jelas.
5. Tambahkan batch transaction dan conflict reporting.

### Acceptance criteria

- Reading naik normal diterima.
- Reading turun tanpa correction ditolak.
- Reading turun dengan correction valid diterima.
- Correction turun tidak memblokir pembacaan berikutnya secara salah.
- Hasil import reporting memuat inserted/skipped/failed.

---

# 5. P1 — Hardening Identity, Session, dan Audit

## P1-01 — Secure session lifecycle

**Priority:** P1  
**Owner:** Backend  
**ISO:** A.5.16, A.5.17, A.5.18, A.8.5

### Perubahan

- Tambahkan `tokenVersion` atau server-side session ID.
- Cabut token saat logout, reset password, disable account, atau suspected compromise.
- Batasi JWT algorithm secara eksplisit.
- Tambahkan issuer dan audience validation.
- Gunakan access token berumur pendek.
- Implementasikan refresh token rotation jika dibutuhkan.
- Tambahkan status account: `active`, `disabled`, `locked`, `terminated`.
- Implementasikan MFA untuk admin.

### Acceptance criteria

- JWT yang sudah logout/revoke tidak dapat digunakan.
- User yang dinonaktifkan kehilangan akses pada request berikutnya.
- Role demote langsung kehilangan privilege.
- Access/refresh token memiliki expiry dan rotation policy.

---

## P1-02 — Rate limit, brute force, dan proxy trust

**Priority:** P1  
**Owner:** Backend / DevOps  
**ISO:** A.5.17, A.8.5, A.8.16, A.8.20

### Perubahan

- Ganti `trust proxy: 1` dengan allowlist proxy eksplisit.
- Jangan membaca `x-forwarded-for` mentah.
- Gunakan `req.ip` setelah proxy policy tervalidasi.
- Tambahkan dummy bcrypt hash agar email valid/tidak valid memiliki waktu pemrosesan serupa.
- Tambahkan rate limit per normalized email hash.
- Gunakan Redis/shared store bila multi-instance.
- Tambahkan global limiter untuk endpoint mahal.

### Acceptance criteria

- Spoofed XFF tidak mengubah client IP yang dipercaya.
- Brute force terlimit per IP dan per account.
- Multi-instance memiliki rate limit yang konsisten.
- Auth failure menghasilkan metric/alert.

---

## P1-03 — Password policy

**Priority:** P1  
**Owner:** Backend  
**ISO:** A.5.17, A.8.5, A.8.24

### Perubahan

- Batasi password maksimal 72 byte bila tetap memakai bcrypt.
- Rekomendasi: migrasi ke Argon2id.
- Tambahkan password breach screening bila relevan.
- Jangan menyimpan password atau hash di log.
- Tambahkan maksimal request field size.

### Acceptance criteria

- Password berbeda setelah 72 byte tidak dianggap sama.
- Password terlalu panjang ditolak dengan jelas.
- Tidak ada credential di log/audit payload.

---

## P1-04 — Audit trail yang trustworthy

**Priority:** P1  
**Owner:** Backend / Security  
**ISO:** A.5.28, A.8.15, A.8.16, A.8.34

### Perubahan

1. Audit seluruh event penting:
   - Register/login/logout
   - Login failure
   - Authorization failure
   - Vehicle/history mutation
   - Import/export
   - Role/status change
   - Audit purge/review
2. Hapus atau batasi endpoint delete-all audit.
3. Gunakan append-only atau immutable storage.
4. Tambahkan actor snapshot, request ID, source IP tervalidasi, dan result.
5. Jangan simpan `foto`, `struk`, token, atau payload penuh.
6. Audit failure harus menghasilkan alert/metric.
7. Tambahkan retention dan legal hold policy.

### Acceptance criteria

- Aksi audit purge memiliki audit event sendiri.
- Audit write failure terdeteksi.
- User ID tidak menjadi satu-satunya identitas actor.
- Tidak ada data media/binary dalam detail audit.

---

# 6. P1 — Infrastructure, TLS, Backup, dan Observability

## P1-05 — Production Compose hardening

**Priority:** P1  
**Owner:** DevOps  
**ISO:** A.8.2, A.8.8, A.8.9, A.8.20, A.8.31

### Perubahan

- Buat compose production terpisah.
- Production hanya memakai `Dockerfile.prod` dan Nginx.
- Jangan publish PostgreSQL/backend ke host production.
- Jalankan container sebagai non-root.
- Tambahkan `read_only`, `cap_drop: [ALL]`, `tmpfs`, resource limits, dan PID limits sesuai kompatibilitas.
- Pin base image ke digest.
- Tambahkan image scan, SBOM, dan provenance.
- Jangan menjalankan `tsx`/source TypeScript sebagai runtime production.

### Acceptance criteria

- Production image tidak menjalankan Vite dev server.
- Container UID bukan root.
- Database tidak dapat diakses dari host production.
- Image scan tidak menemukan critical/high yang tidak disetujui.

---

## P1-06 — TLS dan security headers

**Priority:** P1  
**Owner:** DevOps / Backend  
**ISO:** A.8.20, A.8.24, A.8.26

### Perubahan

- TLS termination melalui reverse proxy/load balancer.
- Redirect HTTP ke HTTPS.
- HSTS setelah domain siap HTTPS.
- Tambahkan CSP.
- Tambahkan Permissions-Policy.
- Tambahkan `Cache-Control: no-store` untuk auth/me/export.
- Validasi `CLIENT_ORIGIN` harus HTTPS pada production.
- Fail fast jika `NODE_ENV` production belum dikonfigurasi.

### Acceptance criteria

- HTTP production tidak dapat digunakan untuk login.
- `Set-Cookie` production memiliki `Secure` dan `HttpOnly`.
- Header security terverifikasi di response.
- Startup production ditolak jika transport/config belum aman.

---

## P1-07 — Backup, restore, dan DR

**Priority:** P1  
**Owner:** DevOps / DBA  
**ISO:** A.8.13, A.8.14, A.5.24, A.5.28

### Perubahan

- Ganti shell interpolation `pg_dump` dengan `execFileSync` argument array.
- Backup dengan format custom.
- Enkripsi backup.
- Checksum dan validasi archive.
- Simpan minimal satu copy off-host.
- retention policy.
- immutable copy.
- restore script.
- restore runbook.
- RPO/RTO.
- restore drill berkala.

### Acceptance criteria

- Backup dapat dipulihkan ke database kosong.
- Checksum dan jumlah data tervalidasi.
- Backup failure menghasilkan alert.
- Restore drill terdokumentasi dengan waktu recovery.

---

## P1-08 — Structured logging, metrics, dan alerting

**Priority:** P1  
**Owner:** Backend / DevOps  
**ISO:** A.8.15, A.8.16, A.5.24

### Perubahan

- Structured JSON logging.
- Request ID/correlation ID.
- Redaction token/password/cookie/data URL/query sensitive.
- Metrics:
  - request count
  - latency
  - error rate
  - auth failure
  - rate-limit hit
  - DB pool
  - audit-write failure
  - backup age/status
- Alert ownership dan escalation.
- Log retention dan access control.

### Acceptance criteria

- Semua request dapat ditelusuri menggunakan request ID.
- Error log tidak membocorkan internal detail ke client atau logCollector.
- Alert dapat diuji secara manual.
- Owner dan SLA setiap alert terdokumentasi.

---

# 7. P1 — Fungsional, Test, dan Data Quality

## P1-09 — Canonical status engine

**Priority:** P1  
**Owner:** Backend / Frontend  
**ISO:** A.8.25, A.8.26, A.8.29

### Perubahan

- Gunakan satu implementasi status atau shared package yang benar-benar sama.
- Tambahkan status `unverified`/`belum diperiksa`.
- Tentukan semantics:
  - `safe`
  - `dueSoon`
  - `overdue`
  - `unverified`
- Standarisasi timezone.
- Buat golden cases untuk:
  - Tanggal null
  - Hari ke-0
  - Boundary amber
  - Leap day
  - Month-end
  - Tanggal servis sama dengan KM berbeda
  - Timezone berbeda

### Acceptance criteria

- Frontend, backend, stats, reminders, filters, dan export menghasilkan status yang sama.
- Kendaraan tanpa data tidak masuk KPI `safe`.

---

## P1-10 — Automated test suite

**Priority:** P1  
**Owner:** QA / Backend / Frontend  
**ISO:** A.8.25, A.8.29

### Test wajib

#### Unit

- Status computation.
- Date/month-end.
- Odometer correction.
- CSV formula escaping.
- Validation schema.
- Role/permission decision.

#### Integration — PostgreSQL

- Health DB up/down.
- Registration first owner.
- Invite expiry/reuse.
- Login valid/invalid.
- CSRF missing/wrong/valid.
- User/admin authorization.
- Vehicle CRUD.
- Duplicate plate concurrent.
- History ownership.
- Import transaction/rollback.
- Audit persistence.

#### Browser E2E

- Register/login.
- Session expiry.
- Logout.
- Admin create vehicle.
- User read-only.
- User mutation blocked.
- Import Excel/JSON sesuai contract.
- Export JSON/CSV.
- Audit log.
- Error/loading/empty state.
- Keyboard/focus modal.
- Responsive 320/375/768/1440.

#### Performance

- p95 API <500 ms pada dataset representatif.
- Search/pagination.
- Import 500 vehicle/5000 reading.
- Concurrent users.

### Acceptance criteria

- Tidak ada critical flow tanpa automated test.
- Negative authorization tests wajib ada.
- Test failure menghentikan deployment.

---

# 8. P1 — Frontend, Accessibility, dan Performance

## P1-11 — Form dan dialog accessibility

**Priority:** P1  
**Owner:** Frontend  
**ISO:** A.8.26, A.8.29

### Perubahan

- Gunakan semantic `<form>`.
- Tombol submit native.
- Pastikan seluruh input memiliki `id` dan label terhubung.
- Pastikan focus trap dan focus restore.
- Nested dialog harus meng-inert background dialog.
- Escape saat busy tidak menutup dialog.
- Mutation button disabled selama request.
- Tambahkan automated axe check.

### Acceptance criteria

- Form dapat submit dengan keyboard.
- Semua control memiliki accessible name.
- Tidak ada fokus pada background saat modal terbuka.
- Tidak ada horizontal overflow kritis di 320px.

---

## P1-12 — Dashboard aggregation

**Priority:** P1  
**Owner:** Frontend / Backend  
**ISO:** A.8.25, A.8.28

### Perubahan

- Jangan menghitung panel global dari halaman vehicle aktif.
- Pisahkan endpoint summary/global dari data paginated.
- Debounce search.
- Lazy-load chart/admin module.
- Optimalkan query dan index.
- Tambahkan created/updated timestamps pada DTO bila dibutuhkan activity panel.

### Acceptance criteria

- Total, location breakdown, dan activity benar ketika data lebih dari satu halaman.
- Search tidak mengirim request setiap ketikan.
- p95 terukur dan memenuhi SLA.

---

## P1-13 — Session state, request lifecycle, dan stale data

**Priority:** P1  
**Owner:** Frontend  
**ISO:** A.5.15, A.5.18, A.8.3, A.8.16, A.8.26

### Perubahan

- Gunakan `AbortController` untuk request armada, export, dan import.
- Invalidasi request lama ketika filter berubah, session berakhir, atau terjadi logout.
- Clear seluruh state sensitif pada `401` dan logout:
  - fleet
  - locations
  - snapshots
  - reminders
  - summary
  - pagination
- Jangan menandai logout berhasil hanya dari state lokal bila request server gagal.
- Tampilkan status stale/failed bila sebagian endpoint dashboard gagal.
- Jangan menggunakan `catch(() => [])` untuk endpoint yang memengaruhi keputusan bisnis.
- Standardisasi session-expiry handling dan redirect ke login.

### Acceptance criteria

- Request milik user lama tidak dapat menulis state setelah logout.
- User berikutnya tidak pernah melihat data user sebelumnya.
- Partial API failure terlihat jelas dan dapat di-retry.
- Semua request yang berjalan dapat di-cancel.

---

## P1-14 — Import Excel, odometer, dan media validation

**Priority:** P1  
**Owner:** Frontend / Backend  
**ISO:** A.8.3, A.8.6, A.8.12, A.8.25, A.8.28

### Perubahan

- Validasi ukuran file, row count, MIME, magic bytes, dimensions, dan pixel count sebelum processing.
- Bedakan `null`, `undefined`, dan empty string pada odometer.
- Cell odometer kosong tidak boleh diubah menjadi `0`.
- Tolak nilai negatif, teks non-number, dan file di luar contract.
- Batasi final data URL.
- Allowlist hanya format gambar yang disetujui; default tolak SVG.
- Simpan media di object storage privat, bukan langsung di database JSON.
- Tambahkan preview dan alasan penolakan per row.

### Acceptance criteria

- File kosong/ besar/ salah format ditolak sebelum server dipanggil.
- Odometer kosong tidak pernah tersimpan sebagai `0`.
- Foto non-image dan MIME palsu ditolak.
- Import file besar tidak membebani main thread tanpa batas.
- Server tetap menjadi sumber validasi utama.

---

## P1-15 — API client, error handling, dan media URL

**Priority:** P1  
**Owner:** Frontend  
**ISO:** A.8.16, A.8.25, A.8.26, A.8.28

### Perubahan

- Semua request, termasuk CSV export, melewati API client yang sama.
- Tambahkan timeout dan `AbortSignal`.
- Tambahkan error taxonomy:
  - `AUTH_EXPIRED`
  - `CSRF_INVALID`
  - `FORBIDDEN`
  - `VALIDATION_ERROR`
  - `NETWORK_ERROR`
  - `SERVER_ERROR`
- Jangan gunakan `Promise<any>` untuk response sensitif.
- Tambahkan runtime schema/validation untuk response kritis.
- Batasi `foto`/`struk` pada URL renderer dengan scheme/MIME allowlist.
- Hapus error handler backend yang duplikat dan jangan menampilkan raw internal error pada UI production.

### Acceptance criteria

- CSV export 401 diperlakukan sama dengan API request biasa.
- Semua request memiliki timeout.
- Error production tidak membocorkan internal detail.
- URL/data URL yang tidak diizinkan tidak dirender.
- Tidak ada dua central error handler yang bertentangan.

---

## P1-16 — Frontend accessibility dan feedback

**Priority:** P1  
**Owner:** Frontend / QA  
**ISO:** A.8.25, A.8.26, A.8.29

### Perubahan

- Tambahkan Escape handler untuk semua modal, termasuk odometer modal.
- Manage focus pada notification drawer, popover, dan user menu.
- Tambahkan keyboard navigation untuk menu.
- Hentikan focus hook dialog utama ketika nested receipt dialog aktif.
- Tambahkan `aria-invalid` dan `aria-describedby` untuk field error.
- Sediakan ringkasan textual atau tabel alternatif untuk Chart.js.
- Ganti `alert()` blocking dengan `role="status"`, `role="alert"`, atau toast accessible.
- Tambahkan test viewport 320px, 375px, 768px, 1440px, keyboard-only, dan screen reader.

### Acceptance criteria

- Semua modal dapat dibuka/diutup dengan keyboard.
- Fokus tidak keluar dari dialog.
- Error field terhubung ke input.
- Chart memiliki alternatif accessible.
- Tidak ada critical horizontal overflow pada mobile.
- Success/error feedback dapat dideteksi assistive technology.

---


## P2-01 — Security testing lifecycle

**Priority:** P2  
**Owner:** Security / DevOps  
**ISO:** A.8.8, A.8.25, A.8.29

- Tambahkan SAST.
- Tambahkan secret scanning.
- Tambahkan DAST.
- Tambahkan image scan.
- Tambahkan SBOM.
- Vulnerability SLA dan risk acceptance register.
- Penetration test minimal sebelum production dan setelah perubahan material.

## P2-02 — Data privacy dan retention

**Priority:** P2  
**Owner:** Product / Legal / Security  
**ISO:** A.5.12, A.5.34, A.8.10, A.8.12

- Data inventory.
- Data-flow map.
- Klasifikasi data.
- Retention per entity.
- Legal hold.
- Data subject access/delete process.
- Object storage untuk foto/struk.
- Field-level authorization.
- Data minimization pada export.

## P2-03 — ISMS evidence

**Priority:** P2  
**Owner:** Management / Security  
**ISO:** A.5.1–A.5.36 dan Annex A

Buat evidence repository untuk:

- Scope dan Statement of Applicability.
- Risk assessment.
- Risk treatment plan.
- Security policy.
- Access review.
- Joiner/mover/leaver.
- Change approval.
- Incident response exercise.
- Management review.
- Continual improvement.
- Internal audit.
- Management review dan corrective action.

---

# 10. Matriks Ownership dan Evidence

| Area | PIC utama | Evidence yang harus disimpan |
|---|---|---|
| Backend/API | Backend Lead | Test report, API contract, authorization matrix |
| Database | DBA/Backend | Migration log, role grants, concurrency test |
| Frontend | Frontend Lead | E2E report, accessibility report, build artifact |
| CI/CD | DevOps | Pipeline log, artifact hash, scan report |
| Security | Security/IT | Threat model, SAST/SCA/DAST/pentest |
| Backup/DR | DevOps/DBA | Backup log, checksum, restore drill report |
| Logging | Backend/DevOps | Dashboard, alert test, retention config |
| Privacy | Product/Legal | Data inventory, retention, DPA/privacy assessment |
| Release | Tech Lead/Owner | Release checklist, approval, known exceptions |

---

# 11. Definition of Done

## Security

- [ ] Tidak ada secret dalam image/cache/log.
- [ ] Tidak ada critical/high vulnerability tanpa risk acceptance.
- [ ] Role dan scope authorization tervalidasi melalui API dan browser.
- [x] Full export sesuai authorization matrix.
- [ ] Session logout/revoke tervalidasi.
- [ ] CSRF dan trusted proxy tervalidasi.
- [ ] Database runtime tidak superuser.
- [ ] Plat uniqueness dan last-admin concurrency tervalidasi.
- [ ] Audit append-only, durable, dan tidak menyimpan media.

## Functional

- [x] Build frontend lulus.
- [x] Typecheck frontend/backend lulus.
- [ ] Export JSON/CSV lulus.
- [ ] Import dan round-trip export/import lulus.
- [ ] Status `safe/due/overdue/unverified` konsisten.
- [x] Odometer correction sesuai aturan.
- [x] User mutation ditolak.
- [ ] Admin last-account invariant aman.

## Infrastructure

- [x] Production memakai static frontend.
- [ ] TLS/HSTS/CSP active.
- [ ] Container non-root.
- [ ] Image digest dan scan evidence tersedia.
- [x] Database tidak publish public.
- [ ] Backup encrypted/off-host.
- [ ] Restore drill PASS.

## ISO/Operations

- [ ] Risk assessment updated.
- [ ] Control owner dan evidence location assigned.
- [ ] Incident response test executed.
- [ ] Access review executed.
- [ ] Change approval/rollback evidence available.
- [ ] Management review performed.

---

# 12. Rekomendasi Eksekusi Pertama

Jika harus mulai dari satu sprint pertama, sprint tersebut harus berisi:

1. `P0-01` Docker context protection.
2. `P0-02` Build/typecheck recovery.
3. `P0-03` Dependency remediation.
4. `P0-04` Export contract fix.
5. `P0-05` Export authorization.
6. `P0-06` Database role, unique plate, last-admin lock.
7. `P1-10` Minimal test suite untuk auth/RBAC/CRUD/import/export.
8. `P1-07` Minimal encrypted backup dan restore drill.

Sprint tersebut harus menghasilkan **release candidate yang dapat dibuild, diuji otomatis, di-deploy ke staging, dan diaudit authorization-nya** sebelum pekerjaan P2 dimulai.
