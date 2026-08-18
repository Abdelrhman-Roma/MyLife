/**
 * TodoModal Component
 * Add/edit task modal with comprehensive form
 */

import { type FC, useState, useEffect } from 'react';
import type { Task, TaskPriority, RecurringFrequency, RecurringConfig } from '../types/todo';

export interface TodoModalProps {
  open: boolean;
  editingTask: Task | null;
  onClose: () => void;
  onSave: (data: Partial<Task>) => Promise<void>;
}

interface FormData {
  title: string;
  notes: string;
  priority: TaskPriority;
  tags: string[];
  dueDate: string;
  time: string;
  recurring: RecurringConfig | null;
  reminder: string;
  dependsOn: string[];
  subtasks: Array<{ title: string; completed: boolean }>;
  attachments: Array<{ name: string; url: string }>;
}

const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High'];
const RECURRING_FREQUENCIES: RecurringFrequency[] = ['Daily', 'Weekly', 'Monthly'];

export const TodoModal: FC<TodoModalProps> = ({ open, editingTask, onClose, onSave }) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    notes: '',
    priority: 'Medium',
    tags: [],
    dueDate: '',
    time: '',
    recurring: null,
    reminder: '',
    dependsOn: [],
    subtasks: [],
    attachments: [],
  });
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');

  // Initialize form data when editing
  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title || '',
        notes: editingTask.notes || '',
        priority: editingTask.priority || 'Medium',
        tags: editingTask.tags || [],
        dueDate: editingTask.dueDate || '',
        time: editingTask.time || '',
        recurring: editingTask.recurring || null,
        reminder: editingTask.reminder || '',
        dependsOn: editingTask.dependsOn || [],
        subtasks: (editingTask.subtasks || []).map(st => ({ title: st.title, completed: st.completed })),
        attachments: (editingTask.attachments || []).map(att => ({ name: att.name, url: att.url })),
      });
    } else {
      // Reset for new task
      setFormData({
        title: '',
        notes: '',
        priority: 'Medium',
        tags: [],
        dueDate: '',
        time: '',
        recurring: null,
        reminder: '',
        dependsOn: [],
        subtasks: [],
        attachments: [],
      });
    }
  }, [editingTask, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      await onSave({
        title: formData.title.trim(),
        notes: formData.notes.trim() || undefined,
        priority: formData.priority,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        dueDate: formData.dueDate || undefined,
        time: formData.time || undefined,
        recurring: formData.recurring,
        reminder: formData.reminder || undefined,
        dependsOn: formData.dependsOn.length > 0 ? formData.dependsOn : undefined,
        subtasks: formData.subtasks.length > 0 ? formData.subtasks.map((st, i) => ({ id: `st-${Date.now()}-${i}`, title: st.title, completed: st.completed })) : undefined,
        attachments: formData.attachments.length > 0 ? formData.attachments.map((att, i) => ({ id: `att-${Date.now()}-${i}`, name: att.name, url: att.url })) : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const handleAddSubtask = () => {
    const title = subtaskInput.trim();
    if (title) {
      setFormData({
        ...formData,
        subtasks: [...formData.subtasks, { title, completed: false }],
      });
      setSubtaskInput('');
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setFormData({
      ...formData,
      subtasks: formData.subtasks.filter((_, i) => i !== index),
    });
  };

  const handleToggleSubtask = (index: number) => {
    setFormData({
      ...formData,
      subtasks: formData.subtasks.map((s, i) =>
        i === index ? { ...s, completed: !s.completed } : s
      ),
    });
  };

  if (!open) return null;

  return (
    <div className="td-modal-overlay" onClick={onClose}>
      <div className="td-modal" onClick={(e) => e.stopPropagation()}>
        <div className="td-modal-header">
          <h2>{editingTask ? 'Edit Task' : 'Add New Task'}</h2>
          <button className="td-modal-close" onClick={onClose} aria-label="Close modal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <form className="td-modal-form" onSubmit={handleSubmit}>
          <div className="td-form-group">
            <label htmlFor="task-title" className="td-label">
              Task Title *
            </label>
            <input
              id="task-title"
              type="text"
              className="td-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title..."
              required
              autoFocus
            />
          </div>

          <div className="td-form-group">
            <label htmlFor="task-notes" className="td-label">
              Notes
            </label>
            <textarea
              id="task-notes"
              className="td-textarea"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes or description..."
              rows={3}
            />
          </div>

          <div className="td-form-row">
            <div className="td-form-group">
              <label htmlFor="task-priority" className="td-label">
                Priority
              </label>
              <select
                id="task-priority"
                className="td-select"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="td-form-group">
              <label htmlFor="task-date" className="td-label">
                Due Date
              </label>
              <input
                id="task-date"
                type="date"
                className="td-input"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <div className="td-form-group">
              <label htmlFor="task-time" className="td-label">
                Time
              </label>
              <input
                id="task-time"
                type="time"
                className="td-input"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          <div className="td-form-group">
            <label className="td-label">
              <input
                type="checkbox"
                checked={!!formData.recurring}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recurring: e.target.checked ? { freq: 'Daily', frequency: 'Daily' } : null,
                  })
                }
              />
              Recurring Task
            </label>
            {formData.recurring && (
              <select
                className="td-select"
                value={formData.recurring.freq}
                onChange={(e) => {
                  const freq = e.target.value as RecurringFrequency;
                  setFormData({
                    ...formData,
                    recurring: { freq, frequency: freq },
                  });
                }}
              >
                {RECURRING_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="td-form-group">
            <label htmlFor="task-tags" className="td-label">
              Tags
            </label>
            <div className="td-tag-input-row">
              <input
                id="task-tags"
                type="text"
                className="td-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Type and press Enter..."
              />
              <button type="button" className="td-btn-secondary" onClick={handleAddTag}>
                Add
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="td-tags-list">
                {formData.tags.map((tag) => (
                  <span key={tag} className="td-tag-chip">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      aria-label={`Remove ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="td-form-group">
            <label htmlFor="task-subtasks" className="td-label">
              Subtasks
            </label>
            <div className="td-tag-input-row">
              <input
                id="task-subtasks"
                type="text"
                className="td-input"
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                placeholder="Add subtask..."
              />
              <button type="button" className="td-btn-secondary" onClick={handleAddSubtask}>
                Add
              </button>
            </div>
            {formData.subtasks.length > 0 && (
              <div className="td-subtasks-list">
                {formData.subtasks.map((subtask, index) => (
                  <div key={index} className="td-subtask-item">
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={() => handleToggleSubtask(index)}
                    />
                    <span className={subtask.completed ? 'is-completed' : ''}>{subtask.title}</span>
                    <button
                      type="button"
                      className="td-remove-subtask"
                      onClick={() => handleRemoveSubtask(index)}
                      aria-label="Remove subtask"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="td-modal-footer">
            <button type="button" className="td-btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="td-btn-primary" disabled={saving || !formData.title.trim()}>
              {saving ? 'Saving...' : editingTask ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
