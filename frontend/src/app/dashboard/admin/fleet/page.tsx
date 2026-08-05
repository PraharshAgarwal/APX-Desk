'use client';

const VEHICLES = [
  { id: 'KA-09-AB-1234', type: '10T Truck',     driver: 'Ramesh M.',  phone: '+91 98001 11111', status: 'Available',   lastTrip: 'May 2',  trips: 142 },
  { id: 'KA-09-CD-5678', type: '10T Truck',     driver: 'Suresh P.',  phone: '+91 97001 22222', status: 'On Route',    lastTrip: 'May 4',  trips: 98  },
  { id: 'KA-09-EF-9012', type: '5T Mini Truck', driver: 'Mohan R.',   phone: '+91 96001 33333', status: 'Available',   lastTrip: 'May 3',  trips: 210 },
  { id: 'TN-09-GH-3456', type: '5T Mini Truck', driver: 'Arjun V.',   phone: '+91 95001 44444', status: 'Maintenance', lastTrip: 'Apr 28', trips: 67  },
];

const STATUS_BADGE: Record<string, string> = {
  Available:   'badge-green',
  'On Route':  'badge-blue',
  Maintenance: 'badge-red',
};

const PERF = VEHICLES.map(v => ({ ...v, pct: Math.min(95, 55 + (v.trips % 40)) }));

export default function FleetPage() {
  return (
    <div className="animate-in">
      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Total Vehicles</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800 }}>4</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Available</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color: '#059669' }}>2</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Ready to dispatch</div>
        </div>
        <div className="stat-card amber">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>On Route</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color: '#d97706' }}>1</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Currently active</div>
        </div>
        <div className="stat-card red">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>In Maintenance</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color: '#dc2626' }}>1</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Scheduled service</div>
        </div>
      </div>

      {/* Fleet table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Fleet Overview</span>
          <button type="button" className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>+ Add Vehicle</button>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Vehicle No.</th><th>Type</th><th>Driver</th><th>Contact</th><th>Status</th><th>Last Trip</th><th>Total Trips</th><th></th></tr>
          </thead>
          <tbody>
            {VEHICLES.map(v => (
              <tr key={v.id}>
                <td><strong style={{ fontFamily: 'var(--font-head)', letterSpacing: '0.04em' }}>{v.id}</strong></td>
                <td style={{ color: 'var(--text-secondary)' }}>{v.type}</td>
                <td style={{ fontWeight: 500 }}>{v.driver}</td>
                <td style={{ fontSize: 12, color: 'var(--text-faint)' }}>{v.phone}</td>
                <td><span className={`badge ${STATUS_BADGE[v.status]}`}>{v.status}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.lastTrip}</td>
                <td style={{ fontWeight: 600 }}>{v.trips}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>History</button>
                    {v.status !== 'Maintenance'
                      ? <button type="button" style={{ padding: '4px 10px', fontSize: 12, background: 'var(--amber-50)', color: 'var(--amber-800)', border: '1px solid var(--amber-100)', borderRadius: 6, cursor: 'pointer' }}>Schedule Maint.</button>
                      : <button type="button" className="btn-primary" style={{ padding: '4px 10px', fontSize: 12 }}>Mark Ready</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Active trip + Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Active Trip — KA-09-CD-5678</span>
            <span className="badge badge-blue">In Progress</span>
          </div>
          <div className="card-body">
            <div style={{ background: 'var(--bg-subtle)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              {[['Driver','Suresh P.'],['Order','ORD-2025-1042'],['Destination','Kaveri Agro — Mysuru'],['Departed','Today, 10:30 AM'],['ETA','Today by 3:00 PM']].map(([l,v])=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Delivery Progress</div>
            <div className="progress-bar">
              <div className="progress-fill green" style={{ width: '65%' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5 }}>Estimated 65% of route completed</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Vehicle Performance (This Month)</span>
          </div>
          <div className="card-body">
            {PERF.map(v => (
              <div key={v.id} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-head)' }}>{v.id}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(v.trips % 15) + 10} trips</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill green" style={{ width: `${v.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
