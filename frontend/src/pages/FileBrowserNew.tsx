import { useState, useEffect, useRef } from 'react'
import {
  Folder, FolderOpen, Upload as UploadIcon, Loader2,
  Check, AlertCircle, Trash2, Eye, RefreshCw,
  Edit2, FileText, FolderPlus, ChevronRight, ChevronDown, Home, HardDrive,
  Grid3x3, List, CheckSquare, Square, X, Send, MessageSquare
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
  getApplicationsOverview,
  deleteApplication,
  moveDocument,
  moveFolder,
  sendChatMessage,
  updateFolderAttributes
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
  // Application tracking attributes
  is_bewerbung?: boolean
  status?: string
  gehaltsangabe?: number
  gehaltsvorgabe?: number
  gehalt_schaetzung?: number
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

interface TreeNode {
  type: 'application' | 'folder'
  id: number
  name: string
  application_id?: number
  parent_id?: number | null
  children?: TreeNode[]
  isExpanded?: boolean
}

interface ContextMenu {
  x: number
  y: number
  item: TreeNode | FileItem
  itemType: 'application' | 'folder' | 'file'
}

export default function FileBrowserNew() {
  // State
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [currentFiles, setCurrentFiles] = useState<FileItem[]>([])
  const [currentFolders, setCurrentFolders] = useState<FolderNode[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([])

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [viewingDocument, setViewingDocument] = useState<FileItem | null>(null)
  const [documentContent, setDocumentContent] = useState<string>('')
  const [loadingDocument, setLoadingDocument] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ type: string; id: number } | null>(null)
  const [newName, setNewName] = useState('')
  const [draggingItem, setDraggingItem] = useState<{ type: 'file' | 'folder'; item: FileItem | FolderNode } | null>(null)
  const [dragOverNode, setDragOverNode] = useState<{ type: 'application' | 'folder'; id: number } | null>(null)
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatResponse, setChatResponse] = useState('')
  const [chatProvider, setChatProvider] = useState('ollama')

  // Folder attributes panel
  const [showAttributesPanel, setShowAttributesPanel] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null)
  const [folderAttributes, setFolderAttributes] = useState({
    is_bewerbung: false,
    status: '',
    gehaltsangabe: 0,
    gehaltsvorgabe: 0,
    gehalt_schaetzung: 0
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Load applications on mount
  useEffect(() => {
    loadApplications()
  }, [])

  // Close context menu and upload menu on click
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null)
      setShowUploadMenu(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Load applications and build tree
  const loadApplications = async () => {
    try {
      setLoading(true)
      const res = await getApplicationsOverview()
      const applications = res.data as Application[]

      // Build tree with applications as root nodes
      const tree: TreeNode[] = await Promise.all(
        applications.map(async (app) => {
          const folders = await loadFolderHierarchy(app.id)
          return {
            type: 'application' as const,
            id: app.id,
            name: app.company_name,
            children: folders,
            isExpanded: false
          }
        })
      )

      setTreeData(tree)
    } catch (err: any) {
      setError(err.message || 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  // Load folder hierarchy recursively
  const loadFolderHierarchy = async (applicationId: number, parentId: number | null = null): Promise<TreeNode[]> => {
    try {
      const res = await listFolders(applicationId, parentId === null ? undefined : parentId)
      const folders = res.data as FolderNode[]

      return await Promise.all(
        folders.map(async (folder) => {
          const children = await loadFolderHierarchy(applicationId, folder.id)
          return {
            type: 'folder' as const,
            id: folder.id,
            name: folder.name,
            application_id: applicationId,
            parent_id: folder.parent_id,
            children,
            isExpanded: false
          }
        })
      )
    } catch (err) {
      console.error('Failed to load folders:', err)
      return []
    }
  }

  // Select node and load its content
  const selectNode = async (node: TreeNode) => {
    setSelectedNode(node)

    if (node.type === 'application') {
      // Load root files and folders of application
      setBreadcrumbs([node.name])
      await loadContent(node.id, null)
    } else {
      // Load files and folders of this folder
      const path = buildPathToNode(node, treeData)
      setBreadcrumbs(path)
      await loadContent(node.application_id!, node.id)
    }
  }

  // Build breadcrumb path to node
  const buildPathToNode = (node: TreeNode, tree: TreeNode[]): string[] => {
    const path: string[] = []

    // Find application
    const app = tree.find(n => n.id === node.application_id && n.type === 'application')
    if (!app) return [node.name]

    path.unshift(app.name)

    // TODO: Build full folder path
    if (node.type === 'folder') {
      path.push(node.name)
    }

    return path
  }

  // Load files and subfolders for display
  const loadContent = async (applicationId: number, folderId: number | null) => {
    try {
      // Load files
      const filesRes = await listFiles(applicationId)
      const allFiles = filesRes.data.files || []
      const filtered = allFiles.filter((f: FileItem) =>
        folderId === null ? f.folder_id === null : f.folder_id === folderId
      )
      setCurrentFiles(filtered)

      // Load immediate child folders
      const foldersRes = await listFolders(applicationId, folderId === null ? undefined : folderId)
      setCurrentFolders(foldersRes.data)
    } catch (err) {
      console.error('Failed to load content:', err)
    }
  }

  // Toggle node expansion
  const toggleNode = (nodeId: number, nodeType: string, tree: TreeNode[]): TreeNode[] => {
    return tree.map(node => {
      if (node.id === nodeId && node.type === nodeType) {
        return { ...node, isExpanded: !node.isExpanded }
      }
      if (node.children) {
        return { ...node, children: toggleNode(nodeId, nodeType, node.children) }
      }
      return node
    })
  }

  const handleToggleNode = (nodeId: number, nodeType: string) => {
    setTreeData(toggleNode(nodeId, nodeType, treeData))
  }

  // File upload
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    let applicationId: number | undefined
    let companyName: string | undefined

    if (!selectedNode) {
      // No application selected - create a new one
      const inputName = prompt('Keine Bewerbung ausgewählt.\n\nBitte geben Sie einen Firmennamen ein, um eine neue Bewerbung zu erstellen:')
      if (!inputName || inputName.trim() === '') {
        setError('Firmenname erforderlich zum Erstellen einer neuen Bewerbung')
        return
      }
      companyName = inputName.trim()
    } else {
      applicationId = selectedNode.type === 'application' ? selectedNode.id : selectedNode.application_id!
    }

    try {
      setUploading(true)
      const fileArray = Array.from(files)
      await uploadFilesOnly(fileArray, applicationId, companyName)

      // Reload
      await loadApplications()
      if (selectedNode) {
        await selectNode(selectedNode)
      } else {
        // If we created a new application, select it
        setError(`Neue Bewerbung "${companyName}" erstellt!`)
        setTimeout(() => setError(null), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // Create new folder
  const handleCreateFolder = async () => {
    if (!selectedNode) {
      setError('Please select a location first')
      return
    }

    const name = prompt('Enter folder name:')
    if (!name) return

    const applicationId = selectedNode.type === 'application' ? selectedNode.id : selectedNode.application_id!
    const parentFolderId = selectedNode.type === 'folder' ? selectedNode.id : null

    try {
      await createFolder(applicationId, name, parentFolderId || undefined)
      await loadApplications()
      if (selectedNode) {
        await selectNode(selectedNode)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create folder')
    }
  }

  // Index document
  const handleIndexDocument = async (file: FileItem) => {
    try {
      await indexDocument(file.id)
      if (selectedNode) {
        await selectNode(selectedNode)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to index document')
    }
  }

  // Index folder recursively
  const handleIndexFolder = async (folder: FolderNode) => {
    try {
      await indexFolderRecursively(folder.id)
      await loadApplications()
      if (selectedNode) {
        await selectNode(selectedNode)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to index folder')
    }
  }

  // Delete file
  const handleDeleteFile = async (file: FileItem) => {
    if (!confirm(`Delete ${file.filename}?`)) return

    try {
      await deleteDocument(file.application_id, file.id)
      if (selectedNode) {
        await selectNode(selectedNode)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete file')
    }
  }

  // Delete folder
  const handleDeleteFolder = async (folder: TreeNode | FolderNode) => {
    const name = 'name' in folder ? folder.name : ''
    if (!confirm(`Delete folder "${name}" and all its contents?`)) return

    try {
      await deleteFolder(folder.id)
      await loadApplications()
      if (selectedNode) {
        const applicationId = selectedNode.type === 'application' ? selectedNode.id : selectedNode.application_id!
        const app = treeData.find(n => n.id === applicationId)
        if (app) await selectNode(app)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete folder')
    }
  }

  // Delete application
  const handleDeleteApplication = async (app: TreeNode) => {
    if (!confirm(`Delete application "${app.name}" and all its data?`)) return

    try {
      await deleteApplication(app.id)
      await loadApplications()
      setSelectedNode(null)
      setCurrentFiles([])
      setCurrentFolders([])
    } catch (err: any) {
      setError(err.message || 'Failed to delete application')
    }
  }

  // Rename folder
  const handleRenameFolder = async (folder: TreeNode, newName: string) => {
    try {
      await renameFolder(folder.id, newName)
      await loadApplications()
      setRenaming(null)
    } catch (err: any) {
      setError(err.message || 'Failed to rename folder')
    }
  }

  // Rename application
  const handleRenameApplication = async (app: TreeNode, newName: string) => {
    try {
      await renameApplication(app.id, newName)
      await loadApplications()
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

  // Multi-selection handlers
  const toggleItemSelection = (type: 'file' | 'folder', id: number) => {
    const key = `${type}-${id}`
    const newSelection = new Set(selectedItems)
    if (newSelection.has(key)) {
      newSelection.delete(key)
    } else {
      newSelection.add(key)
    }
    setSelectedItems(newSelection)
  }

  const selectAll = () => {
    const allItems = new Set<string>()
    currentFolders.forEach(f => allItems.add(`folder-${f.id}`))
    currentFiles.forEach(f => allItems.add(`file-${f.id}`))
    setSelectedItems(allItems)
  }

  const deselectAll = () => {
    setSelectedItems(new Set())
  }

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`Delete ${selectedItems.size} selected items?`)) return

    try {
      for (const key of selectedItems) {
        const [type, idStr] = key.split('-')
        const id = parseInt(idStr)

        if (type === 'file') {
          const file = currentFiles.find(f => f.id === id)
          if (file) await deleteDocument(file.application_id, file.id)
        } else {
          await deleteFolder(id)
        }
      }

      setSelectedItems(new Set())
      await loadApplications()
      if (selectedNode) await selectNode(selectedNode)
    } catch (err: any) {
      setError(err.message || 'Failed to delete items')
    }
  }

  const handleBulkIndex = async () => {
    if (selectedItems.size === 0) return

    try {
      for (const key of selectedItems) {
        const [type, idStr] = key.split('-')
        const id = parseInt(idStr)

        if (type === 'file') {
          await indexDocument(id)
        } else {
          await indexFolderRecursively(id)
        }
      }

      setSelectedItems(new Set())
      await loadApplications()
      if (selectedNode) await selectNode(selectedNode)
    } catch (err: any) {
      setError(err.message || 'Failed to index items')
    }
  }

  // Chat handler - auto-index unindexed documents first
  const handleSendChat = async () => {
    if (!chatMessage.trim()) return

    try {
      setChatLoading(true)
      setChatResponse('Prüfe nicht-indexierte Dokumente...')

      // Index all unindexed documents first
      const unindexedFiles = currentFiles.filter(f => !f.indexed)
      if (unindexedFiles.length > 0) {
        setChatResponse(`Indexiere ${unindexedFiles.length} Dokumente...`)
        for (const file of unindexedFiles) {
          await indexDocument(file.id)
        }
        setChatResponse('Dokumente indexiert, sende Anfrage...')
        // Reload to update indexed status
        if (selectedNode) await selectNode(selectedNode)
      }

      const res = await sendChatMessage(chatMessage, chatProvider)
      setChatResponse(res.data.message || 'No response')
      setChatMessage('')
    } catch (err: any) {
      setError(err.message || 'Chat failed')
      setChatResponse('')
    } finally {
      setChatLoading(false)
    }
  }

  // Folder attributes handlers
  const handleOpenAttributesPanel = (folder: FolderNode) => {
    setSelectedFolder(folder)
    setFolderAttributes({
      is_bewerbung: folder.is_bewerbung || false,
      status: folder.status || '',
      gehaltsangabe: folder.gehaltsangabe || 0,
      gehaltsvorgabe: folder.gehaltsvorgabe || 0,
      gehalt_schaetzung: folder.gehalt_schaetzung || 0
    })
    setShowAttributesPanel(true)
  }

  const handleSaveFolderAttributes = async () => {
    if (!selectedFolder) return

    try {
      await updateFolderAttributes(selectedFolder.id, folderAttributes)
      setShowAttributesPanel(false)
      setError('Folder-Attribute erfolgreich gespeichert')
      setTimeout(() => setError(null), 2000)
      // Reload folders to update the displayed data
      if (selectedNode) await selectNode(selectedNode)
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern der Folder-Attribute')
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

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'file' | 'folder', item: FileItem | FolderNode) => {
    setDraggingItem({ type, item })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnterNode = (nodeType: 'application' | 'folder', nodeId: number) => {
    setDragOverNode({ type: nodeType, id: nodeId })
  }

  const handleDragLeaveNode = () => {
    setDragOverNode(null)
  }

  const handleDropOnNode = async (e: React.DragEvent, targetNode: TreeNode) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverNode(null)

    if (!draggingItem) return

    try {
      const targetApplicationId = targetNode.type === 'application' ? targetNode.id : targetNode.application_id!
      const targetFolderId = targetNode.type === 'folder' ? targetNode.id : null

      if (draggingItem.type === 'file') {
        // Move file
        const file = draggingItem.item as FileItem
        await moveDocument(file.application_id, file.id, targetFolderId || undefined)
      } else {
        // Move folder
        const folder = draggingItem.item as FolderNode
        // Can only move folders within same application
        if (folder.application_id !== targetApplicationId) {
          setError('Cannot move folder to different application')
          return
        }
        await moveFolder(folder.id, targetFolderId || undefined)
      }

      // Reload
      await loadApplications()
      if (selectedNode) {
        await selectNode(selectedNode)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to move item')
    } finally {
      setDraggingItem(null)
    }
  }

  const handleDropOnMainArea = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggingItem || !selectedNode) return

    try {
      const targetApplicationId = selectedNode.type === 'application' ? selectedNode.id : selectedNode.application_id!
      const targetFolderId = selectedNode.type === 'folder' ? selectedNode.id : null

      if (draggingItem.type === 'file') {
        const file = draggingItem.item as FileItem
        await moveDocument(file.application_id, file.id, targetFolderId || undefined)
      } else {
        const folder = draggingItem.item as FolderNode
        if (folder.application_id !== targetApplicationId) {
          setError('Cannot move folder to different application')
          return
        }
        await moveFolder(folder.id, targetFolderId || undefined)
      }

      await loadApplications()
      if (selectedNode) {
        await selectNode(selectedNode)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to move item')
    } finally {
      setDraggingItem(null)
    }
  }

  // Recursive tree renderer
  const renderTree = (nodes: TreeNode[], depth: number = 0) => {
    return nodes.map(node => (
      <div key={`${node.type}-${node.id}`}>
        <div
          className={`flex items-center gap-1 px-2 py-1 hover:bg-blue-100 cursor-pointer rounded text-sm ${
            selectedNode?.id === node.id && selectedNode?.type === node.type ? 'bg-blue-200' : ''
          } ${
            dragOverNode?.id === node.id && dragOverNode?.type === node.type ? 'bg-green-200 border-2 border-green-500' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => selectNode(node)}
          onContextMenu={(e) => handleContextMenu(e, node, node.type)}
          onDragOver={handleDragOver}
          onDragEnter={() => handleDragEnterNode(node.type, node.id)}
          onDragLeave={handleDragLeaveNode}
          onDrop={(e) => handleDropOnNode(e, node)}
        >
          {node.children && node.children.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleToggleNode(node.id, node.type)
              }}
              className="p-0.5 hover:bg-blue-200 rounded"
            >
              {node.isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {node.type === 'application' ? (
            <HardDrive className="w-4 h-4 text-blue-600" />
          ) : node.isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-500" />
          ) : (
            <Folder className="w-4 h-4 text-blue-500" />
          )}

          {renaming?.type === node.type && renaming?.id === node.id ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => node.type === 'application' ? handleRenameApplication(node, newName) : handleRenameFolder(node, newName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') node.type === 'application' ? handleRenameApplication(node, newName) : handleRenameFolder(node, newName)
                if (e.key === 'Escape') setRenaming(null)
              }}
              autoFocus
              className="flex-1 px-1 py-0 border rounded text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 truncate">{node.name}</span>
          )}
        </div>

        {node.isExpanded && node.children && node.children.length > 0 && (
          <div>{renderTree(node.children, depth + 1)}</div>
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
    <div className="flex h-[calc(100vh-280px)] gap-1 mb-20">
      {/* Left: Tree View (Windows Explorer Style) */}
      <div className="w-80 bg-white border border-gray-300 flex flex-col">
        <div className="p-2 bg-gray-50 border-b border-gray-300 font-semibold text-sm">
          Ordner
        </div>

        {/* Toolbar für Ordner-Aktionen */}
        <div className="p-2 bg-gray-50 border-b border-gray-300 flex flex-col gap-2">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowUploadMenu(!showUploadMenu)
              }}
              disabled={uploading}
              className="w-full px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              <UploadIcon className="w-4 h-4" />
              Hochladen
              <ChevronDown className="w-3 h-3" />
            </button>

            {showUploadMenu && !uploading && (
              <div
                className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    fileInputRef.current?.click()
                    setShowUploadMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Dateien auswählen
                </button>
                <button
                  onClick={() => {
                    folderInputRef.current?.click()
                    setShowUploadMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
                >
                  <Folder className="w-4 h-4" />
                  Ordner auswählen
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleCreateFolder}
            disabled={!selectedNode}
            className="w-full px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <FolderPlus className="w-4 h-4" />
            Neuer Ordner
          </button>
        </div>

        <div className="flex-1 overflow-auto p-1">
          {renderTree(treeData)}
        </div>

        {/* Hidden file inputs */}
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

      {/* Right: Content Area */}
      <div className="flex-1 flex flex-col bg-white border border-gray-300">
        {/* Address Bar / Breadcrumbs */}
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-300 flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm flex-1">
            <Home className="w-4 h-4 text-gray-600" />
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-gray-400" />
                <span className="text-gray-700">{crumb}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-300 flex items-center gap-2 relative">
          {!isSelectionMode ? (
            <>
              <div className="flex-1" />

              <button
                onClick={() => {
                  setIsSelectionMode(true)
                  setSelectedItems(new Set())
                }}
                disabled={!selectedNode}
                className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                title="Mehrfachauswahl"
              >
                <CheckSquare className="w-4 h-4" />
                Auswählen
              </button>

              <div className="flex gap-1 border border-gray-300 rounded">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2 py-1 ${viewMode === 'grid' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                  title="Icon-Ansicht"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2 py-1 ${viewMode === 'list' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                  title="Listen-Ansicht"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsSelectionMode(false)
                  setSelectedItems(new Set())
                }}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Abbrechen
              </button>

              <div className="px-3 py-1 text-sm font-semibold text-gray-700">
                {selectedItems.size} ausgewählt
              </div>

              <button
                onClick={selectAll}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Alle auswählen
              </button>

              <button
                onClick={deselectAll}
                disabled={selectedItems.size === 0}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300"
              >
                Keine
              </button>

              <div className="flex-1" />

              <button
                onClick={handleBulkIndex}
                disabled={selectedItems.size === 0}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Indizieren ({selectedItems.size})
              </button>

              <button
                onClick={handleBulkDelete}
                disabled={selectedItems.size === 0}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Löschen ({selectedItems.size})
              </button>
            </>
          )}
        </div>

        {/* Content (Folders + Files like Windows Explorer) */}
        <div className="flex-1 overflow-auto p-2">
          {!selectedNode ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-2" />
                <p>Wählen Sie einen Ordner aus</p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div
              className="grid grid-cols-6 gap-2"
              onDragOver={handleDragOver}
              onDrop={handleDropOnMainArea}
            >
              {/* Folders first */}
              {currentFolders.map(folder => {
                const isSelected = selectedItems.has(`folder-${folder.id}`)
                return (
                  <div
                    key={folder.id}
                    draggable={!isSelectionMode}
                    className={`flex flex-col items-center p-3 rounded hover:bg-blue-50 relative ${
                      isSelectionMode ? 'cursor-pointer' : 'cursor-move'
                    } ${isSelected ? 'bg-blue-100 border-2 border-blue-500' : ''}`}
                    onDragStart={(e) => !isSelectionMode && handleDragStart(e, 'folder', folder)}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleItemSelection('folder', folder.id)
                      }
                    }}
                    onDoubleClick={() => {
                      if (!isSelectionMode) {
                        const node: TreeNode = {
                          type: 'folder',
                          id: folder.id,
                          name: folder.name,
                          application_id: folder.application_id,
                          parent_id: folder.parent_id
                        }
                        selectNode(node)
                      }
                    }}
                    onContextMenu={(e) => !isSelectionMode && handleContextMenu(e, folder, 'folder')}
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      if (!isSelectionMode) {
                        e.stopPropagation()
                        const node: TreeNode = {
                          type: 'folder',
                          id: folder.id,
                          name: folder.name,
                          application_id: folder.application_id,
                          parent_id: folder.parent_id
                        }
                        handleDropOnNode(e, node)
                      }
                    }}
                  >
                    {isSelectionMode && (
                      <div className="absolute top-1 right-1">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    )}
                    <Folder className="w-12 h-12 text-blue-500 mb-1" />
                    <span className="text-xs text-center break-words max-w-full">{folder.name}</span>
                  </div>
                )
              })}

              {/* Files */}
              {currentFiles.map(file => {
                const isSelected = selectedItems.has(`file-${file.id}`)
                return (
                  <div
                    key={file.id}
                    draggable={!isSelectionMode}
                    className={`flex flex-col items-center p-3 rounded hover:bg-blue-50 relative ${
                      isSelectionMode ? 'cursor-pointer' : 'cursor-move'
                    } ${
                      isSelected ? 'bg-blue-100 border-2 border-blue-500' :
                      file.indexed ? 'bg-green-50 border-2 border-green-400' : ''
                    }`}
                    onDragStart={(e) => !isSelectionMode && handleDragStart(e, 'file', file)}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleItemSelection('file', file.id)
                      }
                    }}
                    onDoubleClick={() => !isSelectionMode && handleViewDocument(file)}
                    onContextMenu={(e) => !isSelectionMode && handleContextMenu(e, file, 'file')}
                  >
                    {isSelectionMode && (
                      <div className="absolute top-1 right-1">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    )}
                    <div className="relative">
                      <FileText className={`w-12 h-12 mb-1 ${file.indexed ? 'text-green-600' : 'text-gray-600'}`} />
                      {file.indexed && !isSelectionMode && (
                        <Check className="w-4 h-4 text-green-600 absolute -top-1 -right-1 bg-white rounded-full" />
                      )}
                    </div>
                    <span className={`text-xs text-center break-words max-w-full ${file.indexed ? 'font-semibold text-green-800' : ''}`}>
                      {file.filename}
                    </span>
                  </div>
                )
              })}

              {currentFolders.length === 0 && currentFiles.length === 0 && (
                <div className="col-span-6 text-center py-8 text-gray-400">
                  Dieser Ordner ist leer
                </div>
              )}
            </div>
          ) : (
            /* List View */
            <div
              onDragOver={handleDragOver}
              onDrop={handleDropOnMainArea}
            >
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b border-gray-300 sticky top-0">
                  <tr>
                    {isSelectionMode && (
                      <th className="text-left px-3 py-2 font-semibold w-12">
                        <CheckSquare className="w-4 h-4" />
                      </th>
                    )}
                    <th className="text-left px-3 py-2 font-semibold">Name</th>
                    <th className="text-left px-3 py-2 font-semibold w-32">Typ</th>
                    <th className="text-left px-3 py-2 font-semibold w-32">Indiziert</th>
                    <th className="text-left px-3 py-2 font-semibold w-48">Erstellt am</th>
                    <th className="text-left px-3 py-2 font-semibold w-24">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Folders first */}
                  {currentFolders.map(folder => {
                    const isSelected = selectedItems.has(`folder-${folder.id}`)
                    return (
                      <tr
                        key={`folder-${folder.id}`}
                        draggable={!isSelectionMode}
                        className={`border-b border-gray-200 hover:bg-blue-50 ${
                          isSelectionMode ? 'cursor-pointer' : 'cursor-move'
                        } ${isSelected ? 'bg-blue-100' : ''}`}
                        onDragStart={(e) => !isSelectionMode && handleDragStart(e, 'folder', folder)}
                        onClick={() => {
                          if (isSelectionMode) {
                            toggleItemSelection('folder', folder.id)
                          }
                        }}
                        onDoubleClick={() => {
                          if (!isSelectionMode) {
                            const node: TreeNode = {
                              type: 'folder',
                              id: folder.id,
                              name: folder.name,
                              application_id: folder.application_id,
                              parent_id: folder.parent_id
                            }
                            selectNode(node)
                          }
                        }}
                        onContextMenu={(e) => !isSelectionMode && handleContextMenu(e, folder, 'folder')}
                        onDragOver={handleDragOver}
                        onDrop={(e) => {
                          if (!isSelectionMode) {
                            e.stopPropagation()
                            const node: TreeNode = {
                              type: 'folder',
                              id: folder.id,
                              name: folder.name,
                              application_id: folder.application_id,
                              parent_id: folder.parent_id
                            }
                            handleDropOnNode(e, node)
                          }
                        }}
                      >
                        {isSelectionMode && (
                          <td className="px-3 py-2">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2 flex items-center gap-2">
                          <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="truncate">{folder.name}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">Ordner</td>
                        <td className="px-3 py-2">-</td>
                        <td className="px-3 py-2 text-gray-600">{new Date(folder.created_at).toLocaleString('de-DE')}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenAttributesPanel(folder)
                            }}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            title="Bewerbungs-Attribute"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  {/* Files */}
                  {currentFiles.map(file => {
                    const isSelected = selectedItems.has(`file-${file.id}`)
                    return (
                      <tr
                        key={`file-${file.id}`}
                        draggable={!isSelectionMode}
                        className={`border-b border-gray-200 hover:bg-blue-50 ${
                          isSelectionMode ? 'cursor-pointer' : 'cursor-move'
                        } ${
                          isSelected ? 'bg-blue-100' :
                          file.indexed ? 'bg-green-50' : ''
                        }`}
                        onDragStart={(e) => !isSelectionMode && handleDragStart(e, 'file', file)}
                        onClick={() => {
                          if (isSelectionMode) {
                            toggleItemSelection('file', file.id)
                          }
                        }}
                        onDoubleClick={() => !isSelectionMode && handleViewDocument(file)}
                        onContextMenu={(e) => !isSelectionMode && handleContextMenu(e, file, 'file')}
                      >
                        {isSelectionMode && (
                          <td className="px-3 py-2">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2 flex items-center gap-2">
                          <FileText className={`w-4 h-4 flex-shrink-0 ${file.indexed ? 'text-green-600' : 'text-gray-600'}`} />
                          <span className={`truncate ${file.indexed ? 'font-semibold text-green-800' : ''}`}>{file.filename}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{file.doc_type || 'Datei'}</td>
                        <td className="px-3 py-2">
                          {file.indexed ? (
                            <span className="flex items-center gap-1 text-green-600 font-semibold">
                              <Check className="w-4 h-4" /> Ja
                            </span>
                          ) : (
                            <span className="text-gray-400">Nein</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{new Date(file.created_at).toLocaleString('de-DE')}</td>
                        <td className="px-3 py-2"></td>
                      </tr>
                    )
                  })}

                  {currentFolders.length === 0 && currentFiles.length === 0 && (
                    <tr>
                      <td colSpan={isSelectionMode ? 6 : 5} className="text-center py-8 text-gray-400">
                        Dieser Ordner ist leer
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded shadow-lg border border-gray-300 py-1 z-50 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.itemType === 'application' && (
            <>
              <button
                onClick={() => {
                  setRenaming({ type: 'application', id: contextMenu.item.id })
                  setNewName((contextMenu.item as TreeNode).name)
                  setContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Umbenennen
              </button>
              <button
                onClick={() => {
                  handleDeleteApplication(contextMenu.item as TreeNode)
                  setContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Löschen
              </button>
            </>
          )}

          {contextMenu.itemType === 'folder' && (
            <>
              <button
                onClick={() => {
                  setRenaming({ type: 'folder', id: contextMenu.item.id })
                  setNewName((contextMenu.item as any).name)
                  setContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Umbenennen
              </button>
              <button
                onClick={() => {
                  handleIndexFolder(contextMenu.item as any)
                  setContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Alle indizieren
              </button>
              <button
                onClick={() => {
                  handleDeleteFolder(contextMenu.item as any)
                  setContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
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
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
              >
                <Eye className="w-4 h-4" /> Öffnen
              </button>
              {!(contextMenu.item as FileItem).indexed && (
                <button
                  onClick={() => {
                    handleIndexDocument(contextMenu.item as FileItem)
                    setContextMenu(null)
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Indizieren
                </button>
              )}
              <button
                onClick={() => {
                  handleDeleteFile(contextMenu.item as FileItem)
                  setContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
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

      {/* Folder Attributes Panel (Sliding Side Panel) */}
      {showAttributesPanel && selectedFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex justify-end" onClick={() => setShowAttributesPanel(false)}>
          <div
            className="w-96 bg-white h-full shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-300 flex items-center justify-between bg-blue-50">
              <h2 className="text-lg font-bold text-gray-900">Bewerbungs-Attribute</h2>
              <button onClick={() => setShowAttributesPanel(false)} className="text-gray-600 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                <strong>Folder:</strong> {selectedFolder.name}
              </div>

              {/* 1. Bewerbung Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_bewerbung"
                  checked={folderAttributes.is_bewerbung}
                  onChange={(e) => setFolderAttributes({ ...folderAttributes, is_bewerbung: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_bewerbung" className="text-sm font-semibold">Ist Bewerbung?</label>
              </div>

              {/* 2. Status Listbox */}
              <div>
                <label className="block text-sm font-semibold mb-1">Status</label>
                <select
                  value={folderAttributes.status}
                  onChange={(e) => setFolderAttributes({ ...folderAttributes, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Bitte wählen --</option>
                  <option value="Bewerbung">Bewerbung</option>
                  <option value="1. Interview">1. Interview</option>
                  <option value="2. Interview">2. Interview</option>
                  <option value="3. Interview">3. Interview</option>
                  <option value="4. Gehaltsverhandlung">4. Gehaltsverhandlung</option>
                  <option value="5. Contract">5. Contract</option>
                  <option value="6. Unterschrieben">6. Unterschrieben</option>
                </select>
              </div>

              {/* 3. Gehaltsangabe */}
              <div>
                <label className="block text-sm font-semibold mb-1">Gehaltsangabe (Euro)</label>
                <input
                  type="number"
                  value={folderAttributes.gehaltsangabe}
                  onChange={(e) => setFolderAttributes({ ...folderAttributes, gehaltsangabe: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. 75000"
                />
              </div>

              {/* 4. Gehaltsvorgabe */}
              <div>
                <label className="block text-sm font-semibold mb-1">Gehaltsvorgabe (Euro)</label>
                <input
                  type="number"
                  value={folderAttributes.gehaltsvorgabe}
                  onChange={(e) => setFolderAttributes({ ...folderAttributes, gehaltsvorgabe: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. 80000"
                />
              </div>

              {/* 5. Gehalt Schätzung */}
              <div>
                <label className="block text-sm font-semibold mb-1">Gehalt Schätzung (Euro)</label>
                <input
                  type="number"
                  value={folderAttributes.gehalt_schaetzung}
                  onChange={(e) => setFolderAttributes({ ...folderAttributes, gehalt_schaetzung: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. 77000"
                />
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveFolderAttributes}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Box */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 shadow-lg z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0" />

            {/* LLM Provider Selection */}
            <select
              value={chatProvider}
              onChange={(e) => setChatProvider(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={chatLoading}
            >
              <option value="ollama">Ollama (Lokal)</option>
              <option value="lollms">LoLLMs</option>
              <option value="grok">Grok (xAI)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Claude</option>
            </select>

            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendChat()
                }
              }}
              placeholder="Frage zu Dokumenten stellen..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={chatLoading}
            />
            <button
              onClick={handleSendChat}
              disabled={chatLoading || !chatMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {chatLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Lädt...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Senden
                </>
              )}
            </button>
          </div>

          {chatResponse && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <div className="font-semibold text-blue-900 mb-1">Antwort:</div>
              <div className="text-gray-800">{chatResponse}</div>
              <button
                onClick={() => setChatResponse('')}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              >
                Schließen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-24 right-4 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded shadow-lg flex items-center gap-2 z-50">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4">✕</button>
        </div>
      )}
    </div>
  )
}
