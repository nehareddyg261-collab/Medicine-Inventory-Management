import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Badge, Empty, fmtDate, daysText } from './common.jsx';

// Shows every batch of the selected medicine. New batches are added from the Stock tab (Purchase).
export default function BatchManagement({ medicine, refreshKey }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.batches(medicine.id)
      .then((b) => { setBatches(b); setError(''); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [medicine.id, refreshKey]);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Batches: {medicine.name}</h2>
      </div>

      {loading && <Empty>Loading batches...</Empty>}
      {error && <Empty>{error}</Empty>}
      {!loading && !error && batches.length === 0 && (
        <Empty>No batches yet. Use <strong>Stock → Purchase</strong> to receive the first batch.</Empty>
      )}

      {!loading && !error && batches.length > 0 && (
        <table>
          <thead>
            <tr><th>Batch</th><th>Supplier</th><th>Expiry</th><th className="num">Qty</th><th>Status</th></tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id} className={b.quantity === 0 ? 'dim' : ''}>
                <td>{b.batchNumber}<div className="sub">Mfg {fmtDate(b.manufactureDate)}</div></td>
                <td>{b.supplier ? b.supplier.name : '-'}</td>
                <td>{fmtDate(b.expiryDate)}<div className="sub">{daysText(b.daysToExpiry)}</div></td>
                <td className="num"><strong>{b.quantity}</strong></td>
                <td>{b.quantity === 0 ? <span className="badge gray">Empty</span> : <Badge status={b.status} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="note">Stock is issued from the batch that expires first (FEFO). Expired batches are never issued.</p>
    </section>
  );
}