import { useState, useEffect } from 'react';
import { 
  listTodosApi, 
  createTodoApi, 
  toggleTodoApi, 
  updateTodoApi, 
  deleteTodoApi 
} from '../services/api';

export default function Todos() {
  const [todos, setTodos] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, today_pending: 0, overdue: 0, recurring: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'pending', 'recurring', 'completed', 'high'
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Month navigation state (format: 'YYYY-MM' or 'all')
  const getCurrentYearMonth = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newRecurrence, setNewRecurrence] = useState('none');
  const [newDueDate, setNewDueDate] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit task modal state
  const [editingTodo, setEditingTodo] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [editRecurrence, setEditRecurrence] = useState('none');
  const [editDueDate, setEditDueDate] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchTodos = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedMonth && selectedMonth !== 'all') {
        params.month = selectedMonth;
      }
      if (filter === 'pending') params.status = 'pending';
      if (filter === 'completed') params.status = 'completed';
      if (filter === 'today') params.filter = 'today';
      if (filter === 'recurring') params.filter = 'recurring';
      if (filter === 'high') params.priority = 'high';
      if (search.trim()) params.search = search.trim();

      const result = await listTodosApi(params);
      setTodos(result.todos || []);
      if (result.stats) {
        setStats(result.stats);
      }
    } catch (err) {
      setFeedback({ message: err.message || 'Failed to load tasks.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [filter, search, selectedMonth]);

  const showNotification = (msg, type = 'success') => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  // Month navigation helpers
  const getFormattedMonthLabel = (monthStr) => {
    if (monthStr === 'all') return 'All Time (No Month Filter)';
    const [yyyy, mm] = monthStr.split('-');
    const date = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(getCurrentYearMonth());
      return;
    }
    const [yyyy, mm] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(yyyy, mm - 2, 1);
    const newYyyy = prevDate.getFullYear();
    const newMm = String(prevDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYyyy}-${newMm}`);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(getCurrentYearMonth());
      return;
    }
    const [yyyy, mm] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(yyyy, mm, 1);
    const newYyyy = nextDate.getFullYear();
    const newMm = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYyyy}-${newMm}`);
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(getCurrentYearMonth());
  };

  const handleToggleAllMonths = () => {
    setSelectedMonth(selectedMonth === 'all' ? getCurrentYearMonth() : 'all');
  };

  const handleCreateTodo = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    try {
      await createTodoApi({
        title: newTitle.trim(),
        description: newDescription.trim(),
        priority: newPriority,
        recurrence: newRecurrence,
        due_date: newDueDate || null
      });

      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
      setNewPriority('medium');
      setNewRecurrence('none');
      setShowNotes(false);
      showNotification(
        newRecurrence !== 'none' 
          ? `Recurring (${newRecurrence}) task added!` 
          : 'Task added successfully!'
      );
      fetchTodos();
    } catch (err) {
      showNotification(err.message || 'Failed to create task.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (todo) => {
    // Optimistic UI update
    const nextStatus = todo.status === 'pending' ? 'completed' : 'pending';
    setTodos(todos.map(t => t.id === todo.id ? { ...t, status: nextStatus } : t));

    try {
      const res = await toggleTodoApi(todo.id);
      if (res && res.message) {
        showNotification(res.message);
      }
      fetchTodos();
    } catch (err) {
      showNotification(err.message || 'Failed to update status.', 'danger');
      fetchTodos(); // Rollback
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTodoApi(id);
      showNotification('Task deleted.');
      setTodos(todos.filter(t => t.id !== id));
      fetchTodos();
    } catch (err) {
      showNotification(err.message || 'Failed to delete task.', 'danger');
    }
  };

  const openEditModal = (todo) => {
    setEditingTodo(todo);
    setEditTitle(todo.title);
    setEditDescription(todo.description || '');
    setEditPriority(todo.priority || 'medium');
    setEditRecurrence(todo.recurrence || 'none');
    setEditDueDate(todo.due_date || '');
  };

  const handleUpdateTodo = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    setEditSubmitting(true);
    try {
      await updateTodoApi(editingTodo.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority,
        recurrence: editRecurrence,
        due_date: editDueDate || null
      });
      showNotification('Task updated successfully.');
      setEditingTodo(null);
      fetchTodos();
    } catch (err) {
      showNotification(err.message || 'Failed to update task.', 'danger');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Completion calculation
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>To-Do & Tasks</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Plan, organize, and view monthly routines by selected month
          </p>
        </div>
      </div>

      {feedback.message && (
        <div className={`status-badge ${feedback.type === 'danger' ? 'danger' : 'success'}`} style={{ width: '100%', marginBottom: '16px' }}>
          <span className="status-dot"></span>
          {feedback.message}
        </div>
      )}

      {/* Interactive Month Selector Bar */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handlePrevMonth}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-background)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Previous month"
          >
            ◀ Prev Month
          </button>

          <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-color)', minWidth: '160px', textAlign: 'center' }}>
            📅 {getFormattedMonthLabel(selectedMonth)}
          </span>

          <button
            onClick={handleNextMonth}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-background)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Next month"
          >
            Next Month ▶
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleCurrentMonth}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--primary-color)',
              backgroundColor: selectedMonth === getCurrentYearMonth() ? 'var(--primary-color)' : 'transparent',
              color: selectedMonth === getCurrentYearMonth() ? '#ffffff' : 'var(--primary-color)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Current Month
          </button>

          <button
            onClick={handleToggleAllMonths}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: selectedMonth === 'all' ? 'var(--primary-color)' : 'transparent',
              color: selectedMonth === 'all' ? '#ffffff' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {selectedMonth === 'all' ? 'Filtering: All Time' : 'View All Months'}
          </button>
        </div>
      </div>

      {/* Progress & Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
            {selectedMonth === 'all' ? 'TOTAL TASKS' : 'TASKS IN ' + getFormattedMonthLabel(selectedMonth).toUpperCase()}
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '4px' }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>PENDING</div>
          <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '4px', color: '#d97706' }}>{stats.pending}</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>MONTHLY / RECURRING</div>
          <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '4px', color: 'var(--primary-color)' }}>{stats.recurring || 0}</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>COMPLETED</div>
          <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '4px', color: 'var(--success-color)' }}>{stats.completed}</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>COMPLETION</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary-color)' }}>{completionRate}%</div>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', marginTop: '10px', overflow: 'hidden' }}>
            <div style={{
              width: `${completionRate}%`,
              height: '100%',
              backgroundColor: 'var(--primary-color)',
              borderRadius: '4px',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Quick Add Task Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <form onSubmit={handleCreateTodo}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className="form-control"
              placeholder="What needs to be done? (Press Enter to add)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{ flex: '1', minWidth: '220px' }}
              required
            />

            {/* Repeat Selector */}
            <select
              className="form-control"
              value={newRecurrence}
              onChange={(e) => setNewRecurrence(e.target.value)}
              style={{ width: 'auto', minWidth: '130px', fontWeight: newRecurrence !== 'none' ? '600' : 'normal' }}
              title="Repeat frequency"
            >
              <option value="none">One-time</option>
              <option value="monthly">🔁 Monthly</option>
              <option value="weekly">🔁 Weekly</option>
              <option value="daily">🔁 Daily</option>
            </select>

            {/* Priority Selector */}
            <select
              className="form-control"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              style={{ width: 'auto', minWidth: '110px' }}
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>

            {/* Due Date Picker */}
            <input
              type="date"
              className="form-control"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              style={{ width: 'auto' }}
              title="Due date (for monthly tasks, sets the monthly target day)"
            />

            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                padding: '8px 12px',
                fontSize: '13px',
                cursor: 'pointer',
                color: showNotes ? 'var(--primary-color)' : 'var(--text-muted)'
              }}
            >
              {showNotes ? 'Hide Notes' : '+ Notes'}
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !newTitle.trim()}
              style={{ minHeight: '38px', padding: '0 20px' }}
            >
              {submitting ? 'Adding...' : '+ Add Task'}
            </button>
          </div>

          {showNotes && (
            <div style={{ marginTop: '12px' }}>
              <textarea
                className="form-control"
                placeholder="Add additional details or notes for this task..."
                rows="2"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          )}
        </form>
      </div>

      {/* Task Filters & Search Bar */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Tasks', count: stats.total },
              { id: 'today', label: 'Today', count: stats.today_pending },
              { id: 'pending', label: 'Pending', count: stats.pending },
              { id: 'recurring', label: '🔁 Monthly / Recurring', count: stats.recurring },
              { id: 'completed', label: 'Completed', count: stats.completed },
              { id: 'high', label: '🔴 High Priority' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backgroundColor: filter === tab.id ? 'var(--primary-color)' : 'var(--card-background)',
                  color: filter === tab.id ? '#ffffff' : 'var(--text-color)',
                  transition: 'var(--transition)'
                }}
              >
                {tab.label} {tab.count !== undefined && tab.count > 0 ? `(${tab.count})` : ''}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ minWidth: '200px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '13px', padding: '6px 12px' }}
            />
          </div>
        </div>

        {/* Task List */}
        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading tasks for {getFormattedMonthLabel(selectedMonth)}...
          </div>
        ) : todos.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
            <p style={{ fontSize: '15px', fontWeight: '500' }}>No tasks found for {getFormattedMonthLabel(selectedMonth)}.</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Add a new task above or navigate to another month!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {todos.map(todo => {
              const isCompleted = todo.status === 'completed';
              const isOverdue = !isCompleted && todo.due_date && todo.due_date < todayStr;
              const isDueToday = !isCompleted && todo.due_date === todayStr;

              return (
                <div
                  key={todo.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: isCompleted ? '#f9fafb' : 'var(--card-background)',
                    opacity: isCompleted ? 0.75 : 1,
                    transition: 'var(--transition)'
                  }}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => handleToggle(todo)}
                    style={{
                      marginTop: '4px',
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: 'var(--primary-color)'
                    }}
                  />

                  {/* Task Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: 'var(--text-color)',
                        textDecoration: isCompleted ? 'line-through' : 'none'
                      }}>
                        {todo.title}
                      </span>

                      {/* Recurrence Badge */}
                      {todo.recurrence && todo.recurrence !== 'none' && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontWeight: '600',
                          backgroundColor: '#e0e7ff',
                          color: '#4338ca'
                        }}>
                          🔁 {todo.recurrence.toUpperCase()}
                        </span>
                      )}

                      {/* Priority Badge */}
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: '600',
                        backgroundColor: 
                          todo.priority === 'high' ? '#fee2e2' :
                          todo.priority === 'low' ? '#f1f5f9' : '#fef3c7',
                        color:
                          todo.priority === 'high' ? '#b91c1c' :
                          todo.priority === 'low' ? '#475569' : '#b45309'
                      }}>
                        {todo.priority.toUpperCase()}
                      </span>

                      {/* Due Date Badge */}
                      {todo.due_date && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '600',
                          backgroundColor: isOverdue ? '#fef2f2' : isDueToday ? '#eff6ff' : '#f3f4f6',
                          color: isOverdue ? '#dc2626' : isDueToday ? 'var(--primary-color)' : 'var(--text-muted)'
                        }}>
                          📅 {isDueToday ? 'Today' : todo.due_date} {isOverdue ? '(Overdue)' : ''}
                        </span>
                      )}
                    </div>

                    {todo.description && (
                      <p style={{
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        marginTop: '4px',
                        marginBottom: 0,
                        whiteSpace: 'pre-line',
                        textDecoration: isCompleted ? 'line-through' : 'none'
                      }}>
                        {todo.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      onClick={() => openEditModal(todo)}
                      title="Edit task"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-color)',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(todo.id)}
                      title="Delete task"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger-color)',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Task Modal */}
      {editingTodo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--card-background)',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            maxWidth: '500px',
            width: '100%',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafafa'
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Edit Task</h2>
              <button
                onClick={() => setEditingTodo(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTodo} style={{ padding: '20px' }}>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Repeat Frequency</label>
                <select
                  className="form-control"
                  value={editRecurrence}
                  onChange={(e) => setEditRecurrence(e.target.value)}
                >
                  <option value="none">One-time</option>
                  <option value="monthly">🔁 Monthly</option>
                  <option value="weekly">🔁 Weekly</option>
                  <option value="daily">🔁 Daily</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-control"
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes / Details</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingTodo(null)}
                  style={{ minHeight: '36px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editSubmitting || !editTitle.trim()}
                  style={{ minHeight: '36px', fontSize: '13px' }}
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
