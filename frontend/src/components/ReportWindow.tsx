import { useState } from 'react'
import { X, Plus, Loader2, Download, Trash2 } from 'lucide-react'
import { generateCustomReport } from '../utils/api'

interface ReportWindowProps {
  onClose: () => void
}

interface CustomColumn {
  name: string
  type: 'text' | 'number' | 'date' | 'status'
  prompt: string
}

export default function ReportWindow({ onClose }: ReportWindowProps) {
  const [baseColumns, setBaseColumns] = useState<string[]>([
    'company_name',
    'position',
    'status',
    'document_count',
  ])
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([])
  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnPrompt, setNewColumnPrompt] = useState('')
  const [newColumnType, setNewColumnType] = useState<'text' | 'number'>('text')
  const [provider, setProvider] = useState('ollama')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)

  const availableBaseColumns = [
    { value: 'company_name', label: 'Firmenname' },
    { value: 'position', label: 'Position' },
    { value: 'status', label: 'Status' },
    { value: 'document_count', label: 'Anzahl Dokumente' },
    { value: 'created_at', label: 'Erstellt am' },
    { value: 'updated_at', label: 'Aktualisiert am' },
    { value: 'notes', label: 'Notizen' },
  ]

  const handleAddCustomColumn = () => {
    if (!newColumnName.trim() || !newColumnPrompt.trim()) {
      alert('Bitte Name und Prompt angeben')
      return
    }

    const column: CustomColumn = {
      name: newColumnName.trim().toLowerCase().replace(/\s+/g, '_'),
      type: newColumnType,
      prompt: newColumnPrompt.trim(),
    }

    setCustomColumns([...customColumns, column])
    setNewColumnName('')
    setNewColumnPrompt('')
    setNewColumnType('text')
  }

  const handleRemoveCustomColumn = (index: number) => {
    setCustomColumns(customColumns.filter((_, i) => i !== index))
  }

  const handleToggleBaseColumn = (column: string) => {
    if (baseColumns.includes(column)) {
      setBaseColumns(baseColumns.filter((c) => c !== column))
    } else {
      setBaseColumns([...baseColumns, column])
    }
  }

  const handleGenerateReport = async () => {
    try {
      setLoading(true)
      const res = await generateCustomReport(baseColumns, customColumns, provider)
      setReportData(res.data)
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Fehler beim Erstellen des Reports')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCSV = () => {
    if (!reportData) return

    const headers = reportData.columns.join(',')
    const rows = reportData.rows.map((row: any) =>
      reportData.columns.map((col: string) => {
        const value = row[col]
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )

    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `bewerbungs_report_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getColumnLabel = (column: string) => {
    const found = availableBaseColumns.find((c) => c.value === column)
    return found ? found.label : column
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h3 className="text-2xl font-bold text-white">Berichts-Generator</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-md transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!reportData ? (
            <>
              {/* Base Columns Selection */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Basis-Spalten</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableBaseColumns.map((col) => (
                    <label
                      key={col.value}
                      className="flex items-center space-x-2 p-3 bg-gray-900 border border-gray-700 rounded-md cursor-pointer hover:bg-gray-750 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={baseColumns.includes(col.value)}
                        onChange={() => handleToggleBaseColumn(col.value)}
                        className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-300">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Columns */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">
                  Benutzerdefinierte Spalten (via LLM)
                </h4>

                {customColumns.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {customColumns.map((col, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-900 border border-gray-700 rounded-md p-3 flex items-start justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-white">{col.name}</span>
                            <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">
                              {col.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mt-1">{col.prompt}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveCustomColumn(idx)}
                          className="p-1 text-red-400 hover:bg-red-900/20 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Custom Column Form */}
                <div className="bg-gray-900 border border-gray-700 rounded-md p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Spaltenname
                      </label>
                      <input
                        type="text"
                        value={newColumnName}
                        onChange={(e) => setNewColumnName(e.target.value)}
                        placeholder="z.B. Match Score"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Typ</label>
                      <select
                        value={newColumnType}
                        onChange={(e) => setNewColumnType(e.target.value as 'text' | 'number')}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                      >
                        <option value="text">Text</option>
                        <option value="number">Zahl</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      LLM-Prompt (Was soll berechnet/analysiert werden?)
                    </label>
                    <textarea
                      value={newColumnPrompt}
                      onChange={(e) => setNewColumnPrompt(e.target.value)}
                      placeholder="z.B. 'Bewerte die Passung dieser Bewerbung zu meinen Skills von 1-10'"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
                      rows={2}
                    />
                  </div>
                  <button
                    onClick={handleAddCustomColumn}
                    className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Spalte hinzufügen</span>
                  </button>
                </div>
              </div>

              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  LLM-Provider (für custom Spalten)
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="ollama">Ollama (Lokal - langsamer)</option>
                  <option value="grok">Grok (Cloud - schneller)</option>
                  <option value="anthropic">Claude (Cloud - am besten)</option>
                </select>
                {customColumns.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    ⚠️ Custom Spalten benötigen LLM-Aufrufe pro Bewerbung - kann dauern!
                  </p>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateReport}
                disabled={loading || baseColumns.length === 0}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-md font-medium flex items-center justify-center space-x-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Report wird erstellt...</span>
                  </>
                ) : (
                  <>
                    <span>Report generieren</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Report Results */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-white">Report-Ergebnis</h4>
                  <p className="text-sm text-gray-400">
                    {reportData.total_rows} Bewerbungen | {reportData.columns.length} Spalten
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleDownloadCSV}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm flex items-center space-x-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>CSV Download</span>
                  </button>
                  <button
                    onClick={() => setReportData(null)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors"
                  >
                    Neu erstellen
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr>
                      {reportData.columns.map((col: string) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left font-medium text-gray-300 border-b border-gray-700"
                        >
                          {getColumnLabel(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {reportData.rows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-800 transition-colors">
                        {reportData.columns.map((col: string) => (
                          <td key={col} className="px-4 py-3 text-gray-300 whitespace-nowrap">
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
