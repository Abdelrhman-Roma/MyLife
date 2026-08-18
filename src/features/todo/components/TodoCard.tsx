/**
 * TodoCard Component
 * Individual task card with checkbox, content, and action buttons
 */

import type { FC } from 'react';
import type { TaskWithMeta } from '../types/todo';

export interface TodoCardProps {
  task: TaskWithMeta;
  draggable?: boolean;
  onToggle: (id: string) => void;
  onEdit: (task: TaskWithMeta) => void;
  onDelete: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
}

export const TodoCard: FC<TodoCardProps> = ({
  task,
  draggable = false,
  onToggle,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
}) => {
  const cardClasses = [
    'td-card',
    task.completed && 'is-completed',
    task.isOverdue && !task.completed && 'is-overdue',
    draggable && 'is-draggable',
  ]
    .filter(Boolean)
    .join(' ');

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(task.id);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', task.id);
    }
  };

  const handleDragEnd = () => {
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div
      className={cardClasses}
      data-priority={task.priority}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {draggable && (
        <div className="td-drag-handle" aria-label="Drag to reorder">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4h4M6 8h4M6 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}

      <input
        type="checkbox"
        className="td-checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        aria-label={`Mark task "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
      />

      <div className="td-content">
        <div className="td-title">{task.title}</div>

        {task.notes && <div className="td-notes">{task.notes}</div>}

        <div className="td-meta">
          {task.dueDate && (
            <span className="td-meta-item">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M11 2H3C2.44772 2 2 2.44772 2 3V11C2 11.5523 2.44772 12 3 12H11C11.5523 12 12 11.5523 12 11V3C12 2.44772 11.5523 2 11 2Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M4 1V3M10 1V3M2 5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {formatDate(task.dueDate)}
              {task.time && ` at ${formatTime(task.time)}`}
            </span>
          )}

          {task.priority && task.priority !== 'Medium' && (
            <span className={`td-priority td-priority-${task.priority.toLowerCase()}`}>
              {task.priority}
            </span>
          )}

          {task.recurring && (
            <span className="td-meta-item td-recurring">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M10 4L12 2M12 2L10 0M12 2H8C5.79086 2 4 3.79086 4 6V8M4 10L2 12M2 12L4 14M2 12H6C8.20914 12 10 10.2091 10 8V6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {task.recurring.frequency}
            </span>
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="td-tags">
              {task.tags.map((tag) => (
                <span key={tag} className="td-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {task.subtasks && task.subtasks.length > 0 && (
          <div className="td-subtasks">
            <div className="td-subtask-bar">
              <div
                className="td-subtask-progress"
                style={{
                  width: `${(task.subtasks.filter((s) => s.completed).length / task.subtasks.length) * 100}%`,
                }}
              />
            </div>
            <span className="td-subtask-count">
              {task.subtasks.filter((s) => s.completed).length} / {task.subtasks.length} subtasks
            </span>
          </div>
        )}

        {task.attachments && task.attachments.length > 0 && (
          <div className="td-attachments">
            {task.attachments.map((att, idx) => (
              <a
                key={idx}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="td-attachment"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 10L3 6L4 5L7 8L13 2L14 3L7 10Z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
                {att.name || 'Attachment'}
              </a>
            ))}
          </div>
        )}

        {task.dependsOn && task.dependsOn.length > 0 && (
          <div className="td-blocked-notice">
            Blocked by {task.dependsOn.length} task{task.dependsOn.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="td-actions">
        <button
          className="td-action-btn"
          onClick={() => onEdit(task)}
          aria-label="Edit task"
          title="Edit"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M11 2L14 5L5 14H2V11L11 2Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          className="td-action-btn td-action-delete"
          onClick={() => onDelete(task.id)}
          aria-label="Delete task"
          title="Delete"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 4H14M6 7V11M10 7V11M3 4L4 13C4 13.5523 4.44772 14 5 14H11C11.5523 14 12 13.5523 12 13L13 4M6 4V2C6 1.44772 6.44772 1 7 1H9C9.55228 1 10 1.44772 10 2V4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
