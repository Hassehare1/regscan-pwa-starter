import React, { useEffect, useRef, useState } from 'react'
import Tesseract from 'tesseract.js'

export default function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [streamErr, setStreamErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [reg, setReg] = useState('')
  const [ocrLog, setOcrLog] = useState([])
  const [admin, setAdmin] = useState(false)
  const [visits, setVisits] = useState(0)

  // Admin-läge via #admin i URL:en, med enkel besöksräknare
  useEffect(() => {
    if (window.location.hash.includes('admin')) {
      setAdmin(true)
      const v = (parseInt(localStorage.getItem('visits') || '0', 10) + 1)
      localStorage.setItem('visits', String(v))
      setVisits(v)
    }
  }, [])

  // Starta kameran
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (e) {
        setStreamErr('Kunde inte få kameratillgång. Tillåt kamera i webbläsaren på denna sida (https).')
      }
    })()
  }, [])

  const captureAndOCR = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setBusy(true)
    setOcrLog(l => ['Tar bild…', ...l])

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      // Rita upp hela videobilden
      const w = (canvas.width = video.videoWidth || 1280)
      const h = (canvas.height = video.videoHeight || 720)
      ctx.drawImage(video, 0, 0, w, h)

      // Plocka ut ett horisontellt band i mitten där skylten troligen är
      const bandH = Math.floor(h * 0.35)
      const bandY = Math.floor((h - bandH) / 2)
      const band = ctx.getImageData(0, bandY, w, bandH)

      // Lägg bandet i en temporär canvas
      const t = document.createElement('canvas')
      t.width = w
      t.height = bandH
      const tctx = t.getContext('2d')
      tctx.putImageData(band, 0, 0)

      // Förstora och thresholda bilden för bättre OCR
      setOcrLog(l => ['Förstorar och rensar bilden före OCR…', ...l])

      const scale = 2 // testa 2–3 vid behov
      const big = document.createElement('canvas')
      big.width = t.width * scale
      big.height = t.height * scale
      const bigCtx = big.getContext('2d')

      bigCtx.imageSmoothingEnabled = false
      bigCtx.drawImage(t, 0, 0, big.width, big.height)

      // Enkel gråskala + threshold
      const imgData = bigCtx.getImageData(0, 0, big.width, big.height)
      const d = imgData.data
      for (let i = 0; i < d.length; i += 4) {
        const avg = (d[i] + d[i + 1] + d[i + 2]) / 3
        const v = avg > 140 ? 255 : 0 // justera 140 om det behövs
        d[i] = d[i + 1] = d[i + 2] = v
      }
      bigCtx.putImageData(imgData, 0, 0)

      setOcrLog(l => ['Kör OCR på förstorad, renad bild…', ...l])

      const { data: { text } } = await Tesseract.recognize(
        big.toDataURL('image/png'),
        'eng',
        {
          logger: (m) => {
            if (m.status) {
              setOcrLog(l => [
                `${m.status} ${m.progress ? Math.round(m.progress * 100) + '%' : ''}`,
                ...l
              ])
            }
          }
        }
      )

      // Regskylt-läge: bara A–Z och 0–9, 3–8 tecken
      const raw = text.toUpperCase().replace(/[^A-Z0-9]/g, '')
      const plausible = raw.match(/[A-Z0-9]{3,8}/g)?.[0] || ''

      setReg(plausible)
      setOcrLog(l => [
        `OCR klar. Råtext: "${text.replace(/\s+/g, ' ')}" → rensat: "${raw}" → valt: "${plausible || '(inget)'}"`,
        ...l
      ])
    } catch (e) {
      setOcrLog(l => [`Fel i OCR: ${e?.message || String(e)}`, ...l])
    } finally {
      setBusy(false)
    }
  }

  const smsHref = reg ? `sms:71640?body=${encodeURIComponent(reg)}` : null

  return (
    <div className="wrap">
      <header className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="pill">RegScan PWA</span>
        <span className="muted">Kamera → OCR → SMS till 71640</span>
      </header>

      <div className="grid">
        <section className="card">
          <h2>Skanna registreringsskylt</h2>
          {streamErr && <div className="muted">{streamErr}</div>}
          <video ref={videoRef} autoPlay playsInline muted />
          <div className="row" style={{ marginTop: 10 }}>
            <button onClick={captureAndOCR} disabled={busy}>Ta bild &amp; kör OCR</button>
            <button onClick={() => setReg('')} disabled={busy}>Rensa</button>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </section>

        <section className="card">
          <h2>Resultat</h2>
          <label className="muted">Upptäckt regnr (kan redigeras):</label>
          <input
            value={reg}
            onChange={e => setReg(e.target.value.toUpperCase())}
            placeholder="ABC123"
          />
          <div className="row" style={{ marginTop: 10 }}>
            <a
              className="btn"
              href={smsHref || '#'}
              onClick={(e) => { if (!smsHref) e.preventDefault() }}
            >
              <button disabled={!smsHref}>Öppna SMS till 71640</button>
            </a>
            <span className="muted">SMS öppnas i telefonens app – tryck “Skicka”.</span>
          </div>

          <div className="footer">
            <div>Integritet: Regnr lagras inte på server. All OCR sker i din webbläsare.</div>
            <div>Tips: Lägg till sidan på hemskärmen för riktig app-känsla.</div>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <h3>OCR-logg</h3>
        <div className="muted">
          {ocrLog.length === 0
            ? 'Ingen logg ännu.'
            : (
              <ul>
                {ocrLog.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            )}
        </div>
      </section>

      {admin && (
        <section className="card" style={{ marginTop: 12 }}>
          <h3>Admin</h3>
          <div className="muted">Besöksräknare (endast localStorage): {visits}</div>
          <div className="muted">Öppna sidan med <code>#admin</code> i URL:en för att se detta.</div>
        </section>
      )}
    </div>
  )
}
