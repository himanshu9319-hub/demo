import { useState, useRef, useEffect } from 'react'
import {
  Bell, MapPin, Search, ChevronDown, LogOut,
  User, CheckCircle, ShieldCheck, Menu
} from 'lucide-react'

export function PatientTopBar({
  activeTab,
  patientName = 'Patient',
  patientEmail = 'patient@example.com',
  patientPhone = '+91 98765 43210',
  city = 'Rishikesh, Uttarakhand',
  searchQuery = '',
  onSearchChange,
  onOpenLocation,
  onLogout,
  onToggleMobileMenu,
  unreadCount = 2,
}) {
  const isDashboard = activeTab === 'dashboard'
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const firstName = patientName.trim().split(' ')[0] || 'Patient'

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <header className="patient-topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-mobile-menu-btn"
          onClick={onToggleMobileMenu}
          aria-label="Open mobile navigation"
        >
          <Menu size={20} />
        </button>

        {isDashboard ? (
          <div className="patient-greeting">
            <h1>Hello, {firstName} 👋</h1>
            <p className="greeting-sub">“Skip the line, save your time.”</p>
          </div>
        ) : (
          <div className="topbar-search-wrap">
            <div className="topbar-search">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange?.(e.target.value)}
                placeholder="Search hospitals near you..."
              />
            </div>
            {city && (
              <button type="button" className="topbar-location-pill" onClick={onOpenLocation}>
                <MapPin size={14} className="location-pin-icon" />
                <span>{city}</span>
                <ChevronDown size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="topbar-right">
        {/* Notifications */}
        <button type="button" className="topbar-icon-btn notification-btn" aria-label="Notifications">
          <Bell size={18} />
          {unreadCount > 0 && <span className="notification-dot" />}
        </button>

        {/* Direct One-Click Logout Button (Requested by User) */}
        <button
          type="button"
          className="topbar-quick-logout-btn"
          onClick={onLogout}
          title="Sign out of this patient account"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>

        {/* User Avatar with Profile Dropdown Menu */}
        <div className="user-profile-menu-wrapper" ref={menuRef}>
          <button
            type="button"
            className="user-avatar-badge-btn"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label="User profile menu"
          >
            <span>{patientName.charAt(0).toUpperCase()}</span>
          </button>

          {userMenuOpen && (
            <div className="user-dropdown-popover">
              <div className="dropdown-user-header">
                <strong>{patientName}</strong>
                <small>{patientEmail}</small>
                <small className="dropdown-phone">{patientPhone}</small>
              </div>

              <div className="dropdown-divider" />

              <button
                type="button"
                className="dropdown-menu-item red-logout-btn"
                onClick={() => {
                  setUserMenuOpen(false)
                  onLogout?.()
                }}
              >
                <LogOut size={15} />
                <span>Log out from account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
