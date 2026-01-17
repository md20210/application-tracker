import { useState } from 'react'
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { uploadDirectory } from '../utils/api'

export default function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [position, setPosition] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.zip')) {
        setError('Bitte eine ZIP-Datei auswählen')
        return
      }
      setFile(selectedFile)
      setError(null)

      // Try to extract company name from filename
      const filename = selectedFile.name.replace('.zip', '')
      if (!companyName) {
        setCompanyName(filename)
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.zip')) {
        setError('Bitte eine ZIP-Datei auswählen')
        return
      }
      setFile(droppedFile)
      setError(null)

      const filename = droppedFile.name.replace('.zip', '')
      if (!companyName) {
        setCompanyName(filename)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleUpload = async () => {
    if (!file || !companyName.trim()) {
      setError('Bitte Datei und Firmenname angeben')
      return
    }

    try {
      setUploading(true)
      setError(null)
      setResult(null)

      const res = await uploadDirectory(file, companyName, position || undefined)
      setResult(res.data)

      // Reset form
      setFile(null)
      setCompanyName('')
      setPosition('')
    } catch (error: any) {
      console.error('Upload error:', error)
      setError(error.response?.data?.detail || 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-white mb-6">Bewerbung hochladen</h2>

      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">Anleitung</h3>
          <ul className="space-y-1 text-sm text-gray-300">
            <li>• Erstelle ein ZIP-Archiv mit allen Bewerbungsunterlagen</li>
            <li>• Ordnerstruktur ist egal - alle Dateien werden verarbeitet</li>
            <li>• Unterstützte Formate: PDF, DOCX, TXT</li>
            <li>• Dateinamen sollten aussagekräftig sein (z.B. "CV.pdf", "Anschreiben.docx")</li>
          </ul>
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            file
              ? 'border-green-600 bg-green-900/10'
              : 'border-gray-600 bg-gray-800 hover:border-primary-600'
          }`}
        >
          {file ? (
            <div className="space-y-2">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-gray-400 text-sm">{(file.size / 1024).toFixed(0)} KB</p>
              <button
                onClick={() => setFile(null)}
                className="text-red-400 text-sm hover:underline"
              >
                Entfernen
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <UploadIcon className="w-16 h-16 text-gray-500 mx-auto" />
              <div>
                <p className="text-white font-medium mb-1">
                  ZIP-Datei hierher ziehen oder klicken
                </p>
                <p className="text-gray-400 text-sm">Maximal 50 MB</p>
              </div>
              <input
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-block px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md cursor-pointer transition-colors"
              >
                Datei auswählen
              </label>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Firmenname <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="z.B. Allianz, SAP, Siemens"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Position (optional)
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="z.B. Senior Developer, Product Manager"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || !companyName.trim() || uploading}
            className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center justify-center space-x-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Upload läuft...</span>
              </>
            ) : (
              <>
                <UploadIcon className="w-5 h-5" />
                <span>Hochladen</span>
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-red-300">{error}</div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-300 font-medium">Upload erfolgreich!</p>
                <p className="text-gray-300 text-sm mt-1">
                  {result.total_files} Dateien verarbeitet für {result.company_name}
                </p>
              </div>
            </div>

            {result.processed_files.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-300 mb-2">Verarbeitete Dateien:</p>
                <div className="space-y-1">
                  {result.processed_files.map((file: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-gray-800 rounded px-3 py-2 flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{file.filename}</span>
                        <span className="text-gray-500">({file.type})</span>
                      </div>
                      <span className="text-gray-400">{file.chars} Zeichen</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-red-300 mb-2">Fehler:</p>
                <div className="space-y-1">
                  {result.errors.map((err: any, idx: number) => (
                    <div key={idx} className="bg-red-900/20 rounded px-3 py-2 text-sm text-red-300">
                      {err.filename}: {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
