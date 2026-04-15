import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { Tag, Plus, Trash2, Edit3, X } from 'lucide-react'

const TAG_COLORS = ['#ff6b6b', '#e64980', '#cc5de8', '#845ef7', '#5c7cfa', '#339af0', '#1098ad', '#20c997', '#51cf66', '#fcc419', '#ff9800', '#495057']

export default function TagsPage() {
  const tags = useLiveQuery(() => db.tags.toArray())
  const tasks = useLiveQuery(() => db.tasks.toArray())
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#5c7cfa')

  const getTagUsage = (tagId) => {
    return tasks?.filter(t => t.tagIds?.includes(tagId)).length || 0
  }

  const handleSave = async () => {
    if (!name.trim()) return
    if (editingId) {
      await db.tags.update(editingId, { name: name.trim(), color })
      setEditingId(null)
    } else {
      await db.tags.add({ name: name.trim(), color })
    }
    setName('')
    setColor('#5c7cfa')
    setShowAdd(false)
  }

  const handleDelete = async (id) => {
    await db.tags.delete(id)
    // Remove tag from tasks
    const tasksWithTag = await db.tasks.filter(t => t.tagIds?.includes(id)).toArray()
    for (const task of tasksWithTag) {
      await db.tasks.update(task.id, { tagIds: task.tagIds.filter(tid => tid !== id) })
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Tag size={24} className="text-primary-500" /> Tags
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Label and categorize your tasks</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditingId(null); setName(''); setColor('#5c7cfa') }} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={16} /> New Tag
        </button>
      </div>

      {showAdd && (
        <div className="glass-card p-4 mb-6 animate-slide-up">
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Tag name"
              className="input-field flex-1"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-400">Color:</span>
            {TAG_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                style={{ background: c, ringColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Preview:</span>
            <span className="tag-pill" style={{ background: color + '20', color }}>
              {name || 'tag-name'}
            </span>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleSave} className="btn-primary text-sm">
              {editingId ? 'Save' : 'Create Tag'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {tags?.map(tag => (
          <div key={tag.id} className="glass-card p-3 card-hover group flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: tag.color }} />
              <span className="font-medium text-sm text-gray-300">{tag.name}</span>
              <span className="text-[10px] text-gray-400">{getTagUsage(tag.id)} tasks</span>
            </div>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingId(tag.id); setName(tag.name); setColor(tag.color); setShowAdd(true) }} className="p-1 rounded hover:bg-navy-700 text-gray-400">
                <Edit3 size={12} />
              </button>
              <button onClick={() => handleDelete(tag.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
