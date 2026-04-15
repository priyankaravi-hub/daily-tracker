import React, { useState, useRef } from 'react'
import { db } from '../db'
import { Download, Upload, AlertTriangle, CheckCircle, Shield, Database, HardDrive } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const fileInputRef = useRef(null)

  const TABLE_NAMES = ['tasks', 'projects', 'tags', 'dailyLogs', 'learnings', 'timeEntries', 'achievements']

  async function handleExport() {
    setExporting(true)
    try {
      const backup = { version: 1, exportedAt: new Date().toISOString(), tables: {} }
      for (const name of TABLE_NAMES) {
        backup.tables[name] = await db.table(name).toArray()
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `wdyd-backup-${date}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      localStorage.setItem('lastBackupDate', new Date().toISOString())
      toast.success('Backup exported successfully!')
    } catch (err) {
      toast.error('Export failed: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setShowConfirm(true)
    e.target.value = ''
  }

  async function handleImport() {
    if (!pendingFile) return
    setImporting(true)
    setShowConfirm(false)

    try {
      const text = await pendingFile.text()
      const backup = JSON.parse(text)

      if (!backup.tables || typeof backup.tables !== 'object') {
        throw new Error('Invalid backup file format')
      }

      const missingTables = TABLE_NAMES.filter(t => !Array.isArray(backup.tables[t]))
      if (missingTables.length > 0) {
        throw new Error(`Backup is missing tables: ${missingTables.join(', ')}`)
      }

      await db.transaction('rw', TABLE_NAMES.map(n => db.table(n)), async () => {
        for (const name of TABLE_NAMES) {
          await db.table(name).clear()
          if (backup.tables[name].length > 0) {
            await db.table(name).bulkAdd(backup.tables[name])
          }
        }
      })

      toast.success('Data restored successfully! Refreshing...')
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      toast.error('Import failed: ' + err.message)
    } finally {
      setImporting(false)
      setPendingFile(null)
    }
  }

  const lastBackup = localStorage.getItem('lastBackupDate')
  const lastBackupDisplay = lastBackup
    ? new Date(lastBackup).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Never'

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your data and preferences</p>
      </div>

      {/* Data Overview */}
      <div className="bg-navy-800 rounded-2xl border border-navy-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
            <Database size={20} className="text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Data Storage</h2>
            <p className="text-xs text-gray-500">Your data is stored locally in this browser</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StorageStat label="Last Backup" value={lastBackupDisplay} />
          <StorageStat label="Storage" value="IndexedDB" />
          <StorageStat label="Tables" value={TABLE_NAMES.length.toString()} />
          <StorageStat label="Status" value="Local Only" />
        </div>
      </div>

      {/* Export */}
      <div className="bg-navy-800 rounded-2xl border border-navy-700 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Download size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Export Backup</h2>
            <p className="text-xs text-gray-500">Download all your data as a JSON file</p>
          </div>
        </div>
        <p className="text-sm text-gray-400 mb-4 ml-[52px]">
          Creates a complete snapshot of your tasks, projects, tags, daily logs, learnings, time entries, and achievements.
        </p>
        <div className="ml-[52px]">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Download size={16} />
            {exporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>

      {/* Import */}
      <div className="bg-navy-800 rounded-2xl border border-navy-700 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Upload size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Restore from Backup</h2>
            <p className="text-xs text-gray-500">Import a previously exported JSON backup file</p>
          </div>
        </div>
        <div className="ml-[52px] space-y-3">
          <div className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-500/10 rounded-lg px-3 py-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>Importing will replace all current data. Export a backup first if you want to keep your existing data.</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-5 py-2.5 bg-navy-700 hover:bg-navy-600 disabled:opacity-50 text-gray-200 text-sm font-semibold rounded-xl transition-colors border border-navy-600"
          >
            <Upload size={16} />
            {importing ? 'Importing...' : 'Choose Backup File'}
          </button>
        </div>
      </div>

      {/* Data Safety Tips */}
      <div className="bg-navy-800 rounded-2xl border border-navy-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
            <Shield size={20} className="text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Keep Your Data Safe</h2>
          </div>
        </div>
        <ul className="space-y-2 ml-[52px] text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            Export backups regularly (we'll remind you weekly)
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            Store backup files in cloud storage (Google Drive, iCloud, Dropbox)
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            Clearing browser data will erase your local data — backup first
          </li>
          <li className="flex items-start gap-2">
            <HardDrive size={14} className="text-gray-500 flex-shrink-0 mt-0.5" />
            Desktop &amp; mobile apps with cloud sync are coming soon
          </li>
        </ul>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={24} className="text-amber-400" />
              <h3 className="text-lg font-bold text-gray-100">Confirm Restore</h3>
            </div>
            <p className="text-sm text-gray-400 mb-1">
              This will <strong className="text-gray-200">permanently replace</strong> all current data with the contents of:
            </p>
            <p className="text-sm text-primary-400 font-medium mb-4 truncate">{pendingFile?.name}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowConfirm(false); setPendingFile(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition-colors"
              >
                Yes, Restore Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StorageStat({ label, value }) {
  return (
    <div className="bg-navy-900/50 rounded-xl px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-300 truncate">{value}</p>
    </div>
  )
}
