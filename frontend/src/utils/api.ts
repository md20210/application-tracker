import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://general-backend-production-a734.up.railway.app'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Applications
export const getApplicationsOverview = () => api.get('/api/applications/overview')
export const getApplicationDetail = (id: number) => api.get(`/api/applications/${id}`)
export const updateApplicationStatus = (id: number, status: string, notes?: string) =>
  api.patch(`/api/applications/${id}/status`, { status, notes })
export const deleteApplication = (id: number) => api.delete(`/api/applications/${id}`)
export const deleteDocument = (applicationId: number, documentId: number) =>
  api.delete(`/api/applications/${applicationId}/documents/${documentId}`)
export const getDocumentContent = (applicationId: number, documentId: number) =>
  api.get(`/api/applications/${applicationId}/documents/${documentId}/content`)

// Upload
export const uploadDirectory = (
  files: File[],
  companyName: string,
  position?: string,
  onUploadProgress?: (progressEvent: any) => void
) => {
  const formData = new FormData()

  // Append all files
  files.forEach(file => {
    formData.append('files', file)
  })

  formData.append('company_name', companyName)
  if (position) formData.append('position', position)

  return api.post('/api/applications/upload/directory', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
}

export const uploadBatchApplications = (
  files: File[],
  onUploadProgress?: (progressEvent: any) => void
) => {
  const formData = new FormData()

  // Append all files (directory structure preserved in file.webkitRelativePath)
  files.forEach(file => {
    formData.append('files', file)
  })

  return api.post('/api/applications/upload/batch', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
}

export const uploadSingleDocument = (file: File, applicationId: number, docType?: string) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('application_id', applicationId.toString())
  if (docType) formData.append('doc_type', docType)

  return api.post('/api/applications/upload/single', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// Chat
export const sendChatMessage = (message: string, provider: string = 'ollama') =>
  api.post('/api/applications/chat/message', { message, provider })

export const getChatHistory = (limit: number = 50) =>
  api.get(`/api/applications/chat/history?limit=${limit}`)

export const clearChatHistory = () => api.delete('/api/applications/chat/history')

// Reports
export const getStatusReport = () => api.get('/api/applications/reports/status')

export const generateCustomReport = (columns: string[], customColumns: any[], provider: string = 'ollama') =>
  api.post('/api/applications/reports/generate', { columns, custom_columns: customColumns, provider })

export const getOverviewReport = () => api.get('/api/applications/reports/overview')

// File Browser - Simple upload without auto-processing
export const uploadFilesOnly = (
  files: File[],
  applicationId?: number,
  companyName?: string
) => {
  const formData = new FormData()

  files.forEach(file => {
    formData.append('files', file)
  })

  if (applicationId) formData.append('application_id', applicationId.toString())
  if (companyName) formData.append('company_name', companyName)

  return api.post('/api/applications/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const indexDocument = (documentId: number) =>
  api.post(`/api/applications/documents/${documentId}/index`)

export const listFiles = (applicationId?: number) => {
  const params = applicationId ? { application_id: applicationId } : {}
  return api.get('/api/applications/files/list', { params })
}

// Folder Operations (Hierarchical up to 10 levels)
export const listFolders = (applicationId: number, parentId?: number) => {
  const params = parentId !== undefined ? { parent_id: parentId } : {}
  return api.get(`/api/applications/${applicationId}/folders`, { params })
}

export const createFolder = (applicationId: number, name: string, parentId?: number) =>
  api.post(`/api/applications/${applicationId}/folders`, { name, parent_id: parentId })

export const renameFolder = (folderId: number, newName: string) =>
  api.patch(`/api/applications/folders/${folderId}/rename`, { new_name: newName })

export const moveFolder = (folderId: number, targetParentId?: number) =>
  api.post(`/api/applications/folders/${folderId}/move`, { target_parent_id: targetParentId })

export const deleteFolder = (folderId: number) =>
  api.delete(`/api/applications/folders/${folderId}`)

export const indexFolderRecursively = (folderId: number) =>
  api.post(`/api/applications/folders/${folderId}/index-all`)

export const renameApplication = (applicationId: number, newName: string) =>
  api.patch(`/api/applications/${applicationId}/rename`, { new_name: newName })

export const moveDocument = (applicationId: number, documentId: number, targetFolderId?: number) =>
  api.post(`/api/applications/${applicationId}/documents/${documentId}/move`, { target_folder_id: targetFolderId })

export default api
