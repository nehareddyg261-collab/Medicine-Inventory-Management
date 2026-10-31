import React, { useState, useCallback } from 'react';
import Dashboard from './components/Dashboard.jsx';
import MedicineList from './components/MedicineList.jsx';
import StockManagement from './components/StockManagement.jsx';
import SupplierManagement from './components/SupplierManagement.jsx';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'medicines', label: 'Medicines' },
  { id: 'stock', label: 'Stock' },
  { id: 'suppliers', label: 'Suppliers' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState(null);

  // Shows a small message at the bottom of the screen for a few seconds.
  const notify = useCallback((message, type = 'ok') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">+</span>
          <span>MediStock</span>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="content">
        {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}
        {tab === 'medicines' && <MedicineList notify={notify} />}
        {tab === 'stock' && <StockManagement notify={notify} />}
        {tab === 'suppliers' && <SupplierManagement notify={notify} />}
      </main>

      {toast && <div className={'toast ' + toast.type}>{toast.message}</div>}
    </div>
  );
}