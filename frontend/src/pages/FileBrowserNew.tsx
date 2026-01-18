import { useState, useEffect, useRef } from 'react'
import {
  Folder, FolderOpen, Upload as UploadIcon, Loader2,
  Check, AlertCircle, MoreVertical, Trash2, Eye, RefreshCw,
  Edit2, FileText, FolderPlus, ChevronRight, ChevronDown, Home
} from 'lucide-react'
import {
  uploadFilesOnly,
  indexDocument,
  listFiles,
  deleteDocument,
  getDocumentContent,
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  indexFolderRecursively,
  renameApplication,
  getApplicationsOverview
} from '../utils/api'

// Interfaces
interface Application {
  id: number
  company_name: string
  position: string | null
  status: string
  document_count: number
  created_at: string
}

interface FolderNode {
  id: number
  application_id: number
  name: string
  parent_id: number | null
  path: string
  level: number
  created_at: string
  children?: FolderNode[]
  isExpanded?: boolean
}

interface FileItem {
  id: number
  application_id: number
  folder_id: number | null
  filename: string
  doc_type: string | null
  indexed: boolean
  created_at: string
}

interface BreadcrumbItem {
  type: 'application' | 'folder'
  id: number
  name: string
}

interface ContextMenu {
  x: number
  y: number
  item: Application | FolderNode | FileItem
  itemType: 'application' | 'folder' | 'file'
}

export default function FileBrowserNew() {
  // State
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [folderTree, setFolderTree] = useState<FolderNode[]>([])
  const [currentFiles, setCurrentFiles] = useState<FileItem[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [viewingDocument, setViewingDocument] = useState<FileItem | null>(null)
  const [documentContent, setDocumentContent] = useState<string>('')
  const [loadingDocument, setLoadingDocument] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ type: string; id: number } | null>(null)
  const [newName, setNewName] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Load applications on mount
  useEffect(() => {
    loadApplications()
  }, [])

  // Close context menu on click
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Load applications
  const loadApplications = async () => {
    try {
      setLoading(true)
      const res = await getApplicationsOverview()
      setApplications(res.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  // Select application and load its folder structure
  const selectApplication = async (app: Application) => {
    setSelectedApplication(app)
    setBreadcrumbs([{ type: 'application', id: app.id, name: app.company_name }])
    setCurrentFolderId(null)
    await loadFolderStructure(app.id)
    await loadFiles(app.id, null)
  }

  // Load folder structure recursively
  const loadFolderStructure = async (applicationId: number, parentId: number | null = null): Promise<FolderNode[]> => {
    try {
      const res = await listFolders(applicationId, parentId === null ? undefined : parentId)
      const folders = res.data as FolderNode[]

      // Load children recursively
      for (const folder of folders) {
        folder.children = await loadFolderStructure(applicationId, folder.id)
        folder.isExpanded = false
      }

      if (parentId === null) {
        setFolderTree(folders)
      }

      return folders
    } catch (err) {
      console.error('Failed to load folders:', err)
      return []
    }
  }

  // Load files in current folder
  const loadFiles = async (applicationId: number, folderId: number | null) => {
    try {
      const res = await listFiles(applicationId)
      // Filter files by folder_id
      const files = res.data.files || []
      const filtered = files.filter((f: FileItem) =>
        folderId === null ? f.folder_id === null : f.folder_id === folderId
      )
      setCurrentFiles(filtered)
    } catch (err) {
      console.error('Failed to load files:', err)
    }
  }

  // Navigate to folder
  const navigateToFolder = async (folder: FolderNode) => {
    if (!selectedApplication) return

    setCurrentFolderId(folder.id)

    // Build breadcrumb path
    const path: BreadcrumbItem[] = [
      { type: 'application', id: selectedApplication.id, name: selectedApplication.company_name }
    ]

    // Add folder to breadcrumb
    // TODO: We should build the full path hierarchy for proper breadcrumbs
    path.push({ type: 'folder', id: folder.id, name: folder.name })

    setBreadcrumbs(path)
    await loadFiles(selectedApplication.id, folder.id)
  }

  // Navigate via breadcrumb
  const navigateToBreadcrumb = async (index: number) => {
    if (!selectedApplication) return

    const item = breadcrumbs[index]
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1)
    setBreadcrumbs(newBreadcrumbs)

    if (item.type === 'application') {
      setCurrentFolderId(null)
      await loadFiles(selectedApplication.id, null)
    } else {
      setCurrentFolderId(item.id)
      await loadFiles(selectedApplication.id, item.id)
    }
  }

  // Toggle folder expand/collapse
  const toggleFolder = (folderId: number, folders: FolderNode[]): FolderNode[] => {
    return folders.map(folder => {
      if (folder.id === folderId) {
        return { ...folder, isExpanded: !folder.isExpanded }
      }
      if (folder.children) {
        return { ...folder, children: toggleFolder(folderId, folder.children) }
      }
      return folder
    })
  }

  const handleToggleFolder = (folderId: number) => {
    setFolderTree(toggleFolder(folderId, folderTree))
  }

  // File upload
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (!selectedApplication) {
      setError('Please select an application first')
      return
    }

    try {
      setUploading(true)
      const fileArray = Array.from(files)
      await uploadFilesOnly(fileArray, selectedApplication.id)

      // Reload folder structure and files
      await loadFolderStructure(selectedApplication.id)
      await loadFiles(selectedApplication.id, currentFolderId)

    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // Create new folder
  const handleCreateFolder = async () => {
    if (!selectedApplication) return

    const name = prompt('Enter folder name:')
    if (!name) return

    try {
      await createFolder(selectedApplication.id, name, currentFolderId || undefined)
      await loadFolderStructure(selectedApplication.id)
    } catch (err: any) {
      setError(err.message || 'Failed to create folder')
    }
  }

  // Index document
  const handleIndexDocument = async (file: FileItem) => {
    try {
      await indexDocument(file.id)
      await loadFiles(selectedApplication!.id, currentFolderId)
    } catch (err: any) {
      setError(err.message || 'Failed to index document')
    }
  }

  // Index folder recursively
  const handleIndexFolder = async (folder: FolderNode) => {
    try {
      await indexFolderRecursively(folder.id)
      await loadFolderStructure(selectedApplication!.id)
      await loadFiles(selectedApplication!.id, currentFolderId)
    } catch (err: any) {
      setError(err.message || 'Failed to index folder')
    }
  }

  // Delete file
  const handleDeleteFile = async (file: FileItem) => {
    if (!confirm(`Delete ${file.filename}?`)) return

    try {
      await deleteDocument(file.application_id, file.id)
      await loadFiles(selectedApplication!.id, currentFolderId)
    } catch (err: any) {
      setError(err.message || 'Failed to delete file')
    }
  }

  // Delete folder
  const handleDeleteFolder = async (folder: FolderNode) => {
    if (!confirm(`Delete folder "${folder.name}" and all its contents?`)) return

    try {
      await deleteFolder(folder.id)
      await loadFolderStructure(selectedApplication!.id)
      await loadFiles(selectedApplication!.id, currentFolderId)
    } catch (err: any) {
      setError(err.message || 'Failed to delete folder')
    }
  }

  // Rename folder
  const handleRenameFolder = async (folder: FolderNode, newName: string) => {
    try {
      await renameFolder(folder.id, newName)
      await loadFolderStructure(selectedApplication!.id)
      setRenaming(null)
    } catch (err: any) {
      setError(err.message || 'Failed to rename folder')
    }
  }

  // Rename application
  const handleRenameApplication = async (app: Application, newName: string) => {
    try {
      await renameApplication(app.id, newName)
      await loadApplications()
      if (selectedApplication?.id === app.id) {
        setSelectedApplication({ ...selectedApplication, company_name: newName })
        setBreadcrumbs([{ type: 'application', id: app.id, name: newName }, ...breadcrumbs.slice(1)])
      }
      setRenaming(null)
    } catch (err: any) {
      setError(err.message || 'Failed to rename application')
    }
  }

  // View document
  const handleViewDocument = async (file: FileItem) => {
    try {
      setLoadingDocument(true)
      setViewingDocument(file)
      const res = await getDocumentContent(file.application_id, file.id)
      setDocumentContent(res.data.content || 'No content available')
    } catch (err: any) {
      setError(err.message || 'Failed to load document')
    } finally {
      setLoadingDocument(false)
    }
  }

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, item: any, itemType: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
      itemType: itemType as any
    })
  }

  // Recursive folder tree renderer
  const renderFolderTree = (folders: FolderNode[], depth: number = 0) => {
    return folders.map(folder => (
      <div key={folder.id} style={{ marginLeft: `${depth * 20}px` }}>
        <div
          className="flex items-center gap-2 p-2 hover:bg-blue-50 cursor-pointer rounded group"
          onClick={() => navigateToFolder(folder)}
          onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggleFolder(folder.id)
            }}
            className="p-1 hover:bg-blue-100 rounded"
          >
            {folder.children && folder.children.length > 0 ? (
              folder.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="w-4" />
            )}
          </button>

          {folder.isExpanded ? (
            <FolderOpen className="w-5 h-5 text-blue-600" />
          ) : (
            <Folder className="w-5 h-5 text-blue-500" />
          )}

          {renaming?.type === 'folder' && renaming?.id === folder.id ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => handleRenameFolder(folder, newName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameFolder(folder, newName)
                if (e.key === 'Escape') setRenaming(null)
              }}
              autoFocus
              className="flex-1 px-2 py-1 border rounded"
            />
          ) : (
            <span className="flex-1 text-sm">{folder.name}</span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              handleContextMenu(e, folder, 'folder')
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 rounded"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {folder.isExpanded && folder.children && folder.children.length > 0 && (
          <div>{renderFolderTree(folder.children, depth + 1)}</div>
        )}
      </div>
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        {/* Left sidebar - Applications */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">Bewerbungen</h2>
            <div className="space-y-2">
              {applications.map(app => (
                <div
                  key={app.id}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    selectedApplication?.id === app.id
                      ? 'bg-blue-100 border border-blue-300'
                      : 'bg-blue-50 hover:bg-blue-100 border border-transparent'
                  }`}
                  onClick={() => selectApplication(app)}
                  onContextMenu={(e) => handleContextMenu(e, app, 'application')}
                >
                  {renaming?.type === 'application' && renaming?.id === app.id ? (
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onBlur={() => handleRenameApplication(app, newName)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameApplication(app, newName)
                        if (e.key === 'Escape') setRenaming(null)
                      }}
                      autoFocus
                      className="w-full px-2 py-1 border rounded"
                    />
                  ) : (
                    <>
                      <div className="font-medium text-sm text-blue-900">{app.company_name}</div>
                      <div className="text-xs text-blue-600 mt-1">{app.document_count} Dateien</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1">
          {!selectedApplication ? (
            <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-8 text-center">
              <FileText className="w-16 h-16 mx-auto text-blue-300 mb-4" />
              <p className="text-blue-600">Wählen Sie eine Bewerbung aus</p>
            </div>
          ) : (
            <>
              {/* Breadcrumbs */}
              <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Home className="w-4 h-4 text-blue-600" />
                  {breadcrumbs.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-blue-400" />
                      <button
                        onClick={() => navigateToBreadcrumb(index)}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {item.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toolbar */}
              <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4 mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    disabled={uploading}
                  >
                    <UploadIcon className="w-4 h-4" />
                    Ordner hochladen
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    disabled={uploading}
                  >
                    <FileText className="w-4 h-4" />
                    Dateien hochladen
                  </button>

                  <button
                    onClick={handleCreateFolder}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    <FolderPlus className="w-4 h-4" />
                    Neuer Ordner
                  </button>

                  <input
                    ref={folderInputRef}
                    type="file"
                    {...({ webkitdirectory: '', directory: '' } as any)}
                    multiple
                    onChange={(e) => handleUpload(e.target.files)}
                    className="hidden"
                  />

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => handleUpload(e.target.files)}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                {/* Folder tree */}
                {folderTree.length > 0 && (
                  <div className="w-64 bg-white rounded-lg shadow-sm border border-blue-100 p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3">Ordner</h3>
                    <div className="space-y-1">
                      {renderFolderTree(folderTree)}
                    </div>
                  </div>
                )}

                {/* File list */}
                <div className="flex-1 bg-white rounded-lg shadow-sm border border-blue-100 p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3">Dateien</h3>

                  {currentFiles.length === 0 ? (
                    <div className="text-center py-8 text-blue-500">
                      Keine Dateien in diesem Ordner
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentFiles.map(file => (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 p-3 rounded hover:bg-blue-50 group"
                          onContextMenu={(e) => handleContextMenu(e, file, 'file')}
                        >
                          <FileText className="w-5 h-5 text-blue-600" />
                          <span className="flex-1 text-sm">{file.filename}</span>

                          {file.indexed ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <button
                              onClick={() => handleIndexDocument(file)}
                              className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                            >
                              Index
                            </button>
                          )}

                          <button
                            onClick={() => handleViewDocument(file)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleContextMenu(e, file, 'file')
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 rounded"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.itemType === 'application' && (
            <>
              <button
                onClick={() => {
                  setRenaming({ type: 'application', id: contextMenu.item.id })
                  setNewName((contextMenu.item as Application).company_name)
                  setContextMenu(null)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Umbenennen
              </button>
            </>
          )}

          {contextMenu.itemType === 'folder' && (
            <>
              <button
                onClick={() => {
                  setRenaming({ type: 'folder', id: contextMenu.item.id })
                  setNewName((contextMenu.item as FolderNode).name)
                  setContextMenu(null)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Umbenennen
              </button>
              <button
                onClick={() => {
                  handleIndexFolder(contextMenu.item as FolderNode)
                  setContextMenu(null)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Alle Dateien indizieren
              </button>
              <button
                onClick={() => {
                  handleDeleteFolder(contextMenu.item as FolderNode)
                  setContextMenu(null)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Löschen
              </button>
            </>
          )}

          {contextMenu.itemType === 'file' && (
            <>
              <button
                onClick={() => {
                  handleViewDocument(contextMenu.item as FileItem)
                  setContextMenu(null)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
              >
                <Eye className="w-4 h-4" /> Ansehen
              </button>
              {!(contextMenu.item as FileItem).indexed && (
                <button
                  onClick={() => {
                    handleIndexDocument(contextMenu.item as FileItem)
                    setContextMenu(null)
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Indizieren
                </button>
              )}
              <button
                onClick={() => {
                  handleDeleteFile(contextMenu.item as FileItem)
                  setContextMenu(null)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Löschen
              </button>
            </>
          )}
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-blue-900">{viewingDocument.filename}</h3>
              <button
                onClick={() => setViewingDocument(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loadingDocument ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm">{documentContent}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded shadow-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4">✕</button>
        </div>
      )}
    </div>
  )
}
