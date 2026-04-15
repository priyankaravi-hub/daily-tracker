import React from 'react'
import { NavLink } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getTotalXP, getLevelFromXP, calculateStreak } from '../db'
import {
  LayoutDashboard, CalendarDays, FolderKanban, Tag, Trophy,
  Settings, Flame, Zap, ChevronLeft, ChevronRight, Bot
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', icon: CalendarDays, label: 'Today' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/tags', icon: Tag, label: 'Tags' },
  { to: '/achievements', icon: Trophy, label: 'Achievements' },
]

export default function Sidebar({ collapsed, setCollapsed, onOpenGreeting }) {
  const [xp, setXP] = React.useState(0)
  const [streak, setStreak] = React.useState(0)

  const tasks = useLiveQuery(() => db.tasks.where('status').equals('done').count())

  React.useEffect(() => {
    getTotalXP().then(setXP)
    calculateStreak().then(setStreak)
  }, [tasks])

  const levelInfo = getLevelFromXP(xp)

  return (
    <aside className={`h-screen sticky top-0 flex flex-col bg-navy-800 border-r border-navy-700 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-navy-700">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-navy-900 font-bold text-sm flex-shrink-0">
          ?
        </div>
        {!collapsed && <span className="font-bold text-lg text-primary-400 whitespace-nowrap">What do you do?</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded-lg hover:bg-navy-700 text-gray-400 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Level / XP Bar */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-navy-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-primary-400">Level {levelInfo.level}</span>
            <span className="text-xs text-gray-500">{xp} XP</span>
          </div>
          <div className="xp-bar">
            <div className="xp-fill" style={{ width: `${levelInfo.progress}%` }} />
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-sm">
              <Flame size={14} className="text-orange-500" />
              <span className="font-medium text-gray-300">{streak} day streak</span>
            </div>
          )}
        </div>
      )}

      {collapsed && streak > 0 && (
        <div className="flex flex-col items-center py-3 border-b border-navy-700">
          <Flame size={18} className="text-primary-400" />
          <span className="text-xs font-bold text-gray-400">{streak}</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-500/15 text-primary-400 shadow-sm'
                  : 'text-gray-400 hover:bg-navy-700 hover:text-gray-200'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.label : ''}
          >
            <item.icon size={18} className="flex-shrink-0" />
            {!collapsed && item.label}
          </NavLink>
        ))}
      </nav>

      {/* Say hi to bot + Settings */}
      <div className="px-2 py-2 border-t border-navy-700 space-y-0.5">
        <button
          onClick={onOpenGreeting}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-gray-400 hover:bg-navy-700 hover:text-primary-400 w-full ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Say hi to bot' : ''}
        >
          <Bot size={18} className="flex-shrink-0" />
          {!collapsed && 'Say hi to bot'}
        </button>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full ${
              isActive
                ? 'bg-primary-500/15 text-primary-400 shadow-sm'
                : 'text-gray-400 hover:bg-navy-700 hover:text-gray-200'
            } ${collapsed ? 'justify-center' : ''}`
          }
          title={collapsed ? 'Settings' : ''}
        >
          <Settings size={18} className="flex-shrink-0" />
          {!collapsed && 'Settings'}
        </NavLink>
      </div>

      {/* Bottom */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-navy-700">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Zap size={12} />
            <span>What do you do? v1.0</span>
          </div>
        </div>
      )}
    </aside>
  )
}
