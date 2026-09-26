import { useState } from 'react';
import Toolbar from './Toolbar';
import VehicleGrid from './VehicleGrid';
import EmptyState from './EmptyState';
import SkeletonCard from './SkeletonCard';

export type FleetFilters = {
  text: string;
  status: string;
  location: string;
};

export type FleetPagination = {
  page: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (page: number) => void;
};

export type FleetViewVehicle = {
  id: string;
  [key: string]: unknown;
};

export type FleetViewProps = {
  vehicles: FleetViewVehicle[];
  totalCount?: number;
  locations?: string[];
  filters?: FleetFilters;
  sessionRole?: 'edit' | 'view';
  loading?: boolean;
  error?: string | null;
  onSearchChange?: (value: string) => void;
  onStatusChange?: (value: string) => void;
  onLocationChange?: (value: string) => void;
  onResetFilters?: () => void;
  onOpenDetail: (vehicleId: string) => void;
  onAddVehicle?: () => void;
  pagination?: FleetPagination;
  onRetry?: () => void;
};

const defaultFilters: FleetFilters = { text: '', status: 'all', location: 'all' };
const styles = `
  .ac-fleet { min-width: 0; }
  .ac-fleet__summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    color: var(--text-dim);
    font-size: 11px;
  }
  .ac-fleet__summary strong { color: var(--text); }
  .ac-fleet__filters { margin-bottom: 14px; }
  .ac-fleet__filters-toggle { display: none; }
  .ac-fleet__error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
    padding: 12px 14px;
    border: 1px solid var(--red);
    border-radius: 8px;
    background: var(--red-dim);
    color: var(--red);
    font-size: 12px;
  }
  .ac-fleet__error button { border: 0; background: transparent; color: inherit; font-weight: 700; cursor: pointer; }
  .ac-fleet__error button:focus-visible,
  .ac-fleet__filters-toggle:focus-visible,
  .ac-fleet__pager button:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
  .ac-fleet__loading { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .ac-fleet__empty { border: 1px dashed var(--border); border-radius: var(--radius); background: var(--panel); }
  .ac-fleet__pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 20px;
  }
  .ac-fleet__pager span { min-width: 105px; color: var(--text-dim); font: 10px 'JetBrains Mono', monospace; text-align: center; }
  .ac-fleet__pager button:disabled { opacity: 0.4; cursor: not-allowed; }
  @media (max-width: 768px) {
    .ac-fleet__loading { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  }
  @media (max-width: 600px) {
    .ac-fleet__summary { align-items: flex-start; }
    .ac-fleet__filters-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 8px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--panel2);
      color: var(--text);
      font: 600 12px 'Inter', sans-serif;
      cursor: pointer;
    }
    .ac-fleet__filters-toggle span:last-child { color: var(--text-dim); }
    .ac-fleet__filters-content { display: none; }
    .ac-fleet__filters-content[data-open='true'] { display: block; }
  }
  @media (max-width: 480px) { .ac-fleet__loading { grid-template-columns: 1fr; } }
`;

export default function FleetView({
  vehicles,
  totalCount = vehicles.length,
  locations = [],
  filters = defaultFilters,
  loading = false,
  error = null,
  onSearchChange,
  onStatusChange,
  onLocationChange,
  onResetFilters,
  onOpenDetail,
  pagination,
  onRetry,
}: FleetViewProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const activeFilterCount = [
    filters.text.trim().length > 0,
    filters.status !== 'all',
    filters.location !== 'all',
  ].filter(Boolean).length;
  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <section className="ac-fleet" aria-label="Memuat daftar armada" aria-busy="true">
          <div className="ac-fleet__loading">
            {Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} />)}
          </div>
        </section>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{styles}</style>
        <section className="ac-fleet">
          <div className="ac-fleet__error" role="alert">
            <span>{error}</span>
            {onRetry && <button type="button" onClick={onRetry}>Coba lagi</button>}
          </div>
        </section>
      </>
    );
  }

  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const resultCount = pagination?.totalResults ?? vehicles.length;
  const canReset = activeFilterCount > 0 && Boolean(onResetFilters);

  const handleReset = () => {
    onResetFilters?.();
    setMobileFiltersOpen(false);
  };

  return (
    <>
      <style>{styles}</style>
      <section className="ac-fleet" aria-labelledby="fleet-results-title">
        <div className="ac-fleet__summary">
          <span id="fleet-results-title" aria-live="polite">
            Menampilkan <strong>{resultCount}</strong> dari <strong>{totalCount}</strong> kendaraan
            {activeFilterCount > 0 && ` · ${activeFilterCount} filter aktif`}
          </span>
        </div>

        <div className="ac-fleet__filters">
          <button
            type="button"
            className="ac-fleet__filters-toggle"
            onClick={() => setMobileFiltersOpen((open) => !open)}
            aria-expanded={mobileFiltersOpen}
            aria-controls="fleet-filters"
          >
            <span>Filter armada</span>
            <span>{activeFilterCount > 0 ? `${activeFilterCount} aktif` : 'Semua data'} {mobileFiltersOpen ? '▴' : '▾'}</span>
          </button>
          <div className="ac-fleet__filters-content" id="fleet-filters" data-open={mobileFiltersOpen}>
            <Toolbar
              filterText={filters.text}
              filterStatus={filters.status}
              filterLokasi={filters.location}
              lokasiList={locations}
              onSearchChange={onSearchChange || (() => undefined)}
              onStatusChange={onStatusChange || (() => undefined)}
              onLokasiChange={onLocationChange || (() => undefined)}
            />
            {canReset && (
              <button type="button" className="link-btn" onClick={handleReset}>
                Reset semua filter
              </button>
            )}
          </div>
        </div>

        {totalCount === 0 ? (
          <div className="ac-fleet__empty">
            <EmptyState hasFleet={false} />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="ac-fleet__empty">
            <EmptyState hasFleet />
          </div>
        ) : (
          <VehicleGrid vehicles={vehicles} onOpenDetail={onOpenDetail} />
        )}

        {pagination && totalPages > 1 && (
          <nav className="ac-fleet__pager" aria-label="Pagination armada">
            <button
              type="button"
              className="btn secondary small"
              onClick={() => pagination.onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Sebelumnya
            </button>
            <span>{currentPage} / {totalPages}</span>
            <button
              type="button"
              className="btn secondary small"
              onClick={() => pagination.onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Berikutnya
            </button>
          </nav>
        )}
      </section>
    </>
  );
}
