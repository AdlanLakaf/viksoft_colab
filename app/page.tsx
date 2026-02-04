'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authHelpers } from '@/lib/auth'
import { motion } from 'framer-motion'
import { Users, Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isLogin) {
        await authHelpers.signIn(formData.email, formData.password)
        
        // Check user status
        const user = await authHelpers.getUser()
        if (user) {
          const profile = await authHelpers.getProfile(user.id)
          
          if (profile.status === 'pending') {
            setError('Your account is pending approval. Please wait for admin approval.')
            await authHelpers.signOut()
            return
          }
          
          if (profile.status === 'rejected') {
            setError('Your account has been rejected. Please contact the administrator.')
            await authHelpers.signOut()
            return
          }
          
          // Redirect based on role
          if (profile.role === 'admin') {
            router.push('/admin')
          } else {
            router.push('/dashboard')
          }
        }
      } else {
        await authHelpers.signUp(formData.email, formData.password, formData.fullName)
        setSuccess('Account created! Please wait for admin approval before logging in.')
        setFormData({ email: '', password: '', fullName: '' })
        setTimeout(() => setIsLogin(true), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-600/20 to-pink-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass rounded-2xl shadow-2xl p-8 border border-white/10">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary mb-4 shadow-lg"
            >
              <Users className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-2">CSV Collaboration</h1>
            <p className="text-slate-400">
              {isLogin ? 'Welcome back! Sign in to continue' : 'Create your account to get started'}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-400">{success}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="input-group">
                <label className="input-label">
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            )}

            <div className="input-group">
              <label className="input-label">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary group"
            >
              {loading ? (
                <div className="spinner mx-auto" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setSuccess('')
              }}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {isLogin ? (
                <>
                  Don't have an account?{' '}
                  <span className="text-blue-400 font-semibold">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <span className="text-blue-400 font-semibold">Sign in</span>
                </>
              )}
            </button>
          </div>

          {/* Info Note */}
          {!isLogin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg"
            >
              <p className="text-xs text-blue-300 text-center">
                New accounts require admin approval before you can access the platform
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
