import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function TrendChart({ snapshots }) {
  const [collapsed, setCollapsed] = useState(true);

  if (collapsed) {
    return (
      <div className="panel-box">
        <button type="button" className="head panel-toggle" onClick={() => setCollapsed(false)}>
          <span>Tren kondisi armada</span>
          <span style={{ fontSize: '11px' }}>Tampilkan</span>
        </button>
        <div className="body collapsed"></div>
      </div>
    );
  }

  const hasData = snapshots.length >= 2;

  const chartData = {
    labels: snapshots.map((s) => s.date.slice(5)),
    datasets: [
      {
        label: 'Aman',
        data: snapshots.map((s) => s.ok),
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        tension: 0.25,
      },
      {
        label: 'Perlu perhatian',
        data: snapshots.map((s) => s.amber),
        borderColor: '#f59e0b',
        backgroundColor: '#f59e0b',
        tension: 0.25,
      },
      {
        label: 'Terlambat',
        data: snapshots.map((s) => s.red),
        borderColor: '#ef6673',
        backgroundColor: '#ef6673',
        tension: 0.25,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#667085', font: { size: 11 } } },
    },
    scales: {
      x: {
        ticks: { color: '#98a2b3', font: { size: 10 } },
        grid: { color: '#edf0f4' },
      },
      y: {
        ticks: { color: '#98a2b3', font: { size: 10 }, precision: 0 },
        grid: { color: '#edf0f4' },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="panel-box">
      <button type="button" className="head panel-toggle" onClick={() => setCollapsed(true)}>
        <span>Tren kondisi armada</span>
        <span style={{ fontSize: '11px' }}>Sembunyikan</span>
      </button>
      <div className="body">
        {!hasData ? (
          <div className="empty-rem" style={{ padding: '6px 0' }}>
            Data tren akan terkumpul seiring waktu aplikasi ini dibuka setiap hari.
          </div>
        ) : (
          <Line data={chartData} options={chartOptions} height={90} />
        )}
      </div>
    </div>
  );
}
