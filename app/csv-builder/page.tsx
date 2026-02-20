'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authHelpers } from '@/lib/auth'
import { supabase, Profile } from '@/lib/supabase'
import {
    Plus, Trash2, Download, Upload, ArrowLeft,
    ChevronRight, ChevronLeft, Save
} from 'lucide-react'

interface Cell {
    value: string
}

export default function CSVBuilderPage() {
    const router = useRouter()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [columns, setColumns] = useState<string[]>(['Column 1', 'Column 2', 'Column 3'])
    const [rows, setRows] = useState<Cell[][]>([
        [{ value: '' }, { value: '' }, { value: '' }],
        [{ value: '' }, { value: '' }, { value: '' }],
        [{ value: '' }, { value: '' }, { value: '' }],
    ])
    const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null)
    const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null)
    const inputRefs = useRef<(HTMLInputElement | null)[][]>([])

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
        } catch (error) {
            console.error('Auth error:', error)
            router.push('/')
        } finally {
            setLoading(false)
        }
    }

    const addColumn = () => {
        const newColName = `Column ${columns.length + 1}`
        setColumns([...columns, newColName])
        setRows(rows.map(row => [...row, { value: '' }]))
    }

    const deleteColumn = (colIndex: number) => {
        if (columns.length <= 1) {
            alert('Must have at least one column')
            return
        }
        setColumns(columns.filter((_, i) => i !== colIndex))
        setRows(rows.map(row => row.filter((_, i) => i !== colIndex)))
    }

    const addRow = () => {
        setRows([...rows, columns.map(() => ({ value: '' }))])
    }

    const deleteRow = (rowIndex: number) => {
        if (rows.length <= 1) {
            alert('Must have at least one row')
            return
        }
        setRows(rows.filter((_, i) => i !== rowIndex))
    }

    const updateCell = (rowIndex: number, colIndex: number, value: string) => {
        const newRows = [...rows]
        newRows[rowIndex][colIndex].value = value
        setRows(newRows)
    }

    const updateColumnName = (colIndex: number, value: string) => {
        const newColumns = [...columns]
        newColumns[colIndex] = value
        setColumns(newColumns)
    }

    const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            // Move down
            if (rowIndex < rows.length - 1) {
                focusCell(rowIndex + 1, colIndex)
            } else {
                // Add new row if at bottom
                addRow()
                setTimeout(() => focusCell(rowIndex + 1, colIndex), 50)
            }
        } else if (e.key === 'Tab') {
            e.preventDefault()
            // Move right (or down to next row)
            if (e.shiftKey) {
                // Shift+Tab: move left
                if (colIndex > 0) {
                    focusCell(rowIndex, colIndex - 1)
                } else if (rowIndex > 0) {
                    focusCell(rowIndex - 1, columns.length - 1)
                }
            } else {
                // Tab: move right
                if (colIndex < columns.length - 1) {
                    focusCell(rowIndex, colIndex + 1)
                } else if (rowIndex < rows.length - 1) {
                    focusCell(rowIndex + 1, 0)
                }
            }
        } else if (e.key === 'ArrowUp' && e.ctrlKey) {
            e.preventDefault()
            if (rowIndex > 0) focusCell(rowIndex - 1, colIndex)
        } else if (e.key === 'ArrowDown' && e.ctrlKey) {
            e.preventDefault()
            if (rowIndex < rows.length - 1) focusCell(rowIndex + 1, colIndex)
        } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
            e.preventDefault()
            if (colIndex > 0) focusCell(rowIndex, colIndex - 1)
        } else if (e.key === 'ArrowRight' && e.ctrlKey) {
            e.preventDefault()
            if (colIndex < columns.length - 1) focusCell(rowIndex, colIndex + 1)
        }
    }

    const focusCell = (rowIndex: number, colIndex: number) => {
        setSelectedCell({ row: rowIndex, col: colIndex })
        setEditingCell({ row: rowIndex, col: colIndex })
        setTimeout(() => {
            inputRefs.current[rowIndex]?.[colIndex]?.focus()
            inputRefs.current[rowIndex]?.[colIndex]?.select()
        }, 0)
    }

    const downloadCSV = () => {
        const csvContent = [
            columns.join(','),
            ...rows.map(row =>
                row.map(cell => `"${cell.value.replace(/"/g, '""')}"`).join(',')
            )
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `custom-data-${Date.now()}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    const uploadToDatabase = async () => {
        if (!profile) return

        try {
            // Create CSV file record
            const { data: csvFile, error: fileError } = await supabase
                .from('csv_files')
                .insert({
                    name: `Custom Entry ${new Date().toLocaleDateString()}`,
                    original_filename: `custom-${Date.now()}.csv`,
                    uploaded_by: profile.id,
                    total_rows: rows.length,
                })
                .select()
                .single()

            if (fileError) throw fileError

            // Convert to database format
            const dbRows = rows.map((row, index) => {
                const rowData: Record<string, string> = {}
                columns.forEach((col, colIndex) => {
                    rowData[col] = row[colIndex].value
                })
                return {
                    file_id: csvFile.id,
                    row_index: index,
                    data: rowData,
                    status: 'pending' as const,
                }
            })

            // Insert in batches
            const BATCH_SIZE = 1000
            for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
                const batch = dbRows.slice(i, i + BATCH_SIZE)
                const { error } = await supabase.from('csv_rows').insert(batch)
                if (error) throw error
            }

            alert(`✅ Uploaded successfully!\n\nRows: ${rows.length}\nColumns: ${columns.length}`)
            router.push('/admin')
        } catch (error) {
            console.error('Upload error:', error)
            alert('Error uploading to database')
        }
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
            <div className="max-w-full mx-auto mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/admin')} className="btn btn-ghost">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold">CSV Builder</h1>
                            <p className="text-slate-400">Create custom CSV data manually</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={addColumn} className="btn btn-secondary">
                            <Plus className="w-4 h-4" />
                            Add Column
                        </button>
                        <button onClick={addRow} className="btn btn-secondary">
                            <Plus className="w-4 h-4" />
                            Add Row
                        </button>
                        <button onClick={downloadCSV} className="btn btn-ghost">
                            <Download className="w-4 h-4" />
                            Download CSV
                        </button>
                        <button onClick={uploadToDatabase} className="btn btn-primary">
                            <Upload className="w-4 h-4" />
                            Upload to Database
                        </button>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="max-w-full mx-auto mb-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-300">
                        💡 <strong>Keyboard shortcuts:</strong> Enter (move down) · Tab (move right) ·
                        Shift+Tab (move left) · Ctrl+Arrows (navigate) · Double-click to edit column names
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="max-w-full mx-auto mb-6">
                <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">Columns:</span>
                        <span className="font-bold text-green-400">{columns.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">Rows:</span>
                        <span className="font-bold text-blue-400">{rows.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">Total Cells:</span>
                        <span className="font-bold text-purple-400">{columns.length * rows.length}</span>
                    </div>
                </div>
            </div>

            {/* Spreadsheet */}
            <div className="max-w-full mx-auto">
                <div className="table-container" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                    <table className="data-table">
                        <thead>
                        <tr>
                            <th className="sticky left-0 bg-slate-700 z-20" style={{ width: '60px' }}>#</th>
                            {columns.map((col, colIndex) => (
                                <th key={colIndex} style={{ minWidth: '200px' }}>
                                    <div className="flex items-center justify-between gap-2">
                                        <input
                                            type="text"
                                            value={col}
                                            onChange={(e) => updateColumnName(colIndex, e.target.value)}
                                            className="bg-transparent border-none outline-none text-white font-semibold w-full"
                                            placeholder={`Column ${colIndex + 1}`}
                                        />
                                        <button
                                            onClick={() => deleteColumn(colIndex)}
                                            className="text-red-400 hover:text-red-300 p-1"
                                            title="Delete column"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </th>
                            ))}
                            <th style={{ width: '60px' }}>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((row, rowIndex) => {
                            if (!inputRefs.current[rowIndex]) {
                                inputRefs.current[rowIndex] = []
                            }
                            return (
                                <tr key={rowIndex}>
                                    <td className="sticky left-0 bg-slate-800 font-mono text-xs text-center">
                                        {rowIndex + 1}
                                    </td>
                                    {row.map((cell, colIndex) => {
                                        const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                                        return (
                                            <td key={colIndex} className="p-0">
                                                <input
                                                    ref={(el) => {
                                                        if (!inputRefs.current[rowIndex]) {
                                                            inputRefs.current[rowIndex] = []
                                                        }
                                                        inputRefs.current[rowIndex][colIndex] = el
                                                    }}
                                                    type="text"
                                                    value={cell.value}
                                                    onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                                                    onFocus={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                                                    onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                                                    className={`w-full h-full px-3 py-2 bg-transparent border-none outline-none ${
                                                        isSelected ? 'ring-2 ring-blue-500' : ''
                                                    }`}
                                                    placeholder={`Row ${rowIndex + 1}`}
                                                />
                                            </td>
                                        )
                                    })}
                                    <td className="text-center">
                                        <button
                                            onClick={() => deleteRow(rowIndex)}
                                            className="text-red-400 hover:text-red-300 p-2"
                                            title="Delete row"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 flex items-center gap-3">
                    <button onClick={addRow} className="btn btn-ghost text-sm">
                        <Plus className="w-3 h-3" />
                        Add Row Below
                    </button>
                    <button onClick={addColumn} className="btn btn-ghost text-sm">
                        <Plus className="w-3 h-3" />
                        Add Column Right
                    </button>
                </div>
            </div>
        </div>
    )
}