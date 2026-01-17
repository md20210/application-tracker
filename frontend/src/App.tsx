import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { FileText, MessageSquare, BarChart3, Upload as UploadIcon } from 'lucide-react'
import Overview from './pages/Overview'
import Chat from './pages/Chat'
import Upload from './pages/Upload'

function App() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        {/* Navbar - Styled like dabrock.info */}
        <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <FileText className="w-8 h-8 text-primary-400" />
                <h1 className="text-xl font-bold text-white">Application Tracker</h1>
              </div>

              <div className="flex space-x-1">
                <Link
                  to="/"
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <BarChart3 className="w-5 h-5 inline-block mr-2" />
                  Übersicht
                </Link>

                <Link
                  to="/chat"
                  onClick={() => setActiveTab('chat')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
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
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
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
            <Route path="/chat" element={<Chat />} />
            <Route path="/upload" element={<Upload />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 border-t border-gray-700 mt-16">
          <div className="container mx-auto px-4 py-6 text-center text-gray-400 text-sm">
            <p>Application Tracker © 2026 | Powered by FastAPI + React</p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
