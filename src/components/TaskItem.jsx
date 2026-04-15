import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { PRIORITY_CONFIG, STATUS_CONFIG, formatDuration } from '../utils/helpers'
import { Check, Circle, Clock, Play, Square, Trash2, Edit3, ChevronDown, ChevronUp, Timer } from 'lucide-react'
import confetti from 'canvas-confetti'

export default function TaskItem({ task, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerStart, setTimerStart] = useState(null)
  const [elapsed, setElapsed] = useState(0)

  const tags = useLiveQuery(() => db.tags.toArray())
  const taskTags = tags?.filter(t => task.tagIds?.includes(t.id)) || []
  const project = useLiveQuery(() => task.projectId ? db.projects.get(task.projectId) : null, [task.projectId])

  // Timer
  React.useEffect(() => {
    let interval
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - timerStart) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, timerStart])

  const toggleStatus = async () => {
    const newStatus = task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in-progress' : 'done'
    const updates = { status: newStatus }

    if (newStatus === 'done') {
      updates.completedAt = new Date().toISOString()
      // Stop timer if running
      if (isTimerRunning) {
        await stopTimer()
      }
      // Confetti!
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 }, colors: ['#5c7cfa', '#ff9800', '#51cf66'] })
    } else {
      updates.completedAt = null
    }

    await db.tasks.update(task.id, updates)
  }

  const startTimer = () => {
    setTimerStart(Date.now())
    setIsTimerRunning(true)
    setElapsed(0)
  }

  const stopTimer = async () => {
    setIsTimerRunning(false)
    const duration = Math.floor((Date.now() - timerStart) / 60000) // minutes
    if (duration > 0) {
      await db.timeEntries.add({
        taskId: task.id,
        date: new Date().toISOString().split('T')[0],
        startTime: new Date(timerStart).toISOString(),
        endTime: new Date().toISOString(),
        duration,
      })
      await db.tasks.update(task.id, {
        timeSpent: (task.timeSpent || 0) + duration
      })
    }
    setTimerStart(null)
    setElapsed(0)
  }

  const deleteTask = async () => {
    await db.tasks.delete(task.id)
    await db.timeEntries.where('taskId').equals(task.id).delete()
  }

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const priority = PRIORITY_CONFIG[task.priority || 'medium']
  const isDone = task.status === 'done'

  return (
    <div className={`glass-card p-3 card-hover group ${isDone ? 'opacity-70' : ''} ${isTimerRunning ? 'ring-2 ring-primary-400 animate-pulse-glow' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Status toggle */}
        <button onClick={toggleStatus} className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110">
          {isDone ? (
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Check size={12} className="text-white" />
            </div>
          ) : task.status === 'in-progress' ? (
            <div className="w-5 h-5 rounded-full border-2 border-primary-500 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary-500" />
            </div>
          ) : (
            <Circle size={20} className="text-gray-300 hover:text-primary-400" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-200'}`}>
              {task.title}
            </span>
            <span className="tag-pill text-[10px]" style={{ background: priority.bg, color: priority.color }}>
              {priority.label}
            </span>
            {task.isChallenge && (
              <span className="tag-pill bg-purple-100 text-purple-600 text-[10px]">Challenge</span>
            )}
          </div>

          {/* Tags & Project */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {project && (
              <span className="tag-pill text-[10px]" style={{ background: project.color + '20', color: project.color }}>
                {project.emoji} {project.name}
              </span>
            )}
            {taskTags.map(tag => (
              <span key={tag.id} className="tag-pill text-[10px]" style={{ background: tag.color + '20', color: tag.color }}>
                {tag.name}
              </span>
            ))}
            {task.timeSpent > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <Clock size={10} /> {formatDuration(task.timeSpent)}
              </span>
            )}
          </div>

          {/* Expanded description */}
          {expanded && task.description && (
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">{task.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Timer */}
          {!isDone && (
            <button
              onClick={isTimerRunning ? stopTimer : startTimer}
              className={`p-1.5 rounded-lg transition-colors ${isTimerRunning ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'hover:bg-navy-700 text-gray-400'}`}
              title={isTimerRunning ? 'Stop timer' : 'Start timer'}
            >
              {isTimerRunning ? <Square size={14} /> : <Play size={14} />}
            </button>
          )}

          {task.description && (
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-navy-700 text-gray-400">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <button onClick={() => onEdit?.(task)} className="p-1.5 rounded-lg hover:bg-navy-700 text-gray-400">
            <Edit3 size={14} />
          </button>
          <button onClick={deleteTask} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Timer display */}
      {isTimerRunning && (
        <div className="mt-2 flex items-center gap-2 text-sm font-mono text-primary-400 bg-primary-400/10 rounded-lg px-3 py-1.5">
          <Timer size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
          {formatTimer(elapsed)}
        </div>
      )}
    </div>
  )
}
