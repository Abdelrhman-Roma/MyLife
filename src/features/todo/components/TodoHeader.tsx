/**
 * TodoHeader Component
 * Displays todo statistics and add task button
 */

import type { FC } from 'react';

export interface TodoHeaderProps {
  stats: {
    total: number;
    completed: number;
    overdue: number;
    today: number;
    upcoming: number;
  };
  onAddClick: () => void;
}

export const TodoHeader: FC<TodoHeaderProps> = ({ stats, onAddClick }) => {
  return (
    <div className="td-header-top">
      <div className="td-stats">
        <div className="td-stat">
          <span className="td-stat-label">Total</span>
          <span className="td-stat-value">{stats.total}</span>
        </div>
        <div className="td-stat">
          <span className="td-stat-label">Completed</span>
          <span className="td-stat-value">{stats.completed}</span>
        </div>
        <div className="td-stat">
          <span className="td-stat-label">Overdue</span>
          <span className="td-stat-value td-stat-overdue">{stats.overdue}</span>
        </div>
        <div className="td-stat">
          <span className="td-stat-label">Today</span>
          <span className="td-stat-value">{stats.today}</span>
        </div>
        <div className="td-stat">
          <span className="td-stat-label">Upcoming</span>
          <span className="td-stat-value">{stats.upcoming}</span>
        </div>
      </div>
      <button className="td-add-btn" onClick={onAddClick} aria-label="Add new task">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>Add Task</span>
      </button>
    </div>
  );
};
