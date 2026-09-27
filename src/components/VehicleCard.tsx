import { computeVehicle } from '../utils/helpers';

export default function VehicleCard({ vehicle, onClick }) {
  const v = vehicle;
  const c = computeVehicle(v);
  const photos = Array.isArray(v.photos) && v.photos.length ? v.photos : v.foto ? [v.foto] : [];
  const cover = photos[0];

  return (
    <button type="button" className="card" onClick={onClick} aria-label={`Buka detail ${v.merk || 'kendaraan'} ${v.plat || ''}`}>
      {cover && (
        <span className="card-photo-wrap">
          <img className="card-photo" src={cover} alt={v.merk} />
          {photos.length > 1 && <span className="card-photo-count">{photos.length} foto</span>}
        </span>
      )}
      {v.lokasi && <span className="loc-tag">{v.lokasi}</span>}
      <span className="plate">{v.plat || '-'}</span>
      <div className="merk">{v.merk || 'Tanpa nama'}</div>
      <div className="tahun">{v.tahun || ''}</div>
      {v.pic && <div className="vehicle-pic">PIC: {v.pic}</div>}
      <div className="rail">
        <div className={`seg ${c.pajakTahunanStatus}`}></div>
        <div className={`seg ${c.pajak5TahunanStatus}`}></div>
        <div className={`seg ${c.keurStatus}`}></div>
        <div className={`seg ${c.serviceStatus}`}></div>
      </div>
      <div className="rail-lbl">
        <span>Pajak 1th</span>
        <span>Pajak 5th</span>
        <span>Keur</span>
        <span>Servis</span>
      </div>
      <div className="km">
        Odometer: {v.kmSekarang ? Number(v.kmSekarang).toLocaleString('id-ID') + ' km' : '-'}
      </div>
      <div className="next-service">
        Servis berikut di:{' '}
        {c.nextServiceKm ? Number(c.nextServiceKm).toLocaleString('id-ID') + ' km' : '-'}
      </div>
    </button>
  );
}
