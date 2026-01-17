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

// Upload
export const uploadDirectory = (file: File, companyName: string, position?: string) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('company_name', companyName)
  if (position) formData.append('position', position)

  return api.post('/api/applications/upload/directory', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
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

export default api
