import { useRef, useState } from 'react';
import { api } from './api/client';
import readXlsxFile, { readSheet } from 'read-excel-file/browser';
import type { ChangeEvent } from 'react';
import useFleet from './hooks/useFleet';
import { useAuth } from './context/useAuth';
import {
  shareWhatsApp,
  uid,
  DEFAULTS,
  getFullFleet,
} from './utils/helpers';
import AppNavbar from './components/AppNavbar';
import DashboardOverview from './components/DashboardOverview';
import DashboardActivity from './components/DashboardActivity';
import AuditLogView from './components/AuditLogView';
import ImportPreviewModal from './components/ImportPreviewModal';
import OdometerImportPreviewModal from './components/OdometerImportPreviewModal';
import PageHeader from './components/PageHeader';
import FleetView from './components/FleetView';
import ReminderPanel from './components/ReminderPanel';
import FleetStatusPanel from './components/FleetStatusPanel';
import FleetSummaryCard from './components/FleetSummaryCard';
import FleetBreakdownPanel from './components/FleetBreakdownPanel';
import InviteTokenCard from './components/InviteTokenCard';
import NotificationBell from './components/NotificationBell';
import VehicleFormModal from './components/VehicleFormModal';
import VehicleDetailModal from './components/VehicleDetailModal';
import SkeletonCard from './components/SkeletonCard';
import SkeletonStats from './components/SkeletonStats';
import SkeletonTable from './components/SkeletonTable';
import Login from './pages/Login';
import Register from './pages/Register';
import UserManagement from './components/UserManagement';
import ConfirmDeleteVehicleModal from './components/ConfirmDeleteVehicleModal';
import ReportView from './components/ReportView';
import type { AppView } from './components/AppNavbar';

const excelHeaderAliases: Record<string, string[]> = {
  merk: ['merk', 'model', 'merek', 'merkmodel'],
  plat: ['plat', 'platnomor', 'nomorpolat'],
  tahun: ['tahun', 'tahunkendaraan'],
  lokasi: ['lokasi', 'lokasicabang', 'cabang', 'depot'],
  pic: ['pic', 'pikendaraan', 'penanggungjawab', 'picKendaraan'],
  pajakTahunanBerlaku: ['pajaktahunanberlaku', 'pajaktahunan', 'pajakthn'],
  pajak5TahunanBerlaku: ['pajak5tahunberlaku', 'pajak5tahun', 'pajaklima tahun'],
  keurBerlaku: ['keurberlaku', 'keur'],
  intervalKm: ['intervalkm', 'intervalservis', 'intervalkm servo'],
  intervalBulan: ['intervalbulan', 'intervalservisbulan'],
  kmSekarang: ['kmsekarang', 'odometer', 'odometr', 'kmyangsekarang'],
  catatan: ['catatan', 'keterangan', 'note'],
};

function normalizeHeader(value: unknown) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function excelDate(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString().slice(0, 10);
  }
  const text = String(value ?? '').trim();
  return text ? text.slice(0, 10) : null;
}

function parseExcelVehicles(rows: any[][]) {
  if (rows.length < 2) throw new Error('File Excel harus memiliki header dan minimal satu baris data.');
  const headerIndex = new Map<string, number>();
  rows[0].forEach((header, index) => headerIndex.set(normalizeHeader(header), index));

  const valueFor = (row: any[], field: string) => {
    const aliases = excelHeaderAliases[field] || [];
    const index = aliases.map((alias) => headerIndex.get(normalizeHeader(alias))).find((value) => value !== undefined);
    return index === undefined ? null : row[index];
  };

  return rows.slice(1).map((row) => ({
    merk: String(valueFor(row, 'merk') ?? '').trim(),
    plat: String(valueFor(row, 'plat') ?? '').trim().toUpperCase(),
    tahun: String(valueFor(row, 'tahun') ?? '').trim(),
    lokasi: String(valueFor(row, 'lokasi') ?? '').trim(),
    pic: String(valueFor(row, 'pic') ?? '').trim(),
    pajakTahunanBerlaku: excelDate(valueFor(row, 'pajakTahunanBerlaku')),
    pajak5TahunanBerlaku: excelDate(valueFor(row, 'pajak5TahunanBerlaku')),
    keurBerlaku: excelDate(valueFor(row, 'keurBerlaku')),
    intervalKm: Number(valueFor(row, 'intervalKm')) || 5000,
    intervalBulan: Number(valueFor(row, 'intervalBulan')) || 6,
    kmSekarang: Number(valueFor(row, 'kmSekarang')) || null,
    catatan: String(valueFor(row, 'catatan') ?? '').trim(),
  })).filter((vehicle) => vehicle.merk || vehicle.plat);
}

function hasOdometerColumns(rows: any[][]) {
  if (rows.length === 0) return false;
  const headers = new Set(rows[0].map((header) => normalizeHeader(header)));
  const hasPlat = ['plat', 'platnomor', 'nomorpolat'].some((alias) => headers.has(normalizeHeader(alias)));
  const hasTanggal = ['tanggal', 'tanggalpembacaan', 'readingdate'].some((alias) => headers.has(normalizeHeader(alias)));
  const hasOdometer = ['odometer', 'odometerkm', 'km', 'kilometer'].some((alias) => headers.has(normalizeHeader(alias)));
  return hasPlat && hasTanggal && hasOdometer;
}

async function readOdometerSheet(file: File) {
  const sheets = await readXlsxFile(file);
  const namedSheet = sheets.find((sheet) => {
    const name = normalizeHeader(sheet.sheet);
    return name === 'odometer' || name.includes('odometer');
  });
  const fallbackSheet = sheets.length === 1 ? sheets[0] : null;
  const sheet = namedSheet || fallbackSheet;
  const availableSheets = sheets.map((item) => item.sheet).filter(Boolean).join(', ');

  if (!sheet) {
    throw new Error(`Sheet "Odometer" tidak ditemukan. Sheet tersedia: ${availableSheets || 'tidak ada'}.`);
  }
  if (!hasOdometerColumns(sheet.data)) {
    throw new Error(`Sheet "${sheet.sheet}" tidak memiliki header odometer yang valid. Gunakan kolom Plat, Tanggal, dan Odometer.`);
  }
  return sheet.data;
}

function parseOdometerRows(rows: any[][]) {
  if (rows.length < 2) throw new Error('Sheet Odometer harus memiliki header dan minimal satu baris data.');
  if (!hasOdometerColumns(rows)) {
    throw new Error('Sheet Odometer harus memiliki header Plat, Tanggal, dan Odometer.');
  }
  const headerIndex = new Map<string, number>();
  rows[0].forEach((header, index) => headerIndex.set(normalizeHeader(header), index));
  const valueFor = (row: any[], aliases: string[]) => {
    const index = aliases.map((alias) => headerIndex.get(normalizeHeader(alias))).find((value) => value !== undefined);
    return index === undefined ? null : row[index];
  };
  return rows.slice(1).map((row) => {
    const correctionValue = String(valueFor(row, ['koreksi', 'iscorrection', 'correction']) ?? '').trim().toLowerCase();
    const rawOdometer = valueFor(row, ['odometer', 'odometerkm', 'km', 'kilometer']);
    return {
      plat: String(valueFor(row, ['plat', 'platnomor', 'nomorpolat']) ?? '').trim().toUpperCase(),
      tanggal: excelDate(valueFor(row, ['tanggal', 'tanggalpembacaan', 'readingdate'])),
      odometerKm: rawOdometer === null || rawOdometer === '' ? Number.NaN : Number(rawOdometer),
      sumber: String(valueFor(row, ['sumber', 'source']) ?? 'Excel'),
      catatan: String(valueFor(row, ['catatan', 'keterangan', 'notes']) ?? '').trim(),
      isCorrection: ['true', 'ya', '1', 'correction', 'koreksi'].includes(correctionValue),
      correctionReason: String(valueFor(row, ['alasankoreksi', 'correctionreason', 'alasan']) ?? '').trim(),
    };
  }).filter((reading) => reading.plat || reading.tanggal || Number.isFinite(reading.odometerKm));
}

export default function App() {
  const { user, loading, logout } = useAuth();
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [authView, setAuthView] = useState('login');
  const [formModalVehicle, setFormModalVehicle] = useState<any>(null);
  const [detailVehicleId, setDetailVehicleId] = useState<string | null>(null);
  const [detailVehicleOverride, setDetailVehicleOverride] = useState<any>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [existingPlates, setExistingPlates] = useState<string[]>([]);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [odometerPreview, setOdometerPreview] = useState<any[] | null>(null);
  const [odometerBusy, setOdometerBusy] = useState(false);
  const [odometerError, setOdometerError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLokasi, setFilterLokasi] = useState('all');
  const [fleetPage, setFleetPage] = useState(1);
  const importInputRef = useRef<HTMLInputElement>(null);
  const odometerInputRef = useRef<HTMLInputElement>(null);

  const {
    fleet,
    locations,
    snapshots,
    reminders: serverReminders,
    summary: fleetSummary,
    pagination: fleetPagination,
    loading: fleetLoading,
    initialLoading: fleetInitialLoading,
    error: fleetError,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    addHistory,
    deleteHistory,
    importData,
    notifGranted,
    toggleNotif,
    refresh: refreshFleet,
  } = useFleet(
    Boolean(user),
    filterText,
    filterStatus,
    filterLokasi,
    fleetPage
  );

  const sessionRole = user?.role === 'admin' ? 'edit' : 'view';
  const reminders = serverReminders;
  const stats = fleetSummary;
  const { overdue, dueSoon, safe } = stats;
  const locationOptions = locations;

  const openAddForm = () => {
    setFormModalVehicle({
      id: uid(),
      merk: '',
      plat: '',
      tahun: '',
      lokasi: '',
      pic: '',
      pajakTahunanBerlaku: '',
      pajak5TahunanBerlaku: '',
      keurBerlaku: '',
      intervalKm: DEFAULTS.intervalKm,
      intervalBulan: DEFAULTS.intervalBulan,
      kmSekarang: '',
      catatan: '',
      serviceHistory: [],
      foto: null,
      _existing: false,
    });
  };

  const openEditForm = (id: string) => {
    const vehicle = fleet.find((v) => v.id === id)
      || (detailVehicleOverride?.id === id ? detailVehicleOverride : null);
    if (vehicle) setFormModalVehicle({ ...vehicle, _existing: true });
    setDetailVehicleId(null);
    setDetailVehicleOverride(null);
  };

  const handleSaveVehicle = async (data, isEditing: boolean) => {
    const { _existing, ...cleanData } = data;
    if (isEditing) await updateVehicle(cleanData);
    else await addVehicle(cleanData);
    setFormModalVehicle(null);
  };

  // Hapus kendaraan memakai dialog konfirmasi khusus (bukan confirm() bawaan)
  // karena satu hapus juga menghapus foto, riwayat servis, dan pembacaan
  // odometer secara permanen lewat ON DELETE CASCADE.
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openDeleteVehicle = (id: string) => {
    const vehicle =
      fleet.find((item) => String(item.id) === String(id))
      || (detailVehicleOverride?.id === id ? detailVehicleOverride : null);
    if (!vehicle) return;
    setDeleteError(null);
    setDeleteTarget(vehicle);
  };

  const handleDeleteVehicle = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteVehicle(deleteTarget.id);
      setDeleteTarget(null);
      setFormModalVehicle(null);
      setDetailVehicleId(null);
      setDetailVehicleOverride(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Gagal menghapus kendaraan.'
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        throw new Error('Gunakan file Excel berformat .xlsx.');
      }
      const rows = await readSheet(file);
      const incoming = parseExcelVehicles(rows);
      if (incoming.length === 0) throw new Error('Tidak ada data kendaraan yang bisa diimpor.');
      const fullFleet = await getFullFleet().catch(() => []);
      setExistingPlates(fullFleet.map((vehicle: { plat?: string | null }) => (vehicle.plat || '').toUpperCase()));
      setImportPreview(incoming);
      setImportError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal membaca file Excel.';
      setImportError(message);
      alert(`Gagal membaca file: ${message}`);
    } finally {
      event.target.value = '';
    }
  };

  const handleOdometerImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        throw new Error('Gunakan file Excel berformat .xlsx.');
      }
      const rows = await readOdometerSheet(file);
      const incoming = parseOdometerRows(rows);
      if (incoming.length === 0) throw new Error('Sheet Odometer tidak memiliki data untuk diimpor.');
      setOdometerPreview(incoming);
      setOdometerError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal membaca file odometer Excel.';
      setOdometerError(message);
      alert(`Gagal membaca file: ${message}`);
    } finally {
      event.target.value = '';
    }
  };

  const handleConfirmOdometerImport = async (readings) => {
    setOdometerBusy(true);
    setOdometerError(null);
    try {
      const result = await api('/odometer/import', {
        method: 'POST',
        body: JSON.stringify({ readings }),
      });
      setOdometerPreview(null);
      await refreshFleet();
      alert(`Odometer berhasil diperbarui. ${result.imported} pembacaan disimpan, ${result.updatedVehicles} kendaraan diperbarui.`);
    } catch (err) {
      setOdometerError(err instanceof Error ? err.message : 'Gagal mengimpor odometer.');
    } finally {
      setOdometerBusy(false);
    }
  };

  const handleConfirmImport = async (vehicles) => {
    setImportBusy(true);
    setImportError(null);
    try {
      const result = await importData(vehicles);
      const imported = Number(result?.imported) || 0;
      setImportPreview(null);
      alert(`Data armada berhasil diimpor. ${imported} kendaraan baru ditambahkan.`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Gagal mengimpor data.');
    } finally {
      setImportBusy(false);
    }
  };

  const handleNavigate = (view: AppView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openVehicleById = async (id: string) => {
    setDetailError(null);
    const localVehicle = fleet.find((vehicle) => String(vehicle.id) === String(id));
    if (localVehicle) {
      setDetailVehicleId(localVehicle.id);
      setDetailVehicleOverride(null);
      return;
    }
    try {
      const response = await api(`/vehicles/${id}`);
      setDetailVehicleOverride(response.vehicle);
      setDetailVehicleId(response.vehicle.id);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Kendaraan tidak dapat dibuka.');
    }
  };

  if (loading || (Boolean(user) && fleetInitialLoading)) {
    return (
      <div className="page-wrap">
        <SkeletonStats />
        <SkeletonTable />
        <div className="grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!user) {
    return authView === 'login' ? (
      <>
        <Login />
        <div className="auth-switch">
          Belum punya akun?{' '}
          <button className="link-btn" onClick={() => setAuthView('register')}>Buat akun</button>
        </div>
      </>
    ) : (
      <>
        <Register onRegistered={() => setAuthView('login')} />
        <div className="auth-switch">
          Sudah punya akun?{' '}
          <button className="link-btn" onClick={() => setAuthView('login')}>Masuk</button>
        </div>
      </>
    );
  }

  const detailVehicle = detailVehicleOverride
    || (detailVehicleId ? fleet.find((v) => v.id === detailVehicleId) : null);

  const handleShareWhatsApp = () => {
    void getFullFleet()
      .then((fullFleet) => shareWhatsApp(fullFleet))
      .catch((err) => alert(err.message || 'Gagal mengambil data armada.'));
  };

  const dashboard = (
    <DashboardOverview
      user={user}
      total={stats.total}
      overdue={overdue}
      dueSoon={dueSoon}
      safe={safe}
      locationCount={locationOptions.length}
      loading={fleetLoading}
      error={fleetError || detailError}
      onRetry={refreshFleet}
      canManageFleet={user?.role === 'admin'}
      onAddVehicle={openAddForm}
    >
      <div className="ops-dashboard">
        <div className="ops-dashboard__status">
          <FleetStatusPanel
            total={stats.total}
            safe={safe}
            dueSoon={dueSoon}
            overdue={overdue}
            onViewFleet={() => handleNavigate('fleet')}
          />
          <FleetSummaryCard
            total={stats.total}
            safe={safe}
            dueSoon={dueSoon}
            overdue={overdue}
            locationCount={locationOptions.length}
          />
        </div>
        <div className="ops-dashboard__bottom">
          <FleetBreakdownPanel vehicles={fleet} total={stats.total} />
          <ReminderPanel
            reminders={reminders}
            vehicles={fleet}
            onOpenVehicle={(id) => void openVehicleById(id)}
          />
          <DashboardActivity
            vehicles={fleet}
            userRole={user?.role}
            onOpenVehicle={(id) => void openVehicleById(id)}
          />
        </div>
      </div>
      {user?.role === 'admin' && <InviteTokenCard compact />}
    </DashboardOverview>
  );

  const fleetView = (
    <FleetView
      vehicles={fleet}
      totalCount={stats.total}
      locations={locationOptions}
      filters={{ text: filterText, status: filterStatus, location: filterLokasi }}
      sessionRole={sessionRole}
      loading={fleetLoading}
      error={fleetError}
      onRetry={refreshFleet}
      onSearchChange={(value) => {
        setFilterText(value);
        setFleetPage(1);
      }}
      onStatusChange={(value) => {
        setFilterStatus(value);
        setFleetPage(1);
      }}
      onLocationChange={(value) => {
        setFilterLokasi(value);
        setFleetPage(1);
      }}
      onResetFilters={() => {
        setFilterText('');
        setFilterStatus('all');
        setFilterLokasi('all');
        setFleetPage(1);
      }}
      onOpenDetail={(id) => setDetailVehicleId(id)}
      onAddVehicle={openAddForm}
      pagination={{
        page: fleetPagination.page,
        totalPages: Math.max(1, Math.ceil(fleetPagination.total / fleetPagination.limit)),
        totalResults: fleetPagination.total,
        onPageChange: (page) => setFleetPage(page),
      }}
    />
  );

  const reportsView = (
    <ReportView userRole={user?.role || null} snapshots={snapshots} />
  );

  const usersView = (
    <div className="user-management-view">
      <UserManagement />
    </div>
  );

  const auditView = (
    <AuditLogView
      userRole={user?.role || null}
      title="Audit log"
      pageSize={50}
    />
  );

  return (
    <div className="app-shell">
      <AppNavbar
        activeView={activeView}
        user={user}
        reminderCount={reminders.length}
        notificationsOpen={notificationsOpen}
        onNavigate={handleNavigate}
        onLogout={logout}
        onOpenNotifications={() => setNotificationsOpen((open) => !open)}
      />
      {notificationsOpen && (
        <div id="notification-drawer" className="notification-drawer panel-box" role="dialog" aria-modal="false" aria-label="Notifikasi dan pengingat">
          <div className="head">
            <span>Notifikasi & pengingat</span>
            <button className="close-x" onClick={() => setNotificationsOpen(false)} aria-label="Tutup notifikasi">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="body">
            <div className="list">
              {reminders.length === 0 ? (
                <div className="empty-rem">Tidak ada pengingat aktif.</div>
              ) : (
                reminders.slice(0, 5).map((reminder, index) => (
                  <button
                    className={`rem-item ${reminder.status}`}
                    key={`${reminder.plat}-${index}`}
                    onClick={() => {
                      if (reminder.vehicleId) void openVehicleById(reminder.vehicleId);
                      setNotificationsOpen(false);
                    }}
                  >
                    <span className={`dot ${reminder.status}`}></span>
                    <span className="plat">{reminder.plat}</span>
                    <span className="msg">{reminder.msg}</span>
                  </button>
                ))
              )}
            </div>
            <div className="notification-drawer__footer">
              <NotificationBell
                reminders={reminders}
                notifGranted={notifGranted}
                onToggleNotif={toggleNotif}
                onShareWhatsApp={handleShareWhatsApp}
              />
            </div>
          </div>
        </div>
      )}
      <main className="page-wrap">
        {activeView === 'dashboard' && (
          dashboard
        )}
        {activeView === 'fleet' && (
          <>
            <PageHeader
              view="fleet"
              title="Daftar kendaraan"
              description="Kelola data, masa berlaku dokumen, dan histori servis kendaraan."
              actions={user?.role === 'admin' ? (
                <>
                  <button type="button" className="btn secondary" onClick={() => importInputRef.current?.click()}>
                    Impor Excel
                  </button>
                  <button type="button" className="btn secondary" onClick={() => odometerInputRef.current?.click()}>
                    Impor Odometer
                  </button>
                </>
              ) : undefined}
              canManageFleet={user?.role === 'admin'}
              onAddVehicle={openAddForm}
            />
            {fleetView}
          </>
        )}
        {activeView === 'reports' && (
          <>
            <PageHeader
              view="reports"
              title="Laporan"
              description="Ekspor data armada dan pantau tren kondisi dari waktu ke waktu."
            />
            {reportsView}
          </>
        )}
        {activeView === 'users' && user?.role === 'admin' && (
          <>
            <PageHeader
              view="users"
              title="Pengguna"
              description="Kelola akses pengguna dan role armada."
            />
            {usersView}
          </>
        )}
        {activeView === 'audit' && user?.role === 'admin' && (
          <>
            <PageHeader
              view="audit"
              title="Audit log"
              description="Riwayat aktivitas penting pada aplikasi."
            />
            {auditView}
          </>
        )}
      </main>

      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleImportFile}
        style={{ display: 'none' }}
      />

      <input
        ref={odometerInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleOdometerImportFile}
        style={{ display: 'none' }}
      />

      {importPreview && (
        <ImportPreviewModal
          vehicles={importPreview}
          existingPlates={existingPlates}
          busy={importBusy}
          error={importError}
          onCancel={() => {
            if (!importBusy) {
              setImportPreview(null);
              setExistingPlates([]);
              setImportError(null);
            }
          }}
          onConfirm={handleConfirmImport}
        />
      )}

      {odometerPreview && (
        <OdometerImportPreviewModal
          readings={odometerPreview}
          busy={odometerBusy}
          error={odometerError}
          onCancel={() => {
            if (!odometerBusy) {
              setOdometerPreview(null);
              setOdometerError(null);
            }
          }}
          onConfirm={handleConfirmOdometerImport}
        />
      )}

      {formModalVehicle && (
        <VehicleFormModal
          vehicle={formModalVehicle}
          onSave={handleSaveVehicle}
          onDelete={openDeleteVehicle}
          onClose={() => setFormModalVehicle(null)}
        />
      )}

      {detailVehicle && (
        <VehicleDetailModal
          vehicle={detailVehicle}
          sessionRole={sessionRole}
          onClose={() => {
            setDetailVehicleId(null);
            setDetailVehicleOverride(null);
          }}
          onEdit={openEditForm}
          onDelete={openDeleteVehicle}
          onAddHistory={addHistory}
          onDeleteHistory={deleteHistory}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteVehicleModal
          plat={deleteTarget.plat || ''}
          serviceCount={deleteTarget.serviceHistory?.length || 0}
          photoCount={deleteTarget.photos?.length || 0}
          odometerCount={deleteTarget.odometerHistory?.length || 0}
          busy={deleteBusy}
          error={deleteError}
          onCancel={() => {
            if (deleteBusy) return;
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          onConfirm={handleDeleteVehicle}
        />
      )}
    </div>
  );
}
