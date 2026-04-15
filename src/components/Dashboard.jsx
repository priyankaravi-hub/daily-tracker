import React, { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { toDateKey, formatDuration, MOOD_EMOJIS, ENERGY_EMOJIS } from '../utils/helpers'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, CartesianGrid, Legend
} from 'recharts'
import {
  format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isWithinInterval, parseISO, subWeeks, subMonths
} from 'date-fns'
import { LayoutDashboard, Calendar, TrendingUp, Clock, Smile, Target } from 'lucide-react'

const CHART_COLORS = ['#5c7cfa', '#ff9800', '#51cf66', '#e64980', '#cc5de8', '#20c997', '#fcc419', '#ff6b6b']

export default function Dashboard() {
  const [period, setPeriod] = useState('week') // week | month
  const tasks = useLiveQuery(() => db.tasks.toArray())
  const projects = useLiveQuery(() => db.projects.toArray())
  const dailyLogs = useLiveQuery(() => db.dailyLogs.toArray())
  const timeEntries = useLiveQuery(() => db.timeEntries.toArray())
  const learnings = useLiveQuery(() => db.learnings.toArray())

  const dateRange = useMemo(() => {
    const now = new Date()
    if (period === 'week') {
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    }
    return { start: startOfMonth(now), end: endOfMonth(now) }
  }, [period])

  const days = useMemo(() => eachDayOfInterval(dateRange), [dateRange])

  // Tasks per day chart data
  const tasksByDay = useMemo(() => {
    if (!tasks) return []
    return days.map(day => {
      const key = toDateKey(day)
      const dayTasks = tasks.filter(t => t.date === key)
      return {
        name: format(day, period === 'week' ? 'EEE' : 'MMM d'),
        total: dayTasks.length,
        completed: dayTasks.filter(t => t.status === 'done').length,
        challenges: dayTasks.filter(t => t.isChallenge && t.status === 'done').length,
      }
    })
  }, [tasks, days, period])

  // Tasks by project (pie chart)
  const tasksByProject = useMemo(() => {
    if (!tasks || !projects) return []
    const periodTasks = tasks.filter(t => {
      const d = new Date(t.date)
      return isWithinInterval(d, dateRange)
    })
    const counts = {}
    periodTasks.forEach(t => {
      const proj = projects.find(p => p.id === t.projectId)
      const name = proj ? proj.name : 'No Project'
      counts[name] = (counts[name] || 0) + 1
    })
    return Object.entries(counts).map(([name, value], i) => ({
      name, value, color: projects.find(p => p.name === name)?.color || CHART_COLORS[i % CHART_COLORS.length]
    }))
  }, [tasks, projects, dateRange])

  // Mood & Energy trend
  const moodTrend = useMemo(() => {
    if (!dailyLogs) return []
    return days.map(day => {
      const key = toDateKey(day)
      const log = dailyLogs.find(l => l.date === key)
      return {
        name: format(day, period === 'week' ? 'EEE' : 'MMM d'),
        mood: log ? log.mood + 1 : null,
        energy: log ? log.energy + 1 : null,
      }
    })
  }, [dailyLogs, days, period])

  // Time spent per day
  const timeByDay = useMemo(() => {
    if (!timeEntries) return []
    return days.map(day => {
      const key = toDateKey(day)
      const entries = timeEntries.filter(e => e.date === key)
      const totalMin = entries.reduce((sum, e) => sum + (e.duration || 0), 0)
      return {
        name: format(day, period === 'week' ? 'EEE' : 'MMM d'),
        hours: +(totalMin / 60).toFixed(1),
      }
    })
  }, [timeEntries, days, period])

  // Summary stats
  const stats = useMemo(() => {
    if (!tasks) return {}
    const periodTasks = tasks.filter(t => {
      const d = new Date(t.date)
      return isWithinInterval(d, dateRange)
    })
    const done = periodTasks.filter(t => t.status === 'done')
    const totalTime = timeEntries?.filter(e => {
      const d = new Date(e.date)
      return isWithinInterval(d, dateRange)
    }).reduce((sum, e) => sum + (e.duration || 0), 0) || 0

    const periodLearnings = learnings?.filter(l => {
      const d = new Date(l.date)
      return isWithinInterval(d, dateRange)
    }).length || 0

    return {
      totalTasks: periodTasks.length,
      completedTasks: done.length,
      completionRate: periodTasks.length > 0 ? Math.round((done.length / periodTasks.length) * 100) : 0,
      totalTime,
      avgMood: dailyLogs?.length > 0
        ? (dailyLogs.filter(l => {
            const d = new Date(l.date)
            return isWithinInterval(d, dateRange)
          }).reduce((sum, l) => sum + l.mood, 0) /
          Math.max(dailyLogs.filter(l => isWithinInterval(new Date(l.date), dateRange)).length, 1)).toFixed(1)
        : 'N/A',
      learnings: periodLearnings,
    }
  }, [tasks, timeEntries, dailyLogs, learnings, dateRange])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <LayoutDashboard size={24} className="text-primary-500" /> Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Your productivity at a glance</p>
        </div>

        <div className="flex gap-1 bg-navy-700 rounded-xl p-1">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${period === 'week' ? 'bg-navy-800 shadow text-primary-400' : 'text-gray-500'}`}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${period === 'month' ? 'bg-navy-800 shadow text-primary-400' : 'text-gray-500'}`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="glass-card p-4">
          <Target size={16} className="text-primary-500 mb-2" />
          <p className="text-2xl font-bold text-gray-200">{stats.completedTasks || 0}</p>
          <p className="text-xs text-gray-400">Tasks Completed</p>
        </div>
        <div className="glass-card p-4">
          <TrendingUp size={16} className="text-green-500 mb-2" />
          <p className="text-2xl font-bold text-gray-200">{stats.completionRate || 0}%</p>
          <p className="text-xs text-gray-400">Completion Rate</p>
        </div>
        <div className="glass-card p-4">
          <Clock size={16} className="text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-gray-200">{formatDuration(stats.totalTime || 0)}</p>
          <p className="text-xs text-gray-400">Time Tracked</p>
        </div>
        <div className="glass-card p-4">
          <Smile size={16} className="text-yellow-500 mb-2" />
          <p className="text-2xl font-bold text-gray-200">{stats.avgMood !== 'N/A' ? MOOD_EMOJIS[Math.round(stats.avgMood)] : '—'}</p>
          <p className="text-xs text-gray-400">Avg Mood</p>
        </div>
        <div className="glass-card p-4">
          <Calendar size={16} className="text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-gray-200">{stats.learnings || 0}</p>
          <p className="text-xs text-gray-400">Learnings</p>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Task completion bar chart */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Tasks per Day</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tasksByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#999' }} />
              <YAxis tick={{ fontSize: 11, fill: '#999' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="completed" fill="#51cf66" radius={[4, 4, 0, 0]} name="Completed" />
              <Bar dataKey="total" fill="#dee2e6" radius={[4, 4, 0, 0]} name="Total" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project distribution pie */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Tasks by Project</h3>
          {tasksByProject.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={tasksByProject}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {tasksByProject.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 11, color: '#666' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">
              No data yet for this period
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Mood & Energy trend */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Mood & Energy Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={moodTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#999' }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#999' }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="mood"
                stroke="#5c7cfa"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Mood"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="energy"
                stroke="#ff9800"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Energy"
                connectNulls
              />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Time tracked area chart */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Time Tracked (hours)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#999' }} />
              <YAxis tick={{ fontSize: 11, fill: '#999' }} />
              <Tooltip />
              <defs>
                <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5c7cfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5c7cfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="hours"
                stroke="#5c7cfa"
                strokeWidth={2}
                fill="url(#timeGradient)"
                name="Hours"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
