'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { authHelpers } from '@/lib/auth'
import { supabase, Profile, CSVFile, CSVRow, RowStatus } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft, Filter, Search, Save, Lock, Unlock,
    CheckCircle, Clock, AlertCircle, Edit3, MessageSquare,
    Users, RefreshCw, Download, ChevronLeft, ChevronRight
} from 'lucide-react'

export default function WorkspacePage() {
    const router = useRouter()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [files, setFiles] = useState<CSVFile[]>([])
    const [selectedFile, setSelectedFile] = useState<CSVFile | null>(null)
    const [rows, setRows] = useState<CSVRow[]>([])
    const [activeUsers, setActiveUsers] = useState<Profile[]>([])
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [editingCell, setEditingCell] = useState<{rowId: string, field: string} | null>(null)
    const [loading, setLoading] = useState(true)
    const [columnOrder, setColumnOrder] = useState<string[]>([])
    const realtimeChannel = useRef<any>(null)

    useEffect(() => {
        checkAuth()
        return () => {
            if (realtimeChannel.current) {
                supabase.removeChannel(realtimeChannel.current)
            }
        }
    }, [])

    useEffect(() => {
        if (selectedFile) {
            fetchRows()
            setupRealtime()
            // Reset column order when switching files
            setColumnOrder([])
        }
    }, [selectedFile])

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
            await fetchFiles()
        } catch (error) {
            console.error('Auth error:', error)
            router.push('/')
        } finally {
            setLoading(false)
        }
    }

    const fetchFiles = async () => {
        const { data } = await supabase
            .from('csv_files')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (data && data.length > 0) {
            setFiles(data)
            setSelectedFile(data[0])
        }
    }

    const fetchRows = async () => {
        if (!selectedFile) return

        // Fetch ALL rows (no limit) - we handle pagination on frontend
        const { data, error } = await supabase
            .from('csv_rows')
            .select('*')
            .eq('file_id', selectedFile.id)
            .order('row_index', { ascending: true })
            .limit(100000) // Set high limit to ensure we get everything

        if (error) {
            console.error('Error fetching rows:', error)
            return
        }

        if (data) {
            console.log(`📊 Loaded ${data.length} total rows from database`)
            setRows(data)
            // Fetch active users
            const userIds = [...new Set(data.filter(r => r.locked_by).map(r => r.locked_by!))]
            if (userIds.length > 0) {
                const { data: users } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', userIds)
                if (users) setActiveUsers(users)
            }
        }
    }

    const setupRealtime = () => {
        if (!selectedFile || !profile) return

        // Clean up existing channel
        if (realtimeChannel.current) {
            supabase.removeChannel(realtimeChannel.current)
        }

        // Subscribe to row changes
        realtimeChannel.current = supabase
            .channel(`workspace-${selectedFile.id}`, {
                config: {
                    broadcast: { self: true }
                }
            })
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'csv_rows',
                    filter: `file_id=eq.${selectedFile.id}`,
                },
                (payload) => {
                    console.log('🔄 Real-time update received:', payload)
                    fetchRows()
                }
            )
            .on('broadcast', { event: 'row_updated' }, (payload) => {
                console.log('📢 Broadcast received:', payload)
                fetchRows()
            })
            .subscribe((status) => {
                console.log('📡 Realtime status:', status)
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully connected to real-time channel')
                }
            })
    }

    const handleLockRow = async (row: CSVRow) => {
        if (!profile || row.locked_by) return

        try {
            await supabase
                .from('csv_rows')
                .update({
                    locked_by: profile.id,
                    locked_at: new Date().toISOString(),
                    status: 'working' as RowStatus,
                    assigned_to: profile.id,
                })
                .eq('id', row.id)

            await supabase.from('activity_log').insert({
                user_id: profile.id,
                action: 'locked row',
                resource_type: 'row',
                resource_id: row.id,
            })

            // Broadcast to other clients
            if (realtimeChannel.current) {
                realtimeChannel.current.send({
                    type: 'broadcast',
                    event: 'row_updated',
                    payload: { rowId: row.id, action: 'locked' }
                })
            }

            // Refresh immediately
            await fetchRows()
        } catch (error) {
            console.error('Error locking row:', error)
        }
    }

    const handleUnlockRow = async (row: CSVRow) => {
        // Allow admin to unlock any row, or user to unlock their own row
        if (!profile) return
        if (profile.role !== 'admin' && row.locked_by !== profile.id) return

        try {
            await supabase
                .from('csv_rows')
                .update({
                    locked_by: null,
                    locked_at: null,
                })
                .eq('id', row.id)

            // Refresh immediately
            await fetchRows()
        } catch (error) {
            console.error('Error unlocking row:', error)
        }
    }

    const handleUpdateCell = async (rowId: string, field: string, value: any) => {
        const row = rows.find(r => r.id === rowId)
        if (!row || row.locked_by !== profile?.id) return

        try {
            const newData = { ...row.data, [field]: value }
            await supabase
                .from('csv_rows')
                .update({ data: newData })
                .eq('id', rowId)

            setEditingCell(null)
            // Refresh immediately
            await fetchRows()
        } catch (error) {
            console.error('Error updating cell:', error)
        }
    }

    const handleChangeStatus = async (row: CSVRow, status: RowStatus) => {
        if (!profile || (row.locked_by && row.locked_by !== profile.id)) return

        try {
            await supabase
                .from('csv_rows')
                .update({
                    status,
                    completed_at: status === 'completed' ? new Date().toISOString() : null,
                })
                .eq('id', row.id)

            await supabase.from('activity_log').insert({
                user_id: profile.id,
                action: `changed status to ${status}`,
                resource_type: 'row',
                resource_id: row.id,
            })

            // Refresh immediately
            await fetchRows()
        } catch (error) {
            console.error('Error changing status:', error)
        }
    }

    const handleAddNote = async (row: CSVRow) => {
        if (!profile || (row.locked_by && row.locked_by !== profile.id)) return

        const note = prompt('Add a note:', row.notes || '')
        if (note === null) return

        try {
            await supabase
                .from('csv_rows')
                .update({ notes: note })
                .eq('id', row.id)
        } catch (error) {
            console.error('Error adding note:', error)
        }
    }

    const exportToCSV = () => {
        if (!selectedFile || rows.length === 0) return

        const headers = Object.keys(rows[0].data)
        const csvContent = [
            headers.join(','),
            ...rows.map(row =>
                headers.map(h => `"${row.data[h] || ''}"`).join(',')
            )
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedFile.name}-export.csv`
        a.click()
    }

    const filteredRows = rows.filter(row => {
        const matchesStatus = filterStatus === 'all' || row.status === filterStatus
        const matchesSearch = searchQuery === '' ||
            Object.values(row.data).some(val =>
                String(val).toLowerCase().includes(searchQuery.toLowerCase())
            )
        return matchesStatus && matchesSearch
    })

    // Render only first 1000 rows for performance, but keep all data for filtering
    const displayRows = filteredRows.slice(0, 1000)
    const hasMoreRows = filteredRows.length > 1000

    // Debug logging
    if (searchQuery && filteredRows.length > 0) {
        console.log(`🔍 Search "${searchQuery}": Found ${filteredRows.length} matches, displaying ${displayRows.length}`)
    }

    const columnHeaders = rows.length > 0 ? Object.keys(rows[0].data) : []

    // Debug logging for column issues
    useEffect(() => {
        if (rows.length > 0 && columnHeaders.length > 0) {
            console.log('📋 Column Debug:')
            console.log('   Column headers:', columnHeaders)
            console.log('   Column order:', columnOrder)
            console.log('   First row data keys:', Object.keys(rows[0].data))
            console.log('   Sample data:', rows[0].data)
        }
    }, [rows.length, columnHeaders.length])

    // Initialize column order when data loads
    useEffect(() => {
        if (columnHeaders.length > 0 && columnOrder.length === 0) {
            setColumnOrder(columnHeaders)
        }
        // Reset if column count changes (different file structure)
        if (columnOrder.length > 0 && columnOrder.length !== columnHeaders.length) {
            setColumnOrder(columnHeaders)
        }
    }, [columnHeaders.length]) // Only depend on length to avoid infinite loops

    // Use column order for display
    const orderedHeaders = columnOrder.length > 0 ? columnOrder : columnHeaders

    const moveColumn = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= orderedHeaders.length) return

        const newOrder = [...orderedHeaders]
        const [moved] = newOrder.splice(fromIndex, 1)
        newOrder.splice(toIndex, 0, moved)
        setColumnOrder(newOrder)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        )
    }

    if (!selectedFile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-slate-500" />
                    <h2 className="text-xl font-bold mb-2">No CSV Files Available</h2>
                    <p className="text-slate-400 mb-6">Ask your admin to upload a CSV file to get started</p>
                    <button onClick={() => router.push('/dashboard')} className="btn btn-primary">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <div className="max-w-full mx-auto mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/dashboard')} className="btn btn-ghost">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold">{selectedFile.name}</h1>
                            <p className="text-slate-400">
                                {selectedFile.completed_rows}/{selectedFile.total_rows} rows completed
                                {filteredRows.length < rows.length && (
                                    <span className="ml-2 text-blue-400">
                    · Showing {filteredRows.length} filtered
                  </span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Active Users */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                            <Users className="w-4 h-4 text-slate-400" />
                            <div className="flex -space-x-2">
                                {activeUsers.slice(0, 5).map(user => (
                                    <div
                                        key={user.id}
                                        className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center text-white text-xs font-bold"
                                        style={{ backgroundColor: user.user_color }}
                                        title={user.full_name || user.email}
                                    >
                                        {user.full_name?.charAt(0) || user.email.charAt(0)}
                                    </div>
                                ))}
                                {activeUsers.length > 5 && (
                                    <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-white text-xs font-bold">
                                        +{activeUsers.length - 5}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={exportToCSV} className="btn btn-secondary">
                            <Download className="w-4 h-4" />
                            Export
                        </button>

                        <button onClick={fetchRows} className="btn btn-ghost">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search in data..."
                            className="input-field pl-10 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="input-field"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="working">Working</option>
                        <option value="completed">Completed</option>
                        <option value="blocked">Blocked</option>
                    </select>

                    {columnOrder.length > 0 && (
                        <button
                            onClick={() => setColumnOrder(columnHeaders)}
                            className="btn btn-ghost text-sm whitespace-nowrap"
                            title="Reset column order"
                        >
                            Reset Columns
                        </button>
                    )}

                    {files.length > 1 && (
                        <select
                            value={selectedFile.id}
                            onChange={(e) => {
                                const file = files.find(f => f.id === e.target.value)
                                if (file) setSelectedFile(file)
                            }}
                            className="input-field"
                        >
                            {files.map(file => (
                                <option key={file.id} value={file.id}>
                                    {file.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Data Table */}
            <div className="max-w-full mx-auto">
                <div className="table-container" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                    <table className="data-table">
                        <thead>
                        <tr>
                            <th className="sticky left-0 bg-slate-700 z-20" style={{ width: '60px' }}>
                                #
                            </th>
                            <th className="sticky left-[60px] bg-slate-700 z-20" style={{ width: '150px' }}>
                                Status
                            </th>
                            <th className="sticky left-[210px] bg-slate-700 z-20" style={{ width: '100px' }}>
                                Lock
                            </th>
                            <th className="sticky left-[310px] bg-slate-700 z-20" style={{ width: '120px' }}>
                                Assigned
                            </th>
                            {orderedHeaders.map((header, index) => (
                                <th key={header} style={{ minWidth: '200px' }}>
                                    <div className="flex items-center justify-between gap-2">
                                        <button
                                            onClick={() => moveColumn(index, index - 1)}
                                            disabled={index === 0}
                                            className="text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed p-1"
                                            title="Move left"
                                        >
                                            <ChevronLeft className="w-3 h-3" />
                                        </button>
                                        <span className="flex-1 text-center">{header}</span>
                                        <button
                                            onClick={() => moveColumn(index, index + 1)}
                                            disabled={index === orderedHeaders.length - 1}
                                            className="text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed p-1"
                                            title="Move right"
                                        >
                                            <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </th>
                            ))}
                            <th style={{ width: '100px' }}>Notes</th>
                        </tr>
                        </thead>
                        <tbody>
                        {displayRows.map((row) => {
                            const assignedUser = activeUsers.find(u => u.id === row.assigned_to)
                            const isLocked = !!row.locked_by
                            const isLockedByMe = row.locked_by === profile?.id
                            const canEdit = !isLocked || isLockedByMe
                            // Allow admin to unlock any row
                            const canUnlock = isLockedByMe || profile?.role === 'admin'

                            return (
                                <motion.tr
                                    key={row.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className={isLockedByMe ? 'active' : ''}
                                    style={{
                                        borderLeft: isLocked ? `3px solid ${assignedUser?.user_color || '#64748b'}` : 'none'
                                    }}
                                >
                                    <td className="sticky left-0 bg-slate-800 font-mono text-xs">
                                        {row.row_index + 1}
                                    </td>
                                    <td className="sticky left-[60px] bg-slate-800">
                                        <select
                                            value={row.status}
                                            onChange={(e) => handleChangeStatus(row, e.target.value as RowStatus)}
                                            disabled={!canEdit}
                                            className={`badge badge-${row.status} cursor-pointer text-xs px-2 py-1`}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="working">Working</option>
                                            <option value="completed">Completed</option>
                                            <option value="blocked">Blocked</option>
                                        </select>
                                    </td>
                                    <td className="sticky left-[210px] bg-slate-800">
                                        {canUnlock && isLocked ? (
                                            <button
                                                onClick={() => handleUnlockRow(row)}
                                                className="btn btn-ghost p-2"
                                                title={isLockedByMe ? "Unlock" : "Admin: Force Unlock"}
                                            >
                                                <Unlock className="w-4 h-4" />
                                            </button>
                                        ) : !isLocked ? (
                                            <button
                                                onClick={() => handleLockRow(row)}
                                                className="btn btn-primary p-2"
                                                title="Start Working"
                                            >
                                                <Lock className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <div className="text-xs text-slate-500">Locked</div>
                                        )}
                                    </td>
                                    <td className="sticky left-[310px] bg-slate-800">
                                        {assignedUser && (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                    style={{ backgroundColor: assignedUser.user_color }}
                                                >
                                                    {assignedUser.full_name?.charAt(0) || assignedUser.email.charAt(0)}
                                                </div>
                                                <span className="text-xs truncate max-w-[80px]">
                            {assignedUser.full_name || assignedUser.email}
                          </span>
                                            </div>
                                        )}
                                    </td>
                                    {orderedHeaders.map(header => (
                                        <td key={header}>
                                            {editingCell?.rowId === row.id && editingCell?.field === header ? (
                                                <input
                                                    type="text"
                                                    defaultValue={row.data[header] || ''}
                                                    onBlur={(e) => handleUpdateCell(row.id, header, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleUpdateCell(row.id, header, e.currentTarget.value)
                                                        }
                                                        if (e.key === 'Escape') {
                                                            setEditingCell(null)
                                                        }
                                                    }}
                                                    autoFocus
                                                    className="input-field py-1 px-2 text-sm w-full"
                                                />
                                            ) : (
                                                <div
                                                    onContextMenu={(e) => {
                                                        e.preventDefault()
                                                        if (canEdit) {
                                                            setEditingCell({ rowId: row.id, field: header })
                                                        }
                                                    }}
                                                    className={`truncate p-1 rounded ${canEdit ? 'cursor-context-menu hover:bg-slate-700/30' : ''}`}
                                                    title={canEdit ? 'Right-click to edit' : (row.data[header] || '-')}
                                                >
                                                    {row.data[header] !== undefined ? row.data[header] : '-'}
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                    <td>
                                        {(canEdit || row.notes) && (
                                            <button
                                                onClick={() => handleAddNote(row)}
                                                className="btn btn-ghost p-2"
                                                title={row.notes || 'Add Note'}
                                            >
                                                <MessageSquare className={`w-4 h-4 ${row.notes ? 'text-blue-400' : ''}`} />
                                            </button>
                                        )}
                                    </td>
                                </motion.tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Info */}
                {hasMoreRows && (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-300">
                            📊 Showing {displayRows.length} of {filteredRows.length} rows (max 1000 displayed for performance). Use filters to narrow down results.
                        </p>
                    </div>
                )}

                {/* Legend */}
                <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <h3 className="text-sm font-semibold mb-3">Legend</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <span>Pending - Not started</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span>Working - In progress</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span>Completed - Finished</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span>Blocked - Needs attention</span>
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                        💡 Tip: Click <Lock className="w-3 h-3 inline" /> to start working on a row. The row will be locked with your color. <strong>Right-click cells to edit</strong> when locked.
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                        🔄 <strong>Reorder columns:</strong> Use <ChevronLeft className="w-3 h-3 inline" /> <ChevronRight className="w-3 h-3 inline" /> arrows in column headers to move columns left/right.
                    </p>
                    {profile?.role === 'admin' && (
                        <p className="mt-2 text-xs text-purple-400">
                            👑 Admin: You can unlock any row, even if locked by other users.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

function FileText({ className }: { className?: string }) {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
}