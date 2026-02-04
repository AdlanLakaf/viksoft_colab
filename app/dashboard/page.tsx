'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authHelpers } from '@/lib/auth'
import { supabase, Profile, UserStatistics } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { 
  LogOut, Settings, User, FileText, CheckCircle, 
  Clock, AlertCircle, TrendingUp, Activity 
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStatistics | null>(null)
  const [loading, setLoading] = useState(true)

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
      if (userProfile.status !== 'approved') {
        router.push('/')
        return
      }

      setProfile(userProfile)
      await fetchStats(user.id)
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (userId: string) => {
    const { data } = await supabase
      .from('user_statistics')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (data) setStats(data)
  }

  const handleSignOut = async () => {
    await authHelpers.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  const statCards = [
    {
      title: 'Completed',
      value: stats?.total_completed || 0,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
    {
      title: 'Working',
      value: stats?.total_working || 0,
      icon: Clock,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      title: 'Blocked',
      value: stats?.total_blocked || 0,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    },
    {
      title: 'Total Tasks',
      value: (stats?.total_completed || 0) + (stats?.total_working || 0) + (stats?.total_blocked || 0),
      icon: Activity,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
    },
  ]

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
              style={{ backgroundColor: profile?.user_color }}
            >
              {profile?.full_name?.charAt(0) || profile?.email?.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome back, {profile?.full_name || 'User'}!</h1>
              <p className="text-slate-400">{profile?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn btn-ghost">
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button onClick={handleSignOut} className="btn btn-secondary">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`card ${stat.bgColor} border ${stat.borderColor}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <TrendingUp className={`w-4 h-4 ${stat.color}`} />
              </div>
              <h3 className="text-sm font-semibold text-slate-400 mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Quick Actions</h2>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/workspace')}
                  className="w-full btn btn-primary justify-start text-left"
                >
                  <FileText className="w-5 h-5" />
                  <div>
                    <div className="font-semibold">Open Workspace</div>
                    <div className="text-xs opacity-70">Start working on CSV data</div>
                  </div>
                </button>
                
                {profile?.role === 'admin' && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="w-full btn btn-secondary justify-start text-left"
                  >
                    <Settings className="w-5 h-5" />
                    <div>
                      <div className="font-semibold">Admin Dashboard</div>
                      <div className="text-xs opacity-70">Manage users and files</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Profile</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400">Role</label>
                <div className="mt-1">
                  <span className="badge badge-approved uppercase">{profile?.role}</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400">Status</label>
                <div className="mt-1">
                  <span className="badge badge-approved">{profile?.status}</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400">Your Color</label>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full shadow-md"
                    style={{ backgroundColor: profile?.user_color }}
                  />
                  <span className="text-sm font-mono">{profile?.user_color}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
