import React, { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ACHIEVEMENTS, getTotalXP, getLevelFromXP, calculateStreak } from '../db'
import { Trophy, Lock, Flame, Star, Zap } from 'lucide-react'
import confetti from 'canvas-confetti'

export default function AchievementsPage() {
  const unlocked = useLiveQuery(() => db.achievements.toArray())
  const [xp, setXP] = useState(0)
  const [streak, setStreak] = useState(0)

  const tasks = useLiveQuery(() => db.tasks.toArray())
  const learnings = useLiveQuery(() => db.learnings.toArray())
  const timeEntries = useLiveQuery(() => db.timeEntries.toArray())
  const dailyLogs = useLiveQuery(() => db.dailyLogs.toArray())

  useEffect(() => {
    getTotalXP().then(setXP)
    calculateStreak().then(setStreak)
  }, [tasks, learnings, dailyLogs])

  // Check for new achievements
  useEffect(() => {
    if (!tasks || !unlocked || !learnings || !timeEntries || !dailyLogs) return

    const checkAndUnlock = async (key) => {
      const exists = unlocked.find(a => a.key === key)
      if (!exists) {
        await db.achievements.add({ key, unlockedAt: new Date().toISOString() })
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      }
    }

    const doneTasks = tasks.filter(t => t.status === 'done')
    if (doneTasks.length >= 1) checkAndUnlock('first_task')
    if (doneTasks.length >= 10) checkAndUnlock('ten_tasks')
    if (doneTasks.length >= 50) checkAndUnlock('fifty_tasks')
    if (doneTasks.length >= 100) checkAndUnlock('hundred_tasks')

    if (streak >= 3) checkAndUnlock('streak_3')
    if (streak >= 7) checkAndUnlock('streak_7')
    if (streak >= 30) checkAndUnlock('streak_30')

    if (dailyLogs.length >= 7) checkAndUnlock('mood_tracker')
    if (learnings.length >= 10) checkAndUnlock('learner')

    const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0)
    if (totalMinutes >= 600) checkAndUnlock('time_master')

    // Check early bird / night owl
    doneTasks.forEach(t => {
      if (t.completedAt) {
        const hour = new Date(t.completedAt).getHours()
        if (hour < 8) checkAndUnlock('early_bird')
        if (hour >= 22) checkAndUnlock('night_owl')
      }
    })
  }, [tasks, unlocked, learnings, timeEntries, dailyLogs, streak])

  const levelInfo = getLevelFromXP(xp)
  const unlockedKeys = new Set(unlocked?.map(a => a.key) || [])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2 mb-1">
          <Trophy size={24} className="text-yellow-500" /> Achievements
        </h1>
        <p className="text-sm text-gray-400">Unlock badges by staying productive!</p>
      </div>

      {/* Stats banner */}
      <div className="glass-card p-6 mb-8 bg-gradient-to-r from-primary-400/10 to-accent-50">
        <div className="grid grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-600 bg-clip-text text-transparent">
              {levelInfo.level}
            </div>
            <p className="text-xs text-gray-500 mt-1">Current Level</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-200">{xp}</div>
            <p className="text-xs text-gray-500 mt-1">Total XP</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-500 flex items-center justify-center gap-1">
              {streak} <Flame size={20} />
            </div>
            <p className="text-xs text-gray-500 mt-1">Day Streak</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-yellow-500">
              {unlocked?.length || 0}/{ACHIEVEMENTS.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Unlocked</p>
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Level {levelInfo.level}</span>
            <span>{Math.round(levelInfo.progress)}% to Level {levelInfo.level + 1}</span>
          </div>
          <div className="xp-bar h-4">
            <div className="xp-fill" style={{ width: `${levelInfo.progress}%` }} />
          </div>
        </div>
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-3 gap-4">
        {ACHIEVEMENTS.map(achievement => {
          const isUnlocked = unlockedKeys.has(achievement.key)
          const unlockedData = unlocked?.find(a => a.key === achievement.key)

          return (
            <div
              key={achievement.key}
              className={`glass-card p-4 text-center transition-all duration-300 ${
                isUnlocked
                  ? 'ring-2 ring-yellow-300 bg-gradient-to-b from-yellow-50 to-white'
                  : 'opacity-50 grayscale'
              }`}
            >
              <div className={`text-4xl mb-2 ${isUnlocked ? 'animate-bounce-in' : ''}`}>
                {isUnlocked ? achievement.icon : '🔒'}
              </div>
              <h3 className="font-semibold text-sm text-gray-200">{achievement.title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{achievement.description}</p>
              <div className="mt-2 flex items-center justify-center gap-1">
                <Zap size={12} className={isUnlocked ? 'text-yellow-500' : 'text-gray-300'} />
                <span className={`text-xs font-bold ${isUnlocked ? 'text-yellow-600' : 'text-gray-400'}`}>
                  +{achievement.xp} XP
                </span>
              </div>
              {isUnlocked && unlockedData && (
                <p className="text-[10px] text-gray-400 mt-1">
                  Unlocked {new Date(unlockedData.unlockedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
