import { useState, useEffect } from 'react';
import { createEntryApi, updateEntryApi, listActivityTypesApi } from '../services/api';

export default function AddEntry({ onNavigate, editingEntry = null }) {
  const isEditing = !!editingEntry;

  // Initialize date & time in local timezone
  const getLocalDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getLocalTimeString = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const [types, setTypes] = useState([]);
  const [type, setType] = useState(localStorage.getItem('defaultActivityType') || '');
  const [entryDate, setEntryDate] = useState(getLocalDateString());
  const [entryTime, setEntryTime] = useState(getLocalTimeString());
  const [content, setContent] = useState('');
  const [amount, setAmount] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  // Load custom activity types
  useEffect(() => {
    async function fetchTypes() {
      try {
        const result = await listActivityTypesApi();
        setTypes(result.types);
        
        // If editing entry is NOT present, double-check that the default activity type is set correctly
        // (if the default type from settings doesn't exist in the list, default to first list item)
        if (!editingEntry) {
          const defaultVal = localStorage.getItem('defaultActivityType') || 'Work';
          if (result.types.includes(defaultVal)) {
            setType(defaultVal);
          } else if (result.types.length > 0) {
            setType(result.types[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load activity types:', err);
      }
    }
    fetchTypes();
  }, [editingEntry]);

  // Load editing entry details if present
  useEffect(() => {
    if (editingEntry) {
      setType(editingEntry.type);
      setEntryDate(editingEntry.entry_date);
      // Remove seconds if present in database time format (HH:MM:SS -> HH:MM)
      const timeVal = editingEntry.entry_time.substring(0, 5);
      setEntryTime(timeVal);
      setContent(editingEntry.content);
      setAmount(editingEntry.amount !== null ? String(editingEntry.amount) : '');
    }
  }, [editingEntry]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setSubmitting(true);

    const payload = {
      type,
      entry_date: entryDate,
      entry_time: entryTime,
      content,
      amount: type === 'Expense' ? amount : null
    };

    try {
      if (isEditing) {
        payload.id = editingEntry.id;
        await updateEntryApi(payload);
      } else {
        await createEntryApi(payload);
      }
      onNavigate('dashboard');
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      } else {
        setGeneralError(err.message || 'Failed to save entry. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '20px auto', width: '100%' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>
            {isEditing ? 'Edit Daily Entry' : 'Add Daily Entry'}
          </h2>
          <button 
            type="button" 
            onClick={() => onNavigate('dashboard')} 
            className="btn btn-secondary"
            style={{ minHeight: '36px', padding: '6px 14px', fontSize: '13px' }}
          >
            Cancel
          </button>
        </div>

        {generalError && (
          <div className="status-badge danger" style={{ width: '100%', marginBottom: '16px' }}>
            <span className="status-dot"></span>
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Date Picker */}
          <div className="form-group">
            <label htmlFor="entry_date" className="form-label">
              Date
            </label>
            <input
              type="date"
              id="entry_date"
              className="form-control"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
            {errors.entry_date && (
              <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.entry_date}</span>
            )}
          </div>

          {/* Time Picker */}
          <div className="form-group">
            <label htmlFor="entry_time" className="form-label">
              Time
            </label>
            <input
              type="time"
              id="entry_time"
              className="form-control"
              required
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
            />
            {errors.entry_time && (
              <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.entry_time}</span>
            )}
          </div>

          {/* Type Dropdown */}
          <div className="form-group">
            <label htmlFor="entry_type" className="form-label">
              Activity Type
            </label>
            <select
              id="entry_type"
              className="form-control"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {types.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.type && (
              <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.type}</span>
            )}
          </div>

          {/* Amount field (conditional render for Expenses) */}
          {type === 'Expense' && (
            <div className="form-group">
              <label htmlFor="entry_amount" className="form-label">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                id="entry_amount"
                className="form-control"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹ 0.00"
              />
              {errors.amount && (
                <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.amount}</span>
              )}
            </div>
          )}

          {/* Description Textarea */}
          <div className="form-group" style={{ marginBottom: '22px' }}>
            <label htmlFor="entry_content" className="form-label">
              What did you do?
            </label>
            <textarea
              id="entry_content"
              className="form-control"
              required
              rows="4"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe your activity..."
            ></textarea>
            {errors.content && (
              <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.content}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', minHeight: '44px', fontWeight: '600' }}
          >
            {submitting ? 'Saving Entry...' : isEditing ? 'Update Entry' : 'Save Entry'}
          </button>
        </form>
      </div>
    </div>
  );
}
