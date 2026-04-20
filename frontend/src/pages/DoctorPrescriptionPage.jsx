import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FileEdit, Search, CheckCircle, User } from 'lucide-react';

export default function DoctorPrescriptionPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [prescriptionText, setPrescriptionText] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/doctor/patients');
      setPatients(data);
    } catch { toast.error('Failed to load patients.'); }
    finally { setLoading(false); }
  };

  const filtered = patients.filter(p =>
    !search || `${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedPatient || !prescriptionText.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/api/doctor/prescriptions', {
        patientId: selectedPatient.id,
        prescriptionText,
        description: description || 'Prescription',
      });
      toast.success('Prescription saved successfully!');
      setSuccess(true);
      setPrescriptionText('');
      setDescription('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save prescription.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Write Prescription</h2>
          <p className="page-subtitle">Create a text-based prescription for your patient</p>
        </div>
      </div>

      <div className="prescription-layout">
        {/* Patient Selector */}
        <div className="card patient-selector-card">
          <div className="card-section-title">Select Patient</div>
          <div className="search-bar" style={{ marginBottom: 16 }}>
            <Search size={16} color="var(--slate)" />
            <input type="text" className="search-input" placeholder="Search patients..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="loading-placeholder">{[1,2,3].map(i => <div key={i} className="skeleton-row" />)}</div>
          ) : (
            <div className="patient-list">
              {filtered.map(p => (
                <div key={p.id}
                  className={`patient-item ${selectedPatient?.id === p.id ? 'active' : ''}`}
                  onClick={() => setSelectedPatient(p)}>
                  <div className="patient-avatar-sm">
                    <User size={14} />
                  </div>
                  <div>
                    <div className="patient-item-name">{p.firstName} {p.lastName}</div>
                    <div className="patient-item-meta">{p.email}</div>
                  </div>
                  {selectedPatient?.id === p.id && <CheckCircle size={16} color="var(--teal)" style={{ marginLeft: 'auto' }} />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prescription Form */}
        <div className="card prescription-form-card">
          {selectedPatient ? (
            <>
              <div className="selected-patient-banner" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', marginBottom: 20, background: '#ede9fe', borderRadius: 10 }}>
                <User size={18} color="#7c3aed" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedPatient.firstName} {selectedPatient.lastName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>{selectedPatient.email} {selectedPatient.age ? `· ${selectedPatient.age} yrs` : ''} {selectedPatient.gender ? `· ${selectedPatient.gender}` : ''}</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description <span style={{ color: 'var(--slate-light)' }}>(optional)</span></label>
                <input className="form-control" placeholder="e.g. Follow-up prescription, post-consultation" value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Prescription Notes *</label>
                <textarea className="form-control prescription-textarea" rows={12}
                  placeholder="Type your prescription here...&#10;&#10;Rx:&#10;1. Tab. Paracetamol 500mg — 1 tablet, twice daily after meals × 5 days&#10;2. Tab. Omeprazole 20mg — 1 tablet, once daily before breakfast × 7 days&#10;&#10;Advice:&#10;- Avoid spicy foods&#10;- Follow up after 1 week"
                  value={prescriptionText}
                  onChange={e => setPrescriptionText(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => { setPrescriptionText(''); setDescription(''); }}>
                  Clear
                </button>
                <button className="btn btn-primary" onClick={handleSubmit}
                  disabled={submitting || !prescriptionText.trim()}>
                  <FileEdit size={15} /> {submitting ? 'Saving…' : 'Save Prescription'}
                </button>
              </div>

              {success && (
                <div className="success-banner" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#dcfce7', borderRadius: 10, color: '#16a34a', fontSize: '0.875rem', fontWeight: 500 }}>
                  <CheckCircle size={16} /> Prescription saved and sent to patient's records.
                </div>
              )}
            </>
          ) : (
            <div className="empty-state compact">
              <FileEdit size={28} color="var(--slate-light)" />
              <p>Select a patient from the list to start writing a prescription</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
