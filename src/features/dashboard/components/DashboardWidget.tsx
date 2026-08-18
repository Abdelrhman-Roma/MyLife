import { ChevronDown, ChevronUp, EyeOff, GripVertical, Maximize2, Pin } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DashboardCollections, DashboardRecord, WidgetPlacement } from '../types/dashboard'
import { WIDGETS } from '../services/dashboardService'
import { WidgetContent } from './WidgetContent'

export function DashboardWidget({ placement, uid, data, profile, onUpdate }: { placement: WidgetPlacement; uid: string; data: DashboardCollections; profile: DashboardRecord | null; onUpdate: (patch: Partial<WidgetPlacement>) => void }) {
  const definition = WIDGETS.find((widget) => widget.id === placement.widgetId)
  const sortable = useSortable({ id: placement.widgetId })
  if (!definition) return null
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }
  const nextSize = () => { const index = definition.allowedSizes.indexOf(placement.size); onUpdate({ size: definition.allowedSizes[(index + 1) % definition.allowedSizes.length] }) }
  return <article ref={sortable.setNodeRef} style={style} className={`cdash-widget cdash-size-${placement.size}${placement.pinned ? ' is-pinned' : ''}${placement.collapsed ? ' is-collapsed' : ''}${sortable.isDragging ? ' is-dragging' : ''}`}>
    <header className="cdash-widget-head"><button className="widget-drag-handle" aria-label={`Move ${definition.title}`} {...sortable.attributes} {...sortable.listeners}><GripVertical size={17} /></button><h3>{definition.title}</h3><div className="cdash-widget-actions"><button className="icon-btn" title="Collapse or expand" aria-label="Collapse or expand" onClick={() => onUpdate({ collapsed: !placement.collapsed })}>{placement.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button><button className="icon-btn" title="Resize" aria-label="Resize widget" onClick={nextSize}><Maximize2 size={16} /></button><button className="icon-btn" title="Pin" aria-label="Pin widget" onClick={() => onUpdate({ pinned: !placement.pinned })}><Pin size={16} /></button><button className="icon-btn danger" title="Hide" aria-label="Hide widget" onClick={() => onUpdate({ hidden: true })}><EyeOff size={16} /></button></div></header>
    {!placement.collapsed && <div className="cdash-widget-body"><WidgetContent id={placement.widgetId} uid={uid} data={data} profile={profile} /></div>}
  </article>
}
