import { useState, useCallback, useEffect, useRef } from 'react';
import { api, apiPost, apiPut, apiDelete } from '../api/client';

type FleetSummary = {
  total: number;
  overdue: number;
  dueSoon: number;
  safe: number;
};

type FleetPagination = {
  page: number;
  limit: number;
  total: number;
};

export default function useFleet(
  enabled = true,
  filterText = '',
  filterStatus = 'all',
  filterLokasi = 'all',
  page = 1,
  limit = 20
) {
  const [fleet, setFleet] = useState<any[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [summary, setSummary] = useState<FleetSummary>({
    total: 0,
    overdue: 0,
    dueSoon: 0,
    safe: 0,
  });
  const [pagination, setPagination] = useState<FleetPagination>({ page, limit, total: 0 });
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifGranted, setNotifGranted] = useState(false);
  const notifiedRef = useRef(false);
  const requestIdRef = useRef(0);

  const setStatsSummary = (value: Partial<FleetSummary>) => {
    setSummary((current) => ({
      total: value.total == null ? current.total : Number(value.total) || 0,
      overdue: value.overdue == null ? current.overdue : Number(value.overdue) || 0,
      dueSoon: value.dueSoon == null ? current.dueSoon : Number(value.dueSoon) || 0,
      safe: value.safe == null ? current.safe : Number(value.safe) || 0,
    }));
  };

  const loadAll = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const errors: string[] = [];
      const params = new URLSearchParams({
        text: filterText,
        status: filterStatus,
        lokasi: filterLokasi,
        page: String(page),
        limit: String(limit),
      });
      const [vehResult, locationResult, snapResult, statsResult, reminderResult] = await Promise.allSettled([
        api(`/vehicles?${params.toString()}`),
        api('/vehicles/locations'),
        api('/snapshots'),
        api('/stats'),
        api('/reminders'),
      ]);

      if (requestId !== requestIdRef.current) return;

      if (locationResult.status === 'fulfilled') {
        setLocations(locationResult.value.locations || []);
      }

      if (vehResult.status === 'fulfilled') {
        setFleet(vehResult.value.vehicles || []);
        setPagination({
          page: Number(vehResult.value.page) || page,
          limit: Number(vehResult.value.limit) || limit,
          total: Number(vehResult.value.total) || 0,
        });
      } else {
        errors.push(
          vehResult.reason instanceof Error
            ? vehResult.reason.message
            : 'Gagal memuat data armada.'
        );
      }

      if (snapResult.status === 'fulfilled') {
        setSnapshots(snapResult.value.snapshots || []);
      }

      if (statsResult.status === 'fulfilled') {
        setStatsSummary(statsResult.value);
      } else {
        errors.push(
          statsResult.reason instanceof Error
            ? statsResult.reason.message
            : 'Gagal memuat statistik armada.'
        );
      }

      if (reminderResult.status === 'fulfilled') {
        setReminders(reminderResult.value.reminders || []);
      } else {
        errors.push(
          reminderResult.reason instanceof Error
            ? reminderResult.reason.message
            : 'Gagal memuat pengingat armada.'
        );
      }

      setError(errors[0] || null);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setHasLoaded(true);
      }
    }
  }, [filterLokasi, filterStatus, filterText, limit, page]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setHasLoaded(false);
      return;
    }
    loadAll();
  }, [enabled, loadAll]);

  const addVehicle = useCallback(
    async (data) => {
      await apiPost('/vehicles', data);
      await loadAll();
    },
    [loadAll]
  );

  const updateVehicle = useCallback(
    async (data) => {
      await apiPut('/vehicles/' + data.id, data);
      await loadAll();
    },
    [loadAll]
  );

  const deleteVehicle = useCallback(
    async (id) => {
      await apiDelete('/vehicles/' + id);
      await loadAll();
    },
    [loadAll]
  );

  const addHistory = useCallback(
    async (vehId, histEntry) => {
      await apiPost('/vehicles/' + vehId + '/history', histEntry);
      await loadAll();
    },
    [loadAll]
  );

  const deleteHistory = useCallback(
    async (vehId, histId) => {
      await apiDelete('/vehicles/' + vehId + '/history/' + histId);
      await loadAll();
    },
    [loadAll]
  );

  const importData = useCallback(
    async (incoming) => {
      const result = await apiPost('/import', { vehicles: incoming });
      await loadAll();
      return result;
    },
    [loadAll]
  );

  const toggleNotif = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('Browser ini tidak mendukung notifikasi.');
      return;
    }
    const perm = await Notification.requestPermission();
    const granted = perm === 'granted';
    setNotifGranted(granted);

    if (granted && !notifiedRef.current) {
      const { reminders: currentReminders } = await api('/reminders').catch(() => ({ reminders: [] }));
      const urgent = (currentReminders || []).filter((r) => r.status === 'red');
      if (urgent.length > 0) {
        try {
          new Notification('Armada Control 104 Group', {
            body:
              urgent.length +
              ' kendaraan terlambat perpanjangan/servis. Buka aplikasi untuk detail.',
          });
        } catch {
          /* noop */
        }
      }
      notifiedRef.current = true;
    }
  }, []);

  return {
    fleet,
    locations,
    snapshots,
    reminders,
    summary,
    pagination,
    loading,
    initialLoading: enabled && !hasLoaded,
    error,
    notifGranted,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    addHistory,
    deleteHistory,
    importData,
    toggleNotif,
    refresh: loadAll,
  };
}
