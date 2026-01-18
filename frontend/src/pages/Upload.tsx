import { useState, useRef } from 'react'
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Loader2, X, Folder, FolderTree } from 'lucide-react'
import { uploadDirectory, uploadBatchApplications } from '../utils/api'

interface ProcessingStep {
  label: string
  progress: number
  status: 'pending' | 'processing' | 'completed'
}

export default function Upload() {
  const [mode, setMode] = useState<'single' | 'batch'>('batch')  // Default to batch mode
  const [files, setFiles] = useState<File[]>([])
  const [companyName, setCompanyName] = useState('')
  const [position, setPosition] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([])
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dirInputRef = useRef<HTMLInputElement>(null)
  const batchDirInputRef = useRef<HTMLInputElement>(null)

  const handleFilesChange = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return

    const fileArray = Array.from(newFiles)
    setFiles(prev => [...prev, ...fileArray])
    setError(null)

    // Try to extract company name from first file if not set (single mode only)
    if (mode === 'single' && !companyName && fileArray.length > 0) {
      const firstFilename = fileArray[0].name
      const nameWithoutExt = firstFilename.replace(/\.[^/.]+$/, "")
      setCompanyName(nameWithoutExt)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFilesChange(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const simulateUploadProgress = async () => {
    // Simulate upload progress over 3 seconds
    const duration = 3000
    const intervalTime = 50
    const increments = duration / intervalTime
    const progressPerIncrement = 100 / increments

    for (let p = 0; p < 100; p += progressPerIncrement) {
      await new Promise(resolve => setTimeout(resolve, intervalTime))
      setUploadProgress(Math.min(99, p + progressPerIncrement))
    }
  }

  const simulateBackendProcessing = async () => {
    // Initialize steps
    const steps: ProcessingStep[] = [
      { label: 'LLM analysiert Dokumente (CV, Anschreiben, Job Description)', progress: 0, status: 'pending' },
      { label: 'Generiere Embeddings für Suche', progress: 0, status: 'pending' },
      { label: 'Indiziere in Elasticsearch', progress: 0, status: 'pending' }
    ]
    setProcessingSteps(steps)

    // Simulate each step with progress
    const stepDurations = [7000, 6000, 4000] // milliseconds for each step

    for (let i = 0; i < steps.length; i++) {
      // Mark current step as processing
      setProcessingSteps(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status: 'processing' } : s
      ))

      // Animate progress for this step
      const duration = stepDurations[i]
      const intervalTime = 50 // update every 50ms
      const increments = duration / intervalTime
      const progressPerIncrement = 100 / increments

      for (let p = 0; p < 100; p += progressPerIncrement) {
        await new Promise(resolve => setTimeout(resolve, intervalTime))
        setProcessingSteps(prev => prev.map((s, idx) =>
          idx === i ? { ...s, progress: Math.min(100, p + progressPerIncrement) } : s
        ))
      }

      // Mark step as completed
      setProcessingSteps(prev => prev.map((s, idx) =>
        idx === i ? { ...s, progress: 100, status: 'completed' } : s
      ))
    }
  }

  const handleUpload = async () => {
    if (mode === 'single') {
      // Single mode: requires company name
      if (files.length === 0 || !companyName.trim()) {
        setError('Bitte Dateien und Firmenname angeben')
        return
      }

      try {
        setUploading(true)
        setUploadProgress(0)
        setProcessingSteps([])
        setError(null)
        setResult(null)

        // Run simulated upload progress and actual upload in parallel
        const [res] = await Promise.all([
          uploadDirectory(files, companyName, position || undefined),
          simulateUploadProgress()
        ])

        // Set to 100% when upload completes
        setUploadProgress(100)

        // After upload completes, simulate backend processing
        await simulateBackendProcessing()

        setResult(res.data)

        // Reset form
        setFiles([])
        setCompanyName('')
        setPosition('')
      } catch (error: any) {
        console.error('Upload error:', error)
        setError(error.response?.data?.detail || 'Upload fehlgeschlagen')
      } finally {
        setUploading(false)
        setUploadProgress(0)
        setProcessingSteps([])
      }
    } else {
      // Batch mode: no company name needed (extracted from directory structure)
      if (files.length === 0) {
        setError('Bitte Verzeichnis mit Bewerbungen auswählen')
        return
      }

      try {
        setUploading(true)
        setUploadProgress(0)
        setProcessingSteps([])
        setError(null)
        setResult(null)

        // Run simulated upload progress and actual upload in parallel
        const [res] = await Promise.all([
          uploadBatchApplications(files),
          simulateUploadProgress()
        ])

        // Set to 100% when upload completes
        setUploadProgress(100)

        // After upload completes, simulate backend processing
        await simulateBackendProcessing()

        setResult(res.data)

        // Reset form
        setFiles([])
      } catch (error: any) {
        console.error('Batch upload error:', error)
        setError(error.response?.data?.detail || 'Batch Upload fehlgeschlagen')
      } finally {
        setUploading(false)
        setUploadProgress(0)
        setProcessingSteps([])
      }
    }
  }

  const getCompaniesFromFiles = (): string[] => {
    const companies = new Set<string>()
    files.forEach(file => {
      // @ts-ignore - webkitRelativePath exists on File
      const relativePath = file.webkitRelativePath || file.name
      const parts = relativePath.split('/')
      if (parts.length >= 2) {
        companies.add(parts[0])  // First level directory = company name
      }
    })
    return Array.from(companies)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  const companies = mode === 'batch' ? getCompaniesFromFiles() : []

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-blue-900 mb-6">Bewerbung hochladen</h2>

      <div className="space-y-6">
        {/* Mode Selector */}
        <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-blue-700 mb-3">Upload-Modus</h3>
          <div className="flex gap-4">
            <button
              onClick={() => { setMode('batch'); setFiles([]); setCompanyName(''); }}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                mode === 'batch'
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-blue-200 bg-white text-blue-600 hover:border-blue-400'
              }`}
            >
              <FolderTree className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">Batch Upload</div>
              <div className="text-xs mt-1">Mehrere Bewerbungen auf einmal</div>
            </button>

            <button
              onClick={() => { setMode('single'); setFiles([]); }}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                mode === 'single'
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-blue-200 bg-white text-blue-600 hover:border-blue-400'
              }`}
            >
              <Folder className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">Einzelne Bewerbung</div>
              <div className="text-xs mt-1">Eine Firma mit mehreren Dateien</div>
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">
            {mode === 'batch' ? 'Batch Upload Anleitung' : 'Einzelne Bewerbung Anleitung'}
          </h3>
          {mode === 'batch' ? (
            <ul className="space-y-1 text-sm text-blue-600">
              <li>• Wähle ein Hauptverzeichnis mit allen Bewerbungen</li>
              <li>• Jedes Unterverzeichnis = eine Bewerbung (Verzeichnisname = Firmenname)</li>
              <li>• Beispiel: <code className="bg-white px-1 rounded">Bewerbungen/Allianz/CV.pdf</code></li>
              <li>• Alle Bewerbungen werden automatisch erkannt und hochgeladen</li>
            </ul>
          ) : (
            <ul className="space-y-1 text-sm text-blue-600">
              <li>• Ziehe mehrere Dateien ins Upload-Feld oder wähle sie aus</li>
              <li>• Oder wähle ein komplettes Verzeichnis mit allen Unterordnern</li>
              <li>• Unterstützte Formate: PDF, DOCX, TXT</li>
              <li>• Dateinamen sollten aussagekräftig sein (z.B. "CV.pdf", "Anschreiben.docx")</li>
            </ul>
          )}
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            files.length > 0
              ? 'border-green-500 bg-green-50'
              : 'border-blue-300 bg-blue-50 hover:border-blue-500'
          }`}
        >
          {files.length > 0 ? (
            <div className="space-y-2">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
              <p className="text-blue-900 font-medium">{files.length} Datei(en) ausgewählt</p>
              {mode === 'batch' && companies.length > 0 && (
                <p className="text-blue-700 text-sm">{companies.length} Bewerbung(en) erkannt</p>
              )}
              <p className="text-blue-600 text-sm">{formatFileSize(totalSize)} gesamt</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mode === 'batch' ? (
                <FolderTree className="w-16 h-16 text-blue-400 mx-auto" />
              ) : (
                <UploadIcon className="w-16 h-16 text-blue-400 mx-auto" />
              )}
              <div>
                <p className="text-blue-900 font-medium mb-1">
                  {mode === 'batch' ? 'Hauptverzeichnis mit Bewerbungen auswählen' : 'Dateien hierher ziehen oder auswählen'}
                </p>
                <p className="text-blue-600 text-sm">
                  {mode === 'batch' ? 'Alle Unterverzeichnisse werden als separate Bewerbungen verarbeitet' : 'Mehrere Dateien werden unterstützt'}
                </p>
              </div>

              {mode === 'batch' ? (
                <>
                  <input
                    ref={batchDirInputRef}
                    type="file"
                    // @ts-ignore - webkitdirectory is not in TS types
                    webkitdirectory=""
                    onChange={(e) => handleFilesChange(e.target.files)}
                    className="hidden"
                    id="batch-dir-upload"
                  />
                  <label
                    htmlFor="batch-dir-upload"
                    className="inline-flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors shadow-sm"
                  >
                    <FolderTree className="w-4 h-4" />
                    <span>Hauptverzeichnis auswählen</span>
                  </label>
                </>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => handleFilesChange(e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <input
                    ref={dirInputRef}
                    type="file"
                    // @ts-ignore - webkitdirectory is not in TS types
                    webkitdirectory=""
                    onChange={(e) => handleFilesChange(e.target.files)}
                    className="hidden"
                    id="dir-upload"
                  />

                  <div className="flex items-center justify-center space-x-3">
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors shadow-sm"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Dateien auswählen</span>
                    </label>

                    <label
                      htmlFor="dir-upload"
                      className="inline-flex items-center space-x-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md cursor-pointer transition-colors shadow-sm"
                    >
                      <Folder className="w-4 h-4" />
                      <span>Verzeichnis auswählen</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Batch Mode: Show detected companies */}
        {mode === 'batch' && companies.length > 0 && (
          <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              Erkannte Bewerbungen ({companies.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {companies.map((company, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm"
                >
                  {company}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-900">Ausgewählte Dateien ({files.length})</h3>
              <button
                onClick={() => setFiles([])}
                className="text-red-600 text-sm hover:underline"
              >
                Alle entfernen
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="bg-blue-50 rounded px-3 py-2 flex items-center justify-between text-sm"
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-blue-900 truncate">
                      {/* @ts-ignore - webkitRelativePath exists on File */}
                      {file.webkitRelativePath || file.name}
                    </span>
                    <span className="text-blue-600 flex-shrink-0">{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-2 text-red-600 hover:text-red-700 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form - Only show for single mode */}
        {mode === 'single' && (
          <div className="bg-white rounded-lg border border-blue-200 p-6 space-y-4 shadow-sm">
            <div className="bg-blue-50 border border-blue-300 rounded p-3 mb-4">
              <p className="text-sm text-blue-700">
                💡 <strong>Tipp:</strong> Firma und Position werden automatisch aus den Dokumenten extrahiert.
                Du kannst sie optional manuell überschreiben.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">
                Firmenname <span className="text-blue-500">(optional - wird aus Dokumenten extrahiert)</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Wird automatisch aus CV/Anschreiben extrahiert..."
                className="w-full px-4 py-2 bg-white border border-blue-300 rounded-md text-blue-900 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">
                Position <span className="text-blue-500">(optional - wird aus Dokumenten extrahiert)</span>
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Wird automatisch aus CV/Anschreiben extrahiert..."
                className="w-full px-4 py-2 bg-white border border-blue-300 rounded-md text-blue-900 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center justify-center space-x-2 shadow-sm"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>
                {uploadProgress < 100 ? 'Upload läuft...' : 'Verarbeitung läuft...'}
              </span>
            </>
          ) : (
            <>
              <UploadIcon className="w-5 h-5" />
              {mode === 'batch' ? (
                <span>Batch Upload starten ({companies.length} Bewerbungen)</span>
              ) : (
                <span>Hochladen ({files.length} Dateien)</span>
              )}
            </>
          )}
        </button>

        {/* Progress Bar */}
        {uploading && (
          <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
            {uploadProgress < 100 ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-700 font-medium">Upload-Fortschritt</span>
                  <span className="text-blue-900 font-semibold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Dateien werden zum Server hochgeladen...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Upload completed */}
                <div className="flex items-center space-x-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Upload abgeschlossen</span>
                </div>

                {/* Processing steps */}
                <div className="space-y-3">
                  {processingSteps.map((step, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          {step.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : step.status === 'processing' ? (
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-blue-300" />
                          )}
                          <span className={`${step.status === 'completed' ? 'text-green-700' : 'text-blue-700'}`}>
                            {step.label}
                          </span>
                        </div>
                        {step.status !== 'pending' && (
                          <span className="text-blue-900 font-semibold text-xs">
                            {Math.round(step.progress)}%
                          </span>
                        )}
                      </div>
                      {step.status !== 'pending' && (
                        <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden ml-6">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              step.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${step.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-blue-500 italic mt-2">
                  Dies kann 10-30 Sekunden dauern, abhängig von der Anzahl der Dokumente.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start space-x-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-4 space-y-3 shadow-sm">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-700 font-medium">Upload erfolgreich!</p>
                {mode === 'batch' ? (
                  <p className="text-blue-700 text-sm mt-1">
                    {result.total_applications} Bewerbungen mit {result.total_files} Dateien verarbeitet
                  </p>
                ) : (
                  <p className="text-blue-700 text-sm mt-1">
                    {result.total_files} Dateien verarbeitet für {result.company_name}
                  </p>
                )}
              </div>
            </div>

            {mode === 'batch' && result.applications && result.applications.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-blue-700 mb-2">Verarbeitete Bewerbungen:</p>
                <div className="space-y-2">
                  {result.applications.map((app: any, idx: number) => (
                    <div key={idx} className="bg-white rounded p-3 border border-green-200">
                      <div className="font-medium text-blue-900">{app.company_name}</div>
                      <div className="text-sm text-blue-600 mt-1">
                        {app.total_files} Dateien verarbeitet
                      </div>
                      {app.errors && app.errors.length > 0 && (
                        <div className="text-sm text-red-600 mt-1">
                          {app.errors.length} Fehler
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mode === 'single' && result.processed_files && result.processed_files.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-blue-700 mb-2">Verarbeitete Dateien:</p>
                <div className="space-y-1">
                  {result.processed_files.map((file: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-white rounded px-3 py-2 flex items-center justify-between text-sm border border-green-200"
                    >
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-blue-900">{file.filename}</span>
                        <span className="text-blue-600">({file.type})</span>
                      </div>
                      <span className="text-blue-600">{file.chars} Zeichen</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-red-700 mb-2">Fehler:</p>
                <div className="space-y-1">
                  {result.errors.map((err: any, idx: number) => (
                    <div key={idx} className="bg-red-50 rounded px-3 py-2 text-sm text-red-700 border border-red-200">
                      {err.filename || err.company}: {err.error}
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
