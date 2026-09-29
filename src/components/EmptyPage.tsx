import { BarChart3, Plus } from 'lucide-react';

export function EmptyPage({ title, description, action, onAction }: { title: string; description: string; action: string; onAction: () => void }) {
  return <div className="empty-page"><div className="empty-mark"><BarChart3 size={27} /></div><h2>{title}</h2><p>{description}</p><button className="primary-button" onClick={onAction}><Plus size={18} /> {action}</button></div>;
}
