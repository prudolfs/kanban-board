import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column as ColumnType, Task } from '../types';
import { TaskCard } from './task-card';
import { Plus, MoreHorizontal } from 'lucide-react';

interface ColumnProps {
  column: ColumnType;
  onAddTask: (columnId: string, task: Omit<Task, 'id' | 'createdAt'>) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

export function Column({ column, onAddTask, onDeleteTask, onUpdateTask }: ColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Omit<Task, 'id' | 'createdAt'> = {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || undefined,
      };
      
      onAddTask(column.id, newTask);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPriority('medium');
      setNewTaskDueDate('');
      setIsAddingTask(false);
    }
  };

  const handleCancelAdd = () => {
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskPriority('medium');
    setNewTaskDueDate('');
    setIsAddingTask(false);
  };

  return (
    <div className="flex-1 min-w-80 max-w-sm">
      <div className={`rounded-xl ${column.bgColor} border border-gray-200 flex flex-col shadow-sm h-[calc(100vh-200px)]`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
              <h2 className="font-semibold text-gray-900">{column.title}</h2>
              <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                {column.tasks.length}
              </span>
            </div>
            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div
          ref={setNodeRef}
          className={`flex-1 p-4 min-h-32 transition-colors overflow-y-auto ${
            isOver ? 'bg-blue-50 bg-opacity-50' : ''
          } scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400`}
        >
          <SortableContext items={column.tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 group">
              {column.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDelete={onDeleteTask}
                  onUpdate={onUpdateTask}
                />
              ))}
            </div>
          </SortableContext>
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl flex-shrink-0">
          {isAddingTask ? (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="space-y-3">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full text-sm font-medium border-0 outline-none placeholder-gray-400"
                  autoFocus
                />
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Add description..."
                  className="w-full text-sm text-gray-600 border-0 outline-none placeholder-gray-400 resize-none"
                  rows={2}
                />
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCancelAdd}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTask}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    Add Task
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingTask(true)}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Add a task</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}