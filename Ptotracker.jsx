import React, { useState, useEffect } from 'react';

const PTOTracker = () => {
  const [requests, setRequests] = useState(() => {
    const saved = localStorage.getItem('pto_requests');
    return saved ? JSON.parse(saved) : [];
  });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('vacation');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('pending');
  const [alert, setAlert] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    // Set default dates
    const today = new Date();
    const start = formatDateInput(today);
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    const endStr = formatDateInput(end);
    
    setStartDate(start);
    setEndDate(endStr);
  }, []);

  useEffect(() => {
    localStorage.setItem('pto_requests', JSON.stringify(requests));
  }, [requests]);

  const calculateBusinessDays = (start, end) => {
    let count = 0;
    const current = parseDateInput(start);
    const endDate = parseDateInput(end);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (parseDateInput(startDate) > parseDateInput(endDate)) {
      showAlert('End date must be after start date', 'error');
      return;
    }

    const newRequest = {
      id: Date.now(),
      startDate,
      endDate,
      type,
      reason,
      status,
      days: calculateBusinessDays(startDate, endDate),
      created: new Date().toISOString()
    };

    setRequests([...requests, newRequest]);
    showAlert('PTO request submitted successfully', 'success');
    
    // Reset form
    const today = new Date();
    const start = formatDateInput(today);
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    const endStr = formatDateInput(end);
    
    setStartDate(start);
    setEndDate(endStr);
    setType('vacation');
    setReason('');
    setStatus('pending');
  };

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const deleteRequest = (id) => {
    setRequests(requests.filter(req => req.id !== id));
    showAlert('PTO request deleted', 'success');
  };

  const editRequest = (id) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    setStartDate(req.startDate);
    setEndDate(req.endDate);
    setType(req.type);
    setReason(req.reason || '');
    setStatus(req.status);
    deleteRequest(id);
  };

  const formatDate = (dateStr) => {
    return parseDateInput(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getPTOForDate = (date) => {
    for (let req of requests) {
      const start = parseDateInput(req.startDate);
      const end = parseDateInput(req.endDate);
      if (date >= start && date <= end) {
        return req;
      }
    }
    return null;
  };

  const parseDateInput = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const stats = {
    total: requests.reduce((sum, req) => sum + (req.days || 0), 0),
    approved: requests
      .filter(req => req.status === 'approved')
      .reduce((sum, req) => sum + (req.days || 0), 0),
    pending: requests
      .filter(req => req.status === 'pending')
      .reduce((sum, req) => sum + (req.days || 0), 0)
  };

  const filteredRequests = activeTab === 'all' 
    ? requests 
    : requests.filter(req => req.status === activeTab);

  const sortedRequests = [...filteredRequests].sort((a, b) => 
    new Date(b.created) - new Date(a.created)
  );

  const renderCalendar = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    const weeks = [];
    let week = [];
    
    // Previous month days
    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
      week.push({
        date: prevLastDay.getDate() - i,
        isCurrentMonth: false,
        fullDate: new Date(year, month - 1, prevLastDay.getDate() - i)
      });
    }
    
    // Current month
    for (let date = 1; date <= lastDay.getDate(); date++) {
      const cellDate = new Date(year, month, date);
      week.push({
        date,
        isCurrentMonth: true,
        fullDate: cellDate,
        isToday: cellDate.toDateString() === now.toDateString(),
        pto: getPTOForDate(cellDate)
      });
      
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    
    // Next month days
    let nextDate = 1;
    while (week.length < 7 && week.length > 0) {
      week.push({
        date: nextDate++,
        isCurrentMonth: false,
        fullDate: new Date(year, month + 1, nextDate - 1)
      });
    }
    if (week.length > 0) weeks.push(week);
    
    return weeks;
  };

  const calendarWeeks = renderCalendar();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>PTO Tracker</h1>
        <p style={styles.subtitle}>Plan and track your paid time off</p>
      </header>

      <div style={styles.grid}>
        {/* Left Column */}
        <div>
          {/* Stats */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>PTO Overview</div>
            <div style={styles.statsGrid}>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{stats.total}</div>
                <div style={styles.statLabel}>Total Days</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{stats.approved}</div>
                <div style={styles.statLabel}>Approved</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{stats.pending}</div>
                <div style={styles.statLabel}>Pending</div>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div style={{...styles.card, marginTop: '1.5rem'}}>
            <div style={styles.cardTitle}>Calendar</div>
            <table style={styles.calendar}>
              <thead>
                <tr>
                  {days.map(day => (
                    <th key={day} style={styles.calendarHeader}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calendarWeeks.map((week, weekIdx) => (
                  <tr key={weekIdx}>
                    {week.map((cell, cellIdx) => {
                      let cellStyle = styles.calendarCell;
                      if (!cell.isCurrentMonth) {
                        cellStyle = {...cellStyle, ...styles.calendarCellOther};
                      } else if (cell.isToday) {
                        cellStyle = {...cellStyle, ...styles.calendarCellToday};
                      } else if (cell.pto) {
                        const statusStyle = styles[`calendarCellPto${cell.pto.status}`] || {};
                        cellStyle = {...cellStyle, ...styles.calendarCellPto, ...statusStyle};
                      }
                      
                      return (
                        <td key={cellIdx} style={cellStyle}>
                          <div>{cell.date}</div>
                          {cell.pto && (
                            <div style={styles.calendarBadge}>
                              {cell.pto.type[0].toUpperCase()}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Request Form */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>Request PTO</div>
            
            {alert && (
              <div style={{
                ...styles.alert,
                backgroundColor: alert.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: alert.type === 'success' ? '#166534' : '#991b1b',
                marginBottom: '1rem',
                borderLeft: `4px solid ${alert.type === 'success' ? '#10b981' : '#ef4444'}`
              }}>
                {alert.message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  style={styles.input}
                  required
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Day</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Reason (optional)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brief reason for PTO"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={styles.input}
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <button type="submit" style={styles.buttonPrimary}>
                Submit Request
              </button>
            </form>
          </div>

          {/* Requests List */}
          <div style={{...styles.card, marginTop: '1.5rem'}}>
            <div style={styles.cardTitle}>PTO Requests</div>
            
            <div style={styles.tabs}>
              {['all', 'approved', 'pending'].map(tabName => (
                <button
                  key={tabName}
                  onClick={() => setActiveTab(tabName)}
                  style={{
                    ...styles.tab,
                    ...(activeTab === tabName ? styles.tabActive : {})
                  }}
                >
                  {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
                </button>
              ))}
            </div>

            <div>
              {sortedRequests.length === 0 ? (
                <div style={styles.emptyState}>
                  No {activeTab !== 'all' ? activeTab : ''} requests
                </div>
              ) : (
                sortedRequests.map(req => (
                  <div key={req.id} style={styles.entryItem}>
                    <div style={styles.entryHeader}>
                      <div>
                        {formatDate(req.startDate)} → {formatDate(req.endDate)}
                        <span style={{color: '#64748b', fontWeight: 'normal', fontSize: '0.9rem'}}>
                          {` (${req.days} days)`}
                        </span>
                      </div>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: req.status === 'approved' ? '#dcfce7' : req.status === 'pending' ? '#fef3c7' : '#fee2e2',
                        color: req.status === 'approved' ? '#166534' : req.status === 'pending' ? '#92400e' : '#991b1b'
                      }}>
                        {req.status}
                      </span>
                    </div>
                    <div style={{fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem'}}>
                      {req.type} {req.reason && `• ${req.reason}`}
                    </div>
                    <div style={styles.entryActions}>
                      <button
                        onClick={() => editRequest(req.id)}
                        style={styles.buttonSecondary}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteRequest(req.id)}
                        style={styles.buttonDanger}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Annual Summary</div>
        <table style={styles.summaryTable}>
          <thead>
            <tr>
              <th style={styles.tableHeader}>Type</th>
              <th style={styles.tableHeader}>Approved</th>
              <th style={styles.tableHeader}>Pending</th>
              <th style={styles.tableHeader}>Rejected</th>
            </tr>
          </thead>
          <tbody>
            {['vacation', 'sick', 'personal', 'unpaid'].map(ptoType => {
              const reqs = requests.filter(req => req.type === ptoType);
              const approved = reqs.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.days, 0);
              const pending = reqs.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.days, 0);
              const rejected = reqs.filter(r => r.status === 'rejected').reduce((sum, r) => sum + r.days, 0);
              
              if (approved || pending || rejected) {
                return (
                  <tr key={ptoType}>
                    <td style={styles.tableCell}>{ptoType.charAt(0).toUpperCase() + ptoType.slice(1)}</td>
                    <td style={styles.tableCell}>{approved}</td>
                    <td style={styles.tableCell}>{pending}</td>
                    <td style={styles.tableCell}>{rejected}</td>
                  </tr>
                );
              }
              return null;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f1f5f9',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '600',
    letterSpacing: '-0.5px',
    marginBottom: '0.5rem',
    color: '#0f172a'
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#64748b'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    marginBottom: '2rem',
    '@media (maxWidth: 1024px)': {
      gridTemplateColumns: '1fr'
    }
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: '1rem',
    borderBottom: '2px solid #f1f5f9',
    paddingBottom: '0.75rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem'
  },
  statBox: {
    backgroundColor: '#f1f5f9',
    padding: '1rem',
    borderRadius: '6px',
    textAlign: 'center',
    borderLeft: '4px solid #10b981'
  },
  statNumber: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#059669',
    marginBottom: '0.25rem'
  },
  statLabel: {
    fontSize: '0.8rem',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#334155',
    marginBottom: '0.4rem'
  },
  input: {
    width: '100%',
    padding: '0.7rem',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  },
  buttonPrimary: {
    width: '100%',
    padding: '0.8rem 1.5rem',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  buttonSecondary: {
    padding: '0.6rem 1rem',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  buttonDanger: {
    padding: '0.6rem 1rem',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  calendar: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem'
  },
  calendarHeader: {
    padding: '0.75rem',
    textAlign: 'center',
    fontWeight: '600',
    color: '#334155',
    backgroundColor: '#f1f5f9',
    borderBottom: '2px solid #e2e8f0'
  },
  calendarCell: {
    padding: '0.5rem',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    height: '40px',
    position: 'relative'
  },
  calendarCellOther: {
    backgroundColor: '#f8fafc',
    color: '#a1aec6'
  },
  calendarCellToday: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontWeight: '600'
  },
  calendarCellPto: {
    backgroundColor: '#dbeafe'
  },
  calendarCellPtoapproved: {
    backgroundColor: '#dcfce7'
  },
  calendarCellPtopending: {
    backgroundColor: '#fef3c7'
  },
  calendarCellPtorejected: {
    backgroundColor: '#fee2e2'
  },
  calendarBadge: {
    fontSize: '0.65rem',
    padding: '1px 3px',
    borderRadius: '2px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)'
  },
  tabs: {
    display: 'flex',
    gap: '0',
    borderBottom: '2px solid #e2e8f0',
    marginBottom: '1.5rem'
  },
  tab: {
    padding: '0.75rem 1.5rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#64748b',
    borderBottom: '3px solid transparent',
    transition: 'all 0.2s',
    position: 'relative',
    bottom: '-2px'
  },
  tabActive: {
    color: '#059669',
    borderBottomColor: '#10b981'
  },
  alert: {
    padding: '1rem',
    borderRadius: '6px',
    marginBottom: '1rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem',
    color: '#71717a'
  },
  entryItem: {
    backgroundColor: '#f8fafc',
    padding: '1rem',
    borderRadius: '6px',
    marginBottom: '0.75rem',
    borderLeft: '4px solid #10b981'
  },
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  badge: {
    display: 'inline-block',
    padding: '0.3rem 0.7rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  entryActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  summaryTable: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    padding: '0.75rem',
    textAlign: 'left',
    fontWeight: '600',
    color: '#334155',
    backgroundColor: '#f1f5f9',
    borderBottom: '2px solid #e2e8f0'
  },
  tableCell: {
    padding: '0.75rem',
    borderBottom: '1px solid #e2e8f0'
  }
};

export default PTOTracker;
