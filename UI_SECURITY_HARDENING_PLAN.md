# UI & Security Hardening Plan

Status: Draft untuk implementasi  
Scope: Frontend React, backend Express/PostgreSQL, Docker Compose, import/export, user management

## Tujuan

Menyelesaikan temuan audit UI dan security tanpa mengubah fungsi bisnis utama. Fokusnya adalah keamanan akses armada, kredensial, mutation state, focus/accessibility, serta konsistensi tombol dan notifikasi.

## Ringkasan prioritas

| Prioritas | Area | Target |
|---|---|---|
| P1 | Registrasi & bootstrap | Hanya admin/invitation yang dapat membuat akun |
| P1 | JWT authorization | Role dan status user selalu dicek dari database |
| P1 | Async error handling | Request invalid/database error tidak boleh mematikan API |
| P1 | Docker exposure | PostgreSQL dan backend tidak publish publik |
| P1 | Modal interaction | Focus trap, focus restore, disable mutation saat busy |
| P1 | Reminder detail | Tombol Buka selalu membuka detail atau menampilkan error |
| P1 | User management | Cegah admin menurunkan role dirinya sendiri |
| P2 | Import & export | Schema limit, transaction, CSV formula protection |
| P2 | Notification & export | Busy state, count konsisten, popup blocking fallback |
| P2 | Form & loading | Semantic form, Enter submit, dashboard refresh state |
| P2/P3 | UI polish | Error announcements, touch targets, misleading click affordance |

## Tahap 1 — Security P1

### 1. Mengganti public registration

File:
- `server/src/routes/auth.ts`
- `src/pages/Register.tsx`
- `src/App.tsx`
- `server/src/routes/users.ts`

Perubahan:
- Tambahkan invitation token atau registration code.
- Hapus auto-register user pertama sebagai admin.
- Sediakan bootstrap owner melalui CLI/secret deployment.
- Batasi user baru sampai di-approve admin.
- Jangan mengekspos data sensitif sebelum approval.

Acceptance criteria:
- Request tanpa invitation ditolak `403`.
- Registrasi pertama yang publik tidak dapat menjadi admin.
- Admin dapat membuat invitation dan mencabut invitation.

### 2. Membatalkan role dari JWT lama

File:
- `server/src/middleware/auth.ts`
- `server/src/utils/auth.ts`
- `server/src/routes/auth.ts`
- `server/src/routes/users.ts`

Perubahan:
- `requireAuth` mencari user berdasarkan subject/token user ID.
- Ambil role terbaru dari database dan pasang pada `req.user`.
- Tolak user yang sudah dihapus atau nonaktif.
- Tambahkan `tokenVersion` atau session revocation untuk invalidated token.
- Persingkat access token dan gunakan refresh token yang dapat direvoke bila diperlukan.

Acceptance criteria:
- User yang dihapus tidak bisa memakai JWT lama.
- Admin yang diturunkan kehilangan akses admin pada request berikutnya.
- Logout membatalkan token/session sesuai kebijakan.

### 3. Menambahkan async error boundary Express

File:
- `server/src/index.ts`
- seluruh `server/src/routes/*.ts`

Perubahan:
- Buat `asyncHandler`.
- Validasi ID route sebagai positive integer.
- Tambahkan terminal error handler empat argumen.
- Jangan mengembalikan raw database error ke client.
- Log query ID dan metadata aman, bukan seluruh parameter sensitif.

Acceptance criteria:
- `GET /api/vehicles/not-an-integer` menghasilkan response 4xx, bukan crash.
- Error database berulang tidak menghentikan process.
- Password hash, token, dan query parameters tidak masuk log.

### 4. Mengunci Docker exposure

File:
- `docker-compose.yml`
- `nginx.conf`
- server Dockerfile jika diperlukan

Perubahan:
- Hapus publish `POSTGRES_PORT` dari default production.
- Backend hanya berada di internal Compose network.
- development yang membutuhkan akses lokal memakai bind `127.0.0.1`.
- Production hanya publish frontend/reverse proxy.
- Tambahkan security headers dan TLS di edge production.

Acceptance criteria:
- PostgreSQL tidak dapat diakses dari host tanpa bind eksplisit.
- Backend tidak dapat diakses langsung dari browser production.
- API hanya tersedia melalui proxy yang dikonfigurasi.

## Tahap 2 — UI P1

### 5. Shared dialog focus management

File:
- `src/components/VehicleFormModal.tsx`
- `src/components/VehicleDetailModal.tsx`
- `src/components/ImportPreviewModal.tsx`
- component/hook baru, misalnya `src/hooks/useDialogFocus.ts`

Perubahan:
- Simpan elemen pemicu saat modal dibuka.
- Fokus heading atau control pertama yang meaningful.
- Trap Tab/Shift+Tab.
- Tandai background inert jika memungkinkan.
- Kembalikan fokus ke trigger saat modal ditutup.
- Escape tidak menutup dialog ketika mutation sedang berjalan.

Acceptance criteria:
- Keyboard tidak dapat fokus ke control di belakang overlay.
- Focus kembali ke tombol pemicu.
- Escape tidak menutup modal saat request mutation berjalan.

### 6. Memperbaiki status mutation pada vehicle dialog

File:
- `src/components/VehicleFormModal.tsx`
- `src/components/VehicleDetailModal.tsx`

Perubahan:
- Pisahkan state `saving`, `deleting`, `addingHistory`, `deletingHistory`.
- Disable tombol Tutup/Edit/Hapus/Delete selama mutation aktif.
- Cegah mutation ganda dan request bersamaan.
- Tampilkan label yang jujur, misalnya `Menyimpan…`.

### 7. Memperbaiki label form dan semantic form

File:
- `src/components/VehicleFormModal.tsx`
- `src/components/VehicleDetailModal.tsx`

Perubahan:
- Tambahkan `id` dan `htmlFor` untuk seluruh input.
- Tambahkan `required`, `aria-invalid`, dan `aria-describedby` sesuai validasi.
- Bungkus form vehicle dan history dengan `<form>`.
- Gunakan `type="submit"` pada tombol utama.

Acceptance criteria:
- Klik label fokus ke input yang benar.
- Enter pada input Field menjalankan action yang diharapkan.
- Error field terhubung secara semantik ke input.

### 8. Menjamin tombol Buka reminder selalu bekerja

File:
- `src/App.tsx`
- `src/components/ReminderPanel.tsx`

Perubahan:
- Cari vehicle di data lokal.
- Jika tidak ditemukan, fetch `/vehicles/:id`.
- Isi `detailVehicleOverride` bila diperlukan.
- Tampilkan error jika vehicle tidak ditemukan atau request gagal.

Acceptance criteria:
- Tombol Buka tidak pernah menjadi no-op diam-diam.
- Error dapat dipulihkan dengan tombol retry atau memahami bahwa vehicle tidak tersedia.

### 9. Mencegah admin self-demotion

File:
- `server/src/routes/users.ts`
- `src/components/UserManagement.tsx`
- `src/App.tsx`

Perubahan:
- Backend menolak perubahan role akun sendiri.
- Frontend menerima current user ID.
- Disable role control untuk akun aktif.
- Role change wajib memiliki konfirmasi yang menyebutkan user dan role tujuan.
- Tolak perubahan yang membuat tidak ada admin aktif.

## Tahap 3 — Security dan UX P2

### 10. Hardening import JSON

File:
- `server/src/routes/import.ts`
- `src/App.tsx`
- `src/middleware/validate.ts`

Perubahan:
- Gunakan `z.array(vehicleSchema).max(...)`.
- Validasi seluruh payload sebelum insert.
- Gunakan transaction agar tidak ada partial import.
- Batch insert untuk payload besar.
- Batasi ukuran field dan jumlah record.
- Tambahkan error recovery dan retry.

### 11. Proteksi CSV formula injection

File:
- `server/src/routes/import.ts`

Perubahan:
- Escape cell yang diawali `=`, `+`, `-`, `@`, tab, atau carriage return.
- Pertahankan format CSV tetap valid.
- Tambahkan test untuk formula injection.

### 12. Registration/login limiter dan proxy trust

File:
- `server/src/routes/auth.ts`
- `server/src/index.ts`
- `docker-compose.yml`

Perubahan:
- Tambahkan rate limiter khusus registration.
- Batasi registration berdasarkan IP + normalized email.
- Set `trust proxy` hanya untuk jumlah proxy hop yang dipercaya.
- Jangan publish backend langsung ke host.
- Jika memakai banyak replica, gunakan shared rate-limit store.

### 13. Cookie dan session policy

File:
- `server/src/utils/auth.ts`
- `server/src/middleware/csrf.ts`
- `docker-compose.yml`

Perbaikan:
- Tetapkan perbedaan environment development dan production secara eksplisit.
- Production hanya memakai HTTPS.
- `Secure` cookie wajib aktif di production.
- Jangan silently fallback ke cookie non-secure.
- Tambahkan CSRF protection pada logout bila diperlukan.

### 14. Notification behavior

File:
- `src/App.tsx`
- `src/components/AppNavbar.tsx`
- `src/components/NotificationBell.tsx`
- `src/hooks/useFleet.ts`

Perubahan:
- Gunakan satu sumber count untuk navbar, bell, dan drawer.
- Tambahkan `aria-expanded` dan `aria-controls` pada bell.
- Tampilkan “Lihat semua pengingat”.
- Jika permission sudah granted, tampilkan disabled status.
- Sesuaikan copy dengan behavior: ongoing monitoring atau kirim sekali.
- Tambahkan Escape/outside click untuk drawer.

### 15. Export dan WhatsApp busy state

File:
- `src/App.tsx`
- `src/components/NotificationBell.tsx`
- `src/utils/helpers.ts`

Perubahan:
- Disable aksi ketika request berjalan.
- Buka popup WhatsApp secara sinkron sebelum fetch.
- Tampilkan fallback jika popup diblokir.
- Jangan允允 user memicu export berulang tanpa progress state.

## Tahap 4 — UI Hardening P2/P3

### 16. Dashboard loading

File:
- `src/App.tsx`
- `src/components/DashboardOverview.tsx`

Perubahan:
- Pass `loading={fleetLoading}`.
- Tambahkan `aria-busy`.
- Bedakan initial load vs refresh tanpa menghapus data lama.

### 17. User management recovery

File:
- `src/components/UserManagement.tsx`

Perubahan:
- Tambahkan `busyUserId` dan operation state.
- Disable conflicting controls.
- Preserve table saat request gagal.
- Tampilkan `role="alert"` dan tombol Coba lagi.
- Ignore stale reload response.

### 18. Error announcements dan semantics

File:
- `src/components/ImportPreviewModal.tsx`
- `src/components/ReminderPanel.tsx`
- `src/index.css`

Perubahan:
- Tambahkan `role="alert"` pada import error.
- Tambahkan `role="group"` pada reminder filter.
- Hapus `cursor: pointer` dari `.panel-box .head`.
- Gunakan class khusus untuk header yang benar-benar interaktif.

### 19. Responsive dan touch targets

File:
- `src/components/UserManagement.tsx`
- `src/components/VehicleFormModal.tsx`
- `src/index.css`

Perubahan:
- Ubah user row dan photo controls menjadi wrapping/grid.
- Truncate atau wrap email/name dengan benar.
- Pastikan target penting minimal 44×44px.
- Uji viewport 320px, 390px, 768px, dan desktop.

## Security hygiene

- Tambahkan `backups/` ke `.gitignore` dan `.dockerignore`.
- Jangan log password hash, JWT, atau parameter query.
- Tambahkan security headers/CSP minimal di edge.
- Jalankan container sebagai non-root bila kompatibel.
- Validasi protocol/size `foto`.
- Update dependency development yang punya audit finding.
- Jalankan `npm audit --omit=dev`, build frontend, dan backend test sebelum release.

## Verification checklist

### Security
- [x] User tanpa invitation tidak bisa register.
- [ ] Registrant pertama tidak otomatis menjadi admin.
- [x] User yang dihapus/didemote kehilangan akses pada request berikutnya.
- [x] Invalid route ID tidak/crash API.
- [x] PostgreSQL tidak publish publik.
- [x] Backend tidak bisa diakses langsung dari host production.
- [x] Import memvalidasi seluruh payload dan berjalan atomik.
- [x] CSV formula dinetralkan.
- [x] Health endpoint tidak membocorkan detail database.
- [ ] Log tidak memuat secret/query parameter sensitif.

### UI
- [ ] Semua modal memiliki focus trap dan focus restore.
- [x] Escape tidak menutup modal saat busy.
- [x] Mutation button disabled selama request.
- [ ] Form dapat submit dengan Enter.
- [x] Tombol Buka reminder selalu membuka detail atau menampilkan error.
- [x] Admin tidak bisa self-demote.
- [x] User management memiliki busy/retry/error state.
- [x] Notification count konsisten.
- [x] Dashboard menampilkan refresh loading state.
- [ ] Import error dan reminder filter memiliki semantics yang benar.
- [ ] Tidak ada dead click affordance pada header panel.
- [ ] Tidak ada horizontal overflow pada 320px.

## Release gate

Sebelum release:

```bash
npm run build
npm run lint
npm audit --omit=dev
```

Backend juga harus menjalankan migration check, route test, auth test, dan smoke test melalui Docker Compose preview.
