import { useState, useEffect } from 'react'
import { Trash2, FileText, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { getApplicationsOverview, getApplicationDetail, deleteApplication, getStatusReport } from '../utils/api'
import ReportWindow from '../components/ReportWindow'

interface Application {
  id: number
  company_name: string
  position: string | null
  status: string
  document_count: number
  created_at: string
  updated_at: string
}

interface StatusReport {
  total_applications: number
  status_distribution: { status: string; count: number }[]
  recent_changes: any[]
}

export default function Overview() {
  const [applications, setApplications] = useState<Application[]>([])
  const [statusReport, setStatusReport] = useState<StatusReport | null>(null)
  const [expandedApp, setExpandedApp] = useState<number | null>(null)
  const [appDetails, setAppDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showReportWindow, setShowReportWindow] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [appsRes, reportRes] = await Promise.all([
        getApplicationsOverview(),
        getStatusReport(),
      ])
      setApplications(appsRes.data)
      setStatusReport(reportRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExpandApp = async (appId: number) => {
    if (expandedApp === appId) {
      setExpandedApp(null)
      setAppDetails(null)
    } else {
      setExpandedApp(appId)
      try {
        const res = await getApplicationDetail(appId)
        setAppDetails(res.data)
      } catch (error) {
        console.error('Error loading app details:', error)
      }
    }
  }

  const handleDelete = async (appId: number, companyName: string) => {
    if (confirm(`Bewerbung für ${companyName} wirklich löschen?`)) {
      try {
        await deleteApplication(appId)
        loadData()
        if (expandedApp === appId) {
          setExpandedApp(null)
          setAppDetails(null)
        }
      } catch (error) {
        console.error('Error deleting application:', error)
        alert('Fehler beim Löschen')
      }
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      uploaded: 'bg-gray-600',
      applied: 'bg-blue-600',
      screening: 'bg-yellow-600',
      interview: 'bg-purple-600',
      technical_test: 'bg-indigo-600',
      offer: 'bg-green-600',
      rejected: 'bg-red-600',
      accepted: 'bg-emerald-600',
      withdrawn: 'bg-gray-500',
    }
    return colors[status] || 'bg-gray-600'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      uploaded: 'Hochgeladen',
      applied: 'Beworben',
      screening: 'Screening',
      interview: 'Interview',
      technical_test: 'Tech-Test',
      offer: 'Zusage',
      rejected: 'Absage',
      accepted: 'Angenommen',
      withdrawn: 'Zurückgezogen',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Lädt...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">Bewerbungs-Übersicht</h2>
        <button
          onClick={() => setShowReportWindow(true)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
        >
          Report erstellen
        </button>
      </div>

      {/* Status Report Summary */}
      {statusReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm">Gesamt</div>
            <div className="text-3xl font-bold text-white mt-1">
              {statusReport.total_applications}
            </div>
          </div>

          {statusReport.status_distribution.slice(0, 3).map((item) => (
            <div key={item.status} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm">{getStatusLabel(item.status)}</div>
              <div className="text-3xl font-bold text-white mt-1">{item.count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Applications Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Firma</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Position</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Dokumente</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Erstellt</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  Noch keine Bewerbungen vorhanden
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <>
                  <tr key={app.id} className="hover:bg-gray-750 cursor-pointer">
                    <td
                      className="px-4 py-3 text-white font-medium"
                      onClick={() => handleExpandApp(app.id)}
                    >
                      <div className="flex items-center">
                        {expandedApp === app.id ? (
                          <ChevronUp className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        )}
                        {app.company_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{app.position || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(
                          app.status
                        )}`}
                      >
                        {getStatusLabel(app.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <FileText className="w-4 h-4 inline-block mr-1" />
                      {app.document_count}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(app.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(app.id, app.company_name)}
                        className="p-2 text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Details */}
                  {expandedApp === app.id && appDetails && (
                    <tr>
                      <td colSpan={6} className="bg-gray-900 px-4 py-4">
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-white mb-2">Dokumente</h4>
                          {appDetails.documents.length === 0 ? (
                            <p className="text-gray-400">Keine Dokumente vorhanden</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {appDetails.documents.map((doc: any) => (
                                <div
                                  key={doc.id}
                                  className="bg-gray-800 rounded-md p-3 border border-gray-700"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-white font-medium">{doc.filename}</div>
                                      <div className="text-gray-400 text-sm">
                                        {doc.doc_type || 'Unbekannt'}
                                      </div>
                                    </div>
                                    <FileText className="w-5 h-5 text-gray-400" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {appDetails.status_history.length > 0 && (
                            <>
                              <h4 className="text-lg font-semibold text-white mb-2 mt-4">
                                Status-Historie
                              </h4>
                              <div className="space-y-2">
                                {appDetails.status_history.slice(0, 5).map((history: any) => (
                                  <div
                                    key={history.id}
                                    className="bg-gray-800 rounded-md p-3 border border-gray-700 text-sm"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="text-gray-400">
                                          {history.old_status || 'Neu'}
                                        </span>
                                        <span className="text-gray-500 mx-2">→</span>
                                        <span className="text-white font-medium">
                                          {getStatusLabel(history.new_status)}
                                        </span>
                                      </div>
                                      <div className="text-gray-400 text-xs">
                                        {new Date(history.changed_at).toLocaleString('de-DE')}
                                      </div>
                                    </div>
                                    {history.notes && (
                                      <div className="text-gray-400 mt-1">{history.notes}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Report Window Modal */}
      {showReportWindow && (
        <ReportWindow onClose={() => setShowReportWindow(false)} />
      )}
    </div>
  )
}
