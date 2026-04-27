import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FileText, Download, Calendar, User, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const TYPE_CONFIG = {
  PRESCRIPTION: { label: 'Prescription', color: '#7c3aed', bg: '#ede9fe' },
  LAB_REPORT: { label: 'Lab Report', color: 'var(--teal)', bg: 'var(--teal-pale)' },
  IMAGING_REPORT: { label: 'Imaging Report', color: '#0891b2', bg: '#e0f2fe' },
  DISCHARGE_SUMMARY: { label: 'Discharge', color: '#d97706', bg: '#fef3c7' },
  REFERRAL: { label: 'Referral', color: '#16a34a', bg: '#dcfce7' },
  OTHER: { label: 'Other', color: 'var(--slate)', bg: '#f1f5f9' },
};

function PrescriptionCard({ doc }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card prescription-card">
      <div className="prescription-header">
        <div className="doc-type-icon" style={{ background: '#ede9fe' }}>
          <FileText size={18} color="#7c3aed" />
        </div>
        <div className="doc-card-body" style={{ flex: 1 }}>
          <div className="doc-name">Prescription</div>
          <div className="doc-meta">
            <span><User size={12} /> {doc.doctorName}</span>
            <span>·</span>
            <span><Calendar size={12} /> {doc.uploadedAt ? format(parseISO(doc.uploadedAt), 'MMM d, yyyy') : '—'}</span>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
          <Eye size={14} /> {expanded ? 'Hide' : 'View'}
        </button>
      </div>
      {expanded && (
        <div className="prescription-text-body">
          {doc.prescriptionText}
        </div>
      )}
    </div>
  );
}

function FileCard({ doc, onDownload }) {
  const cfg = TYPE_CONFIG[doc.documentType] || TYPE_CONFIG.OTHER;
  return (
    <div className="card doc-card">
      <div className="doc-type-icon" style={{ background: cfg.bg }}>
        <FileText size={18} color={cfg.color} />
      </div>
      <div className="doc-card-body">
        <div className="doc-card-top">
          <div>
            <div className="doc-name">{doc.originalName || doc.fileName || 'Document'}</div>
            <span className="doc-type-badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
          </div>
        </div>
        <div className="doc-meta">
          <span><User size={12} /> {doc.doctorName || 'Unknown'}</span>
          <span>·</span>
          <span><Calendar size={12} /> {doc.uploadedAt ? format(parseISO(doc.uploadedAt), 'MMM d, yyyy') : '—'}</span>
          {doc.fileSize && <><span>·</span><span>{(doc.fileSize / 1024).toFixed(0)} KB</span></>}
        </div>
        {doc.description && <div className="doc-description">{doc.description}</div>}
      </div>
      <div className="doc-actions">
        <button onClick={() => onDownload(doc.id, doc.originalName || doc.fileName)}
          className="icon-btn" title="Download">
          <Download size={15} />
        </button>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchDocuments(); }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/documents');
      setDocuments(data);
    } catch { toast.error('Failed to load documents.'); }
    finally { setLoading(false); }
  };

  const handleDownload = async (id, fileName) => {
    try {
      const response = await api.get(`/api/documents/download/${id}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download document.');
    }
  };

  const tabs = [
    ['all', 'All'],
    ['PRESCRIPTION', 'Prescriptions'],
    ['LAB_REPORT', 'Lab Reports'],
    ['IMAGING_REPORT', 'Imaging'],
  ];

  const filtered = filter === 'all' ? documents : documents.filter(d => d.documentType === filter);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">My Records</h2>
          <p className="page-subtitle">View your prescriptions, lab reports, and medical documents</p>
        </div>
      </div>

      <div className="filter-tabs">
        {tabs.map(([val, label]) => (
          <button key={val} className={`filter-tab ${filter === val ? 'active' : ''}`}
            onClick={() => setFilter(val)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-placeholder">
          {[1, 2, 3].map(i => <div key={i} className="skeleton-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FileText size={32} color="var(--slate-light)" /></div>
          <h4>No documents found</h4>
          <p>Your {filter !== 'all' ? tabs.find(t => t[0] === filter)?.[1]?.toLowerCase() : 'records'} will appear here.</p>
        </div>
      ) : (
        <div className="docs-list">
          {filtered.map(doc => (
            doc.documentType === 'PRESCRIPTION' && doc.prescriptionText ? (
              <PrescriptionCard key={doc.id} doc={doc} />
            ) : (
              <FileCard key={doc.id} doc={doc} onDownload={handleDownload} />
            )
          ))}
        </div>
      )}
    </div>
  );
}
