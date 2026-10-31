import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';
import { Empty } from './common.jsx';

const EMPTY = { name: '', contactPerson: '', phone: '', email: '', address: '' };

export default function SupplierManagement({ notify }) {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.suppliers().then((s) => { setSuppliers(s); setError(''); }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    try {
      if (form.id) await api.updateSupplier(form.id, form);
      else await api.createSupplier(form);
      notify(form.id ? 'Supplier updated' : 'Supplier added');
      setForm(null);
      load();
    } catch (err) { notify(err.message, 'error'); }
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete ${s.name}?`)) return;
    try {
      await api.deleteSupplier(s.id);
      notify('Supplier deleted');
      load();
    } catch (err) { notify(err.message, 'error'); }
  };

  return (
    <div className="stack">
      <div className="page-head with-action">
        <div>
          <h1>Suppliers</h1>
          <p>Who you buy from and how to reach them.</p>
        </div>
        <button className="btn" onClick={() => setForm({ ...EMPTY })}>+ Add supplier</button>
      </div>

      {form && (
        <form className="card form-grid" onSubmit={save}>
          <h2 className="span-all">{form.id ? 'Edit supplier' : 'New supplier'}</h2>
          <label>Name<input required value={form.name} onChange={set('name')} /></label>
          <label>Contact person<input value={form.contactPerson || ''} onChange={set('contactPerson')} /></label>
          <label>Phone<input value={form.phone || ''} onChange={set('phone')} /></label>
          <label>Email<input type="email" value={form.email || ''} onChange={set('email')} /></label>
          <label className="span-all">Address<input value={form.address || ''} onChange={set('address')} /></label>
          <div className="actions span-all">
            <button type="submit" className="btn">Save</button>
            <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <section className="card">
        {error && <Empty>{error}</Empty>}
        {!error && suppliers.length === 0 && <Empty>No suppliers yet.</Empty>}
        {!error && suppliers.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th>Address</th><th /></tr></thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.contactPerson || '-'}</td>
                    <td>{s.phone || '-'}</td>
                    <td>{s.email || '-'}</td>
                    <td className="sub">{s.address || '-'}</td>
                    <td className="row-actions">
                      <button className="link" onClick={() => setForm({ ...EMPTY, ...s })}>Edit</button>
                      <button className="link danger" onClick={() => remove(s)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}