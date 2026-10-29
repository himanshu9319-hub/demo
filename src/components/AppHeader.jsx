import { Activity, BriefcaseMedical, Moon, Sun, UserRound } from 'lucide-react'
import { IconButton } from './IconButton'

export function AppHeader({ goTo, language, setLanguage, dark, setDark, onSignIn, labels }) {
  return (
    <>
      <div className="demo-banner"><span className="demo-inner"><Activity size={14} /> Demo environment · ABHA-style verification is simulated · Not connected to ABDM or WhatsApp</span></div>
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand" onClick={() => goTo('home')} aria-label="QueueFree home"><span className="brand-mark"><Activity size={19} strokeWidth={2.7} /></span><span>Queue<span>Free</span></span></button>
          <div className="top-actions">
            <button className="staff-link" onClick={() => goTo('staff')}><BriefcaseMedical size={15} /> Reception</button>
            <a className="staff-link" href="/doctor"><UserRound size={15} /> Doctor</a>
            <button className="language-link" onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}>{language === 'en' ? 'हिंदी' : 'English'}</button>
            <IconButton label="Toggle dark mode" onClick={() => setDark(!dark)}>{dark ? <Sun size={19} /> : <Moon size={19} />}</IconButton>
            <button className="signin" onClick={onSignIn}><UserRound size={16} /><span>{labels.signin}</span></button>
          </div>
        </div>
      </header>
    </>
  )
}
