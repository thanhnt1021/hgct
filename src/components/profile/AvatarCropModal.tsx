'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  file: File
  onSave: (blob: Blob) => void
  onClose: () => void
}

const SIZE = 240   // display crop area size (px)
const OUT = 200    // output JPEG size (px)

export default function AvatarCropModal({ file, onSave, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 1, h: 1 })
  const [saving, setSaving] = useState(false)
  const drag = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
      // Initial scale: fit the shorter side to SIZE
      const minSide = Math.min(img.naturalWidth, img.naturalHeight)
      const initialScale = SIZE / minSide
      setScale(initialScale)
      // Center
      setOffset({
        x: (SIZE - img.naturalWidth * initialScale) / 2,
        y: (SIZE - img.naturalHeight * initialScale) / 2,
      })
      setImgLoaded(true)
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Draw preview
  useEffect(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !imgLoaded) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.drawImage(img, offset.x, offset.y, imgNaturalSize.w * scale, imgNaturalSize.h * scale)
  }, [offset, scale, imgLoaded, imgNaturalSize])

  const clampOffset = useCallback((ox: number, oy: number, sc: number) => {
    const w = imgNaturalSize.w * sc
    const h = imgNaturalSize.h * sc
    return {
      x: Math.min(0, Math.max(SIZE - w, ox)),
      y: Math.min(0, Math.max(SIZE - h, oy)),
    }
  }, [imgNaturalSize])

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.startX
    const dy = e.clientY - drag.current.startY
    setOffset(clampOffset(drag.current.ox + dx, drag.current.oy + dy, scale))
  }
  const onPointerUp = () => { drag.current = null }

  const handleScale = (newScale: number) => {
    setScale(newScale)
    setOffset(prev => clampOffset(prev.x, prev.y, newScale))
  }

  const handleSave = async () => {
    const img = imgRef.current
    if (!img) return
    setSaving(true)
    const out = document.createElement('canvas')
    out.width = OUT; out.height = OUT
    const ctx = out.getContext('2d')!
    // Scale from display coords to output coords
    const ratio = OUT / SIZE
    ctx.drawImage(img,
      offset.x * ratio, offset.y * ratio,
      imgNaturalSize.w * scale * ratio, imgNaturalSize.h * scale * ratio
    )
    out.toBlob(blob => {
      if (blob) onSave(blob)
      setSaving(false)
    }, 'image/jpeg', 0.85)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(22,54,83,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl p-6 flex flex-col items-center gap-4"
        style={{ background: 'var(--as-surface-raised)', border: '1px solid var(--as-border-gold)', minWidth: 300, boxShadow: 'var(--as-shadow-card)' }}
      >
        <h3 className="font-bold text-base" style={{ color: 'var(--as-text-strong)', fontFamily: 'var(--font-playfair)' }}>
          Chỉnh ảnh đại diện
        </h3>
        <p className="text-xs" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)' }}>
          Kéo để điều chỉnh vị trí ảnh
        </p>

        {/* Crop area */}
        <div style={{ position: 'relative', width: SIZE, height: SIZE, borderRadius: '50%', overflow: 'hidden', cursor: 'grab', border: '2px solid var(--as-border-gold)' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{ display: 'block' }} />
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem' }}>
              Đang tải...
            </div>
          )}
        </div>

        {/* Scale slider */}
        <div className="w-full flex items-center gap-3">
          <span style={{ color: 'var(--as-text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-vietnam)' }}>Thu</span>
          <input
            type="range" min={0.5} max={3} step={0.01}
            value={scale}
            onChange={e => handleScale(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--as-cta)' }}
          />
          <span style={{ color: 'var(--as-text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-vietnam)' }}>Phóng</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 w-full">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'transparent', color: 'var(--as-text-strong)', border: '1px solid var(--as-border-gold)', fontFamily: 'var(--font-vietnam)' }}>
            Hủy
          </button>
          <button onClick={handleSave} disabled={!imgLoaded || saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: imgLoaded ? 'var(--as-cta)' : 'rgba(22,54,83,0.12)', color: imgLoaded ? 'var(--as-text-on-dark)' : 'var(--as-text-muted)', fontFamily: 'var(--font-vietnam)', boxShadow: imgLoaded ? 'var(--as-shadow-glow)' : 'none' }}>
            {saving ? 'Đang lưu...' : 'Lưu ảnh'}
          </button>
        </div>
      </div>
    </div>
  )
}
