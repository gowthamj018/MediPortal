import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Upload, Search, CheckCircle, User, FileText, X } from 'lucide-react';

export default function DoctorUploadPage() {
  const location = useLocation();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [documentType, setDocumentType] = useState('LAB_REPORT');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/doctor/patients');
      setPatients(data);
      if (location.state?.preselectPatientId) {
        const p = data.find(p => p.id === location.state.preselectPatientId);
        if (p) setSelectedPatient(p);
      }
    } catch { toast.error('Failed to load patients.'); }
    finally { setLoading(false); }
  };

  const filtered = patients.filter(p =>
    !search || `${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleSubmit = async () => {
    if (!selectedPatient || !file) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', selectedPatient.id);
      formData.append('documentType', documentType);
      formData.append('description', description);

      await api.post('/api/doctor/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Report uploaded successfully!');
      setSuccess(true);
      setFile(null);
      setDescription('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Upload Reports</h2>
          <p className="page-subtitle">Upload lab reports or imaging reports for your patients</p>
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

        {/* Upload Form */}
        <div className="card prescription-form-card">
          {selectedPatient ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', marginBottom: 20, background: '#ede9fe', borderRadius: 10 }}>
                <User size={18} color="#7c3aed" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedPatient.firstName} {selectedPatient.lastName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>{selectedPatient.email}</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Report Category *</label>
                <div className="type-selector">
                  {[['LAB_REPORT', 'Lab Report'], ['IMAGING_REPORT', 'Imaging Report']].map(([val, label]) => (
                    <button key={val} type="button"
                      className={`type-btn ${documentType === val ? 'active' : ''}`}
                      onClick={() => setDocumentType(val)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description <span style={{ color: 'var(--slate-light)' }}>(optional)</span></label>
                <input className="form-control" placeholder="e.g. Blood work results, MRI scan..."
                  value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Attach File *</label>
                <div className="upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}>
                  {file ? (
                    <div className="upload-file-preview">
                      <FileText size={20} color="var(--teal)" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{file.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate-light)' }}>{(file.size / 1024).toFixed(0)} KB</div>
                      </div>
                      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <Upload size={28} color="var(--slate-light)" />
                      <p>Click to select or drag & drop your file here</p>
                      <span>PDF, JPEG, PNG, DICOM up to 10MB</span>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                    accept=".pdf,.jpg,.jpeg,.png,.dcm"
                    onChange={e => setFile(e.target.files[0])} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSubmit}
                  disabled={submitting || !file}>
                  <Upload size={15} /> {submitting ? 'Uploading…' : 'Upload Report'}
                </button>
              </div>

              {success && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#dcfce7', borderRadius: 10, color: '#16a34a', fontSize: '0.875rem', fontWeight: 500 }}>
                  <CheckCircle size={16} /> Report uploaded and added to patient's records.
                </div>
              )}
            </>
          ) : (
            <div className="empty-state compact">
              <Upload size={28} color="var(--slate-light)" />
              <p>Select a patient from the list to upload a report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
