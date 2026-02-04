'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authHelpers } from '@/lib/auth'
import { supabase, Profile, CSVFile } from '@/lib/supabase'
import { motion } from 'framer-motion'
import Papa from 'papaparse'
import { 
  Users, Upload, FileText, CheckCircle, XCircle, 
  Clock, LogOut, Home, Filter, Search, Trash2,
  UserCheck, UserX, Crown
} from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [files, setFiles] = useState<CSVFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await authHelpers.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const userProfile = await authHelpers.getProfile(user.id)
      if (userProfile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setProfile(userProfile)
      await Promise.all([fetchUsers(), fetchFiles()])
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setUsers(data)
  }

  const fetchFiles = async () => {
    const { data } = await supabase
      .from('csv_files')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setFiles(data)
  }

  const handleUserStatusChange = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId)
      
      await fetchUsers()
      
      // Log activity
      await supabase.from('activity_log').insert({
        user_id: profile?.id,
        action: `${status} user`,
        resource_type: 'user',
        resource_id: userId,
      })
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploading(true)

    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          // Create file record
          const { data: csvFile, error: fileError } = await supabase
            .from('csv_files')
            .insert({
              name: file.name.replace('.csv', ''),
              original_filename: file.name,
              uploaded_by: profile.id,
              total_rows: results.data.length,
            })
            .select()
            .single()

          if (fileError) throw fileError

          // Insert all rows
          const rows = results.data.map((row, index) => ({
            file_id: csvFile.id,
            row_index: index,
            data: row,
            status: 'pending' as const,
          }))

          const { error: rowsError } = await supabase
            .from('csv_rows')
            .insert(rows)

          if (rowsError) throw rowsError

          // Log activity
          await supabase.from('activity_log').insert({
            user_id: profile.id,
            action: 'uploaded CSV file',
            resource_type: 'file',
            resource_id: csvFile.id,
            details: {
              filename: file.name,
              rows: results.data.length,
            },
          })

          await fetchFiles()
          alert('File uploaded successfully!')
        },
        error: (error) => {
          console.error('Parse error:', error)
          alert('Error parsing CSV file')
        },
      })
    } catch (error) {
      console.error('Upload error:', error)
      alert('Error uploading file')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This will also delete all associated rows.')) {
      return
    }

    try {
      await supabase
        .from('csv_files')
        .delete()
        .eq('id', fileId)
      
      await fetchFiles()
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const stats = {
    totalUsers: users.length,
    pendingUsers: users.filter(u => u.status === 'pending').length,
    approvedUsers: users.filter(u => u.status === 'approved').length,
    totalFiles: files.length,
    activeFiles: files.filter(f => f.is_active).length,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center shadow-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-slate-400">Manage users, files, and system settings</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="btn btn-ghost">
              <Home className="w-4 h-4" />
              User View
            </button>
            <button onClick={() => authHelpers.signOut().then(() => router.push('/'))} className="btn btn-secondary">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="blue" />
          <StatCard title="Pending" value={stats.pendingUsers} icon={Clock} color="yellow" />
          <StatCard title="Approved" value={stats.approvedUsers} icon={CheckCircle} color="green" />
          <StatCard title="Total Files" value={stats.totalFiles} icon={FileText} color="purple" />
          <StatCard title="Active Files" value={stats.activeFiles} icon={CheckCircle} color="cyan" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Management */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="card-title">User Management</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="input-field pl-10 pr-4 py-2 text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="input-field py-2 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                              style={{ backgroundColor: user.user_color }}
                            >
                              {user.full_name?.charAt(0) || user.email.charAt(0)}
                            </div>
                            <span className="font-medium">{user.full_name || 'N/A'}</span>
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`badge ${user.role === 'admin' ? 'badge-completed' : 'badge-pending'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${user.status === 'approved' ? 'approved' : user.status === 'rejected' ? 'rejected' : 'pending'}`}>
                            {user.status}
                          </span>
                        </td>
                        <td>
                          {user.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUserStatusChange(user.id, 'approved')}
                                className="btn btn-success p-2"
                                title="Approve"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUserStatusChange(user.id, 'rejected')}
                                className="btn btn-danger p-2"
                                title="Reject"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* File Management */}
          <div>
            <div className="card mb-6">
              <div className="card-header">
                <h2 className="card-title">Upload CSV File</h2>
              </div>
              <label className="btn btn-primary w-full cursor-pointer">
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Choose CSV File'}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">CSV Files</h2>
              </div>
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-blue-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-sm">{file.name}</h4>
                        <p className="text-xs text-slate-400">{file.original_filename}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="btn btn-danger p-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {file.completed_rows}/{file.total_rows} rows
                      </span>
                      <span className={`badge ${file.is_active ? 'badge-approved' : 'badge-blocked'}`}>
                        {file.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${(file.completed_rows / file.total_rows) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    yellow: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    green: 'text-green-500 bg-green-500/10 border-green-500/30',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
    cyan: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card ${colors[color]} border`}
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon className={`w-5 h-5 ${colors[color].split(' ')[0]}`} />
        <h3 className="text-sm font-semibold text-slate-400">{title}</h3>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </motion.div>
  )
}
