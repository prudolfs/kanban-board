import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Column } from './column';
import { TaskCard } from './task-card';
import { Task, Column as ColumnType, ColumnId } from '../types';
import { v4 as uuidv4 } from 'uuid';

const initialColumns: ColumnType[] = [
  {
    id: 'todo',
    title: 'To Do',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    tasks: [
      {
        id: '1',
        title: 'Design user interface mockups',
        description: 'Create high-fidelity mockups for the dashboard and user profile pages',
        priority: 'high',
        dueDate: '2025-01-20',
        createdAt: '2025-01-15T10:00:00Z',
      },
      {
        id: '2',
        title: 'Research competitor features',
        description: 'Analyze top 5 competitors and document key features',
        priority: 'medium',
        createdAt: '2025-01-15T11:00:00Z',
      },
    ],
  },
  {
    id: 'doing',
    title: 'Doing',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    tasks: [
      {
        id: '3',
        title: 'Implement authentication system',
        description: 'Set up JWT-based authentication with refresh tokens',
        priority: 'high',
        dueDate: '2025-01-18',
        createdAt: '2025-01-15T09:00:00Z',
      },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    tasks: [
      {
        id: '4',
        title: 'Set up development environment',
        description: 'Configure React, TypeScript, and Tailwind CSS',
        priority: 'medium',
        createdAt: '2025-01-14T16:00:00Z',
      },
    ],
  },
];

export function KanbanBoard() {
  const [columns, setColumns] = useState<ColumnType[]>(initialColumns);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
  );

  const findColumnByTaskId = (taskId: string) => {
    return columns.find(column => column.tasks.some(task => task.id === taskId));
  };

  const findTaskById = (taskId: string) => {
    for (const column of columns) {
      const task = column.tasks.find(task => task.id === taskId);
      if (task) return task;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTaskById(event.active.id as string);
    setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnByTaskId(activeId);
    const overColumn = columns.find(column => 
      column.id === overId || column.tasks.some(task => task.id === overId)
    );

    if (!activeColumn || !overColumn || activeColumn === overColumn) return;

    setColumns(columns => {
      const activeItems = activeColumn.tasks;
      const overItems = overColumn.tasks;

      const activeIndex = activeItems.findIndex(task => task.id === activeId);
      const overIndex = overItems.findIndex(task => task.id === overId);

      let newIndex: number;
      if (overId in overColumn.tasks.map(task => task.id)) {
        newIndex = overIndex;
      } else {
        newIndex = overItems.length;
      }

      return columns.map(column => {
        if (column.id === activeColumn.id) {
          return {
            ...column,
            tasks: column.tasks.filter(task => task.id !== activeId)
          };
        } else if (column.id === overColumn.id) {
          return {
            ...column,
            tasks: [
              ...column.tasks.slice(0, newIndex),
              activeItems[activeIndex],
              ...column.tasks.slice(newIndex)
            ]
          };
        }
        return column;
      });
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnByTaskId(activeId);
    const overColumn = columns.find(column => 
      column.id === overId || column.tasks.some(task => task.id === overId)
    );

    if (!activeColumn || !overColumn) return;

    if (activeColumn === overColumn) {
      const activeIndex = activeColumn.tasks.findIndex(task => task.id === activeId);
      const overIndex = overColumn.tasks.findIndex(task => task.id === overId);

      if (activeIndex !== overIndex) {
        setColumns(columns => columns.map(column => {
          if (column.id === activeColumn.id) {
            return {
              ...column,
              tasks: arrayMove(column.tasks, activeIndex, overIndex)
            };
          }
          return column;
        }));
      }
    }
  };

  const handleAddTask = (columnId: string, newTask: Omit<Task, 'id' | 'createdAt'>) => {
    const task: Task = {
      ...newTask,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    setColumns(columns => columns.map(column => {
      if (column.id === columnId) {
        return {
          ...column,
          tasks: [...column.tasks, task]
        };
      }
      return column;
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    setColumns(columns => columns.map(column => ({
      ...column,
      tasks: column.tasks.filter(task => task.id !== taskId)
    })));
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setColumns(columns => columns.map(column => ({
      ...column,
      tasks: column.tasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    })));
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      autoScroll={{
        enabled: true,
        threshold: {
          x: 0.2,
          y: 0.2,
        },
        acceleration: 0.01,
      }}
    >
      <div className="flex gap-6 h-full overflow-x-auto">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={handleUpdateTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            onDelete={() => {}}
            onUpdate={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}