import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Badge, Empty, money, fmtDate, daysText } from './common.jsx';

function downloadCsv(filename, header, rows) {
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [mode, setMode] = useState('valuation'); // 'valuation' | 'expiry'
  const [medicines, setMedicines] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.medicines(), api.expiringBatches(90)])
      .then(([m, e]) => { setMedicines(m); setExpiring(e); })
      .catch((e) => setError(e.message));
  }, []);

  const totalValue = medicines.reduce((sum, m) => sum + m.totalStock * m.unitPrice, 0);

  const exportCsv = () => {
    if (mode === 'valuation') {
      downloadCsv('stock-valuation.csv',
        ['Medicine', 'Category', 'Usable stock', 'Unit price', 'Value'],
        medicines.map((m) => [m.name, m.category, m.totalStock, m.unitPrice, m.totalStock * m.unitPrice]));
    } else {
      downloadCsv('expiry-report.csv',
        ['Medicine', 'Batch', 'Quantity', 'Expiry date', 'Days left', 'Status'],
        expiring.map((b) => [b.medicine.name, b.batchNumber, b.quantity, b.expiryDate, b.daysToExpiry, b.status]));
    }
  };

  return (
    <section className="card">
      <div className="card-head">
        <h2>Reports</h2>
        <div className="row-gap">
          <div className="segmented small">
            <button className={mode === 'valuation' ? 'seg active' : 'seg'} onClick={() => setMode('valuation')}>Stock valuation</button>
            <button className={mode === 'expiry' ? 'seg active' : 'seg'} onClick={() => setMode('expiry')}>Expiry (90 days)</button>
          </div>
          <button className="btn ghost" onClick={exportCsv}>Download CSV</button>
        </div>
      </div>

      {error && <Empty>{error}</Empty>}

      {!error && mode === 'valuation' && (
        <table>
          <thead><tr><th>Medicine</th><th>Category</th><th className="num">Usable stock</th><th className="num">Unit price</th><th className="num">Value</th></tr></thead>
          <tbody>
            {medicines.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td><td>{m.category}</td>
                <td className="num">{m.totalStock}</td>
                <td className="num">{money(m.unitPrice)}</td>
                <td className="num">{money(m.totalStock * m.unitPrice)}</td>
              </tr>
            ))}
            <tr className="total"><td colSpan="4">Total stock value</td><td className="num">{money(totalValue)}</td></tr>
          </tbody>
        </table>
      )}

      {!error && mode === 'expiry' && (expiring.length === 0 ? <Empty>No batches expire in the next 90 days.</Empty> : (
        <table>
          <thead><tr><th>Medicine</th><th>Batch</th><th className="num">Qty</th><th>Expiry date</th><th>Status</th></tr></thead>
          <tbody>
            {expiring.map((b) => (
              <tr key={b.id}>
                <td>{b.medicine.name}</td><td>{b.batchNumber}</td>
                <td className="num">{b.quantity}</td>
                <td>{fmtDate(b.expiryDate)} <span className="sub inline">{daysText(b.daysToExpiry)}</span></td>
                <td><Badge status={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </section>
  );
}