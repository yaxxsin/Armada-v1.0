import type { ReactNode } from 'react';
import type { AppView } from './AppNavbar';

export type PageCrumb = {
  label: string;
  onNavigate?: () => void;
};

export type PageHeaderProps = {
  view: AppView;
  title: string;
  description?: string;
  breadcrumbs?: PageCrumb[];
  actions?: ReactNode;
  canManageFleet?: boolean;
  onAddVehicle?: () => void;
};

const styles = `
  .ac-page-header { margin-bottom: 22px; }
  .ac-page-header__breadcrumbs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
    color: var(--text-faint);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .ac-page-header__crumb {
    border: 0;
    padding: 2px;
    background: transparent;
    color: var(--text-faint);
    font: inherit;
  }
  button.ac-page-header__crumb { cursor: pointer; }
  button.ac-page-header__crumb:hover { color: var(--teal); }
  .ac-page-header__crumb[aria-current='page'] { color: var(--text-dim); }
  .ac-page-header__row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
  }
  .ac-page-header__copy { min-width: 0; }
  .ac-page-header h1 {
    margin: 0;
    font-size: clamp(25px, 4vw, 34px);
    line-height: 1.05;
  }
  .ac-page-header p {
    max-width: 680px;
    margin-top: 6px;
    color: var(--text-dim);
    font-size: 13px;
    line-height: 1.55;
  }
  .ac-page-header__actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
  .ac-page-header__actions .btn:focus-visible,
  .ac-page-header__crumb:focus-visible {
    outline: 2px solid var(--teal);
    outline-offset: 2px;
  }
  @media (max-width: 600px) {
    .ac-page-header { margin-bottom: 18px; }
    .ac-page-header__row { align-items: stretch; flex-direction: column; gap: 14px; }
    .ac-page-header__actions { justify-content: flex-start; }
    .ac-page-header__actions .btn { flex: 1 1 auto; }
  }
`;

export default function PageHeader({
  view,
  title,
  description,
  breadcrumbs = [],
  actions,
  canManageFleet = false,
  onAddVehicle,
}: PageHeaderProps) {
  const showAddVehicle = (view === 'dashboard' || view === 'fleet') && canManageFleet;

  return (
    <>
      <style>{styles}</style>
      <header className="ac-page-header">
        {breadcrumbs.length > 0 && (
          <nav className="ac-page-header__breadcrumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => {
              const isCurrent = index === breadcrumbs.length - 1;
              return (
                <span key={`${crumb.label}-${index}`}>
                  {crumb.onNavigate && !isCurrent ? (
                    <button type="button" className="ac-page-header__crumb" onClick={crumb.onNavigate}>
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="ac-page-header__crumb" aria-current={isCurrent ? 'page' : undefined}>
                      {crumb.label}
                    </span>
                  )}
                  {!isCurrent && <span aria-hidden="true">/</span>}
                </span>
              );
            })}
          </nav>
        )}

        <div className="ac-page-header__row">
          <div className="ac-page-header__copy">
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>
          {(actions || showAddVehicle) && (
            <div className="ac-page-header__actions">
              {actions}
              {showAddVehicle && (
                <button type="button" className="btn" onClick={onAddVehicle}>
                  + Tambah Kendaraan
                </button>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
