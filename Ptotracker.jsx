import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'pto_requests';
const PTO_ALLOWANCE = 20;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOLIDAYS = [
  ['2026-01-01', "New Year's Day", 'full'], ['2026-01-19', 'Martin Luther King, Jr. Day', 'full'],
  ['2026-02-16', "Washington's Birthday", 'full'], ['2026-04-03', 'Good Friday', 'full'],
  ['2026-05-25', 'Memorial Day', 'full'], ['2026-06-19', 'Juneteenth National Independence Day', 'full'],
  ['2026-07-03', 'Independence Day observed', 'full'], ['2026-09-07', 'Labor Day', 'full'],
  ['2026-11-26', 'Thanksgiving Day', 'full'], ['2026-11-27', 'Day after Thanksgiving', 'half'],
  ['2026-12-24', 'Christmas Eve early close', 'half'], ['2026-12-25', 'Christmas Day', 'full'],
  ['2027-01-01', "New Year's Day", 'full'], ['2027-01-18', 'Martin Luther King, Jr. Day', 'full'],
  ['2027-02-15', "Washington's Birthday", 'full'], ['2027-03-26', 'Good Friday', 'full'],
  ['2027-05-31', 'Memorial Day', 'full'], ['2027-06-18', 'Juneteenth observed', 'full'],
  ['2027-07-05', 'Independence Day observed', 'full'], ['2027-09-06', 'Labor Day', 'full'],
  ['2027-11-25', 'Thanksgiving Day', 'full'], ['2027-11-26', 'Day after Thanksgiving', 'half'],
  ['2027-12-24', 'Christmas Day observed', 'full'], ['2028-01-17', 'Martin Luther King, Jr. Day', 'full'],
  ['2028-02-21', "Washington's Birthday", 'full'], ['2028-04-14', 'Good Friday', 'full'],
  ['2028-05-29', 'Memorial Day', 'full'], ['2028-06-19', 'Juneteenth National Independence Day', 'full'],
  ['2028-07-03', 'Independence Day early close', 'half'], ['2028-07-04', 'Independence Day', 'full'],
  ['2028-09-04', 'Labor Day', 'full'], ['2028-11-23', 'Thanksgiving Day', 'full'],
  ['2028-11-24', 'Day after Thanksgiving', 'half'], ['2028-12-25', 'Christmas Day', 'full']
].map(([date, name, kind]) => ({ date, name, kind }));

const pad = value => String(value).padStart(2, '0');
const formatDateInput = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDateInput = value => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const validDateInput = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = parseDateInput(value);
  return !Number.isNaN(date.getTime()) && formatDateInput(date) === value;
};
const holidayFor = date => HOLIDAYS.find(holiday => holiday.date === formatDateInput(date));
const eligible = date => {
  const holiday = holidayFor(date);
  return date.getDay() !== 0 && date.getDay() !== 6 && (!holiday || holiday.kind === 'half');
};
const businessDays = (start, end) => {
  if (!start || !end) return 0;
  const current = parseDateInput(start);
  const last = parseDateInput(end);
  let count = 0;
  while (current <= last) {
    if (eligible(current)) count += 1;
    current.setDate(current.getDate() + 1);
  }
  return count;
};
const shiftEligible = (date, direction) => {
  const shifted = new Date(date);
  do {
    shifted.setDate(shifted.getDate() + direction);
  } while (!eligible(shifted));
  return shifted;
};
const normalizeRequests = requests => requests.filter(request => validDateInput(request.startDate) && validDateInput(request.endDate))
  .map(request => ({
    id: request.id || Date.now() + Math.random(),
    startDate: request.startDate,
    endDate: request.endDate,
    type: request.type === 'wfh' ? 'wfh' : 'pto',
    reason: request.reason || '',
    days: businessDays(request.startDate, request.endDate),
    created: request.created || new Date().toISOString()
  }))
  .filter(request => parseDateInput(request.startDate) <= parseDateInput(request.endDate));
const displayDate = value => parseDateInput(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function PTOTracker() {
  const today = new Date();
  const [requests, setRequests] = useState(() => {
    try {
      return normalizeRequests(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch {
      return [];
    }
  });
  const [calendarMonth, setCalendarMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [startDate, setStartDate] = useState(formatDateInput(today));
  const [endDate, setEndDate] = useState(formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)));
  const [type, setType] = useState('pto');
  const [reason, setReason] = useState('');
  const [adjustmentMode, setAdjustmentMode] = useState('extend');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }, [requests]);

  const getEvent = date => requests.find(request => {
    const start = parseDateInput(request.startDate);
    const end = parseDateInput(request.endDate);
    return date >= start && date <= end;
  });

  const submit = event => {
    event.preventDefault();
    if (!startDate || !endDate || parseDateInput(startDate) > parseDateInput(endDate)) return;
    setRequests(current => [...current, {
      id: Date.now(), startDate, endDate, type, reason,
      days: businessDays(startDate, endDate), created: new Date().toISOString()
    }]);
    setReason('');
  };

  const adjust = (id, edge) => {
    setRequests(current => current.map(request => {
      if (request.id !== id) return request;
      const start = parseDateInput(request.startDate);
      const end = parseDateInput(request.endDate);
      const direction = adjustmentMode === 'extend' ? 1 : -1;
      let nextStart = start;
      let nextEnd = end;
      if (edge === 'front') nextStart = shiftEligible(start, direction > 0 ? -1 : 1);
      if (edge === 'back') nextEnd = shiftEligible(end, direction);
      if (nextStart > nextEnd) return request;
      const nextStartText = formatDateInput(nextStart);
      const nextEndText = formatDateInput(nextEnd);
      return { ...request, startDate: nextStartText, endDate: nextEndText, days: businessDays(nextStartText, nextEndText) };
    }));
  };

  const deleteEvent = id => setRequests(current => current.filter(request => request.id !== id));
  const ptoDays = requests.filter(request => request.type === 'pto').reduce((sum, request) => sum + request.days, 0);
  const wfhDays = requests.filter(request => request.type === 'wfh').reduce((sum, request) => sum + request.days, 0);

  return (
    <main style={styles.page}>
      <header><h1 style={styles.title}>PTO Tracker</h1><p style={styles.subtitle}>Plan and track your paid time off</p></header>
      <div style={styles.grid}>
        <section style={styles.card}>
          <div style={styles.calendarControls}>
            <button style={styles.iconButton} onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)}>←</button>
            <strong>Calendar</strong>
            <button style={styles.iconButton} onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>→</button>
          </div>
          {[0, 1, 2].map(offset => <Month key={offset} date={new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1)} getEvent={getEvent} />)}
          <div style={styles.legend}>Full holiday <span style={styles.halfLegend}>Half-day</span></div>
        </section>

        <section>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>PTO Overview</h2>
            <div style={styles.statsGrid}>
              <Stat value={Math.max(0, PTO_ALLOWANCE - ptoDays)} label="PTO Days Left" />
              <Stat value={ptoDays} label="PTO Scheduled" />
              <Stat value={wfhDays} label="WFH Scheduled" />
            </div>
          </div>
          <div style={{ ...styles.card, marginTop: '1.5rem', overflowX: 'auto' }}>
            <h2 style={styles.cardTitle}>Event Log</h2>
            <table style={styles.table}><thead><tr><th>Reason</th><th>Type</th><th>Days</th><th>Start / End</th><th>Adjust</th></tr></thead>
              <tbody>{requests.length === 0 ? <tr><td colSpan="5" style={styles.empty}>No events yet</td></tr> : [...requests].sort((a, b) => parseDateInput(a.startDate) - parseDateInput(b.startDate)).map(request => <tr key={request.id}>
                <td>{request.reason || 'Unspecified'}</td><td>{request.type.toUpperCase()}</td><td>{request.days}</td><td>{displayDate(request.startDate)} → {displayDate(request.endDate)}</td>
                <td><div style={styles.controls}>
                  <button style={{ ...styles.smallButton, ...styles.modeButton }} onClick={() => setAdjustmentMode(mode => mode === 'extend' ? 'shorten' : 'extend')} title="Toggle extend or shorten">{adjustmentMode === 'extend' ? '+' : '−'}</button>
                  <button style={styles.smallButton} onClick={() => adjust(request.id, 'front')} title={`${adjustmentMode === 'extend' ? 'Extend' : 'Shorten'} front`}>↑</button>
                  <button style={styles.smallButton} onClick={() => adjust(request.id, 'back')} title={`${adjustmentMode === 'extend' ? 'Extend' : 'Shorten'} back`}>↓</button>
                  <button style={styles.smallButton} onClick={() => deleteEvent(request.id)} title="Delete event">×</button>
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>

        <section style={styles.card}><h2 style={styles.cardTitle}>Add Event</h2><form onSubmit={submit}>
          <label style={styles.label}>Reason<input style={styles.input} value={reason} onChange={event => setReason(event.target.value)} placeholder="What's this for?" /></label>
          <div style={styles.formRow}><label style={styles.label}>Start Date<input style={styles.input} type="date" value={startDate} onChange={event => setStartDate(event.target.value)} required /></label><label style={styles.label}>End Date<input style={styles.input} type="date" value={endDate} onChange={event => setEndDate(event.target.value)} required /></label></div>
          <label style={styles.label}>Type<select style={styles.input} value={type} onChange={event => setType(event.target.value)}><option value="pto">PTO</option><option value="wfh">WFH</option></select></label>
          <button style={styles.primary} type="submit">Add Event</button>
        </form></section>
      </div>
    </main>
  );
}

function Stat({ value, label }) { return <div style={styles.stat}><strong>{value}</strong><span>{label}</span></div>; }

function Month({ date, getEvent }) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let index = 0; index < firstDay.getDay(); index += 1) cells.push(<td key={`before-${index}`} style={styles.otherCell} />);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const cellDate = new Date(date.getFullYear(), date.getMonth(), day);
    const holiday = holidayFor(cellDate);
    const event = getEvent(cellDate);
    cells.push(<td key={day} title={holiday ? `${holiday.name} (${holiday.kind}-day)` : ''} style={{ ...styles.cell, ...(holiday?.kind === 'full' ? styles.fullHoliday : {}), ...(holiday?.kind === 'half' ? styles.halfHoliday : {}), ...(event?.type === 'wfh' ? styles.wfh : event ? styles.pto : {}) }}><div>{day}</div>{holiday && <small>{holiday.kind === 'half' ? '½' : 'H'}</small>}{event && <small>{event.type[0].toUpperCase()}</small>}</td>);
  }
  while (cells.length % 7) cells.push(<td key={`after-${cells.length}`} style={styles.otherCell} />);
  const rows = [];
  for (let index = 0; index < cells.length; index += 7) rows.push(<tr key={index}>{cells.slice(index, index + 7)}</tr>);
  return <div style={styles.month}><h3>{date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3><table style={styles.calendar}><thead><tr>{DAYS.map(day => <th key={day}>{day}</th>)}</tr></thead><tbody>{rows}</tbody></table></div>;
}

const styles = {
  page: { width: '100%', margin: '0 auto', padding: '2rem clamp(1rem, 3vw, 3rem)', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif', color: '#334155', background: '#f1f5f9', minHeight: '100vh' },
  title: { color: '#0f172a', marginBottom: '.5rem' }, subtitle: { color: '#64748b' },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(280px, .9fr) minmax(420px, 1.35fr) minmax(280px, .9fr)', gap: '1.5rem', marginTop: '2rem' },
  card: { background: '#fff', borderRadius: 8, padding: '1.25rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,.1)' }, cardTitle: { color: '#0f172a', fontSize: '1.1rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '.75rem' },
  calendarControls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }, iconButton: { border: '1px solid #e2e8f0', background: '#fff', borderRadius: 4, padding: '.35rem .7rem', cursor: 'pointer' },
  month: { marginBottom: '1rem' }, calendar: { width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }, cell: { border: '1px solid #e2e8f0', textAlign: 'center', height: 36, padding: '.25rem' }, otherCell: { border: '1px solid #f1f5f9', height: 36 }, fullHoliday: { background: '#fef3c7' }, halfHoliday: { background: 'linear-gradient(135deg,#fef3c7 0 50%,#fff 50%)' }, pto: { boxShadow: 'inset 0 -4px #bfdbfe' }, wfh: { boxShadow: 'inset 0 -4px #ddd6fe' }, legend: { fontSize: '.75rem', marginTop: '.5rem' }, halfLegend: { marginLeft: '.75rem', paddingLeft: '.75rem', borderLeft: '1px solid #cbd5e1' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.75rem' }, stat: { background: '#f8fafc', padding: '.75rem', textAlign: 'center', borderLeft: '4px solid #10b981' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 560 }, empty: { padding: '2rem', textAlign: 'center' }, controls: { display: 'flex', gap: '.2rem' }, smallButton: { width: 28, height: 28, padding: 0, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 4, cursor: 'pointer' }, modeButton: { color: '#059669', fontWeight: 700 },
  label: { display: 'block', fontSize: '.9rem', fontWeight: 500, marginBottom: '1rem' }, input: { display: 'block', width: '100%', padding: '.65rem', marginTop: '.35rem', border: '1px solid #e2e8f0', borderRadius: 6, boxSizing: 'border-box' }, formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }, primary: { width: '100%', padding: '.75rem', border: 0, borderRadius: 6, background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 600 }
};

export default PTOTracker;
