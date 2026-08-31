import { useState, useEffect } from 'react';
import { createEntryApi, updateEntryApi } from '../services/api';

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

  const [type, setType] = useState(localStorage.getItem('defaultActivityType') || 'Work');
  const [entryDate, setEntryDate] = useState(getLocalDateString());
  const [entryTime, setEntryTime] = useState(getLocalTimeString());
  const [content, setContent] = useState('');
  const [amount, setAmount] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

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
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '0 20px' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>
            {isEditing ? 'Edit Daily Entry' : 'Add Daily Entry'}
          </h2>
          <button 
            type="button" 
            onClick={() => onNavigate('dashboard')} 
            className="btn btn-secondary"
            style={{ minHeight: '34px', padding: '6px 12px', fontSize: '13px', backgroundColor: '#6b7280' }}
          >
            Cancel
          </button>
        </div>

        {generalError && (
          <div className="status-badge danger" style={{ width: '100%', marginBottom: '16px', display: 'flex', boxSizing: 'border-box' }}>
            <span className="status-dot"></span>
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Date Picker */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="entry_date" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
              Date
            </label>
            <input
              type="date"
              id="entry_date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                fontSize: '15px'
              }}
            />
            {errors.entry_date && (
              <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.entry_date}</span>
            )}
          </div>

          {/* Time Picker */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="entry_time" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
              Time
            </label>
            <input
              type="time"
              id="entry_time"
              required
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                fontSize: '15px'
              }}
            />
            {errors.entry_time && (
              <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.entry_time}</span>
            )}
          </div>

          {/* Type Dropdown */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="entry_type" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
              Type
            </label>
            <select
              id="entry_type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                fontSize: '15px',
                backgroundColor: 'white'
              }}
            >
              <option value="Work">Work</option>
              <option value="Study">Study</option>
              <option value="Skill">Skill</option>
              <option value="Expense">Expense</option>
              <option value="Personal">Personal</option>
            </select>
            {errors.type && (
              <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.type}</span>
            )}
          </div>

          {/* Amount field (conditional render for Expenses) */}
          {type === 'Expense' && (
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="entry_amount" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                id="entry_amount"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹ 0.00"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  fontSize: '15px'
                }}
              />
              {errors.amount && (
                <span style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.amount}</span>
              )}
            </div>
          )}

          {/* Description Textarea */}
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="entry_content" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
              What did you do?
            </label>
            <textarea
              id="entry_content"
              required
              rows="4"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe your activity..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                fontSize: '15px',
                fontFamily: 'inherit',
                lineHeight: '1.4'
              }}
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
