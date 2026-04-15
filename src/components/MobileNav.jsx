import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, FolderKanban, Tag, Trophy, Bot } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', icon: CalendarDays, label: 'Today' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/tags', icon: Tag, label: 'Tags' },
  { to: '/achievements', icon: Trophy, label: 'Achievements' },
]

export default function MobileNav({ onOpenGreeting }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-navy-800 border-t border-navy-700 flex items-center justify-around px-1 py-1.5 z-50 lg:hidden">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              isActive ? 'text-primary-400' : 'text-gray-500'
            }`
          }
        >
          <item.icon size={20} />
          {item.label}
        </NavLink>
      ))}
      <button
        onClick={onOpenGreeting}
        className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors text-gray-500 hover:text-primary-400"
      >
        <Bot size={20} />
        Bot
      </button>
    </nav>
  )
}
