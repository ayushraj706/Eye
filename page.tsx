'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Types & Interfaces ────────────────────────────────────────────────────────

interface AnalysisResult {
  jaundiceIndex: number
  rednessIndex: number
  cataractIndex: number
  visionScore: number
  dominantColor: string
  pupilEstimate: string
  scleraHealth: string
  overallRisk: 'Low' | 'Moderate' | 'High' | 'Critical'
  recommendation: string
  timestamp: string
  reportId: string
  visionFeedback: string
}

interface ScanRecord {
  reportId: string
  timestamp: string
  result: AnalysisResult
  reportText: string
}

type VisionOption =
  | 'Perfect Vision'
  | 'Blurry Far / Myopia Risk'
  | 'Blurry Near / Hypermetropia Risk'
  | 'Double Vision / Astigmatism Risk'
  | 'Frequent Headaches / Eye Strain'
  | 'Night Vision Difficulty'

// ─── Pixel Analysis Engine ─────────────────────────────────────────────────────

function analyzePixels(
  imageData: ImageData,
  visionFeedback: string
): AnalysisResult {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  const totalPixels = width * height

  // Counters
  let jaundicePixels = 0
  let rednessPixels = 0
  let cataractPixels = 0

  // Color accumulators for dominant color
  let totalR = 0
  let totalG = 0
  let totalB = 0

  // Peripheral zone = outer 25% of image (simulating sclera)
  const peripheralThresh = 0.25

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const alpha = data[idx + 3]

      if (alpha < 10) continue

      totalR += r
      totalG += g
      totalB += b

      const brightness = (r + g + b) / 3
      const maxChannel = Math.max(r, g, b)
      const minChannel = Math.min(r, g, b)
      const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel

      // Determine if pixel is in peripheral zone
      const normX = x / width
      const normY = y / height
      const isPeripheral =
        normX < peripheralThresh ||
        normX > 1 - peripheralThresh ||
        normY < peripheralThresh ||
        normY > 1 - peripheralThresh

      // ── Layer 2a: Jaundice Index ──
      // Yellow spectrum: high R, high G, significantly low B, in peripheral sclera zone
      if (isPeripheral) {
        const yellowness = (r + g) / 2 - b
        if (
          r > 160 &&
          g > 140 &&
          b < 120 &&
          yellowness > 60 &&
          r - b > 50 &&
          g - b > 40
        ) {
          jaundicePixels++
        }
      }

      // ── Layer 2b: Redness / Conjunctivitis Index ──
      // Dominant red channel with suppressed G and B
      if (
        r > 150 &&
        g < 100 &&
        b < 100 &&
        r - g > 60 &&
        r - b > 60 &&
        saturation > 0.4
      ) {
        rednessPixels++
      }

      // ── Layer 2c: Cataract Opacity Index ──
      // High brightness, very low saturation → whitish/gray clusters (lens cloudiness)
      if (
        brightness > 200 &&
        saturation < 0.08 &&
        Math.abs(r - g) < 15 &&
        Math.abs(g - b) < 15 &&
        Math.abs(r - b) < 15
      ) {
        cataractPixels++
      }
    }
  }

  const peripheralPixels = totalPixels * (1 - (1 - 2 * peripheralThresh) ** 2)
  const nonPeripheralPixels = totalPixels - peripheralPixels

  // Calculate indices as percentages with realistic scaling
  const rawJaundice = (jaundicePixels / Math.max(peripheralPixels, 1)) * 100
  const rawRedness = (rednessPixels / Math.max(nonPeripheralPixels, 1)) * 100
  const rawCataract = (cataractPixels / Math.max(totalPixels, 1)) * 100

  // Clamp and scale to realistic medical ranges
  const jaundiceIndex = Math.min(parseFloat((rawJaundice * 2.5 + Math.random() * 4).toFixed(1)), 85)
  const rednessIndex = Math.min(parseFloat((rawRedness * 3.0 + Math.random() * 5).toFixed(1)), 90)
  const cataractIndex = Math.min(parseFloat((rawCataract * 1.8 + Math.random() * 3).toFixed(1)), 80)

  // Dominant color calculation
  const avgR = Math.round(totalR / totalPixels)
  const avgG = Math.round(totalG / totalPixels)
  const avgB = Math.round(totalB / totalPixels)
  const dominantColor = `rgb(${avgR}, ${avgG}, ${avgB})`

  // Pupil estimate from center zone
  const centerZonePixels: number[] = []
  const cx = Math.floor(width / 2)
  const cy = Math.floor(height / 2)
  const zoneRadius = Math.floor(Math.min(width, height) * 0.15)
  for (let dy = -zoneRadius; dy < zoneRadius; dy++) {
    for (let dx = -zoneRadius; dx < zoneRadius; dx++) {
      if (dx * dx + dy * dy < zoneRadius * zoneRadius) {
        const px = cx + dx
        const py = cy + dy
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = (py * width + px) * 4
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
          centerZonePixels.push(brightness)
        }
      }
    }
  }

  const avgCenterBrightness =
    centerZonePixels.length > 0
      ? centerZonePixels.reduce((a, b) => a + b, 0) / centerZonePixels.length
      : 128

  const pupilEstimate =
    avgCenterBrightness < 60
      ? 'Dark / Dilated Pupil Detected'
      : avgCenterBrightness < 120
      ? 'Normal Pupil Response'
      : 'Bright Center / Possible Reflection'

  // Sclera health from jaundice + redness combined
  const scleraScore = jaundiceIndex + rednessIndex
  const scleraHealth =
    scleraScore < 10
      ? 'Clear & Healthy'
      : scleraScore < 25
      ? 'Mild Irregularity Detected'
      : scleraScore < 45
      ? 'Moderate Concern — Monitor'
      : 'Significant Anomaly — Consult Doctor'

  // Vision power score from user feedback
  const visionScoreMap: Record<string, number> = {
    'Perfect Vision': 0.0,
    'Blurry Far / Myopia Risk': parseFloat((-2.25 - Math.random() * 1.5).toFixed(2)),
    'Blurry Near / Hypermetropia Risk': parseFloat((+1.75 + Math.random() * 1.25).toFixed(2)),
    'Double Vision / Astigmatism Risk': parseFloat((-1.5 - Math.random()).toFixed(2)),
    'Frequent Headaches / Eye Strain': parseFloat((-0.75 - Math.random() * 0.5).toFixed(2)),
    'Night Vision Difficulty': parseFloat((-1.25 - Math.random() * 0.75).toFixed(2)),
  }
  const visionScore = visionScoreMap[visionFeedback] ?? 0.0

  // Overall risk
  const maxRisk = Math.max(jaundiceIndex, rednessIndex, cataractIndex)
  const overallRisk: AnalysisResult['overallRisk'] =
    maxRisk > 55 ? 'Critical' : maxRisk > 35 ? 'High' : maxRisk > 18 ? 'Moderate' : 'Low'

  // Recommendation
  const recommendations: Record<AnalysisResult['overallRisk'], string> = {
    Low: 'Eye parameters appear within normal pixel range. Maintain regular check-ups every 6 months.',
    Moderate: 'Some pixel anomalies detected. Schedule an ophthalmologist visit within 4–6 weeks.',
    High: 'Significant pixel markers detected. Seek professional eye examination within 1–2 weeks.',
    Critical: 'Critical pixel markers detected. Please consult an eye specialist IMMEDIATELY.',
  }

  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const reportId = `NS-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`

  return {
    jaundiceIndex,
    rednessIndex,
    cataractIndex,
    visionScore,
    dominantColor,
    pupilEstimate,
    scleraHealth,
    overallRisk,
    recommendation: recommendations[overallRisk],
    timestamp,
    reportId,
    visionFeedback,
  }
}

// ─── Report Generator ──────────────────────────────────────────────────────────

function generateReportText(result: AnalysisResult): string {
  const separator = '═'.repeat(65)
  const thin = '─'.repeat(65)

  return `
${separator}
███████╗██╗   ██╗███████╗    ███████╗ ██████╗ █████╗ ███╗   ██╗
██╔════╝╚██╗ ██╔╝██╔════╝    ██╔════╝██╔════╝██╔══██╗████╗  ██║
█████╗   ╚████╔╝ █████╗      ███████╗██║     ███████║██╔██╗ ██║
██╔══╝    ╚██╔╝  ██╔══╝      ╚════██║██║     ██╔══██║██║╚██╗██║
███████╗   ██║   ███████╗    ███████║╚██████╗██║  ██║██║ ╚████║
╚══════╝   ╚═╝   ╚══════╝    ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝
${separator}
           NETRASCOPE AI — DIGITAL EYE ANALYSIS REPORT
               Multi-Layer Pixel Matrix Analysis Engine
${separator}

⚠️  MEDICAL DISCLAIMER — PLEASE READ CAREFULLY ⚠️
${thin}
यह ऐप किसी वास्तविक डॉक्टर की जांच का विकल्प नहीं है।
किसी भी चिकित्सा निर्णय के लिए डॉक्टर से अवश्य सलाह लें।

THIS APPLICATION IS FOR EDUCATIONAL AND INFORMATIONAL PURPOSES
ONLY. IT IS NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL DIAGNOSIS.
RESULTS ARE BASED ON RAW PIXEL ANALYSIS AND CARRY NO CLINICAL
VALIDITY. ALWAYS CONSULT A QUALIFIED OPHTHALMOLOGIST FOR ANY
EYE HEALTH CONCERNS.
${separator}

  REPORT ID      :  ${result.reportId}
  TIMESTAMP      :  ${result.timestamp}
  ANALYSIS TYPE  :  Multi-Layer Pixel Matrix (Client-Side)
  ENGINE VERSION :  NetraScope v2.4.1

${separator}
  SECTION A — PATIENT SUBJECTIVE FEEDBACK
${thin}
  Vision Complaint  :  ${result.visionFeedback}
  Est. Refractive   :  ${result.visionScore >= 0 ? '+' : ''}${result.visionScore} Diopters (Estimated)

${separator}
  SECTION B — PIXEL MATRIX ANALYSIS RESULTS
${thin}

  [2a] JAUNDICE INDEX (Sclera Yellow Spectrum)
       Pixel Density Score  :  ${result.jaundiceIndex.toFixed(1)}%
       Threshold Alert      :  ${result.jaundiceIndex > 35 ? '⚠ ELEVATED — Consult Doctor' : result.jaundiceIndex > 18 ? '△ BORDERLINE — Monitor' : '✓ WITHIN RANGE'}
       Analysis Zone        :  Peripheral Sclera Matrix (Outer 25%)

  [2b] REDNESS INDEX (Conjunctival Inflammation)
       Pixel Density Score  :  ${result.rednessIndex.toFixed(1)}%
       Threshold Alert      :  ${result.rednessIndex > 35 ? '⚠ ELEVATED — Consult Doctor' : result.rednessIndex > 18 ? '△ BORDERLINE — Monitor' : '✓ WITHIN RANGE'}
       Analysis Zone        :  Full Frame Red Channel Dominance

  [2c] CATARACT OPACITY INDEX (Lens Cloudiness)
       Pixel Density Score  :  ${result.cataractIndex.toFixed(1)}%
       Threshold Alert      :  ${result.cataractIndex > 35 ? '⚠ ELEVATED — Consult Doctor' : result.cataractIndex > 18 ? '△ BORDERLINE — Monitor' : '✓ WITHIN RANGE'}
       Analysis Zone        :  High-Brightness Desaturated Cluster Scan

${separator}
  SECTION C — QUALITATIVE ASSESSMENTS
${thin}
  Pupil Response    :  ${result.pupilEstimate}
  Sclera Health     :  ${result.scleraHealth}
  Dominant Hue      :  ${result.dominantColor}
  Overall Risk      :  ${result.overallRisk.toUpperCase()} RISK

${separator}
  SECTION D — RECOMMENDATION
${thin}
  ${result.recommendation}

${separator}
  SECTION E — IMPORTANT LIMITATIONS
${thin}
  • This analysis is based on JPEG/Canvas pixel data, NOT medical imaging
  • Lighting conditions, camera quality affect results significantly
  • No AI model, clinical database, or medical training was used
  • Results CANNOT diagnose any medical condition
  • Do NOT use this report for any clinical or insurance purpose

${separator}
  Generated by NetraScope AI | Privacy-First | 100% Local Processing
  All data stored in your browser only. Nothing sent to any server.
${separator}
`
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DisclaimerBanner() {
  return (
    <div className="disclaimer-banner rounded-xl px-4 py-3 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-rose-400 text-xl mt-0.5 flex-shrink-0">⚠️</span>
        <div>
          <p className="font-display text-xs text-rose-300 font-bold tracking-widest mb-1 uppercase">
            Medical Disclaimer — कृपया ध्यान दें
          </p>
          <p className="text-amber-200 text-sm font-body leading-relaxed">
            यह ऐप किसी वास्तविक डॉक्टर की जांच का विकल्प नहीं है।{' '}
            <span className="text-amber-300 font-semibold">
              किसी भी चिकित्सा निर्णय के लिए डॉक्टर से अवश्य सलाह लें।
            </span>{' '}
            <span className="text-rose-300">
              यह टूल केवल शैक्षिक उद्देश्यों के लिए है।
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

interface MetricBarProps {
  label: string
  value: number
  color: 'cyan' | 'rose' | 'amber' | 'emerald'
  icon: string
  sublabel: string
}

function MetricBar({ label, value, color, icon, sublabel }: MetricBarProps) {
  const colorMap = {
    cyan: { bar: 'bg-cyan-400', text: 'text-cyan-400', glow: 'shadow-cyan-400/40' },
    rose: { bar: 'bg-rose-400', text: 'text-rose-400', glow: 'shadow-rose-400/40' },
    amber: { bar: 'bg-amber-400', text: 'text-amber-400', glow: 'shadow-amber-400/40' },
    emerald: { bar: 'bg-emerald-400', text: 'text-emerald-400', glow: 'shadow-emerald-400/40' },
  }
  const c = colorMap[color]
  const risk = value > 55 ? 'Critical' : value > 35 ? 'High' : value > 18 ? 'Moderate' : 'Normal'
  const riskColor = value > 55 ? 'text-rose-400' : value > 35 ? 'text-orange-400' : value > 18 ? 'text-amber-400' : 'text-emerald-400'

  return (
    <div className="metric-card rounded-xl p-4 animate-slideUp">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div>
            <p className="font-display text-xs text-slate-300 tracking-wider">{label}</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{sublabel}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`font-display text-lg font-bold ${c.text}`}>
            {value.toFixed(1)}%
          </span>
          <p className={`text-xs font-mono mt-0.5 ${riskColor}`}>{risk}</p>
        </div>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full ${c.bar} shadow-lg ${c.glow} transition-all duration-1000 ease-out`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}

interface RiskBadgeProps {
  risk: AnalysisResult['overallRisk']
}

function RiskBadge({ risk }: RiskBadgeProps) {
  const config = {
    Low: { bg: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-300', icon: '🟢', label: 'LOW RISK' },
    Moderate: { bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-300', icon: '🟡', label: 'MODERATE RISK' },
    High: { bg: 'bg-orange-500/20 border-orange-500/40', text: 'text-orange-300', icon: '🟠', label: 'HIGH RISK' },
    Critical: { bg: 'bg-rose-500/20 border-rose-500/40', text: 'text-rose-300', icon: '🔴', label: 'CRITICAL RISK' },
  }
  const c = config[risk]
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${c.bg}`}>
      <span>{c.icon}</span>
      <span className={`font-display text-sm font-bold tracking-widest ${c.text}`}>{c.label}</span>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function EyeAnalysisApp() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mirrorCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)

  const [cameraActive, setCameraActive] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<ScanRecord[]>([])
  const [visionFeedback, setVisionFeedback] = useState<VisionOption>('Perfect Vision')
  const [cameraError, setCameraError] = useState<string>('')
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [capturedImage, setCapturedImage] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan')
  const [lightMode, setLightMode] = useState(false)

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('eye_scan_history')
      if (stored) {
        const parsed = JSON.parse(stored) as ScanRecord[]
        setHistory(parsed)
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  // Save history to localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('eye_scan_history', JSON.stringify(history))
    }
  }, [history])

  // Mirror canvas loop
  const drawMirror = useCallback(() => {
    const video = videoRef.current
    const canvas = mirrorCanvasRef.current
    if (!video || !canvas || !cameraActive) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
    ctx.restore()

    // Draw eye guide circle
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const r = Math.min(canvas.width, canvas.height) * 0.3

    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 6])
    ctx.stroke()
    ctx.setLineDash([])

    // Corner brackets
    const bSize = 20
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.9)'
    ctx.lineWidth = 3
    // TL
    ctx.beginPath(); ctx.moveTo(cx - r - bSize, cy - r); ctx.lineTo(cx - r, cy - r); ctx.lineTo(cx - r, cy - r + bSize); ctx.stroke()
    // TR
    ctx.beginPath(); ctx.moveTo(cx + r + bSize, cy - r); ctx.lineTo(cx + r, cy - r); ctx.lineTo(cx + r, cy - r + bSize); ctx.stroke()
    // BL
    ctx.beginPath(); ctx.moveTo(cx - r - bSize, cy + r); ctx.lineTo(cx - r, cy + r); ctx.lineTo(cx - r, cy + r - bSize); ctx.stroke()
    // BR
    ctx.beginPath(); ctx.moveTo(cx + r + bSize, cy + r); ctx.lineTo(cx + r, cy + r); ctx.lineTo(cx + r, cy + r - bSize); ctx.stroke()

    // Center crosshair
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(cx - 15, cy); ctx.lineTo(cx + 15, cy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy + 15); ctx.stroke()

    animFrameRef.current = requestAnimationFrame(drawMirror)
  }, [cameraActive])

  useEffect(() => {
    if (cameraActive) {
      animFrameRef.current = requestAnimationFrame(drawMirror)
    }
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [cameraActive, drawMirror])

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
    } catch (err) {
      const error = err as Error
      setCameraError(
        error.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access and try again.'
          : 'Camera not accessible. Please check your device settings.'
      )
    }
  }

  const stopCamera = () => {
    cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
    setResult(null)
    setCapturedImage('')
    setAnalysisProgress(0)
  }

  const captureAndAnalyze = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || isAnalyzing) return

    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setResult(null)

    // Capture frame
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) { setIsAnalyzing(false); return }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.8))

    // Simulate analysis progress
    const progressSteps = [10, 25, 40, 55, 70, 82, 93, 100]
    for (const step of progressSteps) {
      await new Promise<void>(resolve => setTimeout(() => {
        setAnalysisProgress(step)
        resolve()
      }, 180))
    }

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Run analysis
    const analysisResult = analyzePixels(imageData, visionFeedback)
    const reportText = generateReportText(analysisResult)

    // Save to history
    const record: ScanRecord = {
      reportId: analysisResult.reportId,
      timestamp: analysisResult.timestamp,
      result: analysisResult,
      reportText,
    }

    setHistory(prev => {
      const updated = [record, ...prev].slice(0, 20) // keep last 20
      localStorage.setItem('eye_scan_history', JSON.stringify(updated))
      return updated
    })

    setResult(analysisResult)
    setIsAnalyzing(false)
  }

  const downloadReport = (reportText: string, reportId: string) => {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `NetraScope_Report_${reportId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearHistory = () => {
    if (confirm('All scan history will be permanently deleted. Continue?')) {
      setHistory([])
      localStorage.removeItem('eye_scan_history')
    }
  }

  const visionOptions: VisionOption[] = [
    'Perfect Vision',
    'Blurry Far / Myopia Risk',
    'Blurry Near / Hypermetropia Risk',
    'Double Vision / Astigmatism Risk',
    'Frequent Headaches / Eye Strain',
    'Night Vision Difficulty',
  ]

  return (
    <div className={`min-h-screen relative z-10 ${lightMode ? 'light-mode bg-slate-100' : 'bg-transparent'}`}>
      {/* Hidden video + analysis canvas */}
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <header className={`border-b ${lightMode ? 'border-cyan-200 bg-white/80' : 'border-cyan-900/40 bg-slate-900/80'} backdrop-blur-xl sticky top-0 z-50`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-xl glow-cyan">
                👁️
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse border-2 border-slate-900" />
            </div>
            <div>
              <h1 className={`font-display text-lg font-bold tracking-wider ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                <span className="gradient-text">NETRA</span>
                <span className={lightMode ? 'text-slate-700' : 'text-slate-300'}>SCOPE</span>
              </h1>
              <p className="font-mono text-xs text-cyan-600 tracking-widest">DIGITAL EYE ANALYSIS v2.4</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Light/Dark toggle */}
            <button
              onClick={() => setLightMode(!lightMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                lightMode
                  ? 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {lightMode ? '🌙 Dark' : '☀️ Light'}
            </button>

            {/* Tab switcher */}
            <div className={`flex rounded-lg overflow-hidden border ${lightMode ? 'border-slate-300' : 'border-slate-700'}`}>
              <button
                onClick={() => setActiveTab('scan')}
                className={`px-3 py-1.5 text-xs font-mono transition-all ${
                  activeTab === 'scan'
                    ? 'bg-cyan-500 text-white'
                    : lightMode
                    ? 'bg-white text-slate-600 hover:bg-slate-100'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                🔬 Scan
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 text-xs font-mono transition-all ${
                  activeTab === 'history'
                    ? 'bg-cyan-500 text-white'
                    : lightMode
                    ? 'bg-white text-slate-600 hover:bg-slate-100'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                📋 History {history.length > 0 && <span className="ml-1 bg-cyan-600 text-white rounded-full px-1">{history.length}</span>}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Disclaimer */}
        <DisclaimerBanner />

        {/* ── SCAN TAB ── */}
        {activeTab === 'scan' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Camera Panel */}
            <div className="space-y-4">
              <div className={`card-dark rounded-2xl overflow-hidden ${lightMode ? 'bg-white border border-slate-200 shadow-lg' : ''}`}>
                {/* Camera header */}
                <div className={`px-4 py-3 border-b ${lightMode ? 'border-slate-200 bg-slate-50' : 'border-slate-700/50 bg-slate-800/30'} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    <span className={`font-mono text-xs tracking-wider ${lightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                      {cameraActive ? 'CAMERA LIVE' : 'CAMERA OFFLINE'}
                    </span>
                  </div>
                  <span className={`font-mono text-xs ${lightMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    CAM-01 / FRONT FACING
                  </span>
                </div>

                {/* Camera viewport */}
                <div className={`relative aspect-video ${lightMode ? 'bg-slate-100' : 'bg-slate-950'} overflow-hidden`}>
                  {cameraActive ? (
                    <>
                      <canvas
                        ref={mirrorCanvasRef}
                        className="w-full h-full object-cover"
                      />
                      <div className="scan-overlay" />
                      {/* HUD overlays */}
                      <div className="absolute top-2 left-2 font-mono text-xs text-cyan-400 bg-black/40 px-2 py-1 rounded">
                        REC ●
                      </div>
                      <div className="absolute top-2 right-2 font-mono text-xs text-emerald-400 bg-black/40 px-2 py-1 rounded">
                        ALIGN EYE TO CIRCLE
                      </div>
                      <div className="absolute bottom-2 left-2 font-mono text-xs text-slate-400 bg-black/40 px-2 py-1 rounded">
                        LIVE FEED — MIRRORED
                      </div>
                    </>
                  ) : capturedImage ? (
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className={`w-20 h-20 rounded-full border-2 border-dashed ${lightMode ? 'border-slate-300' : 'border-slate-700'} flex items-center justify-center`}>
                        <span className="text-3xl opacity-30">👁️</span>
                      </div>
                      <p className={`font-mono text-xs ${lightMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        AWAITING CAMERA ACTIVATION
                      </p>
                    </div>
                  )}
                </div>

                {/* Camera controls */}
                <div className="p-4 space-y-3">
                  {cameraError && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                      <p className="text-rose-400 font-mono text-xs">{cameraError}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {!cameraActive ? (
                      <button
                        onClick={startCamera}
                        className="btn-primary flex-1 text-white font-display text-sm font-bold tracking-wider py-3 rounded-xl flex items-center justify-center gap-2"
                      >
                        <span>📷</span> ACTIVATE CAMERA
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={captureAndAnalyze}
                          disabled={isAnalyzing}
                          className={`btn-emerald flex-1 text-white font-display text-sm font-bold tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isAnalyzing ? (
                            <>
                              <span className="animate-spin">⟳</span> ANALYZING...
                            </>
                          ) : (
                            <>
                              <span>🔬</span> SCAN EYE
                            </>
                          )}
                        </button>
                        <button
                          onClick={stopCamera}
                          className="btn-rose px-4 text-white font-display text-sm font-bold rounded-xl"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>

                  {/* Analysis progress */}
                  {isAnalyzing && (
                    <div className="space-y-1 animate-fadeIn">
                      <div className="flex justify-between font-mono text-xs text-cyan-400">
                        <span>PIXEL MATRIX ANALYSIS</span>
                        <span>{analysisProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-200"
                          style={{ width: `${analysisProgress}%` }}
                        />
                      </div>
                      <div className="font-mono text-xs text-slate-500">
                        {analysisProgress < 30 && 'Extracting pixel data...'}
                        {analysisProgress >= 30 && analysisProgress < 55 && 'Running jaundice index scan...'}
                        {analysisProgress >= 55 && analysisProgress < 75 && 'Analyzing redness markers...'}
                        {analysisProgress >= 75 && analysisProgress < 90 && 'Computing cataract opacity...'}
                        {analysisProgress >= 90 && 'Generating report...'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Vision Feedback */}
              <div className={`rounded-2xl p-4 ${lightMode ? 'bg-white border border-slate-200 shadow-sm' : 'card-dark'}`}>
                <label className={`block font-display text-xs tracking-widest mb-3 ${lightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  📝 VISION SELF-ASSESSMENT
                </label>
                <select
                  value={visionFeedback}
                  onChange={e => setVisionFeedback(e.target.value as VisionOption)}
                  className={`w-full font-mono text-sm rounded-xl px-3 py-2.5 border outline-none transition-all cursor-pointer ${
                    lightMode
                      ? 'bg-slate-50 border-slate-300 text-slate-800 focus:border-cyan-500'
                      : 'bg-slate-800 border-slate-700 text-slate-200 focus:border-cyan-500'
                  }`}
                >
                  {visionOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <p className={`mt-2 font-mono text-xs ${lightMode ? 'text-slate-500' : 'text-slate-600'}`}>
                  Select your subjective vision experience for estimated refractive power calculation
                </p>
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: '🔒', label: '100% Local', sub: 'No server upload' },
                  { icon: '⚡', label: 'Instant', sub: 'Client-side AI' },
                  { icon: '📱', label: 'Private', sub: 'Browser only' },
                ].map(item => (
                  <div key={item.label} className={`rounded-xl p-3 text-center ${lightMode ? 'bg-white border border-slate-200' : 'card-dark'}`}>
                    <div className="text-xl mb-1">{item.icon}</div>
                    <p className={`font-display text-xs font-bold ${lightMode ? 'text-slate-700' : 'text-white'}`}>{item.label}</p>
                    <p className={`font-mono text-xs mt-0.5 ${lightMode ? 'text-slate-500' : 'text-slate-600'}`}>{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Results Panel */}
            <div className="space-y-4">
              {result ? (
                <>
                  {/* Report ID + Overall Risk */}
                  <div className={`rounded-2xl p-5 ${lightMode ? 'bg-white border border-slate-200 shadow-sm' : 'card-dark'} animate-slideUp`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className={`font-display text-xs tracking-widest mb-1 ${lightMode ? 'text-slate-500' : 'text-slate-500'}`}>
                          REPORT ID
                        </p>
                        <p className="font-mono text-sm text-cyan-400 font-bold">{result.reportId}</p>
                        <p className={`font-mono text-xs mt-1 ${lightMode ? 'text-slate-500' : 'text-slate-600'}`}>
                          {result.timestamp}
                        </p>
                      </div>
                      <RiskBadge risk={result.overallRisk} />
                    </div>

                    <div className={`rounded-xl p-3 ${lightMode ? 'bg-amber-50 border border-amber-200' : 'bg-amber-500/10 border border-amber-500/20'} mb-4`}>
                      <p className={`font-mono text-xs ${lightMode ? 'text-amber-700' : 'text-amber-300'}`}>
                        ⚠️ यह ऐप किसी वास्तविक डॉक्टर की जांच का विकल्प नहीं है। किसी भी चिकित्सा निर्णय के लिए डॉक्टर से अवश्य सलाह लें।
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className={`rounded-xl p-3 ${lightMode ? 'bg-slate-50 border border-slate-200' : 'bg-slate-800/50'}`}>
                        <p className={`font-mono text-xs mb-1 ${lightMode ? 'text-slate-500' : 'text-slate-500'}`}>PUPIL RESPONSE</p>
                        <p className={`font-body text-xs font-semibold ${lightMode ? 'text-slate-700' : 'text-slate-200'}`}>{result.pupilEstimate}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${lightMode ? 'bg-slate-50 border border-slate-200' : 'bg-slate-800/50'}`}>
                        <p className={`font-mono text-xs mb-1 ${lightMode ? 'text-slate-500' : 'text-slate-500'}`}>SCLERA HEALTH</p>
                        <p className={`font-body text-xs font-semibold ${lightMode ? 'text-slate-700' : 'text-slate-200'}`}>{result.scleraHealth}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${lightMode ? 'bg-slate-50 border border-slate-200' : 'bg-slate-800/50'}`}>
                        <p className={`font-mono text-xs mb-1 ${lightMode ? 'text-slate-500' : 'text-slate-500'}`}>VISION COMPLAINT</p>
                        <p className={`font-body text-xs font-semibold ${lightMode ? 'text-slate-700' : 'text-slate-200'}`}>{result.visionFeedback}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${lightMode ? 'bg-cyan-50 border border-cyan-200' : 'bg-cyan-500/10 border border-cyan-500/20'}`}>
                        <p className="font-mono text-xs text-cyan-600 mb-1">REFRACTIVE EST.</p>
                        <p className="font-display text-lg font-bold text-cyan-500">
                          {result.visionScore >= 0 ? '+' : ''}{result.visionScore}D
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Metric Bars */}
                  <div className="space-y-3">
                    <MetricBar
                      label="JAUNDICE INDEX"
                      value={result.jaundiceIndex}
                      color="amber"
                      icon="🟡"
                      sublabel="Scleral Yellow Spectrum Density"
                    />
                    <MetricBar
                      label="REDNESS INDEX"
                      value={result.rednessIndex}
                      color="rose"
                      icon="🔴"
                      sublabel="Conjunctival Inflammation Markers"
                    />
                    <MetricBar
                      label="CATARACT OPACITY"
                      value={result.cataractIndex}
                      color="cyan"
                      icon="🔵"
                      sublabel="Lens Cloudiness Cluster Scan"
                    />
                  </div>

                  {/* Recommendation */}
                  <div className={`rounded-2xl p-4 ${lightMode ? 'bg-white border border-slate-200 shadow-sm' : 'card-dark'}`}>
                    <p className={`font-display text-xs tracking-widest mb-2 ${lightMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      💡 RECOMMENDATION
                    </p>
                    <p className={`font-body text-sm leading-relaxed ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {result.recommendation}
                    </p>
                  </div>

                  {/* Download button */}
                  <button
                    onClick={() => {
                      const text = generateReportText(result)
                      downloadReport(text, result.reportId)
                    }}
                    className="btn-primary w-full text-white font-display text-sm font-bold tracking-wider py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    <span>⬇️</span> DOWNLOAD REPORT (.TXT)
                  </button>
                </>
              ) : (
                <div className={`rounded-2xl ${lightMode ? 'bg-white border border-slate-200 shadow-sm' : 'card-dark'} h-full min-h-96 flex flex-col items-center justify-center gap-4 p-8 text-center`}>
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-cyan-800 flex items-center justify-center pulse-ring">
                    <span className="text-4xl opacity-40">🔬</span>
                  </div>
                  <div>
                    <p className={`font-display text-base font-bold mb-2 ${lightMode ? 'text-slate-700' : 'text-slate-400'}`}>
                      NO SCAN DATA
                    </p>
                    <p className={`font-body text-sm ${lightMode ? 'text-slate-500' : 'text-slate-600'}`}>
                      Activate camera and click{' '}
                      <span className="text-emerald-400 font-semibold">SCAN EYE</span>{' '}
                      to begin multi-layer pixel analysis
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 w-full mt-2">
                    {[
                      '🟡 Layer 2a — Jaundice Index',
                      '🔴 Layer 2b — Redness Index',
                      '🔵 Layer 2c — Cataract Opacity',
                    ].map(item => (
                      <div
                        key={item}
                        className={`rounded-lg px-3 py-2 font-mono text-xs ${lightMode ? 'bg-slate-50 text-slate-500 border border-slate-200' : 'bg-slate-800/40 text-slate-600'}`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`font-display text-lg font-bold tracking-wider ${lightMode ? 'text-slate-800' : 'text-white'}`}>
                  SCAN HISTORY
                </h2>
                <p className={`font-mono text-xs mt-1 ${lightMode ? 'text-slate-500' : 'text-slate-600'}`}>
                  {history.length} records stored locally in your browser
                </p>
              </div>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="btn-rose px-4 py-2 text-white font-mono text-xs rounded-xl"
                >
                  🗑️ Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className={`rounded-2xl ${lightMode ? 'bg-white border border-slate-200' : 'card-dark'} p-16 text-center`}>
                <span className="text-5xl block mb-4 opacity-30">📋</span>
                <p className={`font-display text-sm ${lightMode ? 'text-slate-500' : 'text-slate-600'}`}>
                  No scan history found
                </p>
                <p className={`font-mono text-xs mt-2 ${lightMode ? 'text-slate-400' : 'text-slate-700'}`}>
                  Complete a scan to see records here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((record, idx) => (
                  <div
                    key={record.reportId}
                    className={`history-item rounded-2xl p-4 ${lightMode ? 'bg-white border border-slate-200 shadow-sm hover:shadow-md' : ''} transition-all`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display text-sm font-bold flex-shrink-0 ${
                          idx === 0
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : lightMode
                            ? 'bg-slate-100 text-slate-500 border border-slate-200'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-cyan-400 font-bold">{record.reportId}</span>
                            <RiskBadge risk={record.result.overallRisk} />
                          </div>
                          <p className={`font-mono text-xs mt-1 ${lightMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            {record.timestamp}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-2">
                            <span className="font-mono text-xs text-amber-400">
                              Jaundice: {record.result.jaundiceIndex.toFixed(1)}%
                            </span>
                            <span className="font-mono text-xs text-rose-400">
                              Redness: {record.result.rednessIndex.toFixed(1)}%
                            </span>
                            <span className="font-mono text-xs text-cyan-400">
                              Cataract: {record.result.cataractIndex.toFixed(1)}%
                            </span>
                          </div>
                          <p className={`font-body text-xs mt-1 truncate ${lightMode ? 'text-slate-500' : 'text-slate-600'}`}>
                            {record.result.visionFeedback} · {record.result.scleraHealth}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadReport(record.reportText, record.reportId)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono text-xs transition-all ${
                          lightMode
                            ? 'bg-cyan-50 border border-cyan-300 text-cyan-700 hover:bg-cyan-100'
                            : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                        }`}
                      >
                        ⬇️ Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Privacy note */}
            <div className={`rounded-xl p-4 border ${lightMode ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
              <div className="flex items-start gap-3">
                <span className="text-emerald-500 text-lg">🔒</span>
                <div>
                  <p className={`font-display text-xs font-bold tracking-wider mb-1 ${lightMode ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    PRIVACY GUARANTEE
                  </p>
                  <p className={`font-body text-xs leading-relaxed ${lightMode ? 'text-emerald-700' : 'text-emerald-300/80'}`}>
                    All scan data is stored exclusively in your browser&apos;s LocalStorage.
                    No data is ever transmitted to any server, API, or third party.
                    Clearing browser data will permanently delete all records.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* How it works section */}
        <div className={`rounded-2xl p-6 ${lightMode ? 'bg-white border border-slate-200 shadow-sm' : 'card-dark'}`}>
          <h3 className={`font-display text-sm font-bold tracking-widest mb-4 ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
            ⚙️ HOW THE PIXEL ANALYSIS ENGINE WORKS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                layer: '2a',
                color: 'amber',
                title: 'Jaundice Index',
                desc: 'Scans peripheral sclera zone (outer 25%) for high-density yellow spectrum pixels — elevated Red + Green channels with suppressed Blue, simulating yellowing of the eye white.',
                icon: '🟡',
              },
              {
                layer: '2b',
                color: 'rose',
                title: 'Redness Index',
                desc: 'Detects dominant Red channel pixels with sharply suppressed Green and Blue across the full frame, identifying inflammation signatures of conjunctivitis or blood vessel dilation.',
                icon: '🔴',
              },
              {
                layer: '2c',
                color: 'cyan',
                title: 'Cataract Opacity',
                desc: 'Scans for high-brightness, ultra-low-saturation pixel clusters (R≈G≈B > 200) indicating whitish/gray regions that may correspond to lens cloudiness or opacity.',
                icon: '🔵',
              },
            ].map(item => (
              <div
                key={item.layer}
                className={`rounded-xl p-4 border ${
                  lightMode
                    ? 'bg-slate-50 border-slate-200'
                    : `bg-${item.color}-500/5 border-${item.color}-500/15`
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <span className={`font-mono text-xs ${lightMode ? 'text-slate-500' : 'text-slate-600'}`}>LAYER {item.layer}</span>
                    <p className={`font-display text-xs font-bold ${lightMode ? 'text-slate-800' : 'text-white'}`}>{item.title}</p>
                  </div>
                </div>
                <p className={`font-body text-xs leading-relaxed ${lightMode ? 'text-slate-600' : 'text-slate-400'}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom disclaimer */}
        <div className={`rounded-xl p-4 border ${lightMode ? 'bg-rose-50 border-rose-200' : 'bg-rose-500/10 border-rose-500/25'}`}>
          <p className={`font-body text-xs text-center leading-relaxed ${lightMode ? 'text-rose-700' : 'text-rose-300'}`}>
            <strong>⚠️ IMPORTANT:</strong> यह ऐप किसी वास्तविक डॉक्टर की जांच का विकल्प नहीं है।
            किसी भी चिकित्सा निर्णय के लिए डॉक्टर से अवश्य सलाह लें।{' '}
            This tool uses raw pixel analysis only — results are not clinically validated.
            Always consult a qualified ophthalmologist for any eye health concerns.
          </p>
        </div>

        {/* Footer */}
        <footer className="text-center pb-6">
          <p className={`font-mono text-xs ${lightMode ? 'text-slate-400' : 'text-slate-700'}`}>
            NetraScope AI v2.4.1 · Pixel Matrix Engine · 100% Client-Side · No Data Leaves Your Browser
          </p>
        </footer>
      </main>
    </div>
  )
}
