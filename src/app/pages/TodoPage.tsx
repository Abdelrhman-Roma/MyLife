/**
 * Todo Page
 * Main Todo feature page with real-time task management
 */

import { type FC, useCallback } from 'react';
import { useTodoData } from '../../features/todo/hooks/useTodoData';
import { useTodoLayout } from '../../features/todo/hooks/useTodoLayout';
import { TodoHeader } from '../../features/todo/components/TodoHeader';
import { TodoFilters } from '../../features/todo/components/TodoFilters';
import { TodoList } from '../../features/todo/components/TodoList';
import { TodoModal } from '../../features/todo/components/TodoModal';
import type { Task } from '../../features/todo/types/todo';
import '../../styles/todo.css';

const TodoPage: FC = () => {
  const [{ tasks, loading, error, syncing }, actions] = useTodoData();
  const [layout, layoutActions] = useTodoLayout(tasks);

  const handleSaveTask = useCallback(
    async (data: Partial<Task>) => {
      if (layout.editingTask) {
        // Update existing task
        await actions.updateTask(layout.editingTask.id, data);
      } else {
        // Create new task
        await actions.createTask(data as Omit<Task, 'id' | 'createdAt' | 'completedAt'>);
      }
    },
    [layout.editingTask, actions]
  );

  const handleReorder = useCallback(
    async (draggedId: string, targetId: string) => {
      // Find tasks and calculate new order
      const draggedTask = tasks.find((t) => t.id === draggedId);
      const targetTask = tasks.find((t) => t.id === targetId);

      if (!draggedTask || !targetTask) return;

      const sortedTasks = [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0));
      const draggedIndex = sortedTasks.findIndex((t) => t.id === draggedId);
      const targetIndex = sortedTasks.findIndex((t) => t.id === targetId);

      // Build batch update operations
      const operations: Array<{ type: 'update'; id: string; data: Partial<Task> }> = [];

      if (draggedIndex < targetIndex) {
        // Moving down
        for (let i = draggedIndex + 1; i <= targetIndex; i++) {
          operations.push({
            type: 'update',
            id: sortedTasks[i].id,
            data: { order: (sortedTasks[i].order || 0) - 1 },
          });
        }
        operations.push({
          type: 'update',
          id: draggedId,
          data: { order: targetTask.order },
        });
      } else {
        // Moving up
        for (let i = targetIndex; i < draggedIndex; i++) {
          operations.push({
            type: 'update',
            id: sortedTasks[i].id,
            data: { order: (sortedTasks[i].order || 0) + 1 },
          });
        }
        operations.push({
          type: 'update',
          id: draggedId,
          data: { order: targetTask.order },
        });
      }

      await actions.batchUpdate(operations);
    },
    [tasks, actions]
  );

  return (
    <div className="todo-page">
      <TodoHeader stats={layout.stats} onAddClick={layoutActions.openAddModal} />

      <TodoFilters
        filter={layout.filter}
        tag={layout.tag}
        search={layout.search}
        sort={layout.sort}
        availableTags={layout.availableTags}
        onFilterChange={layoutActions.setFilter}
        onTagChange={layoutActions.setTag}
        onSearchChange={layoutActions.setSearch}
        onSortChange={layoutActions.setSort}
      />

      {syncing && <div className="td-sync-indicator">Syncing...</div>}

      <TodoList
        tasks={layout.filteredTasks}
        loading={loading}
        error={error}
        allowReorder={layout.sort === 'smart' && layout.filter === 'all'}
        onToggle={actions.toggleTask}
        onEdit={layoutActions.openEditModal}
        onDelete={actions.deleteTask}
        onReorder={handleReorder}
      />

      <TodoModal
        open={layout.modalOpen}
        editingTask={layout.editingTask}
        onClose={layoutActions.closeModal}
        onSave={handleSaveTask}
      />
    </div>
  );
};

export default TodoPage;
