import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { FolderKanban, Plus, Trash2, Edit3, X, Check, Hash, ChevronDown, ChevronUp, CheckCircle2, Circle, Clock } from 'lucide-react'
import { format } from 'date-fns'

const PROJECT_COLORS = ['#5c7cfa', '#ff9800', '#51cf66', '#e64980', '#cc5de8', '#20c997', '#fcc419', '#ff6b6b', '#495057', '#1098ad']
const PROJECT_EMOJIS = ['🏠', '💼', '📚', '🎮', '🎨', '🚀', '💡', '🔬', '🏋️', '🎯', '🌱', '📱', '🖥️', '🎸', '✈️']

export default function ProjectsPage() {
  const projects = useLiveQuery(() => db.projects.toArray())
  const tasks = useLiveQuery(() => db.tasks.toArray())
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [form, setForm] = useState({ name: '', color: '#5c7cfa', emoji: '🎯', description: '' })

  const getProjectStats = (projectId) => {
    const projectTasks = tasks?.filter(t => t.projectId === projectId) || []
    return {
      total: projectTasks.length,
      done: projectTasks.filter(t => t.status === 'done').length,
      inProgress: projectTasks.filter(t => t.status === 'in-progress').length,
    }
  }

  const getProjectTasks = (projectId) => {
    const projectTasks = tasks?.filter(t => t.projectId === projectId) || []
    const open = projectTasks.filter(t => t.status !== 'done').sort((a, b) => new Date(b.date) - new Date(a.date))
    const completed = projectTasks.filter(t => t.status === 'done').sort((a, b) => new Date(b.completedAt || b.date) - new Date(a.completedAt || a.date))
    return { open, completed }
  }

  const handleCloseTask = async (taskId) => {
    await db.tasks.update(taskId, { status: 'done', completedAt: new Date().toISOString() })
  }

  const handleCloseAllOld = async (projectId) => {
    const today = new Date().toISOString().split('T')[0]
    const oldOpen = tasks?.filter(t => t.projectId === projectId && t.status !== 'done' && t.date < today) || []
    const now = new Date().toISOString()
    await Promise.all(oldOpen.map(t => db.tasks.update(t.id, { status: 'done', completedAt: now })))
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    if (editingId) {
      await db.projects.update(editingId, { ...form })
      setEditingId(null)
    } else {
      await db.projects.add({ ...form, createdAt: new Date().toISOString() })
    }
    setForm({ name: '', color: '#5c7cfa', emoji: '🎯', description: '' })
    setShowAdd(false)
  }

  const handleEdit = (project) => {
    setForm({ name: project.name, color: project.color, emoji: project.emoji || '🎯', description: project.description || '' })
    setEditingId(project.id)
    setShowAdd(true)
  }

  const handleDelete = async (id) => {
    await db.projects.delete(id)
    await db.tasks.where('projectId').equals(id).modify({ projectId: null })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <FolderKanban size={24} className="text-primary-500" /> Projects
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Organize your tasks by project</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditingId(null); setForm({ name: '', color: '#5c7cfa', emoji: '🎯', description: '' }) }} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <div className="glass-card p-4 mb-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex gap-1 flex-wrap">
              {PROJECT_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setForm({ ...form, emoji: e })}
                  className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all ${form.emoji === e ? 'bg-navy-700 scale-110 ring-2 ring-primary-300' : 'hover:bg-navy-700'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Project name"
              className="input-field flex-1"
              autoFocus
            />
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Description (optional)"
              className="input-field flex-1"
            />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-400">Color:</span>
            {PROJECT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                className={`w-6 h-6 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                style={{ background: c, ringColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleSave} className="btn-primary text-sm">
              {editingId ? 'Save' : 'Create Project'}
            </button>
          </div>
        </div>
      )}

      {/* Project grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects?.map(project => {
          const stats = getProjectStats(project.id)
          const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
          const isExpanded = expandedId === project.id
          const { open, completed } = isExpanded ? getProjectTasks(project.id) : { open: [], completed: [] }
          const today = new Date().toISOString().split('T')[0]
          const oldOpenCount = isExpanded ? open.filter(t => t.date < today).length : 0

          return (
            <div key={project.id} className={`glass-card card-hover group ${isExpanded ? 'md:col-span-2' : ''}`}>
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : project.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{project.emoji || '📁'}</span>
                    <div>
                      <h3 className="font-semibold text-gray-200">{project.name}</h3>
                      {project.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{project.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(project) }} className="p-1.5 rounded-lg hover:bg-navy-700 text-gray-400">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(project.id) }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400 ml-1" /> : <ChevronDown size={16} className="text-gray-400 ml-1" />}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span>{stats.total} tasks</span>
                  <span className="text-green-500">{stats.done} done</span>
                  <span className="text-primary-400">{stats.inProgress} active</span>
                </div>

                <div className="w-full h-2 rounded-full bg-navy-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, background: project.color }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 text-right">{progress}% complete</p>
              </div>

              {isExpanded && (
                <div className="border-t border-navy-700 p-4 animate-slide-up">
                  {/* Close all old tasks button */}
                  {oldOpenCount > 0 && (
                    <button
                      onClick={() => handleCloseAllOld(project.id)}
                      className="mb-4 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-primary-400/10 text-primary-400 hover:bg-primary-400/20 transition-colors"
                    >
                      <CheckCircle2 size={14} />
                      Close {oldOpenCount} old {oldOpenCount === 1 ? 'task' : 'tasks'} from previous days
                    </button>
                  )}

                  {/* Open tasks */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Open ({open.length})
                    </h4>
                    {open.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No open tasks</p>
                    ) : (
                      <div className="space-y-1.5">
                        {open.map(task => (
                          <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-navy-700/50 group/task">
                            <button
                              onClick={() => handleCloseTask(task.id)}
                              className="text-gray-500 hover:text-green-500 transition-colors flex-shrink-0"
                              title="Mark as done"
                            >
                              <Circle size={16} />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-300 truncate">{task.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-500">{task.date}</span>
                                {task.date < today && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">overdue</span>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${task.status === 'in-progress' ? 'bg-primary-400/10 text-primary-400' : 'bg-navy-700 text-gray-500'}`}>
                                  {task.status === 'in-progress' ? 'In Progress' : 'To Do'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleCloseTask(task.id)}
                              className="text-xs text-gray-500 hover:text-primary-400 opacity-0 group-hover/task:opacity-100 transition-all"
                            >
                              Close
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Completed tasks */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Completed ({completed.length})
                    </h4>
                    {completed.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No completed tasks yet</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {completed.map(task => (
                          <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                            <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-500 line-through truncate">{task.title}</p>
                              <span className="text-[10px] text-gray-600">{task.completedAt ? format(new Date(task.completedAt), 'MMM d') : task.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
