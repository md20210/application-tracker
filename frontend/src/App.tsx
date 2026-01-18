import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { FileText, MessageSquare, BarChart3, Upload as UploadIcon, FolderOpen } from 'lucide-react'
import Overview from './pages/Overview'
import Chat from './pages/Chat'
import Upload from './pages/Upload'
import FileBrowserNew from './pages/FileBrowserNew'

function App() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <Router basename="/applicationtracker">
      <div className="min-h-screen bg-white text-gray-900">
        {/* Navbar - Light blue style */}
        <nav className="bg-blue-50 border-b border-blue-200 sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <FileText className="w-8 h-8 text-blue-600" />
                <h1 className="text-xl font-bold text-blue-900">Application Tracker</h1>
              </div>

              <div className="flex space-x-1">
                <Link
                  to="/"
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <BarChart3 className="w-5 h-5 inline-block mr-2" />
                  Übersicht
                </Link>

                <Link
                  to="/files"
                  onClick={() => setActiveTab('files')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'files'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <FolderOpen className="w-5 h-5 inline-block mr-2" />
                  Dateien
                </Link>

                <Link
                  to="/chat"
                  onClick={() => setActiveTab('chat')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 inline-block mr-2" />
                  Chat
                </Link>

                <Link
                  to="/upload"
                  onClick={() => setActiveTab('upload')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'upload'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <UploadIcon className="w-5 h-5 inline-block mr-2" />
                  Upload
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/files" element={<FileBrowserNew />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/upload" element={<Upload />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-blue-50 border-t border-blue-200 mt-16">
          <div className="container mx-auto px-4 py-6 text-center text-blue-700 text-sm">
            <p>Application Tracker © 2026 | Powered by FastAPI + React</p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
