import { useState, useEffect, useRef } from 'react'
import {
  Folder, FolderOpen, Upload as UploadIcon, Loader2,
  Check, AlertCircle, MoreVertical, Trash2, Eye, RefreshCw,
  Edit2, FileText, FolderPlus
} from 'lucide-react'
import {
  uploadFilesOnly,
  indexDocument,
  listFiles,
  deleteDocument,
  deleteApplication,
  getDocumentContent
} from '../utils/api'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://general-backend-production-a734.up.railway.app'

interface FolderItem {
  id: number
  type: 'folder'
  company_name: string
  position: string | null
  status: string
  document_count: number
  indexed_count: number
  created_at: string
}

interface FileItem {
  id: number
  type: 'file'
  application_id: number
  filename: string
  doc_type: string | null
  indexed: boolean
  created_at: string
}

interface ContextMenu {
  x: number
  y: number
  item: FolderItem | FileItem
}

export default function FileBrowser() {
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [openFolderId, setOpenFolderId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [viewingDocument, setViewingDocument] = useState<FileItem | null>(null)
  const [documentContent, setDocumentContent] = useState<string>('')
  const [loadingDocument, setLoadingDocument] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [renaming, setRenaming] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadFolders()
  }, [])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const loadFolders = async () => {
    try {
      setLoading(true)
      const res = await listFiles()
      setFolders(res.data.folders || [])
      setFiles([])
      setOpenFolderId(null)
    } catch (error) {
      console.error('Error loading folders:', error)
      setError('Fehler beim Laden der Ordner')
    } finally {
      setLoading(false)
    }
  }

  const loadFilesInFolder = async (folderId: number) => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_BASE_URL}/api/applications/files/list?application_id=${folderId}`)
      setFiles(res.data.files || [])
      setOpenFolderId(folderId)
    } catch (error) {
      console.error('Error loading files:', error)
      setError('Fehler beim Laden der Dateien')
    } finally {
      setLoading(false)
    }
  }

  const handleFolderClick = (folderId: number) => {
    if (openFolderId === folderId) {
      // Close folder
      setOpenFolderId(null)
      setFiles([])
    } else {
      // Open folder
      loadFilesInFolder(folderId)
    }
  }

  const handleFolderUpload = async (uploadedFiles: File[]) => {
    if (uploadedFiles.length === 0) return

    try {
      setUploading(true)
      setError(null)

      // Get folder name from first file's path
      const firstFile = uploadedFiles[0] as any
      const folderName = firstFile.webkitRelativePath?.split('/')[0] || 'Neue Bewerbung'

      await uploadFilesOnly(uploadedFiles, undefined, folderName)

      // Reload folders
      await loadFolders()
    } catch (error: any) {
      console.error('Upload error:', error)
      setError(error.response?.data?.detail || 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  const handleFileUploadToFolder = async (folderId: number, uploadedFiles: File[]) => {
    if (uploadedFiles.length === 0) return

    try {
      setUploading(true)
      setError(null)

      await uploadFilesOnly(uploadedFiles, folderId)

      // Reload folder contents
      await loadFilesInFolder(folderId)
      await loadFolders() // Refresh folder counts
    } catch (error: any) {
      console.error('Upload error:', error)
      setError(error.response?.data?.detail || 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const files = Array.from(e.dataTransfer.files)
    handleFolderUpload(files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }

  const handleContextMenu = (e: React.MouseEvent, item: FolderItem | FileItem) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    })
  }

  const handleRenameFolder = async (folderId: number) => {
    if (!newName.trim()) return

    try {
      await axios.patch(`${API_BASE_URL}/api/applications/${folderId}/rename`, {
        new_name: newName
      })
      setRenaming(null)
      setNewName('')
      await loadFolders()
      if (openFolderId === folderId) {
        await loadFilesInFolder(folderId)
      }
    } catch (error) {
      console.error('Error renaming folder:', error)
      setError('Fehler beim Umbenennen')
    }
  }

  const handleDeleteFolder = async (folder: FolderItem) => {
    if (!confirm(`Ordner "${folder.company_name}" und alle Dateien darin wirklich löschen?`)) return

    try {
      setContextMenu(null)
      await deleteApplication(folder.id)
      await loadFolders()
      if (openFolderId === folder.id) {
        setOpenFolderId(null)
        setFiles([])
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      setError('Fehler beim Löschen')
    }
  }

  const handleIndexDocument = async (file: FileItem) => {
    try {
      setContextMenu(null)
      await indexDocument(file.id)
      await loadFilesInFolder(file.application_id)
      await loadFolders() // Update indexed counts
    } catch (error) {
      console.error('Error indexing document:', error)
      setError('Fehler beim Indexieren')
    }
  }

  const handleDeleteFile = async (file: FileItem) => {
    if (!confirm(`Datei "${file.filename}" wirklich löschen?`)) return

    try {
      setContextMenu(null)
      await deleteDocument(file.application_id, file.id)
      await loadFilesInFolder(file.application_id)
      await loadFolders()
    } catch (error) {
      console.error('Error deleting file:', error)
      setError('Fehler beim Löschen')
    }
  }

  const handleViewDocument = async (file: FileItem) => {
    setViewingDocument(file)
    setLoadingDocument(true)
    setDocumentContent('')
    setContextMenu(null)

    try {
      const res = await getDocumentContent(file.application_id, file.id)
      setDocumentContent(res.data.content || '[Kein Text extrahiert]')
    } catch (error) {
      console.error('Error loading document:', error)
      setDocumentContent('[Fehler beim Laden des Dokuments]')
    } finally {
      setLoadingDocument(false)
    }
  }

  if (loading && folders.length === 0) {
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
        <h2 className="text-3xl font-bold text-blue-900">
          {openFolderId ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => { setOpenFolderId(null); setFiles([]) }}
                className="text-blue-600 hover:text-blue-800"
              >
                Ordner
              </button>
              <span>/</span>
              <span>{folders.find(f => f.id === openFolderId)?.company_name}</span>
            </div>
          ) : (
            'Ordner'
          )}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => loadFolders()}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Aktualisieren</span>
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center space-x-2"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Hochladen...</span></>
            ) : (
              <><FolderPlus className="w-4 h-4" /><span>Ordner hochladen</span></>
            )}
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : []
          if (openFolderId) {
            handleFileUploadToFolder(openFolderId, files)
          }
        }}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: '', directory: '' } as any)}
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : []
          handleFolderUpload(files)
        }}
        className="hidden"
      />

      {/* Upload Drop Zone */}
      {!openFolderId && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-blue-300 bg-white hover:border-blue-400'
          }`}
        >
          <UploadIcon className={`w-12 h-12 mx-auto mb-3 ${dragActive ? 'text-blue-600' : 'text-blue-400'}`} />
          <p className="text-blue-700 font-medium mb-1">
            Ordner hier ablegen oder klicken zum Auswählen
          </p>
          <p className="text-blue-500 text-sm">
            Dateien werden NICHT automatisch indexiert. Nutzen Sie das Rechtsklick-Menü.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Folder/File List */}
      <div className="bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm">
        {!openFolderId ? (
          // Folder view
          <div className="divide-y divide-blue-100">
            {folders.length === 0 ? (
              <div className="p-8 text-center">
                <Folder className="w-16 h-16 text-blue-300 mx-auto mb-3" />
                <p className="text-blue-600">Noch keine Ordner hochgeladen</p>
              </div>
            ) : (
              folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center justify-between p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => handleFolderClick(folder.id)}
                  onContextMenu={(e) => handleContextMenu(e, folder)}
                >
                  <div className="flex items-center space-x-3">
                    {openFolderId === folder.id ? (
                      <FolderOpen className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Folder className="w-6 h-6 text-blue-500" />
                    )}
                    {renaming === folder.id ? (
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleRenameFolder(folder.id)
                          if (e.key === 'Escape') { setRenaming(null); setNewName('') }
                        }}
                        onBlur={() => handleRenameFolder(folder.id)}
                        className="px-2 py-1 border border-blue-300 rounded"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div>
                        <div className="font-semibold text-blue-900">{folder.company_name}</div>
                        <div className="text-sm text-blue-600">
                          {folder.document_count} Dateien
                          {folder.indexed_count > 0 && (
                            <span className="ml-2 text-green-600">
                              • {folder.indexed_count} indexiert
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleContextMenu(e, folder)
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          // File view inside folder
          <div>
            {/* Folder header with upload button */}
            <div className="bg-blue-100 px-4 py-3 border-b border-blue-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-5 h-5 text-blue-700" />
                <h3 className="text-lg font-semibold text-blue-900">
                  {folders.find(f => f.id === openFolderId)?.company_name}
                </h3>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center space-x-1"
              >
                <UploadIcon className="w-4 h-4" />
                <span>Dateien hinzufügen</span>
              </button>
            </div>

            {/* Files table */}
            {files.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-16 h-16 text-blue-300 mx-auto mb-3" />
                <p className="text-blue-600">Noch keine Dateien in diesem Ordner</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-blue-50 border-b border-blue-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-blue-700 w-12">Status</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-blue-700">Dateiname</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-blue-700">Typ</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-blue-700">Erstellt</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-blue-700">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {files.map((file) => (
                    <tr
                      key={file.id}
                      className={`hover:bg-blue-50 transition-colors ${
                        file.indexed ? 'bg-green-50 border-l-4 border-green-500' : ''
                      }`}
                      onContextMenu={(e) => handleContextMenu(e, file)}
                    >
                      <td className="px-4 py-3 text-center">
                        {file.indexed ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-gray-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-blue-900 font-medium">
                        {file.filename}
                      </td>
                      <td className="px-4 py-3">
                        {file.indexed ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            {file.doc_type || 'Unbekannt'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            Nicht indexiert
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-blue-600 text-sm">
                        {new Date(file.created_at).toLocaleString('de-DE')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleContextMenu(e, file)
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-blue-200 py-2 z-50 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.item.type === 'folder' ? (
            // Folder context menu
            <>
              <button
                onClick={() => {
                  setContextMenu(null)
                  setRenaming(contextMenu.item.id)
                  setNewName((contextMenu.item as FolderItem).company_name)
                }}
                className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center space-x-2 text-blue-900"
              >
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>Umbenennen</span>
              </button>
              <button
                onClick={() => {
                  setContextMenu(null)
                  handleFolderClick(contextMenu.item.id)
                }}
                className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center space-x-2 text-blue-900"
              >
                <FolderOpen className="w-4 h-4 text-blue-600" />
                <span>Öffnen</span>
              </button>
              <button
                onClick={() => handleDeleteFolder(contextMenu.item as FolderItem)}
                className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center space-x-2 text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                <span>Löschen</span>
              </button>
            </>
          ) : (
            // File context menu
            <>
              {!(contextMenu.item as FileItem).indexed && (
                <button
                  onClick={() => handleIndexDocument(contextMenu.item as FileItem)}
                  className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center space-x-2 text-blue-900"
                >
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  <span>Indexieren</span>
                </button>
              )}
              <button
                onClick={() => handleViewDocument(contextMenu.item as FileItem)}
                className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center space-x-2 text-blue-900"
              >
                <Eye className="w-4 h-4 text-blue-600" />
                <span>Ansehen</span>
              </button>
              <button
                onClick={() => handleDeleteFile(contextMenu.item as FileItem)}
                className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center space-x-2 text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                <span>Löschen</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-blue-200">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">{viewingDocument.filename}</h3>
                <p className="text-sm text-blue-600">
                  {viewingDocument.indexed ? 'Indexiert' : 'Nicht indexiert'}
                </p>
              </div>
              <button
                onClick={() => setViewingDocument(null)}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDocument ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-blue-900 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  {documentContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
