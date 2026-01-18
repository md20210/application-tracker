import { useState, useEffect, useRef } from 'react'
import {
  Folder, FolderOpen, Upload as UploadIcon, Loader2,
  Check, AlertCircle, Trash2, Eye, RefreshCw,
  Edit2, FileText, FolderPlus, ChevronRight, ChevronDown, Home, HardDrive
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
  moveFolder
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
    if (!selectedNode) {
      setError('Please select a folder first')
      return
    }

    const applicationId = selectedNode.type === 'application' ? selectedNode.id : selectedNode.application_id!

    try {
      setUploading(true)
      const fileArray = Array.from(files)
      await uploadFilesOnly(fileArray, applicationId)

      // Reload
      await loadApplications()
      if (selectedNode) {
        await selectNode(selectedNode)
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
    <div className="flex h-[calc(100vh-200px)] gap-1">
      {/* Left: Tree View (Windows Explorer Style) */}
      <div className="w-80 bg-white border border-gray-300 overflow-auto">
        <div className="p-2 bg-gray-50 border-b border-gray-300 font-semibold text-sm">
          Ordner
        </div>
        <div className="p-1">
          {renderTree(treeData)}
        </div>
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
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-300 flex items-center gap-2">
          <button
            onClick={() => folderInputRef.current?.click()}
            disabled={!selectedNode || uploading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <UploadIcon className="w-4 h-4 inline mr-1" />
            Ordner
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedNode || uploading}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4 inline mr-1" />
            Dateien
          </button>

          <button
            onClick={handleCreateFolder}
            disabled={!selectedNode}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <FolderPlus className="w-4 h-4 inline mr-1" />
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

        {/* Content (Folders + Files like Windows Explorer) */}
        <div className="flex-1 overflow-auto p-2">
          {!selectedNode ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-2" />
                <p>Wählen Sie einen Ordner aus</p>
              </div>
            </div>
          ) : (
            <div
              className="grid grid-cols-6 gap-2"
              onDragOver={handleDragOver}
              onDrop={handleDropOnMainArea}
            >
              {/* Folders first */}
              {currentFolders.map(folder => (
                <div
                  key={folder.id}
                  draggable
                  className="flex flex-col items-center p-3 rounded hover:bg-blue-50 cursor-move"
                  onDragStart={(e) => handleDragStart(e, 'folder', folder)}
                  onDoubleClick={() => {
                    const node: TreeNode = {
                      type: 'folder',
                      id: folder.id,
                      name: folder.name,
                      application_id: folder.application_id,
                      parent_id: folder.parent_id
                    }
                    selectNode(node)
                  }}
                  onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.stopPropagation()
                    const node: TreeNode = {
                      type: 'folder',
                      id: folder.id,
                      name: folder.name,
                      application_id: folder.application_id,
                      parent_id: folder.parent_id
                    }
                    handleDropOnNode(e, node)
                  }}
                >
                  <Folder className="w-12 h-12 text-blue-500 mb-1" />
                  <span className="text-xs text-center break-words max-w-full">{folder.name}</span>
                </div>
              ))}

              {/* Files */}
              {currentFiles.map(file => (
                <div
                  key={file.id}
                  draggable
                  className="flex flex-col items-center p-3 rounded hover:bg-blue-50 cursor-move"
                  onDragStart={(e) => handleDragStart(e, 'file', file)}
                  onDoubleClick={() => handleViewDocument(file)}
                  onContextMenu={(e) => handleContextMenu(e, file, 'file')}
                >
                  <div className="relative">
                    <FileText className="w-12 h-12 text-gray-600 mb-1" />
                    {file.indexed && (
                      <Check className="w-4 h-4 text-green-600 absolute -top-1 -right-1 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="text-xs text-center break-words max-w-full">{file.filename}</span>
                </div>
              ))}

              {currentFolders.length === 0 && currentFiles.length === 0 && (
                <div className="col-span-6 text-center py-8 text-gray-400">
                  Dieser Ordner ist leer
                </div>
              )}
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

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded shadow-lg flex items-center gap-2 z-50">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4">✕</button>
        </div>
      )}
    </div>
  )
}
