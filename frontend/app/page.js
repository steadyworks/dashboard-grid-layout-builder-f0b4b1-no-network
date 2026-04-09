'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────
const CELL_HEIGHT = 80
const DEFAULT_COL_SPAN = 4
const DEFAULT_ROW_SPAN = 2
const MIN_COL_SPAN = 2
const MIN_ROW_SPAN = 1
const MAX_COLS = 12
const LS_KEY = 'dashboard-layout-v1'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hasOverlap(widgets, col, row, colSpan, rowSpan, excludeId) {
  return widgets
    .filter(w => w.id !== excludeId)
    .some(w =>
      col < w.col + w.colSpan &&
      col + colSpan > w.col &&
      row < w.row + w.rowSpan &&
      row + rowSpan > w.row
    )
}

function findFreePosition(widgets, colSpan, rowSpan, maxCols = MAX_COLS) {
  const maxRow = widgets.length > 0
    ? Math.max(...widgets.map(w => w.row + w.rowSpan - 1))
    : 0

  for (let row = 1; row <= maxRow + rowSpan; row++) {
    for (let col = 1; col <= maxCols - colSpan + 1; col++) {
      if (!hasOverlap(widgets, col, row, colSpan, rowSpan, null)) {
        return { col, row }
      }
    }
  }
  return { col: 1, row: maxRow + 1 }
}

function clampCol(col, colSpan, maxCols) {
  return Math.max(1, Math.min(maxCols - colSpan + 1, col))
}

function gridRows(widgets) {
  if (!widgets.length) return 4
  return Math.max(4, Math.max(...widgets.map(w => w.row + w.rowSpan - 1)))
}

// ─── Default configs ──────────────────────────────────────────────────────────
function defaultConfig(type) {
  switch (type) {
    case 'counter':    return { label: 'Count', value: '0' }
    case 'bar-chart':  return { data: 'Jan:10,Feb:20,Mar:15' }
    case 'text':       return { content: 'Hello **world**! This is _italic_.' }
    case 'table':      return { data: 'Name,Value\nFoo,100\nBar,200' }
    default:           return {}
  }
}

// ─── Widget content renderers ─────────────────────────────────────────────────
function CounterContent({ config }) {
  const label = config.label || 'Count'
  const value = config.value || '0'
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:4 }}>
      <div style={{ fontSize:32, fontWeight:700, color:'#4f46e5' }}>{value}</div>
      <div style={{ fontSize:13, color:'#666' }}>{label}: {value}</div>
    </div>
  )
}

function BarChartContent({ config }) {
  const raw = config.data || 'A:1'
  const pairs = raw.split(',').map(s => {
    const [label, val] = s.split(':')
    return { label: (label||'').trim(), val: parseFloat(val) || 0 }
  }).filter(p => p.label)
  const maxVal = Math.max(...pairs.map(p => p.val), 1)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:'8px 8px 4px' }}>
      <svg viewBox={`0 0 ${Math.max(pairs.length * 40, 120)} 80`} style={{ flex:1, overflow:'visible' }}>
        {pairs.map((p, i) => {
          const barH = Math.max(2, (p.val / maxVal) * 70)
          const x = i * 40 + 10
          return (
            <g key={i} className="bar">
              <rect
                className="bar"
                x={x} y={80 - barH - 12}
                width={28} height={barH}
                fill="#4f46e5" rx={3}
                data-label={p.label}
              />
              <text x={x + 14} y={80 - 2} textAnchor="middle" fontSize={9} fill="#666">{p.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function parseSimpleMd(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
}

function TextContent({ config }) {
  const html = parseSimpleMd(config.content || '')
  return (
    <div
      style={{ padding:'8px 12px', fontSize:13, lineHeight:1.6, overflow:'auto', height:'100%' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function TableContent({ config }) {
  const rows = (config.data || 'Name,Value\nFoo,1').split('\n').map(r => r.split(','))
  const [header, ...body] = rows
  return (
    <div style={{ overflow:'auto', height:'100%', padding:4 }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr>{(header||[]).map((h,i) => (
            <th key={i} style={{ padding:'4px 8px', background:'#4f46e5', color:'#fff', textAlign:'left', fontSize:11 }}>{h.trim()}</th>
          ))}</tr>
        </thead>
        <tbody>
          {body.map((row,ri) => (
            <tr key={ri} style={{ background: ri%2===0?'#f9f9f9':'#fff' }}>
              {row.map((cell,ci) => (
                <td key={ci} style={{ padding:'3px 8px', borderBottom:'1px solid #eee' }}>{cell.trim()}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WidgetContent({ type, config }) {
  switch (type) {
    case 'counter':   return <CounterContent config={config} />
    case 'bar-chart': return <BarChartContent config={config} />
    case 'text':      return <TextContent config={config} />
    case 'table':     return <TableContent config={config} />
    default:          return <div>Unknown widget</div>
  }
}

// ─── Config Panel ─────────────────────────────────────────────────────────────
function ConfigPanel({ widget, onUpdate, onDelete }) {
  if (!widget) return null

  const { type, config } = widget

  const set = (key, val) => onUpdate({ ...config, [key]: val })

  return (
    <div
      data-testid="config-panel"
      style={{
        width:240, background:'#fff', borderLeft:'1px solid #e5e7eb',
        padding:16, display:'flex', flexDirection:'column', gap:12, overflowY:'auto'
      }}
    >
      <div style={{ fontWeight:700, fontSize:14, color:'#4f46e5', textTransform:'capitalize' }}>
        {type.replace('-', ' ')} Config
      </div>

      {type === 'counter' && (
        <>
          <label style={labelStyle}>
            <span>Label</span>
            <input
              data-field="label"
              placeholder="label"
              name="label"
              value={config.label || ''}
              onChange={e => set('label', e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span>Value</span>
            <input
              data-field="value"
              placeholder="value"
              name="value"
              value={config.value || ''}
              onChange={e => set('value', e.target.value)}
              style={inputStyle}
            />
          </label>
        </>
      )}

      {type === 'bar-chart' && (
        <label style={labelStyle}>
          <span>Data (label:value,...)</span>
          <input
            data-field="data"
            placeholder="data (e.g. Jan:10,Feb:20)"
            name="data"
            value={config.data || ''}
            onChange={e => set('data', e.target.value)}
            style={inputStyle}
          />
        </label>
      )}

      {type === 'text' && (
        <label style={labelStyle}>
          <span>Content</span>
          <textarea
            data-field="content"
            placeholder="content"
            name="content"
            value={config.content || ''}
            onChange={e => set('content', e.target.value)}
            style={{ ...inputStyle, height:80, resize:'vertical' }}
          />
        </label>
      )}

      {type === 'table' && (
        <label style={labelStyle}>
          <span>Data (CSV, first row = headers)</span>
          <textarea
            data-field="data"
            placeholder="data"
            name="data"
            value={config.data || ''}
            onChange={e => set('data', e.target.value)}
            style={{ ...inputStyle, height:100, resize:'vertical' }}
          />
        </label>
      )}

      <button
        data-testid="delete-btn"
        onClick={onDelete}
        style={{
          marginTop:8, padding:'8px 12px', background:'#ef4444', color:'#fff',
          border:'none', borderRadius:6, cursor:'pointer', fontWeight:600
        }}
      >
        Delete Widget
      </button>
    </div>
  )
}

const labelStyle = {
  display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'#555'
}
const inputStyle = {
  padding:'6px 8px', border:'1px solid #d1d5db', borderRadius:6,
  fontSize:12, outline:'none', background:'#fafafa'
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [widgets, setWidgets] = useState([])
  const [nextId, setNextId] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [previewMode, setPreviewMode] = useState('desktop')
  const [layoutJson, setLayoutJson] = useState('')
  const [showOverlap, setShowOverlap] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const gridRef = useRef(null)
  const overlapTimerRef = useRef(null)
  const dragRef = useRef(null)
  const resizeRef = useRef(null)
  const gsapRef = useRef(null)

  // Load GSAP on client
  useEffect(() => {
    import('gsap').then(m => { gsapRef.current = m.gsap || m.default })
  }, [])

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.widgets) setWidgets(parsed.widgets)
        if (parsed.nextId) setNextId(parsed.nextId)
      }
    } catch {}
    setHydrated(true)
  }, [])

  // Persist on change
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(LS_KEY, JSON.stringify({ widgets, nextId }))
  }, [widgets, nextId, hydrated])

  // Flash overlap error
  const triggerOverlapError = useCallback(() => {
    setShowOverlap(true)
    clearTimeout(overlapTimerRef.current)
    overlapTimerRef.current = setTimeout(() => setShowOverlap(false), 1500)
  }, [])

  // Cell dimensions
  const getCellWidth = useCallback(() => {
    if (!gridRef.current) return 80
    return gridRef.current.getBoundingClientRect().width / MAX_COLS
  }, [])

  // Add widget
  const addWidget = useCallback((type) => {
    setWidgets(prev => {
      const pos = findFreePosition(prev, DEFAULT_COL_SPAN, DEFAULT_ROW_SPAN)
      const id = nextId
      const newWidget = {
        id,
        type,
        col: pos.col,
        row: pos.row,
        colSpan: DEFAULT_COL_SPAN,
        rowSpan: DEFAULT_ROW_SPAN,
        config: defaultConfig(type)
      }
      setNextId(n => n + 1)
      // Animate in with GSAP after render
      setTimeout(() => {
        const gsap = gsapRef.current
        if (!gsap) return
        const el = document.querySelector(`[data-testid="widget-${id}"]`)
        if (el) gsap.fromTo(el, { opacity:0, scale:0.85 }, { opacity:1, scale:1, duration:0.3, ease:'back.out(1.5)' })
      }, 30)
      return [...prev, newWidget]
    })
  }, [nextId])

  // Update widget config
  const updateConfig = useCallback((id, newConfig) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, config: newConfig } : w))
  }, [])

  // Delete widget
  const deleteWidget = useCallback((id) => {
    setWidgets(prev => prev.filter(w => w.id !== id))
    setSelectedId(null)
  }, [])

  // Clear all
  const clearAll = useCallback(() => {
    setWidgets([])
    setSelectedId(null)
    setPreviewMode('desktop')
    setLayoutJson('')
    setNextId(1)
  }, [])

  // Export
  const exportLayout = useCallback(() => {
    setLayoutJson(JSON.stringify({ widgets, nextId }, null, 2))
  }, [widgets, nextId])

  // Import
  const importLayout = useCallback(() => {
    try {
      const parsed = JSON.parse(layoutJson)
      if (parsed.widgets) {
        setWidgets(parsed.widgets)
        setNextId(parsed.nextId || (Math.max(0, ...parsed.widgets.map(w => w.id)) + 1))
        setSelectedId(null)
      }
    } catch (e) {
      alert('Invalid JSON layout')
    }
  }, [layoutJson])

  // ─── Drag ───────────────────────────────────────────────────────────────────
  const startDrag = useCallback((e, widgetId) => {
    e.preventDefault()
    e.stopPropagation()
    const widget = widgets.find(w => w.id === widgetId)
    if (!widget) return

    const cellWidth = getCellWidth()
    dragRef.current = {
      widgetId,
      origCol: widget.col,
      origRow: widget.row,
      startX: e.clientX,
      startY: e.clientY,
      cellWidth,
    }

    const el = document.querySelector(`[data-testid="widget-${widgetId}"]`)
    if (el) el.style.zIndex = '1000'
  }, [widgets, getCellWidth])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return
      const { widgetId, startX, startY } = dragRef.current
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const el = document.querySelector(`[data-testid="widget-${widgetId}"]`)
      if (el) {
        el.style.transform = `translate(${dx}px,${dy}px)`
        el.style.opacity = '0.85'
      }
    }

    const onUp = (e) => {
      if (!dragRef.current) return
      const { widgetId, origCol, origRow, startX, startY, cellWidth } = dragRef.current
      dragRef.current = null

      const widget = widgets.find(w => w.id === widgetId)
      if (!widget) return

      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const colOffset = Math.round(dx / cellWidth)
      const rowOffset = Math.round(dy / CELL_HEIGHT)
      const newCol = clampCol(origCol + colOffset, widget.colSpan, MAX_COLS)
      const newRow = Math.max(1, origRow + rowOffset)

      const el = document.querySelector(`[data-testid="widget-${widgetId}"]`)

      if (!hasOverlap(widgets, newCol, newRow, widget.colSpan, widget.rowSpan, widgetId)) {
        // Accept
        if (el) {
          el.style.transform = ''
          el.style.opacity = ''
          el.style.zIndex = ''
        }
        setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, col: newCol, row: newRow } : w))
      } else {
        // Reject — spring back
        triggerOverlapError()
        const gsap = gsapRef.current
        if (el) {
          if (gsap) {
            gsap.fromTo(el,
              { x: dx, y: dy, opacity: 0.85 },
              { x: 0, y: 0, opacity: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)',
                onComplete: () => { el.style.transform = ''; el.style.zIndex = '' }
              }
            )
          } else {
            el.style.transform = ''
            el.style.opacity = ''
            el.style.zIndex = ''
          }
        }
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [widgets, triggerOverlapError])

  // ─── Resize ──────────────────────────────────────────────────────────────────
  const startResize = useCallback((e, widgetId) => {
    e.preventDefault()
    e.stopPropagation()
    const widget = widgets.find(w => w.id === widgetId)
    if (!widget) return

    const cellWidth = getCellWidth()
    resizeRef.current = {
      widgetId,
      origColSpan: widget.colSpan,
      origRowSpan: widget.rowSpan,
      startX: e.clientX,
      startY: e.clientY,
      cellWidth,
    }
  }, [widgets, getCellWidth])

  useEffect(() => {
    const onMove = (e) => {
      if (!resizeRef.current) return
      const { widgetId, origColSpan, origRowSpan, startX, startY, cellWidth } = resizeRef.current
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const newColSpan = Math.max(MIN_COL_SPAN, Math.min(MAX_COLS, origColSpan + Math.round(dx / cellWidth)))
      const newRowSpan = Math.max(MIN_ROW_SPAN, origRowSpan + Math.round(dy / CELL_HEIGHT))

      const el = document.querySelector(`[data-testid="widget-${widgetId}"]`)
      if (el) {
        const widget = widgets.find(w => w.id === widgetId)
        if (!widget) return
        const clampedColSpan = Math.min(newColSpan, MAX_COLS - widget.col + 1)
        el.style.width = `${clampedColSpan * cellWidth}px`
        el.style.height = `${newRowSpan * CELL_HEIGHT}px`
      }
    }

    const onUp = (e) => {
      if (!resizeRef.current) return
      const { widgetId, origColSpan, origRowSpan, startX, startY, cellWidth } = resizeRef.current
      resizeRef.current = null

      const widget = widgets.find(w => w.id === widgetId)
      if (!widget) return

      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const rawColSpan = origColSpan + Math.round(dx / cellWidth)
      const rawRowSpan = origRowSpan + Math.round(dy / CELL_HEIGHT)
      const newColSpan = Math.max(MIN_COL_SPAN, Math.min(MAX_COLS - widget.col + 1, rawColSpan))
      const newRowSpan = Math.max(MIN_ROW_SPAN, rawRowSpan)

      const el = document.querySelector(`[data-testid="widget-${widgetId}"]`)

      if (!hasOverlap(widgets, widget.col, widget.row, newColSpan, newRowSpan, widgetId)) {
        if (el) { el.style.width = ''; el.style.height = '' }
        setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, colSpan: newColSpan, rowSpan: newRowSpan } : w))
      } else {
        triggerOverlapError()
        const gsap = gsapRef.current
        if (el) {
          if (gsap) {
            const tw = origColSpan * cellWidth
            const th = origRowSpan * CELL_HEIGHT
            gsap.to(el, {
              width: tw, height: th, duration: 0.4, ease: 'elastic.out(1, 0.5)',
              onComplete: () => { el.style.width = ''; el.style.height = '' }
            })
          } else {
            el.style.width = ''
            el.style.height = ''
          }
        }
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [widgets, triggerOverlapError])

  // ─── Effective span for preview modes ────────────────────────────────────────
  function effectiveColSpan(widget) {
    if (previewMode === 'tablet') return Math.min(widget.colSpan, 8)
    if (previewMode === 'mobile') return Math.min(widget.colSpan, 4)
    return widget.colSpan
  }

  if (!hydrated) return null

  const numRows = gridRows(widgets) + 2
  const selectedWidget = widgets.find(w => w.id === selectedId) || null

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
      {/* Toolbar */}
      <div
        data-testid="preview-panel"
        style={{
          display:'flex', alignItems:'center', gap:8, padding:'8px 16px',
          background:'#1a1a2e', color:'#fff', flexShrink:0, flexWrap:'wrap'
        }}
      >
        <span style={{ fontWeight:700, fontSize:15, marginRight:8 }}>Dashboard Builder</span>

        <div style={{ display:'flex', gap:4 }}>
          {['desktop','tablet','mobile'].map(m => (
            <button
              key={m}
              data-testid={`preview-${m}`}
              onClick={() => setPreviewMode(m)}
              style={{
                padding:'4px 10px', border:'none', borderRadius:5, cursor:'pointer',
                background: previewMode === m ? '#4f46e5' : '#374151',
                color:'#fff', fontSize:12, fontWeight:600
              }}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ marginLeft:'auto', display:'flex', gap:6, flexWrap:'wrap' }}>
          <button
            data-testid="export-btn"
            onClick={exportLayout}
            style={toolBtnStyle}
          >Export</button>
          <button
            data-testid="import-btn"
            onClick={importLayout}
            style={toolBtnStyle}
          >Import</button>
          <button
            data-testid="clear-all-btn"
            onClick={clearAll}
            style={{ ...toolBtnStyle, background:'#dc2626' }}
          >Clear All</button>
        </div>
      </div>

      {/* Layout JSON output */}
      <textarea
        data-testid="layout-output"
        value={layoutJson}
        onChange={e => setLayoutJson(e.target.value)}
        placeholder='Paste JSON here to import, or click Export to fill...'
        style={{
          width:'100%', height:60, resize:'vertical', padding:'6px 12px',
          fontFamily:'monospace', fontSize:11, border:'none', borderBottom:'1px solid #e5e7eb',
          background:'#f8f9fa', outline:'none', flexShrink:0
        }}
      />

      {/* Main area */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* Palette */}
        <div
          data-testid="palette"
          style={{
            width:160, background:'#fff', borderRight:'1px solid #e5e7eb',
            padding:12, display:'flex', flexDirection:'column', gap:8, overflowY:'auto', flexShrink:0
          }}
        >
          <div style={{ fontWeight:700, fontSize:12, color:'#9ca3af', letterSpacing:1, marginBottom:4 }}>WIDGETS</div>
          {[
            { type:'counter',   testid:'palette-counter',   label:'Counter' },
            { type:'bar-chart', testid:'palette-bar-chart', label:'Bar Chart' },
            { type:'text',      testid:'palette-text',      label:'Text Block' },
            { type:'table',     testid:'palette-table',     label:'Table' },
          ].map(item => (
            <button
              key={item.type}
              data-testid={item.testid}
              onClick={() => addWidget(item.type)}
              style={paletteBtnStyle}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Grid area */}
        <div style={{ flex:1, overflow:'auto', position:'relative' }}>
          {showOverlap && (
            <div
              data-testid="overlap-error"
              style={{
                position:'fixed', top:80, left:'50%', transform:'translateX(-50%)',
                background:'#ef4444', color:'#fff', padding:'8px 20px',
                borderRadius:8, fontWeight:600, fontSize:13, zIndex:9999,
                boxShadow:'0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              Cannot overlap widgets!
            </div>
          )}

          <div
            ref={gridRef}
            data-testid="grid"
            style={{
              position:'relative',
              width:'100%',
              minHeight: numRows * CELL_HEIGHT,
              backgroundImage: `
                linear-gradient(rgba(79,70,229,0.07) 1px, transparent 1px),
                linear-gradient(90deg, rgba(79,70,229,0.07) 1px, transparent 1px)
              `,
              backgroundSize: `calc(100% / ${MAX_COLS}) ${CELL_HEIGHT}px`,
              backgroundPosition: '0 0',
            }}
            onClick={e => {
              if (e.target === gridRef.current) setSelectedId(null)
            }}
          >
            {widgets.map(widget => {
              const eColSpan = effectiveColSpan(widget)
              return (
                <GridWidget
                  key={widget.id}
                  widget={widget}
                  eColSpan={eColSpan}
                  isSelected={selectedId === widget.id}
                  onSelect={() => setSelectedId(widget.id)}
                  onDragStart={startDrag}
                  onResizeStart={startResize}
                  gridRef={gridRef}
                />
              )
            })}
          </div>
        </div>

        {/* Config Panel */}
        {selectedWidget && (
          <ConfigPanel
            widget={selectedWidget}
            onUpdate={(newConfig) => updateConfig(selectedId, newConfig)}
            onDelete={() => deleteWidget(selectedId)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Grid Widget ──────────────────────────────────────────────────────────────
function GridWidget({ widget, eColSpan, isSelected, onSelect, onDragStart, onResizeStart, gridRef }) {
  const widgetRef = useRef(null)

  const getLeft = () => {
    if (!gridRef.current) return 0
    const gridWidth = gridRef.current.getBoundingClientRect().width
    return ((widget.col - 1) / MAX_COLS) * gridWidth
  }

  const getWidth = () => {
    if (!gridRef.current) return eColSpan * 80
    const gridWidth = gridRef.current.getBoundingClientRect().width
    return (eColSpan / MAX_COLS) * gridWidth
  }

  // Use CSS grid for positioning (simpler, keeps width/height from CSS)
  return (
    <div
      ref={widgetRef}
      data-testid={`widget-${widget.id}`}
      data-col-span={eColSpan}
      data-row-span={widget.rowSpan}
      data-widget-id={widget.id}
      style={{
        position: 'absolute',
        left: `calc(${(widget.col - 1) / MAX_COLS * 100}%)`,
        top: (widget.row - 1) * CELL_HEIGHT,
        width: `calc(${eColSpan / MAX_COLS * 100}%)`,
        height: widget.rowSpan * CELL_HEIGHT,
        background: '#fff',
        border: isSelected ? '2px solid #4f46e5' : '1px solid #e5e7eb',
        borderRadius: 8,
        boxShadow: isSelected ? '0 4px 16px rgba(79,70,229,0.2)' : '0 1px 4px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'default',
        userSelect: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
    >
      {/* Header / drag handle */}
      <div
        data-testid={`header-${widget.id}`}
        className="widget-header"
        onMouseDown={(e) => onDragStart(e, widget.id)}
        style={{
          height: 28,
          background: isSelected ? '#4f46e5' : '#f3f4f6',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          cursor: 'grab',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize:11, fontWeight:600, color: isSelected ? '#fff' : '#6b7280', textTransform:'capitalize' }}>
          {widget.type.replace('-', ' ')} #{widget.id}
        </span>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          <span style={{ width:8, height:8, background: isSelected?'rgba(255,255,255,0.5)':'#d1d5db', borderRadius:'50%' }} />
          <span style={{ width:8, height:8, background: isSelected?'rgba(255,255,255,0.5)':'#d1d5db', borderRadius:'50%' }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'hidden', minHeight:0 }}>
        <WidgetContent type={widget.type} config={widget.config} />
      </div>

      {/* Resize handle */}
      <div
        data-testid={`resize-${widget.id}`}
        onMouseDown={(e) => onResizeStart(e, widget.id)}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 16,
          height: 16,
          cursor: 'nwse-resize',
          background: 'linear-gradient(135deg, transparent 40%, #d1d5db 40%)',
          borderRadius: '0 0 8px 0',
          zIndex: 10,
        }}
      />
    </div>
  )
}

// ─── Style constants ───────────────────────────────────────────────────────────
const paletteBtnStyle = {
  padding: '8px 10px',
  background: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  textAlign: 'left',
  transition: 'background 0.15s',
}

const toolBtnStyle = {
  padding: '4px 10px',
  background: '#374151',
  color: '#fff',
  border: 'none',
  borderRadius: 5,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
}
