import { useState, useEffect } from 'react';
import { listEntriesApi, deleteEntryApi, listActivityTypesApi } from '../services/api';

export default function History({ onEditEntry }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Filter States
  const [search, setSearch] = useState('');
  const [types, setTypes] = useState(['Work', 'Study', 'Skill', 'Expense', 'Personal']);
  const [selectedTypes, setSelectedTypes] = useState(['Work', 'Study', 'Skill', 'Expense', 'Personal']);
  const [range, setRange] = useState('this_month'); // Default to last 30 days
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Load custom activity types
  useEffect(() => {
    async function fetchTypes() {
      try {
        const result = await listActivityTypesApi();
        setTypes(result.types);
        setSelectedTypes(result.types);
      } catch (err) {
        console.error('Failed to load activity types:', err);
      }
    }
    fetchTypes();
  }, []);

  const handleTypeCheckboxChange = (t) => {
    if (selectedTypes.includes(t)) {
      setSelectedTypes(selectedTypes.filter(item => item !== t));
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  // Helper to initialize custom date range bounds (default to last 30 days if blank)
  useEffect(() => {
    if (range === 'custom' && (!fromDate || !toDate)) {
      const d = new Date();
      const end = d.toISOString().split('T')[0];
      const start = new Date(d.setDate(d.getDate() - 30)).toISOString().split('T')[0];
      setFromDate(start);
      setToDate(end);
    }
  }, [range]);

  const fetchFilteredEntries = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      // If all are selected, we don't need to specify types (returns all). If none are checked, send empty string.
      // Otherwise send joined comma-separated string.
      const typeParam = selectedTypes.length === types.length ? 'All' : selectedTypes.join(',');
      const params = { range, type: typeParam, search };
      if (range === 'custom') {
        params.from_date = fromDate;
        params.to_date = toDate;
      }
      const data = await listEntriesApi(params);
      setEntries(data);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch entry history.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch entries whenever filters change
  useEffect(() => {
    // Debounce text search to avoid hammering the database
    const delayDebounce = setTimeout(() => {
      // Don't fetch custom range until dates are populated
      if (range === 'custom' && (!fromDate || !toDate)) return;
      fetchFilteredEntries();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, selectedTypes, range, fromDate, toDate]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this log entry?')) {
      return;
    }
    try {
      await deleteEntryApi(id);
      fetchFilteredEntries();
    } catch (err) {
      alert(err.message || 'Failed to delete entry.');
    }
  };

  // Group entries by date
  const groupEntriesByDate = (items) => {
    const groups = {};
    items.forEach(item => {
      const d = new Date(item.entry_date);
      const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      const dateKey = d.toLocaleDateString('en-US', dateOptions);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    } );
    return groups;
  };

  const groupedLogs = groupEntriesByDate(entries);

  // Aggregated Report Metrics
  const totalCount = entries.length;
  const workCount = entries.filter(e => e.type === 'Work').length;
  const studyCount = entries.filter(e => e.type === 'Study').length;
  const skillCount = entries.filter(e => e.type === 'Skill').length;
  const personalCount = entries.filter(e => e.type === 'Personal').length;
  const expenseCount = entries.filter(e => e.type === 'Expense').length;
  const totalExpenses = entries
    .filter(e => e.type === 'Expense')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Trigger PDF Export
  const handleExportPDF = () => {
    const typeParam = selectedTypes.length === types.length ? 'All' : selectedTypes.join(',');
    const queryParams = new URLSearchParams({
      range,
      type: typeParam,
      search,
      from_date: fromDate,
      to_date: toDate
    });
    window.open(`/api/reports/generate-pdf.php?${queryParams.toString()}`, '_blank');
  };

  return (
    <div>
      {/* 1. Header and PDF trigger */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Reports</h1>
        <button 
          onClick={handleExportPDF} 
          className="btn btn-primary"
          style={{ gap: '8px' }}
          disabled={entries.length === 0}
        >
          📄 Export PDF Report
        </button>
      </div>

      {/* 2. Filter Controls Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title" style={{ fontSize: '15px', marginBottom: '16px', paddingBottom: '6px' }}>Filter & Search Logs</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          {/* Text Search */}
          <div>
            <label htmlFor="search" style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Search Description</label>
            <input 
              type="text" 
              id="search"
              placeholder="Search words..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', fontSize: '14px' }}
            />
          </div>

          {/* Type Selector (Multi-select Checkboxes) */}
          <div style={{ gridColumn: 'span 2' }}>
            <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Activity Types</span>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center', minHeight: '38px' }}>
              {types.map(t => (
                <label key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>
                  <input 
                    type="checkbox" 
                    value={t}
                    checked={selectedTypes.includes(t)}
                    onChange={() => handleTypeCheckboxChange(t)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span className={`entry-type ${t.toLowerCase()}`} style={{ cursor: 'pointer', margin: 0 }}>{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Range Selector */}
          <div>
            <label htmlFor="range" style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Date Range</label>
            <select 
              id="range"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', fontSize: '14px', backgroundColor: 'white' }}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">Last 7 Days</option>
              <option value="this_month">Last 30 Days</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs (Conditional render) */}
        {range === 'custom' && (
          <div style={{ display: 'flex', gap: '15px', marginTop: '15px', flexWrap: 'wrap' }}>
            <div>
              <label htmlFor="from_date" style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>From Date</label>
              <input 
                type="date" 
                id="from_date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', fontSize: '14px' }}
              />
            </div>
            <div>
              <label htmlFor="to_date" style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>To Date</label>
              <input 
                type="date" 
                id="to_date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', fontSize: '14px' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Aggregated Summary Report Card */}
      <div className="card" style={{ marginBottom: '24px', backgroundColor: '#fafafa' }}>
        <h2 className="card-title" style={{ fontSize: '15px', marginBottom: '16px', paddingBottom: '6px' }}>Aggregate Report Summary</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px', textAlign: 'center' }}>
          <div style={{ padding: '12px', background: 'white', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Entries</div>
            <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>{totalCount}</div>
          </div>
          <div style={{ padding: '12px', background: 'white', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Work Entries</div>
            <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>{workCount}</div>
          </div>
          <div style={{ padding: '12px', background: 'white', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Study Entries</div>
            <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>{studyCount}</div>
          </div>
          <div style={{ padding: '12px', background: 'white', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Skills Learned</div>
            <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>{skillCount}</div>
          </div>
          <div style={{ padding: '12px', background: 'white', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Spend</div>
            <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px', color: totalExpenses > 0 ? 'var(--danger-color)' : 'inherit' }}>
              ₹{totalExpenses.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Grouped Logs List */}
      <div className="card">
        <h2 className="card-title">Activity Logs</h2>
        
        {errorMessage && (
          <div className="status-badge danger" style={{ width: '100%', marginBottom: '16px' }}>
            <span className="status-dot"></span>
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading historical data...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No historical entries found matching these criteria.
          </div>
        ) : (
          <div>
            {Object.keys(groupedLogs).map(dateKey => (
              <div key={dateKey} style={{ marginBottom: '25px' }}>
                <h3 style={{ fontSize: '15px', color: 'var(--primary-color)', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '10px' }}>
                  {dateKey}
                </h3>
                
                {groupedLogs[dateKey].map(entry => {
                  // Format time to AM/PM for user readability
                  let formattedTime = entry.entry_time;
                  try {
                    const [hours, minutes] = entry.entry_time.split(':');
                    const hrs = parseInt(hours, 10);
                    const suffix = hrs >= 12 ? 'PM' : 'AM';
                    const displayHrs = hrs % 12 || 12;
                    formattedTime = `${displayHrs}:${minutes} ${suffix}`;
                  } catch (e) {
                    // Fallback to original
                  }

                  return (
                    <div key={entry.id} className="entry-item">
                      <span className="entry-time">{formattedTime}</span>
                      <div className="entry-body">
                        <div className="entry-meta">
                          <span className={`entry-type ${entry.type.toLowerCase()}`}>
                            {entry.type}
                          </span>
                          {entry.type === 'Expense' && (
                            <span className="entry-amount">₹{entry.amount?.toFixed(2)}</span>
                          )}
                        </div>
                        <p className="entry-content" style={{ whiteSpace: 'pre-line', marginTop: '4px' }}>
                          {entry.content}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
                        <button 
                          onClick={() => onEditEntry(entry)}
                          style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(entry.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger-color)', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
