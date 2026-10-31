import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Badge, StatCard, Empty, money, daysText, fmtDateTime } from './common.jsx';
import Reports from './Reports.jsx';

// Bar chart: grey-teal bars = past months, amber bars = forecast.
function DemandChart({ data }) {
  const W = 520, H = 230, pad = { l: 36, r: 10, t: 18, b: 30 };
  const max = Math.max(10, ...data.map((d) => d.issued));
  const slot = (W - pad.l - pad.r) / data.length;
  const barW = slot * 0.6;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Units issued per month with forecast">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#DCEBE8" />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5B6B6A">{t}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = pad.l + i * slot + (slot - barW) / 2;
        return (
          <g key={i}>
            <rect x={x} y={y(d.issued)} width={barW} height={H - pad.b - y(d.issued)} rx="4"
                  fill={d.forecast ? '#F5B942' : '#2BB3A3'} />
            <text x={x + barW / 2} y={y(d.issued) - 5} textAnchor="middle" fontSize="11" fill="#1F2937">{d.issued}</text>
            <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="#5B6B6A">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <Empty>{error}</Empty>;
  if (!data) return <Empty>Loading dashboard...</Empty>;

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Dashboard</h1>
        <p>Live stock, expiry alerts and demand forecast.</p>
      </div>

      {/* 1. Summary cards */}
      <div className="stats">
        <StatCard label="Medicines tracked" value={data.totalMedicines} hint={`${data.totalSuppliers} suppliers`} />
        <StatCard label="Stock value" value={money(data.stockValue)} hint="Usable (non-expired) stock" />
        <StatCard label="Low stock" value={data.lowStockCount} hint="At or below reorder level" tone={data.lowStockCount ? 'amber' : 'teal'} />
        <StatCard label="Expiring soon" value={data.expiringSoonCount} hint={`${data.expiredCount} already expired`} tone={data.expiredCount ? 'red' : data.expiringSoonCount ? 'amber' : 'teal'} />
      </div>

      {/* 2. Needs attention */}
      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Low stock</h2>
            <button className="link" onClick={() => onNavigate('stock')}>Receive stock</button>
          </div>
          {data.lowStock.length === 0 ? <Empty>All medicines are above their reorder level.</Empty> : (
            <table>
              <thead><tr><th>Medicine</th><th className="num">In stock</th><th className="num">Reorder at</th></tr></thead>
              <tbody>
                {data.lowStock.map((m) => (
                  <tr key={m.medicineId}>
                    <td>{m.name}</td>
                    <td className="num"><strong>{m.totalStock}</strong></td>
                    <td className="num">{m.reorderLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>Expiry alerts</h2><span className="muted">next 60 days</span></div>
          {data.expiryAlerts.length === 0 ? <Empty>No batches are close to expiry.</Empty> : (
            <table>
              <thead><tr><th>Medicine / batch</th><th className="num">Qty</th><th>Expiry</th></tr></thead>
              <tbody>
                {data.expiryAlerts.map((e) => (
                  <tr key={e.batchId}>
                    <td>{e.medicineName}<div className="sub">{e.batchNumber}</div></td>
                    <td className="num">{e.quantity}</td>
                    <td><Badge status={e.status} /> <span className="sub inline">{daysText(e.daysLeft)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* 3. Demand and reorders */}
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Demand: units issued per month</h2></div>
          <DemandChart data={data.demand} />
          <div className="legend">
            <span><i className="dot teal" /> Actual</span>
            <span><i className="dot amber" /> Forecast (next 3 months)</span>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>Suggested reorders</h2></div>
          {data.reorders.length === 0 ? <Empty>Current stock covers the forecast demand.</Empty> : (
            <table>
              <thead><tr><th>Medicine</th><th className="num">Forecast / mo</th><th className="num">In stock</th><th className="num">Order</th></tr></thead>
              <tbody>
                {data.reorders.map((r) => (
                  <tr key={r.medicineId}>
                    <td>{r.name}</td>
                    <td className="num">{r.forecastNextMonth}</td>
                    <td className="num">{r.currentStock}</td>
                    <td className="num"><strong className="accent">{r.suggested}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="note">Order = next month's forecast + safety stock (reorder level) - current stock.</p>
        </section>
      </div>

      {/* 4. Recent activity */}
      <section className="card">
        <div className="card-head">
          <h2>Recent transactions</h2>
          <button className="link" onClick={() => onNavigate('stock')}>View all</button>
        </div>
        {data.recentTransactions.length === 0 ? <Empty>No transactions yet.</Empty> : (
          <table>
            <thead><tr><th>When</th><th>Medicine</th><th>Batch</th><th>Type</th><th className="num">Qty</th></tr></thead>
            <tbody>
              {data.recentTransactions.map((t) => (
                <tr key={t.id}>
                  <td>{fmtDateTime(t.createdAt)}</td>
                  <td>{t.batch.medicine.name}</td>
                  <td>{t.batch.batchNumber}</td>
                  <td><Badge status={t.type} /></td>
                  <td className="num">{t.type === 'ISSUE' || t.type === 'WRITE_OFF' ? '-' : '+'}{t.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 5. Reports */}
      <Reports />
    </div>
  );
}