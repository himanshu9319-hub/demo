import { FileText, Download, Calendar, Hospital, CheckCircle, Clock } from 'lucide-react'

export function HealthRecords({ bookings = [], patientName = 'Patient User' }) {
  const sampleRecords = [
    {
      id: 'REC-2026-081',
      date: '2026-10-28',
      hospital: 'AIIMS Rishikesh',
      department: 'General Medicine',
      doctor: 'Dr. Ananya Rao',
      token: 'A-025',
      type: 'OPD Digital Slip & Consultation Summary',
      status: 'Completed',
    },
    {
      id: 'REC-2026-042',
      date: '2026-09-14',
      hospital: 'Max Super Speciality Hospital',
      department: 'Cardiology',
      doctor: 'Dr. Neha Shah',
      token: 'CARD-008',
      type: 'Diagnostic Blood Test & ECG Referral',
      status: 'Archived',
    },
  ]

  return (
    <div className="health-records-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-main-title">Health Records & Digital OPD Slips</h1>
          <p className="page-main-sub">Access your verified hospital queue tokens, OPD summaries, and e-prescriptions.</p>
        </div>
      </div>

      <div className="records-list">
        {sampleRecords.map((record) => (
          <article key={record.id} className="health-record-card">
            <div className="record-card-top">
              <div className="record-title-group">
                <div className="record-icon-box">
                  <FileText size={20} className="text-primary-blue" />
                </div>
                <div>
                  <h3>{record.type}</h3>
                  <span className="record-meta-sub">
                    <Hospital size={13} /> {record.hospital} · {record.department}
                  </span>
                </div>
              </div>
              <span className="record-status-pill">{record.status}</span>
            </div>

            <div className="record-details-grid">
              <div>
                <small>APPOINTMENT DATE</small>
                <strong>{record.date}</strong>
              </div>
              <div>
                <small>CONSULTANT</small>
                <strong>{record.doctor}</strong>
              </div>
              <div>
                <small>OPD TOKEN NUMBER</small>
                <strong>{record.token}</strong>
              </div>
              <div>
                <small>PATIENT NAME</small>
                <strong>{patientName}</strong>
              </div>
            </div>

            <div className="record-card-footer">
              <button
                type="button"
                className="btn-download-record"
                onClick={() => alert(`Downloading verified digital OPD slip for ${record.token}...`)}
              >
                <Download size={14} />
                <span>Download Verified OPD Slip (PDF)</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
