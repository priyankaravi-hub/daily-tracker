import React, { useState } from 'react'
import { db } from '../db'
import { MOOD_EMOJIS, MOOD_LABELS, ENERGY_EMOJIS, ENERGY_LABELS, toDateKey } from '../utils/helpers'

export default function MoodTracker({ date, existingLog, onSaved }) {
  const dateKey = toDateKey(date)
  const [mood, setMood] = useState(existingLog?.mood ?? null)
  const [energy, setEnergy] = useState(existingLog?.energy ?? null)
  const [saved, setSaved] = useState(!!existingLog)

  const handleSave = async () => {
    if (mood === null || energy === null) return

    if (existingLog?.id) {
      await db.dailyLogs.update(existingLog.id, { mood, energy })
    } else {
      await db.dailyLogs.add({ date: dateKey, mood, energy })
    }
    setSaved(true)
    onSaved?.()
  }

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">How are you feeling?</h3>

      {/* Mood */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 font-medium mb-2 block">Mood</label>
        <div className="flex gap-2">
          {MOOD_EMOJIS.map((emoji, i) => (
            <button
              key={i}
              onClick={() => { setMood(i); setSaved(false) }}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all ${
                mood === i
                  ? 'bg-primary-400/10 scale-110 ring-2 ring-primary-300'
                  : 'hover:bg-navy-700 hover:scale-105'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-[10px] text-gray-400">{MOOD_LABELS[i]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Energy */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 font-medium mb-2 block">Energy</label>
        <div className="flex gap-2">
          {ENERGY_EMOJIS.map((emoji, i) => (
            <button
              key={i}
              onClick={() => { setEnergy(i); setSaved(false) }}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all ${
                energy === i
                  ? 'bg-accent-50 scale-110 ring-2 ring-accent-300'
                  : 'hover:bg-navy-700 hover:scale-105'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-[10px] text-gray-400">{ENERGY_LABELS[i]}</span>
            </button>
          ))}
        </div>
      </div>

      {!saved && mood !== null && energy !== null && (
        <button onClick={handleSave} className="btn-primary w-full text-sm">
          Log Mood & Energy (+10 XP)
        </button>
      )}
      {saved && (
        <div className="text-center text-sm text-green-600 font-medium py-1">
          Logged! Keep it up! ✨
        </div>
      )}
    </div>
  )
}
