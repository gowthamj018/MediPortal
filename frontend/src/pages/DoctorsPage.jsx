import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, Star, Clock, Stethoscope, Calendar, Award } from 'lucide-react';

const SPECIALIZATIONS = [
  'All', 'Cardiology', 'Neurology', 'Orthopedics', 'Dermatology',
  'Pediatrics', 'General Medicine', 'Gynecology', 'Ophthalmology'
];

function DoctorCard({ doc, onBook }) {
  return (
    <div className="card doctor-card">
      <div className="doctor-card-top">
        <div className="doctor-avatar-xl">
          <Stethoscope size={26} color="var(--teal)" />
        </div>
        <div className="doctor-card-info">
          <h4 className="doctor-card-name">Dr. {doc.firstName} {doc.lastName}</h4>
          <div className="doctor-card-spec">{doc.specialization}</div>
          <div className="doctor-card-dept" style={{ fontSize: '0.78rem', color: 'var(--slate-light)', marginTop: 2 }}>
            {doc.department}
          </div>
        </div>
      </div>

      <div className="doctor-card-stats">
        {doc.rating != null ? (
          <div className="doc-stat">
            <Star size={13} color="#f59e0b" fill="#f59e0b" />
            <span>{doc.rating}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--slate-light)' }}>({doc.ratingCount})</span>
          </div>
        ) : (
          <div className="doc-stat">
            <Award size={13} color="var(--teal)" />
            <span style={{ color: 'var(--teal)', fontWeight: 600 }}>New</span>
          </div>
        )}
        <div className="doc-stat-divider" />
        <div className="doc-stat">
          <Clock size={13} color="var(--slate)" />
          <span>{doc.experienceYears} yrs</span>
        </div>
        <div className="doc-stat-divider" />
        <div className="doc-stat" style={{ color: 'var(--teal)', fontWeight: 600 }}>
          ₹{doc.consultationFee}
        </div>
      </div>

      {doc.bio && (
        <p className="doctor-bio">{doc.bio.length > 100 ? doc.bio.slice(0, 100) + '…' : doc.bio}</p>
      )}

      <div className="doctor-availability">
        <span className="avail-label">Available:</span>
        <span className="avail-days">{doc.availableDays?.replace(/,/g, ' · ')}</span>
        <span className="avail-time">{doc.availableFrom} – {doc.availableTo}</span>
      </div>

      <button className="btn btn-primary w-full" style={{ marginTop: '16px' }} onClick={() => onBook(doc.id)}>
        <Calendar size={14} /> Book Appointment
      </button>
    </div>
  );
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('All');
  const navigate = useNavigate();

  useEffect(() => { fetchDoctors(); }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/doctors');
      setDoctors(data);
    } catch { toast.error('Failed to load doctors.'); }
    finally { setLoading(false); }
  };

  const filtered = doctors.filter(d => {
    const matchesSpec = selectedSpec === 'All' || d.specialization === selectedSpec;
    const matchesSearch = !search ||
      `${d.firstName} ${d.lastName} ${d.specialization} ${d.department}`
        .toLowerCase().includes(search.toLowerCase());
    return matchesSpec && matchesSearch;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Find a Doctor</h2>
          <p className="page-subtitle">Browse our team of experienced healthcare professionals</p>
        </div>
      </div>

      <div className="doctors-filters">
        <div className="search-bar">
          <Search size={16} color="var(--slate)" />
          <input
            type="text"
            placeholder="Search by name, specialization…"
            className="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="spec-chips">
          {SPECIALIZATIONS.map(spec => (
            <button
              key={spec}
              className={`spec-chip ${selectedSpec === spec ? 'active' : ''}`}
              onClick={() => setSelectedSpec(spec)}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-placeholder grid-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-card tall" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Stethoscope size={32} color="var(--slate-light)" /></div>
          <h4>No doctors found</h4>
          <p>Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="doctors-grid">
          {filtered.map(doc => (
            <DoctorCard
              key={doc.id}
              doc={doc}
              onBook={(id) => navigate(`/appointments/book?doctorId=${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
