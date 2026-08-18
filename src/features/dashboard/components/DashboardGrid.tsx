import { useState } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DashboardCollections, DashboardLayout, DashboardRecord, WidgetPlacement } from '../types/dashboard'
import { DashboardWidget } from './DashboardWidget'
import { AddWidgetDialog, PersonalizationDialog } from './DashboardDialogs'
import { reorderWidgets, updateWidget } from '../services/dashboardService'

export function DashboardGrid({ uid, data, profile, layout, onChange }: { uid: string; data: DashboardCollections; profile: DashboardRecord | null; layout: DashboardLayout; onChange: (layout: DashboardLayout) => void }) {
  const [dialog, setDialog] = useState<'add' | 'personalize' | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const placements = layout.widgets.filter((item) => !item.hidden).sort((a, b) => a.order - b.order)
  function update(widgetId: string, patch: Partial<WidgetPlacement>) { onChange(updateWidget(layout, widgetId, patch)) }
  function onDragEnd(event: DragEndEvent) { if (!event.over || event.active.id === event.over.id) return; onChange(reorderWidgets(layout, String(event.active.id), String(event.over.id))) }
  const style = { '--cdash-radius': layout.personalization.cornerRadius === 'sharp' ? '4px' : layout.personalization.cornerRadius === 'round' ? '20px' : '12px', '--cdash-opacity': String(1 - layout.personalization.transparency / 100), '--cdash-accent': layout.personalization.accentColor || 'var(--blue)' } as React.CSSProperties
  return <section className={`cdash-root${layout.personalization.compactMode ? ' cdash-compact' : ''}${layout.personalization.animations ? '' : ' cdash-no-animations'}`} style={style} aria-label="Custom dashboard">
    <div className="cdash-toolbar"><div className="cdash-quick-actions"><Link to="/todos" className="secondary-btn">Quick Add Todo</Link><Link to="/habits" className="secondary-btn">Quick Habit</Link><Link to="/goals" className="secondary-btn">Quick Goal</Link></div><div className="cdash-toolbar-actions"><button className="secondary-btn" onClick={() => setDialog('add')}><Plus size={17} />Add Widget</button><button className="text-btn" onClick={() => setDialog('personalize')}><SlidersHorizontal size={17} />Personalize</button></div></div>
    {placements.length ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={placements.map((item) => item.widgetId)}><div className="cdash-grid">{placements.map((placement) => <DashboardWidget key={placement.widgetId} placement={placement} uid={uid} data={data} profile={profile} onUpdate={(patch) => update(placement.widgetId, patch)} />)}</div></SortableContext></DndContext> : <div className="cdash-onboarding"><p className="eyebrow">Your dashboard is empty</p><h3>Add a widget to get started</h3><button className="secondary-btn" onClick={() => setDialog('add')}><Plus size={17} />Add Widget</button></div>}
    {dialog === 'add' && <AddWidgetDialog layout={layout} onChange={onChange} onClose={() => setDialog(null)} />}{dialog === 'personalize' && <PersonalizationDialog layout={layout} onChange={onChange} onClose={() => setDialog(null)} />}
  </section>
}
