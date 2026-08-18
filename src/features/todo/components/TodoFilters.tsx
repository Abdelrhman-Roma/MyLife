/**
 * TodoFilters Component
 * Filter chips, tag selector, search input, and sort dropdown
 */

import type { FC } from 'react';
import type { TodoFilter, TodoSort } from '../types/todo';

export interface TodoFiltersProps {
  filter: TodoFilter;
  tag: string;
  search: string;
  sort: TodoSort;
  availableTags: string[];
  onFilterChange: (filter: TodoFilter) => void;
  onTagChange: (tag: string) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: TodoSort) => void;
}

const FILTERS: Array<{ value: TodoFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
];

const SORT_OPTIONS: Array<{ value: TodoSort; label: string }> = [
  { value: 'smart', label: 'Smart Order' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Created Date' },
  { value: 'title', label: 'Title' },
];

export const TodoFilters: FC<TodoFiltersProps> = ({
  filter,
  tag,
  search,
  sort,
  availableTags,
  onFilterChange,
  onTagChange,
  onSearchChange,
  onSortChange,
}) => {
  return (
    <div className="td-filters-section">
      <div className="td-search-row">
        <input
          type="search"
          className="td-search"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search tasks"
        />
      </div>

      <div className="td-filter-row">
        <div className="td-filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`td-chip ${filter === f.value ? 'is-active' : ''}`}
              onClick={() => onFilterChange(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {availableTags.length > 0 && (
          <select
            className="td-tag-select"
            value={tag}
            onChange={(e) => onTagChange(e.target.value)}
            aria-label="Filter by tag"
          >
            <option value="all">All Tags</option>
            {availableTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}

        <select
          className="td-sort-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as TodoSort)}
          aria-label="Sort tasks"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
