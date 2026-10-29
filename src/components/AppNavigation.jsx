import { Activity } from 'lucide-react'
import { navItems } from '../lib/appData'

export function AppFooter() {
  return <footer className="footer"><div className="footer-inner"><span className="footer-brand"><span className="brand-mark"><Activity size={17} /></span> QueueFree</span><span>Better care starts with less waiting.</span><span>© 2026 QueueFree</span></div></footer>
}

export function BottomNavigation({ tab, goTo, labels }) {
  return <nav className="bottom-nav" aria-label="Main navigation">
    {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => goTo(id)}><Icon size={19} /><span>{labels[id] || label}</span></button>)}
  </nav>
}
