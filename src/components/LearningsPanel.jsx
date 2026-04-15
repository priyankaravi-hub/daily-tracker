import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { toDateKey } from '../utils/helpers'
import { BookOpen, Plus, X } from 'lucide-react'

export default function LearningsPanel({ date }) {
  const dateKey = toDateKey(date)
  const learnings = useLiveQuery(
    () => db.learnings.where('date').equals(dateKey).toArray(),
    [dateKey]
  )
  const [newLearning, setNewLearning] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const addLearning = async () => {
    if (!newLearning.trim()) return
    const content = newLearning.trim()
    const now = new Date().toISOString()

    // Add to learnings table
    await db.learnings.add({
      date: dateKey,
      content,
      createdAt: now,
    })

    // Sync to Learning project as a completed task
    const learningProject = await db.projects.where('name').equals('Learning').first()
    if (learningProject) {
      await db.tasks.add({
        title: content,
        status: 'done',
        date: dateKey,
        projectId: learningProject.id,
        priority: 'low',
        createdAt: now,
        completedAt: now,
        isLearning: true,
      })
    }

    setNewLearning('')
    setIsAdding(false)
  }

  const removeLearning = async (id) => {
    const learning = await db.learnings.get(id)
    await db.learnings.delete(id)

    // Remove the synced task from Learning project
    if (learning) {
      const learningProject = await db.projects.where('name').equals('Learning').first()
      if (learningProject) {
        const matchingTask = await db.tasks
          .where('projectId').equals(learningProject.id)
          .filter(t => t.isLearning && t.title === learning.content && t.date === learning.date)
          .first()
        if (matchingTask) await db.tasks.delete(matchingTask.id)
      }
    }
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
          <BookOpen size={14} className="text-primary-500" />
          Today's Learnings
        </h3>
        <button
          onClick={() => setIsAdding(true)}
          className="p-1 rounded-lg hover:bg-primary-400/10 text-primary-500 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="space-y-2">
        {learnings?.map(l => (
          <div key={l.id} className="flex items-start gap-2 group">
            <span className="text-primary-400 mt-0.5 text-xs">✦</span>
            <p className="text-sm text-gray-400 flex-1 leading-relaxed">{l.content}</p>
            <button
              onClick={() => removeLearning(l.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {(!learnings || learnings.length === 0) && !isAdding && (
          <p className="text-xs text-gray-400 text-center py-2">
            No learnings yet. What did you discover today?
          </p>
        )}

        {isAdding && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newLearning}
              onChange={e => setNewLearning(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLearning()}
              placeholder="What did you learn today?"
              className="input-field text-sm flex-1"
              autoFocus
            />
            <button onClick={addLearning} className="btn-primary text-xs px-3">
              Add
            </button>
            <button onClick={() => setIsAdding(false)} className="btn-ghost text-xs px-2">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
