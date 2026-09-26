# Plan Implementasi Armada Control 104 Group

**Status:** Revisi UI tahap utama selesai; verification dan hardening tersisa.
**Tanggal:** 25 September 2026
**Produk:** Armada Control 104 Group

## 1. Tujuan

Menjadikan dashboard sebagai pusat operasi armada yang:

- Menampilkan kondisi kendaraan secara cepat.
- Memisahkan navigasi utama dari konten halaman.
- Memudahkan admin menangani kendaraan terlambat atau hampir jatuh tempo.
- Menjaga role `admin` dan `user` tetap berbeda.
- Responsive untuk desktop, tablet, dan mobile.
- Tidak merusak CRUD kendaraan, histori servis, import, export, reminder, user management, dan audit log.

## 2. Yang Sudah Selesai

- [x] Application shell dan navbar responsif.
- [x] Menu role-aware untuk Dashboard, Armada, Laporan, Pengguna, dan Audit Log.
- [x] User menu, logout, notification badge, dan mobile navigation.
- [x] Dashboard overview dengan greeting, status banner, statistik, quick actions, reminder, trend, dan aktivitas.
- [x] Statistik armada dengan konteks: total, terlambat, perlu perhatian, dan aman.
- [x] Quick action admin/user yang tidak membocorkan aksi mutasi ke user read-only.
- [x] Filter armada server-side dengan pagination, filter aktif, reset, dan empty state.
- [x] Detail kendaraan, histori servis, CRUD, import preview, dan duplicate validation.
- [x] Halaman laporan dengan export CSV/JSON.
- [x] Registrasi user internal langsung; akun pertama menjadi admin dan akun berikutnya menjadi user.
- [x] User management UI.
- [x] Audit log dengan pagination, loading, error, dan empty state.
- [x] Loading skeleton, error boundary, dan empty states.
- [x] Error handling pada request armada, statistik, dan reminder.
- [x] State statistik tidak lagi saling menimpa saat response parsial.
- [x] Perbaikan undefined summary values pada dashboard.
- [x] Visual dark control-room dengan contrast, focus state, reduced motion, dan scrollbar yang konsisten.
- [x] Ikon UI utama menggunakan SVG inline yang konsisten.
- [x] Label form auth/history terhubung ke input.
- [x] Error auth dan mutation memakai live region.
- [x] Delete histori memakai button keyboard-accessible.
- [x] Tabel histori memiliki overflow horizontal yang deliberate.
- [x] Reminder filter menggunakan toggle button semantics.
- [x] Menu mobile yang tertutup tidak lagi dapat difokuskan.

## 3. Struktur Aktif

```text
src/
├── App.tsx
├── components/
│   ├── AppNavbar.tsx
│   ├── AuditLogView.tsx
│   ├── DashboardActivity.tsx
│   ├── DashboardOverview.tsx
│   ├── DashboardQuickActions.tsx
│   ├── FleetView.tsx
│   ├── PageHeader.tsx
│   ├── ReminderPanel.tsx
│   ├── StatsGrid.tsx
│   ├── TrendChart.tsx
│   └── ...komponen CRUD/filter/modal
├── hooks/
│   └── useFleet.ts
└── index.css
```

State view masih menggunakan local state `activeView`. React Router baru belum diperlukan sampai shareable URL dan browser history menjadi kebutuhan produk.

## 4. File yang Dibersihkan

File berikut tidak lagi digunakan oleh aplikasi dan telah dihapus:

- `plan.md` — dokumen lama yang bertentangan dengan implementasi terbaru.
- `src/components/TopBar.tsx` — digantikan oleh `AppNavbar`.
- `src/assets/hero.png` — asset Vite/template yang tidak direferensikan.
- `src/assets/vite.svg` — asset template yang tidak direferensikan.
- `public/icons.svg` — tidak direferensikan oleh frontend.
- `server/src/utils/inviteToken.ts` dan `server/src/migrations/002_invite_tokens.sql` — invite flow tidak lagi menjadi bagian produk.

`PRD.md` tetap dipertahankan sebagai konteks produk dan keputusan bisnis. `UI_REVISION_PLAN.md` menjadi satu-satunya dokumen status implementasi UI.

## 5. Hasil Validasi Terakhir

- [x] `npm ci` berhasil dijalankan untuk dependency frontend.
- [x] `npm run lint` berhasil tanpa error dan warning.
- [x] `npm run build` berhasil.
- [x] `npm audit --omit=dev` tidak menemukan vulnerability production.
- [ ] Audit penuh dependency masih melaporkan 2 vulnerability pada dependency development (`nanoid` high dan `postcss` moderate).
- [x] `git diff --check` berhasil.
- [ ] `npx tsc --noEmit` belum lulus; masih ada error tipe existing pada frontend/backend dan konfigurasi import extension.
- [ ] Belum ada automated test suite; belum ditemukan file `*.test.*` atau `*.spec.*`.
- [x] Auth frontend berhasil dikompilasi melalui build Vite; lint auth tidak memiliki warning/error.
- [x] Auth runtime diuji melalui Docker Compose: register, login, session check, dan logout berhasil.
- [x] Backend diuji terhadap PostgreSQL melalui health check dan endpoint auth.

## 6. Perubahan Implementasi Audit

Tanggal: 25 September 2026

- Registrasi tetap direct registration; invite token UI, route, helper, dan validasi invite dihapus dari alur aktif.
- Pembuatan akun pertama menggunakan transaksi database dan advisory lock agar dua request tidak bisa menjadi admin bersamaan.
- `useFleet` menambahkan request generation guard agar response filter lama tidak menimpa response terbaru.
- Export CSV/JSON dan WhatsApp share sekarang mengambil dataset lengkap dari endpoint server.
- Endpoint export JSON juga menyertakan snapshots.
- Import preview mengambil daftar plat lengkap sebelum mendeteksi duplikasi.
- Reminder di luar halaman aktif dapat membuka detail kendaraan melalui `GET /vehicles/:id`.
- Filter lokasi memakai endpoint `/vehicles/locations`, bukan data halaman aktif.
- Form kendaraan dan histori memiliki busy/error state.
- Label form, error live region, delete histori button, dan overflow tabel sudah diperbaiki.
- Docker Compose sekarang memakai environment substitution dari `.env`.
- PostgreSQL, backend, frontend dev, dan frontend production memiliki healthcheck serta dependency readiness.
- Development frontend berjalan konsisten di port `5174`.
- Mode production dipisahkan melalui Compose profile `production`.
- `.env.example` dan `.gitignore` untuk environment Docker sudah ditambahkan.
- Docker image development, backend, dan production berhasil di-build serta diuji melalui health endpoint.

## 7. Pekerjaan yang Belum Selesai

### Prioritas tinggi

- [ ] Tambahkan automated test untuk status computation dan reminder.
- [ ] Tambahkan typecheck-specific ke pipeline (`tsc --noEmit` atau script equivalent).
- [ ] Tambahkan smoke test untuk login, dashboard, dan role access.
- [x] Jalankan lint dan build di environment dengan Node.js serta dependency terinstall.
- [ ] Verifikasi admin/user dapat menjalankan atau tidak menjalankan mutasi sesuai role.
- [x] Export/share memakai dataset lengkap dari endpoint export server, bukan hanya halaman armada aktif.
- [x] Klik pengingat di luar halaman saat ini tetap membuka detail kendaraan melalui endpoint `GET /vehicles/:id`.
- [x] Import preview mengambil daftar plat lengkap dari dataset server sebelum validasi duplikasi.
- [x] Stale-response protection menggunakan request generation guard pada `useFleet`.
- [x] Busy/error state ditambahkan pada form kendaraan dan histori servis.
- [x] Registrasi tetap direct registration; invite token UI dan endpoint invite dihapus dari alur aktif.
- [x] Lokasi filter memakai endpoint lokasi terpisah, bukan data halaman aktif.
- [ ] Finalisasi pembatasan registrasi user internal bila diperlukan.

### Prioritas menengah

- [ ] QA visual pada 1440px, 768px, dan 375px.
- [ ] QA keyboard navigation, Escape, focus return, dan visible focus.
- [ ] QA session expired, unauthorized, loading, empty, error, dan success state.
- [ ] Verifikasi pagination dan filter setelah data exceeds satu halaman.
- [ ] Verifikasi import/export dengan file contoh yang realistis.

### Prioritas rendah / fase berikutnya

- [ ] Finalisasi definisi bisnis `safe`, `amber`, dan `red`.
- [ ] Finalisasi pembatasan registrasi user internal, jika diperlukan.
- [ ] Tambahkan export PDF.
- [ ] Tambahkan scheduled reminder melalui email atau WhatsApp.
- [ ] Tambahkan WebSocket untuk notifikasi real-time.
- [ ] Dokumentasikan deployment production, backup, dan restore drill.
- [ ] Hapus atau pindahkan development secret dari konfigurasi yang dapat dipakai production.

## 8. Kriteria Selesai Tahap UI

- [ ] Dashboard dapat digunakan sebagai halaman default setelah login.
- [ ] Semua menu utama dapat diakses dengan mouse dan keyboard.
- [ ] User read-only tidak melihat atau menjalankan aksi mutasi.
- [ ] Error tidak menghapus seluruh dashboard tanpa recovery action.
- [ ] Loading, empty, error, dan unauthorized state tervalidasi.
- [ ] CRUD, histori servis, import, export, reminder, dan pagination tidak mengalami regresi.
- [ ] Lint, typecheck, build, dan smoke test lulus.
- [ ] Tidak ada secret atau data sensitif baru yang terekspos ke client.

## 9. Catatan Teknis

- `shared/fleet.ts` tetap menjadi sumber perhitungan status frontend/backend.
- Jangan menduplikasi perhitungan status di komponen dashboard.
- Gunakan semantic HTML: `header`, `nav`, `main`, `section`, dan `button` untuk action.
- Pertahankan `useFleet()` sebagai satu orchestration layer untuk data armada.
- Jangan menghapus loading skeleton saat request hanya sedang melakukan filter refresh.
- Perubahan UI harus tetap disertai review role access dan state loading/error.
