import VehicleCard from './VehicleCard';

export default function VehicleGrid({ vehicles, onOpenDetail }) {
  return (
    <div className="grid">
      {vehicles.map((v) => (
        <VehicleCard key={v.id} vehicle={v} onClick={() => onOpenDetail(v.id)} />
      ))}
    </div>
  );
}
