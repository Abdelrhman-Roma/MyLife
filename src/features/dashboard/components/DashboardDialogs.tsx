import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { addWidget, WIDGETS } from '../services/dashboardService'
import type { DashboardLayout } from '../types/dashboard'

function DialogShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => { closeButton.current?.focus() }, [])
  return <div className="cdash-modal-overlay" role="presentation" onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}><button className="cdash-modal-backdrop" aria-label="Close dialog" onClick={onClose} /><section className="cdash-modal-card" role="dialog" aria-modal="true" aria-labelledby="dashboard-dialog-title"><header><h2 id="dashboard-dialog-title">{title}</h2><button ref={closeButton} className="icon-btn" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></header>{children}</section></div>
}

export function AddWidgetDialog({ layout, onChange, onClose }: { layout: DashboardLayout; onChange: (layout: DashboardLayout) => void; onClose: () => void }) {
  const visible = new Set(layout.widgets.filter((item) => !item.hidden).map((item) => item.widgetId))
  const available = WIDGETS.filter((widget) => !visible.has(widget.id))
  function add(widgetId: string) {
    onChange(addWidget(layout, widgetId))
    onClose()
  }
  return <DialogShell title="Add Widget" onClose={onClose}><div className="cdash-store-list">{available.length ? available.map((widget) => <button className="cdash-store-item" key={widget.id} onClick={() => add(widget.id)}><strong>{widget.title}</strong><span>{widget.category}</span></button>) : <p className="widget-empty-row">All widgets are visible.</p>}</div></DialogShell>
}

export function PersonalizationDialog({ layout, onChange, onClose }: { layout: DashboardLayout; onChange: (layout: DashboardLayout) => void; onClose: () => void }) {
  const update = (patch: Partial<DashboardLayout['personalization']>) => onChange({ ...layout, personalization: { ...layout.personalization, ...patch } })
  return <DialogShell title="Personalize" onClose={onClose}><label className="dialog-field">Accent color<input type="color" value={layout.personalization.accentColor || '#78b8ff'} onChange={(event) => update({ accentColor: event.target.value })} /></label><label className="dialog-field">Corner radius<select value={layout.personalization.cornerRadius} onChange={(event) => update({ cornerRadius: event.target.value as DashboardLayout['personalization']['cornerRadius'] })}><option value="sharp">Sharp</option><option value="md">Medium</option><option value="round">Round</option></select></label><label className="dialog-field">Transparency<input type="range" min="0" max="80" value={layout.personalization.transparency} onChange={(event) => update({ transparency: Number(event.target.value) })} /></label><label className="cdash-toggle-row"><span>Compact mode</span><input type="checkbox" checked={layout.personalization.compactMode} onChange={(event) => update({ compactMode: event.target.checked })} /></label><label className="cdash-toggle-row"><span>Animations</span><input type="checkbox" checked={layout.personalization.animations} onChange={(event) => update({ animations: event.target.checked })} /></label><button className="secondary-btn" onClick={onClose}>Done</button></DialogShell>
}
