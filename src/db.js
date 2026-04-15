import Dexie from 'dexie'

export const db = new Dexie('DayFlowDB')

db.version(1).stores({
  tasks: '++id, title, status, date, projectId, priority, createdAt, completedAt',
  projects: '++id, name, color, createdAt',
  tags: '++id, name, color, projectId',
  dailyLogs: '++id, &date, mood, energy',
  learnings: '++id, date, content, taskId',
  timeEntries: '++id, taskId, date, startTime, endTime, duration',
  achievements: '++id, &key, unlockedAt',
})

// Seed default data if empty
export async function seedDefaults() {
  const projectCount = await db.projects.count()
  if (projectCount === 0) {
    await db.projects.bulkAdd([
      { name: 'Personal', color: '#5c7cfa', emoji: '🏠', createdAt: new Date().toISOString() },
      { name: 'Work', color: '#ff9800', emoji: '💼', createdAt: new Date().toISOString() },
      { name: 'Learning', color: '#51cf66', emoji: '📚', createdAt: new Date().toISOString() },
    ])
  }

  const tagCount = await db.tags.count()
  if (tagCount === 0) {
    await db.tags.bulkAdd([
      { name: 'urgent', color: '#ff6b6b' },
      { name: 'bug', color: '#e64980' },
      { name: 'feature', color: '#5c7cfa' },
      { name: 'research', color: '#20c997' },
      { name: 'design', color: '#cc5de8' },
      { name: 'meeting', color: '#fcc419' },
    ])
  }
}

// XP & Level system
export const XP_CONFIG = {
  TASK_COMPLETE: 25,
  CHALLENGE_COMPLETE: 50,
  LOG_MOOD: 10,
  ADD_LEARNING: 15,
  STREAK_BONUS: 5, // per day of streak
}

export function getLevelFromXP(xp) {
  // Each level requires progressively more XP
  const level = Math.floor(Math.sqrt(xp / 50)) + 1
  const currentLevelXP = Math.pow(level - 1, 2) * 50
  const nextLevelXP = Math.pow(level, 2) * 50
  const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
  return { level, progress: Math.min(progress, 100), currentXP: xp, nextLevelXP }
}

// Achievement definitions
export const ACHIEVEMENTS = [
  { key: 'first_task', title: 'First Steps', description: 'Complete your first task', icon: '🎯', xp: 50 },
  { key: 'ten_tasks', title: 'Getting Rolling', description: 'Complete 10 tasks', icon: '🔥', xp: 100 },
  { key: 'fifty_tasks', title: 'Productivity Machine', description: 'Complete 50 tasks', icon: '⚡', xp: 250 },
  { key: 'hundred_tasks', title: 'Centurion', description: 'Complete 100 tasks', icon: '🏆', xp: 500 },
  { key: 'streak_3', title: 'On Fire', description: '3-day streak', icon: '🔥', xp: 75 },
  { key: 'streak_7', title: 'Week Warrior', description: '7-day streak', icon: '⚔️', xp: 150 },
  { key: 'streak_30', title: 'Monthly Legend', description: '30-day streak', icon: '👑', xp: 500 },
  { key: 'mood_tracker', title: 'Self Aware', description: 'Log mood for 7 days', icon: '🧘', xp: 100 },
  { key: 'learner', title: 'Knowledge Seeker', description: 'Add 10 learnings', icon: '📖', xp: 100 },
  { key: 'time_master', title: 'Time Master', description: 'Track 10 hours total', icon: '⏱️', xp: 200 },
  { key: 'multi_project', title: 'Juggler', description: 'Work on 3+ projects in a day', icon: '🤹', xp: 75 },
  { key: 'early_bird', title: 'Early Bird', description: 'Complete a task before 8 AM', icon: '🌅', xp: 50 },
  { key: 'night_owl', title: 'Night Owl', description: 'Complete a task after 10 PM', icon: '🦉', xp: 50 },
]

// Helper to calculate streak
export async function calculateStreak() {
  const logs = await db.dailyLogs.orderBy('date').reverse().toArray()
  if (logs.length === 0) return 0

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < logs.length; i++) {
    const logDate = new Date(logs[i].date)
    logDate.setHours(0, 0, 0, 0)
    const expectedDate = new Date(today)
    expectedDate.setDate(expectedDate.getDate() - i)

    if (logDate.getTime() === expectedDate.getTime()) {
      streak++
    } else if (i === 0 && logDate.getTime() === new Date(today.getTime() - 86400000).getTime()) {
      // Allow yesterday if today hasn't been logged yet
      streak++
    } else {
      break
    }
  }
  return streak
}

// Get total XP
export async function getTotalXP() {
  const tasks = await db.tasks.where('status').equals('done').count()
  const learnings = await db.learnings.count()
  const moodLogs = await db.dailyLogs.count()
  const achievements = await db.achievements.toArray()
  const streak = await calculateStreak()

  let xp = 0
  xp += tasks * XP_CONFIG.TASK_COMPLETE
  xp += learnings * XP_CONFIG.ADD_LEARNING
  xp += moodLogs * XP_CONFIG.LOG_MOOD
  xp += streak * XP_CONFIG.STREAK_BONUS
  xp += achievements.reduce((sum, a) => {
    const def = ACHIEVEMENTS.find(d => d.key === a.key)
    return sum + (def?.xp || 0)
  }, 0)

  return xp
}
