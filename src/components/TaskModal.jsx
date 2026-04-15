import React, { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { X } from 'lucide-react'

export default function TaskModal({ task, date, onClose }) {
  const projects = useLiveQuery(() => db.projects.toArray())
  const tags = useLiveQuery(() => db.tags.toArray())

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    projectId: null,
    tagIds: [],
    isChallenge: false,
    date: date || new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        projectId: task.projectId || null,
        tagIds: task.tagIds || [],
        isChallenge: task.isChallenge || false,
        date: task.date || date || new Date().toISOString().split('T')[0],
      })
    }
  }, [task, date])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return

    const data = {
      ...form,
      title: form.title.trim(),
      projectId: form.projectId ? Number(form.projectId) : null,
    }

    if (task?.id) {
      await db.tasks.update(task.id, data)
    } else {
      data.createdAt = new Date().toISOString()
      data.timeSpent = 0
      await db.tasks.add(data)
    }
    onClose()
  }

  const toggleTag = (tagId) => {
    setForm(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-navy-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700">
          <h3 className="font-semibold text-gray-200">{task?.id ? 'Edit Task' : 'New Task'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-700 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <input
              type="text"
              placeholder="What do you need to do?"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="input-field text-base font-medium"
              autoFocus
            />
          </div>

          <div>
            <textarea
              placeholder="Add details (optional)"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="input-field resize-none h-20 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="input-field text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Project</label>
              <select
                value={form.projectId || ''}
                onChange={e => setForm({ ...form, projectId: e.target.value || null })}
                className="input-field text-sm"
              >
                <option value="">No project</option>
                {projects?.map(p => (
                  <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {tags?.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`tag-pill text-xs transition-all ${
                    form.tagIds.includes(tag.id)
                      ? 'ring-2 ring-offset-1 scale-105'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    background: tag.color + '20',
                    color: tag.color,
                    ringColor: tag.color
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* Challenge toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isChallenge}
              onChange={e => setForm({ ...form, isChallenge: e.target.checked })}
              className="w-4 h-4 rounded border-navy-600 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-400">Mark as Challenge</span>
            <span className="text-xs text-purple-500 font-medium">+50 XP</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">
              {task?.id ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
