/**
 * TodoList Component
 * Task list container with drag-to-reorder support
 */

import { type FC, useState, useCallback } from 'react';
import type { TaskWithMeta } from '../types/todo';
import { TodoCard } from './TodoCard';

export interface TodoListProps {
  tasks: TaskWithMeta[];
  loading: boolean;
  error: string | null;
  allowReorder?: boolean;
  onToggle: (id: string) => void;
  onEdit: (task: TaskWithMeta) => void;
  onDelete: (id: string) => void;
  onReorder?: (draggedId: string, targetId: string) => void;
}

export const TodoList: FC<TodoListProps> = ({
  tasks,
  loading,
  error,
  allowReorder = false,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (draggedId && draggedId !== targetId) {
        setDragOverId(targetId);
      }
    },
    [draggedId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (draggedId && draggedId !== targetId && onReorder) {
        onReorder(draggedId, targetId);
      }
      setDraggedId(null);
      setDragOverId(null);
    },
    [draggedId, onReorder]
  );

  if (loading) {
    return (
      <div className="td-loading">
        <div className="td-spinner" />
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="td-error">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
          <path d="M24 16V26M24 30V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p>{error}</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="td-empty">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <path
            d="M32 8L8 20V44L32 56L56 44V20L32 8Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M32 8V56M8 20L56 44M56 20L8 44" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        </svg>
        <p>No tasks found. Add a task to get started!</p>
      </div>
    );
  }

  return (
    <div className="td-list">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`td-card-wrapper ${dragOverId === task.id ? 'is-drag-over' : ''}`}
          onDragOver={(e) => allowReorder && handleDragOver(e, task.id)}
          onDrop={(e) => allowReorder && handleDrop(e, task.id)}
        >
          <TodoCard
            task={task}
            draggable={allowReorder && !task.completed}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        </div>
      ))}
    </div>
  );
};
