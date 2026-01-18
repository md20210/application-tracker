import { useState, useEffect } from 'react'
import { Trash2, FileText, ChevronDown, ChevronUp, AlertCircle, Check, X, Eye } from 'lucide-react'
import { getApplicationsOverview, getApplicationDetail, deleteApplication, deleteDocument, getDocumentContent, getStatusReport } from '../utils/api'
import ReportWindow from '../components/ReportWindow'

interface Application {
  id: number
  company_name: string
  position: string | null
  status: string
  document_count: number
  cv_file: string | null
  cv_document_id: number | null
  cover_letter_file: string | null
  cover_letter_document_id: number | null
  job_description_file: string | null
  job_description_document_id: number | null
  other_files_count: number
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
  const [viewingDocument, setViewingDocument] = useState<any>(null)
  const [documentContent, setDocumentContent] = useState<string>('')
  const [loadingDocument, setLoadingDocument] = useState(false)

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

  const handleDeleteDocument = async (appId: number, documentId: number, filename: string) => {
    if (confirm(`Dokument "${filename}" wirklich löschen?`)) {
      try {
        await deleteDocument(appId, documentId)
        // Reload detail view
        const res = await getApplicationDetail(appId)
        setAppDetails(res.data)
        // Reload overview to update document counts
        loadData()
      } catch (error) {
        console.error('Error deleting document:', error)
        alert('Fehler beim Löschen des Dokuments')
      }
    }
  }

  const handleViewDocument = async (appId: number, document: any) => {
    setViewingDocument(document)
    setLoadingDocument(true)
    setDocumentContent('')

    try {
      const res = await getDocumentContent(appId, document.id)
      setDocumentContent(res.data.content || '[Kein Text extrahiert]')
    } catch (error) {
      console.error('Error loading document:', error)
      setDocumentContent('[Fehler beim Laden des Dokuments]')
    } finally {
      setLoadingDocument(false)
    }
  }

  const handleViewDocumentFromOverview = async (
    appId: number,
    documentId: number,
    filename: string,
    docType: string
  ) => {
    const doc = { id: documentId, filename, doc_type: docType }
    await handleViewDocument(appId, doc)
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
        <div className="text-blue-600">Lädt...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-blue-900">Bewerbungs-Übersicht</h2>
        <button
          onClick={() => setShowReportWindow(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          Report erstellen
        </button>
      </div>

      {/* Status Report Summary */}
      {statusReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
            <div className="text-blue-600 text-sm">Gesamt</div>
            <div className="text-3xl font-bold text-blue-900 mt-1">
              {statusReport.total_applications}
            </div>
          </div>

          {statusReport.status_distribution.slice(0, 3).map((item) => (
            <div key={item.status} className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
              <div className="text-blue-600 text-sm">{getStatusLabel(item.status)}</div>
              <div className="text-3xl font-bold text-blue-900 mt-1">{item.count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Applications Table */}
      <div className="bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-blue-50 border-b border-blue-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-blue-700">Firma</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-blue-700">Position</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-blue-700">Status</th>
              <th className="px-2 py-3 text-center text-sm font-medium text-blue-700">CV</th>
              <th className="px-2 py-3 text-center text-sm font-medium text-blue-700">Anschreiben</th>
              <th className="px-2 py-3 text-center text-sm font-medium text-blue-700">Job Desc</th>
              <th className="px-2 py-3 text-center text-sm font-medium text-blue-700">Sonstiges</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-blue-700">Erstellt</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-blue-700">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-blue-600">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  Noch keine Bewerbungen vorhanden
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <>
                  <tr key={app.id} className="hover:bg-blue-50 cursor-pointer">
                    <td
                      className="px-4 py-3 text-blue-900 font-medium"
                      onClick={() => handleExpandApp(app.id)}
                    >
                      <div className="flex items-center">
                        {expandedApp === app.id ? (
                          <ChevronUp className="w-4 h-4 mr-2 text-blue-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 mr-2 text-blue-600" />
                        )}
                        {app.company_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-blue-700">{app.position || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(
                          app.status
                        )}`}
                      >
                        {getStatusLabel(app.status)}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      {app.cv_file && app.cv_document_id ? (
                        <button
                          onClick={() => handleViewDocumentFromOverview(app.id, app.cv_document_id!, app.cv_file!, 'cv')}
                          title={`${app.cv_file} ansehen`}
                          className="inline-block p-1 hover:bg-green-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Check className="w-5 h-5 text-green-600" />
                        </button>
                      ) : (
                        <X className="w-5 h-5 text-blue-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {app.cover_letter_file && app.cover_letter_document_id ? (
                        <button
                          onClick={() => handleViewDocumentFromOverview(app.id, app.cover_letter_document_id!, app.cover_letter_file!, 'cover_letter')}
                          title={`${app.cover_letter_file} ansehen`}
                          className="inline-block p-1 hover:bg-green-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Check className="w-5 h-5 text-green-600" />
                        </button>
                      ) : (
                        <X className="w-5 h-5 text-blue-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {app.job_description_file && app.job_description_document_id ? (
                        <button
                          onClick={() => handleViewDocumentFromOverview(app.id, app.job_description_document_id!, app.job_description_file!, 'job_description')}
                          title={`${app.job_description_file} ansehen`}
                          className="inline-block p-1 hover:bg-green-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Check className="w-5 h-5 text-green-600" />
                        </button>
                      ) : (
                        <X className="w-5 h-5 text-blue-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-2 py-3 text-center text-blue-700">
                      {app.other_files_count > 0 ? app.other_files_count : '-'}
                    </td>
                    <td className="px-4 py-3 text-blue-600 text-sm">
                      {new Date(app.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(app.id, app.company_name)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Details */}
                  {expandedApp === app.id && appDetails && (
                    <tr>
                      <td colSpan={9} className="bg-blue-50 px-4 py-4 border-t border-blue-200">
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-blue-900 mb-2">Dokumente</h4>
                          {appDetails.documents.length === 0 ? (
                            <p className="text-blue-600">Keine Dokumente vorhanden</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {appDetails.documents.map((doc: any) => (
                                <div
                                  key={doc.id}
                                  className="bg-white rounded-md p-3 border border-blue-200 shadow-sm"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="text-blue-900 font-medium">{doc.filename}</div>
                                      <div className="text-blue-600 text-sm">
                                        {doc.doc_type || 'Unbekannt'}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-5 h-5 text-blue-600" />
                                      <button
                                        onClick={() => handleViewDocument(app.id, doc)}
                                        className="p-1 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                        title="Dokument ansehen"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteDocument(app.id, doc.id, doc.filename)}
                                        className="p-1 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                        title="Dokument löschen"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {appDetails.status_history.length > 0 && (
                            <>
                              <h4 className="text-lg font-semibold text-blue-900 mb-2 mt-4">
                                Status-Historie
                              </h4>
                              <div className="space-y-2">
                                {appDetails.status_history.slice(0, 5).map((history: any) => (
                                  <div
                                    key={history.id}
                                    className="bg-white rounded-md p-3 border border-blue-200 shadow-sm text-sm"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="text-blue-600">
                                          {history.old_status || 'Neu'}
                                        </span>
                                        <span className="text-blue-400 mx-2">→</span>
                                        <span className="text-blue-900 font-medium">
                                          {getStatusLabel(history.new_status)}
                                        </span>
                                      </div>
                                      <div className="text-blue-600 text-xs">
                                        {new Date(history.changed_at).toLocaleString('de-DE')}
                                      </div>
                                    </div>
                                    {history.notes && (
                                      <div className="text-blue-700 mt-1">{history.notes}</div>
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

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-blue-200">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">{viewingDocument.filename}</h3>
                <p className="text-sm text-blue-600">
                  Typ: <span className="font-medium">{viewingDocument.doc_type}</span>
                </p>
              </div>
              <button
                onClick={() => setViewingDocument(null)}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDocument ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-blue-600">Lädt Dokument...</div>
                </div>
              ) : (
                <div className="prose prose-blue max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-blue-900 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    {documentContent}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-blue-200 flex justify-end">
              <button
                onClick={() => setViewingDocument(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
