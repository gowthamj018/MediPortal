import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, User, Stethoscope, CheckCircle, XCircle, AlertCircle, FileEdit, Upload, X, Droplets, Phone, FileText, Eye, Activity, FilePlus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Scheduled', color: 'var(--teal)', bg: 'var(--teal-pale)', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: '#22c55e', bg: '#dcfce7', icon: CheckCircle },
  COMPLETED: { label: 'Completed', color: '#fff', bg: 'linear-gradient(135deg, #10b981, #059669)', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'var(--red)', bg: 'var(--red-pale)', icon: XCircle },
  NO_SHOW:   { label: 'No Show',   color: 'var(--amber)', bg: 'var(--amber-pale)', icon: AlertCircle },
};

export default function DoctorAppointmentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(location.state?.filter || 'all');
  const [selectedAppt, setSelectedAppt] = useState(null);

  const [modalTab, setModalTab] = useState('details');
  const [patientDocs, setPatientDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  
  const [prescriptionText, setPrescriptionText] = useState('');
  const [desc, setDesc] = useState('');
  const [submittingRx, setSubmittingRx] = useState(false);
  
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('LAB_REPORT');
  const [uploadDesc, setUploadDesc] = useState('');
  const [submittingUp, setSubmittingUp] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => { fetchAppointments(); }, []);

  useEffect(() => {
    if (selectedAppt) {
      setModalTab('details');
      fetchDocs(selectedAppt.patientId);
      setPrescriptionText('');
      setDesc('');
      setFile(null);
      setUploadDesc('');
    }
  }, [selectedAppt]);

  useEffect(() => {
    const handleDocumentClick = () => setSelectedAppt(null);
    if (selectedAppt) {
      document.addEventListener('click', handleDocumentClick);
    }
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [selectedAppt]);

  useEffect(() => {
    return () => {
      if (previewDoc?.url) {
        window.URL.revokeObjectURL(previewDoc.url);
      }
    };
  }, [previewDoc]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/doctor/appointments');
      setAppointments(data);
    } catch { toast.error('Failed to load appointments.'); }
    finally { setLoading(false); }
  };

  const fetchDocs = async (patientId) => {
    setDocsLoading(true);
    try {
      const { data } = await api.get(`/api/doctor/patients/${patientId}/documents`);
      setPatientDocs(data);
    } catch { toast.error('Failed to load patient records.'); }
    finally { setDocsLoading(false); }
  };

  const handleRxSubmit = async () => {
    if (!prescriptionText.trim()) return;
    setSubmittingRx(true);
    try {
      await api.post('/api/doctor/prescriptions', {
        patientId: selectedAppt.patientId,
        appointmentId: selectedAppt.id,
        prescriptionText,
        description: desc || 'Prescription',
      });
      toast.success('Prescription saved!');
      setPrescriptionText('');
      setDesc('');
      fetchDocs(selectedAppt.patientId);
      setModalTab('history');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSubmittingRx(false); }
  };

  const handleUploadSubmit = async () => {
    if (!file) return;
    setSubmittingUp(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', selectedAppt.patientId);
      formData.append('appointmentId', selectedAppt.id);
      formData.append('documentType', docType);
      if (uploadDesc) formData.append('description', uploadDesc);

      await api.post('/api/doctor/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded successfully!');
      setFile(null);
      setUploadDesc('');
      fetchDocs(selectedAppt.patientId);
      setModalTab('history');
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed.'); }
    finally { setSubmittingUp(false); }
  };

  const handleViewDocument = async (docId, fileName) => {
    try {
      setPreviewLoading(true);
      const response = await api.get(`/api/documents/download/${docId}`, { responseType: 'blob' });
      const contentType = response.headers['content-type'] || response.data?.type || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      setPreviewDoc({ url, fileName: fileName || 'Document' });
    } catch { toast.error('Failed to view document'); }
    finally { setPreviewLoading(false); }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await api.delete(`/api/doctor/documents/${docId}`);
      toast.success("Record deleted successfully");
      fetchDocs(selectedAppt.patientId);
    } catch { toast.error("Failed to delete record"); }
  };

  const handleCompleteAppt = async () => {
    if (!window.confirm("Mark this appointment as completed?")) return;
    try {
      await api.put(`/api/doctor/appointments/${selectedAppt.id}/complete`);
      toast.success("Appointment completed");
      setSelectedAppt({ ...selectedAppt, status: 'COMPLETED' });
      fetchAppointments();
    } catch { toast.error("Failed to update status"); }
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const filtered = appointments.filter(a => {
    if (filter === 'today') return a.appointmentDate === today && a.status !== 'CANCELLED';
    if (filter === 'upcoming') return a.appointmentDate >= today && a.status !== 'CANCELLED';
    if (filter === 'past') return a.appointmentDate < today || a.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Appointments</h2>
          <p className="page-subtitle">View and manage your patient appointments</p>
        </div>
      </div>

      <div className="filter-tabs">
        {[['all','All'],['today','Today'],['upcoming','Upcoming'],['past','Past']].map(([v,l]) => (
          <button key={v} className={`filter-tab ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-placeholder">
          {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Calendar size={32} color="var(--slate-light)" />
          <h4>No appointments found</h4>
          <p>No {filter !== 'all' ? filter : ''} appointments.</p>
        </div>
      ) : (
        <div className="appt-grid">
          {filtered.map(a => {
            const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.SCHEDULED;
            const StatusIcon = cfg.icon;
            const isCompleted = a.status === 'COMPLETED';
            const cardStyle = isCompleted ? { background: 'linear-gradient(to bottom right, #ffffff, #f0fdf4)', borderLeft: '4px solid #10b981' } : {};
            return (
              <div key={a.id} className="card appt-card" onClick={(e) => { e.stopPropagation(); setSelectedAppt(a); }} style={{ cursor: 'pointer', transition: 'transform 0.2s', ...cardStyle }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                <div className="appt-card-header">
                  <div className="appt-doctor-info">
                    <div className="doctor-avatar-sm" style={{ background: '#ede9fe' }}>
                      <User size={16} color="#7c3aed" />
                    </div>
                    <div>
                      <div className="appt-doctor-name">{a.patientName}</div>
                      <div className="appt-specialization">{a.reason || 'Consultation'}</div>
                    </div>
                  </div>
                  <span className="status-badge" style={{ color: cfg.color, background: cfg.bg }}>
                    <StatusIcon size={12} />
                    {cfg.label}
                  </span>
                </div>
                <div className="appt-card-body">
                  <div className="appt-meta-row">
                    <div className="appt-meta-item">
                      <Calendar size={14} color="var(--slate)" />
                      <span>{a.appointmentDate ? format(parseISO(a.appointmentDate), 'EEE, MMM d, yyyy') : '—'}</span>
                    </div>
                    <div className="appt-meta-item">
                      <Clock size={14} color="var(--slate)" />
                      <span>{a.appointmentTime?.slice(0,5) || '—'}</span>
                    </div>
                    <div className="appt-meta-item">
                      <Stethoscope size={14} color="var(--slate)" />
                      <span>{a.appointmentType || 'In-Person'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedAppt && (
        <div className="floating-dialog card" onClick={e => e.stopPropagation()} style={{ 
          position: 'fixed', top: '50%', left: 'calc(50% + 130px)', transform: 'translate(-50%, -50%)', 
          zIndex: 1000, maxWidth: '500px', width: '90%', padding: '24px', 
          borderRadius: '16px', background: 'var(--bg-card)', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.1)'
        }}>
          <button onClick={() => setSelectedAppt(null)} style={{ position: 'absolute', right: 20, top: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', padding: '4px', borderRadius: '4px' }}>
            <X size={20} />
          </button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingRight: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="doctor-avatar" style={{ width: '48px', height: '48px', fontSize: '1.1rem', background: '#ede9fe', color: '#7c3aed', flexShrink: 0 }}>
                {selectedAppt.patientName[0]}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{selectedAppt.patientName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate)', marginTop: '2px' }}>
                  {selectedAppt.patientAge ? `${selectedAppt.patientAge} yrs` : ''} {selectedAppt.patientGender ? `· ${selectedAppt.patientGender}` : ''}
                </div>
              </div>
            </div>
            {selectedAppt.status !== 'COMPLETED' && selectedAppt.appointmentDate === today && (
              <button className="btn btn-sm" onClick={handleCompleteAppt} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} /> Mark as Completed
              </button>
            )}
            {selectedAppt.status === 'COMPLETED' && (
              <span className="badge" style={{ background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12} /> Completed</span>
            )}
          </div>

          <div className="tabs" style={{ marginBottom: '20px' }}>
            {[
              { id: 'details', label: 'Details', icon: User },
              { id: 'history', label: 'Records', icon: Activity },
              { id: 'prescribe', label: 'Prescribe', icon: FileEdit },
              { id: 'upload', label: 'Upload', icon: Upload }
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button key={tab.id} className={`tab ${modalTab === tab.id ? 'active' : ''}`} onClick={() => setModalTab(tab.id)} style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TabIcon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
            {modalTab === 'details' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--slate-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Blood Group</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500 }}><Droplets size={14} color="var(--red)" /> {selectedAppt.patientBloodGroup || 'N/A'}</div>
                  </div>
                  <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--slate-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Phone Number</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500 }}><Phone size={14} color="var(--teal)" /> {selectedAppt.patientPhone || 'N/A'}</div>
                  </div>
                </div>
                <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--slate-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Reason for Visit</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{selectedAppt.reason || 'Consultation'}</div>
                </div>
              </>
            )}

            {modalTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {docsLoading ? <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Loading records...</p> : 
                 patientDocs.length === 0 ? <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>No prior records found.</p> :
                 patientDocs.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        {doc.documentType === 'PRESCRIPTION' ? <FileText size={16} color="var(--teal)" /> : <Activity size={16} color="var(--amber)" />}
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{doc.originalName || doc.description || doc.documentType}</span>
                        <span className="badge badge-slate" style={{ fontSize: '0.65rem' }}>{format(parseISO(doc.uploadedAt), 'MMM d, yyyy')}</span>
                      </div>
                      {doc.description && doc.documentType !== 'PRESCRIPTION' && <p style={{ fontSize: '0.75rem', color: 'var(--slate)', margin: '4px 0 0' }}>{doc.description}</p>}
                      {doc.prescriptionText && (
                        <div style={{ background: 'var(--bg)', padding: '8px 12px', borderRadius: '6px', marginTop: '8px', fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                          {doc.prescriptionText}
                        </div>
                      )}
                    </div>
                    {(doc.fileName || doc.originalName) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
                        <button onClick={() => handleViewDocument(doc.id, doc.originalName)} className="btn btn-ghost btn-sm" style={{ padding: '6px', color: 'var(--teal)' }} title="View Document">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleDeleteDoc(doc.id)} className="btn btn-ghost btn-sm" style={{ padding: '6px', color: 'var(--red)' }} title="Delete Document">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    {!doc.fileName && (
                      <button onClick={() => handleDeleteDoc(doc.id)} className="btn btn-ghost btn-sm" style={{ padding: '6px', marginLeft: '12px', color: 'var(--red)' }} title="Delete Prescription">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {modalTab === 'prescribe' && (
              selectedAppt.appointmentDate !== today ? (
                <div className="empty-state" style={{ padding: '30px 20px' }}>
                  <AlertCircle size={28} color="var(--red)" />
                  <p style={{ color: 'var(--red)', marginTop: '8px', fontSize: '0.85rem' }}>Prescriptions can only be written for today's active appointments.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Title / Summary</label>
                    <input className="form-control" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Follow-up medication" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Prescription Details</label>
                    <textarea className="form-control" rows={6} value={prescriptionText} onChange={e => setPrescriptionText(e.target.value)} placeholder="Rx:..." />
                  </div>
                  <button className="btn btn-primary" onClick={handleRxSubmit} disabled={submittingRx || !prescriptionText.trim()} style={{ alignSelf: 'flex-end' }}>
                    {submittingRx ? 'Saving...' : 'Save Prescription'}
                  </button>
                </div>
              )
            )}

            {modalTab === 'upload' && (
              selectedAppt.appointmentDate !== today ? (
                <div className="empty-state" style={{ padding: '30px 20px' }}>
                  <AlertCircle size={28} color="var(--red)" />
                  <p style={{ color: 'var(--red)', marginTop: '8px', fontSize: '0.85rem' }}>Reports can only be uploaded for today's active appointments.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Report Type</label>
                    <select className="form-control" value={docType} onChange={e => setDocType(e.target.value)}>
                      <option value="LAB_REPORT">Lab Report</option>
                      <option value="IMAGING">Imaging (X-Ray, MRI)</option>
                      <option value="CLINICAL_NOTE">Clinical Note</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Description</label>
                    <input className="form-control" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} placeholder="e.g. Blood Test Results" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>File</label>
                    <div style={{ border: '1.5px dashed var(--border)', borderRadius: '8px', padding: '16px', textAlign: 'center', background: 'var(--bg)' }}>
                      <input type="file" id="modal-file-upload" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                      <label htmlFor="modal-file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <FilePlus size={24} color="var(--slate)" />
                        <span style={{ fontSize: '0.8rem', color: 'var(--teal)', fontWeight: 500 }}>{file ? file.name : 'Click to select a file'}</span>
                      </label>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={handleUploadSubmit} disabled={submittingUp || !file} style={{ alignSelf: 'flex-end' }}>
                    {submittingUp ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="modal-header">
              <h3 className="modal-title">{previewDoc.fileName}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={previewDoc.url}
                  download={previewDoc.fileName}
                  className="btn btn-ghost btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  Download
                </a>
                <button className="modal-close" onClick={() => setPreviewDoc(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="modal-body" style={{ height: '75vh', padding: '8px 24px 24px' }}>
              <iframe
                src={previewDoc.url}
                title="Report Preview"
                style={{ width: '100%', height: '100%', border: '1px solid var(--border)', borderRadius: '8px', background: '#fff' }}
              />
            </div>
          </div>
        </div>
      )}

      {previewLoading && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '320px' }}>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <div className="spinner" />
              <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--slate)' }}>Loading report preview...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
