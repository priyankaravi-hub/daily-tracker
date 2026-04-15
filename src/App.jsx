import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { seedDefaults } from './db'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import DailyView from './components/DailyView'
import Dashboard from './components/Dashboard'
import ProjectsPage from './components/ProjectsPage'
import TagsPage from './components/TagsPage'
import AchievementsPage from './components/AchievementsPage'
import SettingsPage from './components/SettingsPage'

const BACKUP_REMINDER_DAYS = 7

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [ready, setReady] = useState(false)
  const [showGreeting, setShowGreeting] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    seedDefaults().then(() => setReady(true))
  }, [])

  useEffect(() => {
    const lastBackup = localStorage.getItem('lastBackupDate')
    if (!lastBackup) return
    const daysSince = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince >= BACKUP_REMINDER_DAYS) {
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span className="text-sm">It's been a while since your last backup.</span>
            <button
              onClick={() => { toast.dismiss(t.id); navigate('/settings') }}
              className="text-xs font-bold text-[#C9A96A] whitespace-nowrap hover:underline"
            >
              Back up now
            </button>
          </div>
        ),
        { duration: 8000, icon: '💾' }
      )
    }
  }, [ready, navigate])

  useEffect(() => {
    const handler = (e) => {
      if (e.data === 'close-greeting') setShowGreeting(false)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#111827]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-navy-900 font-bold text-xl mx-auto mb-3 animate-pulse-glow">
            ?
          </div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#111827]">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '12px', background: '#1F2937', color: '#E5E7EB', fontSize: '14px', border: '1px solid #374151' },
        }}
      />
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} onOpenGreeting={() => setShowGreeting(true)} />
      </div>
      <MobileNav onOpenGreeting={() => setShowGreeting(true)} />
      <main className="flex-1 p-6 pb-20 lg:pb-6 overflow-auto">
        <Routes>
          <Route path="/" element={<DailyView />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      {showGreeting && (
        <div className="fixed inset-0 z-[100]">
          <iframe src={import.meta.env.BASE_URL + 'greeting.html'} className="w-full h-full border-0" title="Greeting" />
        </div>
      )}
    </div>
  )
}
