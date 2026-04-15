import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isYesterday, parseISO, differenceInMinutes } from 'date-fns'

export function formatDate(date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE, MMM d')
}

export function toDateKey(date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'yyyy-MM-dd')
}

export function getWeekDays(date) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export function getMonthDays(date) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  return eachDayOfInterval({ start, end })
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 6) return 'Night owl mode 🦉'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Burning the midnight oil 🌙'
}

export const MOOD_EMOJIS = ['😫', '😕', '😐', '🙂', '😄']
export const MOOD_LABELS = ['Terrible', 'Bad', 'Okay', 'Good', 'Great']
export const ENERGY_EMOJIS = ['🔋', '🪫', '⚡', '💪', '🚀']
export const ENERGY_LABELS = ['Drained', 'Low', 'Normal', 'High', 'Supercharged']

export const PRIORITY_CONFIG = {
  low: { label: 'Low', color: '#51cf66', bg: '#1a2e1a' },
  medium: { label: 'Medium', color: '#fcc419', bg: '#2e2a1a' },
  high: { label: 'High', color: '#C9A96A', bg: '#2e261a' },
  urgent: { label: 'Urgent', color: '#ff6b6b', bg: '#2e1a1a' },
}

export const STATUS_CONFIG = {
  todo: { label: 'To Do', color: '#868e96' },
  'in-progress': { label: 'In Progress', color: '#C9A96A' },
  done: { label: 'Done', color: '#51cf66' },
}
