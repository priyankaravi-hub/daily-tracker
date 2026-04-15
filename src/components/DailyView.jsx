import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { format, isToday, isYesterday } from 'date-fns'
import { toDateKey, getGreeting } from '../utils/helpers'
import TaskItem from './TaskItem'
import TaskModal from './TaskModal'
import MoodTracker from './MoodTracker'
import LearningsPanel from './LearningsPanel'
import { Plus, ChevronLeft, ChevronRight, Calendar, Sparkles, ListTodo, Trophy, Zap } from 'lucide-react'
import Mascot from './Mascot'

export default function DailyView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  const dateKey = toDateKey(currentDate)

  const tasks = useLiveQuery(
    () => db.tasks.where('date').equals(dateKey).toArray(),
    [dateKey]
  )

  const dailyLog = useLiveQuery(
    () => db.dailyLogs.where('date').equals(dateKey).first(),
    [dateKey]
  )

  const allDoneTasks = useLiveQuery(() => db.tasks.where('status').equals('done').count())

  const navigate = (days) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + days)
    setCurrentDate(d)
  }

  const goToToday = () => setCurrentDate(new Date())

  const todoTasks = tasks?.filter(t => t.status === 'todo') || []
  const inProgressTasks = tasks?.filter(t => t.status === 'in-progress') || []
  const doneTasks = tasks?.filter(t => t.status === 'done') || []
  const challenges = tasks?.filter(t => t.isChallenge) || []

  const completionRate = tasks?.length > 0
    ? Math.round((doneTasks.length / tasks.length) * 100)
    : 0

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Mascot size={64} className="flex-shrink-0 -mb-1" />
            <div>
              <p className="text-sm text-gray-400 font-medium">{getGreeting()}, Priyanka!</p>
              <h1 className="text-2xl font-bold text-gray-100">
                {format(currentDate, 'EEE, MMM d')}
                {isToday(currentDate) && <span className="ml-2 text-sm font-medium text-primary-400">Today</span>}
                {isYesterday(currentDate) && <span className="ml-2 text-sm font-medium text-gray-500">Yesterday</span>}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-navy-700 text-gray-500 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={isToday(currentDate) ? undefined : goToToday}
              className={`btn-ghost text-xs flex items-center gap-1 ${isToday(currentDate) ? 'cursor-default' : 'text-primary-400 hover:text-primary-300'}`}
            >
              <Calendar size={14} /> {format(currentDate, 'MMM d, yyyy')}
            </button>
            <button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-navy-700 text-gray-500 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="glass-card p-3 text-center">
            <ListTodo size={16} className="mx-auto mb-1 text-primary-500" />
            <p className="text-lg font-bold text-gray-200">{tasks?.length || 0}</p>
            <p className="text-[10px] text-gray-400">Total Tasks</p>
          </div>
          <div className="glass-card p-3 text-center">
            <Zap size={16} className="mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold text-gray-200">{inProgressTasks.length}</p>
            <p className="text-[10px] text-gray-400">In Progress</p>
          </div>
          <div className="glass-card p-3 text-center">
            <Trophy size={16} className="mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold text-gray-200">{doneTasks.length}</p>
            <p className="text-[10px] text-gray-400">Completed</p>
          </div>
          <div className="glass-card p-3 text-center">
            <Sparkles size={16} className="mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold text-gray-200">{completionRate}%</p>
            <p className="text-[10px] text-gray-400">Done Rate</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main task list */}
        <div className="col-span-2 space-y-4">
          {/* Add task button */}
          <button
            onClick={() => { setEditingTask(null); setShowModal(true) }}
            className="w-full glass-card p-3 flex items-center gap-2 text-gray-400 hover:text-primary-500 hover:border-primary-200 transition-all group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-sm font-medium">Add a task...</span>
          </button>

          {/* Challenges section */}
          {challenges.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles size={12} /> Challenges ({challenges.filter(c => c.status === 'done').length}/{challenges.length})
              </h3>
              <div className="space-y-2">
                {challenges.map(task => (
                  <TaskItem key={task.id} task={task} onEdit={t => { setEditingTask(t); setShowModal(true) }} />
                ))}
              </div>
            </div>
          )}

          {/* In Progress */}
          {inProgressTasks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">
                In Progress ({inProgressTasks.length})
              </h3>
              <div className="space-y-2">
                {inProgressTasks.filter(t => !t.isChallenge).map(task => (
                  <TaskItem key={task.id} task={task} onEdit={t => { setEditingTask(t); setShowModal(true) }} />
                ))}
              </div>
            </div>
          )}

          {/* To Do */}
          {todoTasks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                To Do ({todoTasks.length})
              </h3>
              <div className="space-y-2">
                {todoTasks.filter(t => !t.isChallenge).map(task => (
                  <TaskItem key={task.id} task={task} onEdit={t => { setEditingTask(t); setShowModal(true) }} />
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {doneTasks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">
                Completed ({doneTasks.length})
              </h3>
              <div className="space-y-2">
                {doneTasks.filter(t => !t.isChallenge).map(task => (
                  <TaskItem key={task.id} task={task} onEdit={t => { setEditingTask(t); setShowModal(true) }} />
                ))}
              </div>
            </div>
          )}

          {(!tasks || tasks.length === 0) && (
            <div className="text-center py-12">
              <Mascot size={100} className="mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No tasks for this day yet.</p>
              <p className="text-gray-300 text-xs mt-1">Click "Add a task" to get started!</p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <MoodTracker date={currentDate} existingLog={dailyLog} />
          <LearningsPanel date={currentDate} />

          {/* Daily completion */}
          {tasks?.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Daily Progress</h3>
              <div className="relative pt-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500">
                    {doneTasks.length} of {tasks.length} tasks
                  </span>
                  <span className="text-xs font-bold text-primary-400">{completionRate}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-navy-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${completionRate}%`,
                      background: completionRate === 100
                        ? 'linear-gradient(90deg, #51cf66, #20c997)'
                        : 'linear-gradient(90deg, #5c7cfa, #748ffc)'
                    }}
                  />
                </div>
                {completionRate === 100 && (
                  <p className="text-xs text-green-600 font-medium text-center mt-2 animate-bounce-in">
                    All done! Amazing work! 🎉
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          date={dateKey}
          onClose={() => { setShowModal(false); setEditingTask(null) }}
        />
      )}
    </div>
  )
}
