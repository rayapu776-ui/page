import React, { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { calls as initialCalls } from './data'

// SVG Icons
const I = ({ name }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d={
        {
          home: 'M4 11.5 12 5l8 6.5V20H4z M9 20v-5h6v5',
          list: 'M6 4h12v16H6z M9 8h6M9 12h6M9 16h3',
          users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 20c.6-3.5 2.4-5.5 5.5-5.5s4.9 2 5.5 5.5M17 5.5a3 3 0 0 1 0 5M17.5 14.5c2 .4 3.1 2.1 3.4 5',
          calendar: 'M5 5h14v15H5z M8 3v4m8-4v4M5 10h14',
          chart: 'M5 19V10m7 9V5m7 14v-7',
          settings:
            'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-3c0-.4 0-.8-.1-1.2l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.5 3h-5l-.3 3.1a7 7 0 0 0-1.8 1L5 6.1l-2 3.4 2 1.5a7 7 0 0 0 0 2.3L3 14.9l2 3.4 2.4-1a7 7 0 0 0 1.8 1l.3 3.1h5l.3-3.1a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z',
          bell: 'M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4',
          menu: 'M4 7h16M4 12h16M4 17h16',
          close: 'm6 6 12 12M18 6 6 18',
          search: 'M10.7 17.2a6.5 6.5 0 1 1 4.6-1.9l4.2 4.2',
          eye: 'M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Zm9.5 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
          phone: 'M6.7 3.5 4.5 4.6c-1 5.7 4.3 11 10 10l1.1-2.2-2.4-1.5-1.2 1.1a10.8 10.8 0 0 1-2.9-2.9l1.1-1.2-1.5-2.4Z',
          check: 'm5 12 4.2 4.2L19 6.5',
          clock: 'M12 7v5l3.2 2 M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
          chevronLeft: 'M15 18l-6-6 6-6',
          chevronRight: 'M9 18l6-6-6-6'
        }[name] || ''
      }
    />
  </svg>
)

const fmt = (s) => {
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    r = s % 60
  return h ? `${h}h ${m}m ${r}s` : m ? `${m}m ${r}s` : `${r}s`
}

const label = (c) => c?.name ?? 'Unknown'
const initials = (c) =>
  c?.name
    ? c.name
        .split(/\s+/)
        .map((x) => x[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

const statusLabels = { answered: 'Answered', failed: 'Failed', no_answer: 'No answer' }

function relative(timestamp) {
  const s = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`
  return `${Math.floor(s / 86400)}d ago`
}

// 1. REUSABLE CLINIC LOGO: SMOOTH SCROLL TO TOP ON ANY PAGE
function ClinicBrand({ onClickExtra }) {
  const handleLogoClick = (e) => {
    e.preventDefault()
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    })
    if (onClickExtra) onClickExtra()
  }

  return (
    <div
      className="brand clickable"
      onClick={handleLogoClick}
      title="Scroll to top"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleLogoClick(e)
        }
      }}
    >
      <svg viewBox="0 0 44 44">
        <rect width="44" height="44" rx="12" />
        <path d="M22 10v10M17 15h10M16.4 20.2a7.2 7.2 0 1 0 11.2 0" />
        <circle cx="22" cy="29" r="2.7" />
      </svg>
      <span>
        <b>Clinic</b>
        <small>Call List</small>
      </span>
    </div>
  )
}

function StatusBadge({ status }) {
  return <span className={`badge ${status}`}>{statusLabels[status] || status}</span>
}

function Summary({ text, full = false }) {
  if (!text) return <span className="empty-text">No summary available</span>
  const parts = text.split(/(<b>.*?<\/b>)/g)
  return (
    <span className={full ? 'summary full' : 'summary'}>
      {parts.map((p, i) =>
        p.startsWith('<b>') ? <strong key={i}>{p.slice(3, -4)}</strong> : p
      )}
    </span>
  )
}

// 5 Overview Cards strictly for Dashboard
function Overview({ callsList }) {
  const stats = useMemo(() => {
    const total = callsList.length
    const a = callsList.filter((x) => x.status === 'answered').length
    const n = callsList.filter((x) => x.status === 'no_answer').length
    const f = callsList.filter((x) => x.status === 'failed').length
    const totalSecs = callsList.reduce((s, x) => s + (x.duration_secs || 0), 0)
    const avg = total > 0 ? Math.round(totalSecs / total) : 0
    return [
      ['Total calls', total, 'list'],
      ['Answered', a, 'check'],
      ['No answer', n, 'phone'],
      ['Failed', f, 'close'],
      ['Average duration', fmt(avg), 'clock']
    ]
  }, [callsList])

  return (
    <section className="overview-cards">
      {stats.map(([t, n, i]) => (
        <article key={t} className="stat">
          <span className="stat-icon">
            <I name={i} />
          </span>
          <span>
            <small>{t}</small>
            <b>{n}</b>
          </span>
        </article>
      ))}
    </section>
  )
}

// Recent Activity strictly for Dashboard
function Activity({ items }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="activity-box">
      <h3>Recent activity</h3>
      {items.length ? (
        <div className="activity-list">
          {items.slice(0, 7).map((a) => (
            <div className="activity" key={a.id}>
              <i />
              <div>
                <b>{a.title}</b>
                <em>{a.detail}</em>
                <small>{relative(a.at)}</small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Actions you take will appear here in real-time.</p>
      )}
    </section>
  )
}

const navItems = [
  ['/dashboard', 'Dashboard', 'home'],
  ['/calls', 'Call List', 'list'],
  ['/patients', 'Patients', 'users'],
  ['/appointments', 'Appointments', 'calendar'],
  ['/analytics', 'Analytics', 'chart'],
  ['/settings', 'Settings', 'settings']
]

// Desktop Collapsible Sidebar
function DesktopSidebar({ collapsed, setCollapsed }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} aria-label="Main Navigation">
      <div className="side-top">
        <ClinicBrand />
        <button
          className="collapse icon-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <I name={collapsed ? 'chevronRight' : 'chevronLeft'} />
        </button>
      </div>

      <nav className="nav-menu">
        {navItems.map(([to, labelText, icon]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            title={collapsed ? labelText : undefined}
          >
            <I name={icon} />
            {!collapsed && <span>{labelText}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

// Mobile Slide-in Drawer
function MobileDrawer({ onClose }) {
  return (
    <>
      <div className="menu-scrim" onClick={onClose} />
      <aside className="mobile-menu" aria-label="Mobile Navigation">
        <div className="side-top">
          <ClinicBrand onClickExtra={onClose} />
          <button className="icon-btn" onClick={onClose} aria-label="Close menu">
            <I name="close" />
          </button>
        </div>
        <nav className="nav-menu">
          {navItems.map(([to, labelText, icon]) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <I name={icon} />
              <span>{labelText}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}

// Top Headers (Desktop & Mobile)
function Header({
  onMenu,
  onBell,
  unread,
  bellOpen,
  notifRef,
  mobileNotifRef,
  notes,
  onMarkAllRead,
  onMarkOneRead,
  onCloseNotif
}) {
  const today = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date())
  }, [])

  return (
    <>
      <header className="desktop-header">
        <div className="date-display">
          <span>Today • {today}</span>
        </div>
        <div className="header-actions">
          <div className="notification-trigger" ref={notifRef}>
            <button
              className={`bell icon-btn ${bellOpen ? 'active' : ''}`}
              onClick={onBell}
              aria-label="Notifications"
              title="Notifications"
            >
              <I name="bell" />
              {unread > 0 && <span className="unread-dot">{unread > 9 ? '9+' : unread}</span>}
            </button>

            {bellOpen && (
              <NotificationsPanel
                items={notes}
                onMarkAllRead={onMarkAllRead}
                onMarkOneRead={onMarkOneRead}
                onClose={onCloseNotif}
              />
            )}
          </div>

          <div className="profile">
            <span>
              Dr. Owner
              <small>Clinic owner</small>
            </span>
          </div>
        </div>
      </header>

      <header className="mobile-header">
        <button className="icon-btn" onClick={onMenu} aria-label="Open menu">
          <I name="menu" />
        </button>
        <ClinicBrand />
        <div className="mobile-notification-trigger" ref={mobileNotifRef}>
          <button
            className={`bell icon-btn ${bellOpen ? 'active' : ''}`}
            onClick={onBell}
            aria-label="Notifications"
          >
            <I name="bell" />
            {unread > 0 && <span className="unread-dot">{unread > 9 ? '9+' : unread}</span>}
          </button>
          {bellOpen && (
            <NotificationsPanel
              items={notes}
              onMarkAllRead={onMarkAllRead}
              onMarkOneRead={onMarkOneRead}
              onClose={onCloseNotif}
            />
          )}
        </div>
      </header>
    </>
  )
}

// Redesigned Notification Panel
function NotificationsPanel({ items, onMarkAllRead, onMarkOneRead, onClose }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  const unreadCount = items.filter((n) => !n.read).length

  return (
    <section className="notifications" aria-label="Notifications">
      <header className="notif-header">
        <div>
          <h3>Notifications</h3>
          <span className="notif-unread-badge">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </span>
        </div>
        <button className="icon-btn notif-close-btn" onClick={onClose} aria-label="Close notifications">
          <I name="close" />
        </button>
      </header>

      <div className="notif-body">
        {items.length ? (
          items.map((n) => (
            <article
              className={`notif-card ${n.read ? 'read' : 'unread'}`}
              key={n.id}
              onClick={() => onMarkOneRead(n.id)}
            >
              <span className="notif-status-dot" title={n.read ? 'Read' : 'Unread'}>
                {n.read ? '○' : '●'}
              </span>
              <div className="notif-content">
                <b className="notif-title">{n.title}</b>
                <p className="notif-detail">{n.detail}</p>
                <small className="notif-time">{relative(n.at)}</small>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-notif">
            <p className="muted">No notifications yet.</p>
          </div>
        )}
      </div>

      <footer className="notif-footer">
        <button
          onClick={onMarkAllRead}
          className="mark-read-full-btn"
          disabled={unreadCount === 0}
        >
          Mark all as read
        </button>
      </footer>
    </section>
  )
}

// Compact Filter Controls for Call List
function FilterControls({ filters, setFilters, onApplied, mobile }) {
  const change = (id, value) => {
    const next = { ...filters, [id]: value }
    setFilters(next)
    if (!mobile && onApplied) {
      if (id === 'status') {
        onApplied(`Status filtered · ${value === 'all' ? 'All' : statusLabels[value] || value}`)
      } else if (id === 'sort') {
        onApplied(`Sorted by ${value}`)
      }
    }
  }

  return (
    <div className={mobile ? 'filter-fields' : 'filters'}>
      {[
        [
          'status',
          'Status',
          [
            ['all', 'All statuses'],
            ['answered', 'Answered'],
            ['no_answer', 'No Answer'],
            ['failed', 'Failed']
          ]
        ],
        [
          'duration',
          'Duration',
          [
            ['all', 'All durations'],
            ['short', 'Short (< 1m)'],
            ['medium', 'Medium (1–5m)'],
            ['long', 'Long (5m+)']
          ]
        ],
        [
          'sort',
          'Sort',
          [
            ['newest', 'Newest first'],
            ['oldest', 'Oldest first'],
            ['longest', 'Longest'],
            ['shortest', 'Shortest'],
            ['name', 'Name A–Z']
          ]
        ]
      ].map(([id, l, options]) => (
        <label key={id} className="filter-label">
          {mobile && <span>{l}</span>}
          <select value={filters[id]} onChange={(e) => change(id, e.target.value)}>
            {options.map((x) => (
              <option key={x[0]} value={x[0]}>
                {x[1]}
              </option>
            ))}
          </select>
        </label>
      ))}
      {mobile && (
        <div className="sheet-actions">
          <button
            onClick={() => {
              if (onApplied) onApplied('Filters applied')
            }}
            className="primary"
          >
            Apply
          </button>
          <button
            onClick={() =>
              setFilters({ q: filters.q, status: 'all', duration: 'all', sort: 'newest' })
            }
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}

function CallActions({ call, index, onDetails, onCallback, onReview, reviewed }) {
  return (
    <div className="actions">
      <button onClick={() => onDetails(index)} title="View Details">
        <I name="eye" />
        <span>Details</span>
      </button>
      <button onClick={() => onCallback(index)} title="Initiate Callback">
        <I name="phone" />
        <span>Call Back</span>
      </button>
      <button
        className={reviewed ? 'done' : ''}
        onClick={() => onReview(index)}
        title={reviewed ? 'Reviewed' : 'Mark as Reviewed'}
      >
        <I name="check" />
        <span>{reviewed ? 'Reviewed' : 'Review'}</span>
      </button>
    </div>
  )
}

// =========================================================================
// CALL LIST COMPONENT: STRICT PREFIX-FILTERED RENDERING
// =========================================================================
function CallList({ callsList, filters, reviewed, onClearSearch, ...handlers }) {
  // Compute strictly filtered list on every keystroke
  const filteredList = useMemo(() => {
    const rawQuery = (filters.q || '').trim().toLowerCase()

    return callsList
      .map((call, originalIndex) => ({ call, originalIndex }))
      .filter(({ call }) => {
        // 1. LIVE PREFIX SEARCH (startsWith ONLY, NO substring includes)
        if (rawQuery !== '') {
          const patientName = (call.name || '').trim().toLowerCase()
          if (!patientName.startsWith(rawQuery)) {
            return false
          }
        }

        // 2. STATUS FILTER
        if (filters.status !== 'all') {
          if (call.status !== filters.status) return false
        }

        // 3. DURATION FILTER
        if (filters.duration !== 'all') {
          const sec = call.duration_secs || 0
          if (filters.duration === 'short' && sec >= 60) return false
          if (filters.duration === 'medium' && (sec < 60 || sec >= 300)) return false
          if (filters.duration === 'long' && sec < 300) return false
        }

        return true
      })
      .sort((a, b) => {
        if (filters.sort === 'oldest') return a.originalIndex - b.originalIndex
        if (filters.sort === 'longest') return (b.call.duration_secs || 0) - (a.call.duration_secs || 0)
        if (filters.sort === 'shortest') return (a.call.duration_secs || 0) - (b.call.duration_secs || 0)
        if (filters.sort === 'name') return label(a.call).localeCompare(label(b.call))
        // Default: newest
        return b.originalIndex - a.originalIndex
      })
  }, [callsList, filters.q, filters.status, filters.duration, filters.sort])

  // NO RESULTS STATE: If filtered array is empty, render ONLY the empty state
  if (filteredList.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <I name="search" />
        </div>
        <h2>No results found</h2>
        {filters.q && filters.q.trim() !== '' ? (
          <p>
            No patients match &ldquo;<strong>{filters.q}</strong>&rdquo;.
            <br />
            Try searching for another patient name.
          </p>
        ) : (
          <p>
            No calls match the selected filter criteria.
            <br />
            Try changing or resetting your filters.
          </p>
        )}
        {filters.q && (
          <button className="clear-filter-btn" onClick={onClearSearch}>
            Clear search
          </button>
        )}
      </div>
    )
  }

  // RENDER ONLY THE FILTERED LIST (Desktop Table + Mobile Cards)
  return (
    <>
      {/* Desktop Call Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Patient name</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Summary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map(({ call, originalIndex }, displayIdx) => (
              <tr key={call.id || originalIndex}>
                <td>{displayIdx + 1}</td>
                <td>
                  <div className="person">
                    <span className={`avatar ${!call.name ? 'unknown' : ''}`}>{initials(call)}</span>
                    <b>{label(call)}</b>
                  </div>
                </td>
                <td>
                  <StatusBadge status={call.status} />
                </td>
                <td>{fmt(call.duration_secs)}</td>
                <td>
                  <Summary text={call.summary} />
                </td>
                <td>
                  <CallActions
                    call={call}
                    index={originalIndex}
                    {...handlers}
                    reviewed={reviewed.has(originalIndex)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile 375px Call Cards */}
      <div className="cards">
        {filteredList.map(({ call, originalIndex }) => (
          <article className="call-card" key={call.id || originalIndex}>
            <div className="card-head">
              <div className="person">
                <span className={`avatar ${!call.name ? 'unknown' : ''}`}>{initials(call)}</span>
                <b>{label(call)}</b>
              </div>
              <StatusBadge status={call.status} />
            </div>
            <div className="card-meta">
              <span>
                <I name="clock" />
                {fmt(call.duration_secs)}
              </span>
              <span>{call.summary ? 'Summary available' : 'No summary'}</span>
            </div>
            <p>
              <Summary text={call.summary} full />
            </p>
            <CallActions
              call={call}
              index={originalIndex}
              {...handlers}
              reviewed={reviewed.has(originalIndex)}
            />
          </article>
        ))}
      </div>
    </>
  )
}

// Call Details Drawer / Modal
function CallDetails({ callsList, index, onClose, ...handlers }) {
  const call = callsList[index]
  if (!call) return null

  return (
    <div className="overlay" onMouseDown={onClose}>
      <aside className="details" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="close icon-btn" onClick={onClose} aria-label="Close details">
          <I name="close" />
        </button>
        <p className="eyebrow">Call details</p>
        <div className="details-person">
          <span className={`avatar ${!call.name ? 'unknown' : ''}`}>{initials(call)}</span>
          <div>
            <h2>{label(call)}</h2>
            <StatusBadge status={call.status} />
          </div>
        </div>
        <div className="facts">
          <span>
            <small>Call ID</small>
            <b>#{call.id || index + 1}</b>
          </span>
          <span>
            <small>Duration</small>
            <b>{fmt(call.duration_secs)}</b>
          </span>
          <span>
            <small>Outcome</small>
            <b>{statusLabels[call.status] || call.status}</b>
          </span>
          <span>
            <small>Review status</small>
            <b>{handlers.reviewed.has(index) ? 'Reviewed' : 'Not reviewed'}</b>
          </span>
        </div>
        <section>
          <h3>Summary</h3>
          <p>
            <Summary text={call.summary} full />
          </p>
        </section>
        <div className="detail-actions">
          <button
            className={handlers.reviewed.has(index) ? 'done' : ''}
            onClick={() => handlers.onReview(index)}
          >
            {handlers.reviewed.has(index) ? 'Reviewed' : 'Mark reviewed'}
          </button>
          <button className="primary" onClick={() => handlers.onCallback(index)}>
            Call Back
          </button>
        </div>
      </aside>
    </div>
  )
}

// Callback Modal
function CallbackModal({ callsList, index, onCancel, onConfirm }) {
  const call = callsList[index]
  if (!call) return null

  return (
    <div className="overlay modal-overlay" onMouseDown={onCancel}>
      <section
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className="close icon-btn" onClick={onCancel} aria-label="Cancel callback">
          <I name="close" />
        </button>
        <h2>Call {label(call)}?</h2>
        <p>This will start a callback request for this patient.</p>
        <div className="modal-btn-row">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary btn-confirm" onClick={() => onConfirm(index)}>
            Call Back
          </button>
        </div>
      </section>
    </div>
  )
}

// 13. CALL LIST PAGE (Focused strictly on Call Management)
function CallsPage({ callsList, ...props }) {
  const [sheet, setSheet] = useState(false)

  const handleClearSearch = () => {
    props.setFilters((prev) => ({ ...prev, q: '' }))
  }

  return (
    <div className="page page-fade-slide">
      <header className="page-title">
        <div>
          <p className="eyebrow">Clinic communications</p>
          <h1>Call List</h1>
          <p>Manage and review recent patient communications.</p>
        </div>
      </header>

      {/* Search Bar with Clear Button & Compact Filter only */}
      <div className="call-toolbar">
        <div className="search-box-wrapper">
          <label className="search">
            <I name="search" />
            <input
              value={props.filters.q}
              onChange={(e) => {
                const val = e.target.value
                props.setFilters((prev) => ({ ...prev, q: val }))
              }}
              placeholder="Search patient name (e.g. Rahul, Sunita, Anita)..."
            />
            {props.filters.q && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={handleClearSearch}
                aria-label="Clear search"
                title="Clear search"
              >
                <I name="close" />
              </button>
            )}
          </label>
        </div>
        <div className="desktop-only">
          <FilterControls {...props} />
        </div>
        <button className="mobile-filter" onClick={() => setSheet(true)}>
          Filter & sort
        </button>
      </div>

      {/* Main Call List - NO DASHBOARD STAT CARDS */}
      <section className="call-list">
        <CallList
          callsList={callsList}
          onClearSearch={handleClearSearch}
          {...props}
        />
      </section>

      {/* Mobile Filter Sheet */}
      {sheet && (
        <div className="overlay sheet-overlay" onMouseDown={() => setSheet(false)}>
          <section className="filter-sheet" onMouseDown={(e) => e.stopPropagation()}>
            <i />
            <header>
              <h2>Filter calls</h2>
              <button className="icon-btn" onClick={() => setSheet(false)}>
                <I name="close" />
              </button>
            </header>
            <FilterControls
              mobile
              {...props}
              onApplied={(x) => {
                props.onApplied(x)
                setSheet(false)
              }}
            />
          </section>
        </div>
      )}
    </div>
  )
}

// 11 & 12. CLEAN, MINIMAL & PREMIUM DASHBOARD
function DashboardPage({ callsList, activities }) {
  const total = callsList.length
  const a = callsList.filter((c) => c.status === 'answered').length
  const n = callsList.filter((c) => c.status === 'no_answer').length
  const f = callsList.filter((c) => c.status === 'failed').length

  const resRate = total > 0 ? Math.round((a / total) * 100) : 0

  return (
    <div className="page page-fade-slide">
      <header className="page-title">
        <div>
          <p className="eyebrow">Clinic Telemetry</p>
          <h1>Dashboard</h1>
          <p>Overview of clinic communications and performance.</p>
        </div>
      </header>

      {/* 5 Dynamic Overview Cards */}
      <Overview callsList={callsList} />

      {/* Clean Call Analytics & Recent Activity Section */}
      <div className="dashboard-grid">
        <section className="panel">
          <h2>Call Overview</h2>
          <p>Distribution and outcomes calculated from actual call records.</p>
          <div className="chart">
            <div
              className="donut"
              style={{
                '--a': `${total > 0 ? (a / total) * 100 : 0}%`,
                '--n': `${total > 0 ? ((a + n) / total) * 100 : 0}%`
              }}
            >
              <b>{total}</b>
              <small>Total</small>
            </div>
            <div className="legend-box">
              {[
                ['Answered', a, 'green'],
                ['No answer', n, 'amber'],
                ['Failed', f, 'red']
              ].map((x) => (
                <p className="legend" key={x[0]}>
                  <i className={x[2]} />
                  {x[0]}
                  <b>{x[1]}</b>
                </p>
              ))}
              <div className="res-rate">
                <span>Resolution rate:</span>
                <b>{resRate}%</b>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Activity Feed */}
        <Activity items={activities} />
      </div>
    </div>
  )
}

// Generic Placeholder Pages
function PlaceholderPage({ title, desc }) {
  return (
    <div className="page page-fade-slide">
      <header className="page-title">
        <div>
          <p className="eyebrow">Clinic Module</p>
          <h1>{title}</h1>
          <p>{desc}</p>
        </div>
      </header>
      <div className="placeholder">
        <I name="chart" />
        <h2>{title}</h2>
        <p>This module is connected and active. Call List and Dashboard telemetry are fully live.</p>
      </div>
    </div>
  )
}

// Root Application Component
export default function App() {
  const location = useLocation()
  const [callsList] = useState(initialCalls)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('clinic-sidebar') === 'true')
  const [menu, setMenu] = useState(false)
  const [bell, setBell] = useState(false)
  const [filters, setFilters] = useState({ q: '', status: 'all', duration: 'all', sort: 'newest' })
  const [reviewed, setReviewed] = useState(new Set())
  const [details, setDetails] = useState(null)
  const [callback, setCallback] = useState(null)
  const [toast, setToast] = useState(null)
  const desktopNotificationRef = useRef(null)
  const mobileNotificationRef = useRef(null)

  // Real React Notifications & Activity state with dynamic timestamps
  const [activities, setActivities] = useState([
    { id: 'init-1', title: 'System initialized', detail: 'Telemetry pipeline ready', at: Date.now() - 120000 },
    { id: 'init-2', title: 'Call records loaded', detail: `${initialCalls.length} calls synced`, at: Date.now() - 300000 }
  ])

  const [notes, setNotes] = useState([
    { id: 'notif-1', title: 'Call reviewed', detail: 'Sunita Rao', at: Date.now() - 60000, read: false },
    { id: 'notif-2', title: 'Callback initiated', detail: 'Anita Sharma', at: Date.now() - 300000, read: false },
    { id: 'notif-3', title: 'Follow-up requested', detail: 'New call', at: Date.now() - 720000, read: true }
  ])

  useEffect(() => {
    localStorage.setItem('clinic-sidebar', String(collapsed))
  }, [collapsed])

  // Close popovers on page navigation
  useEffect(() => {
    setBell(false)
    setMenu(false)
  }, [location.pathname])

  // Close the notification panel only when the active layout's bell and panel are both outside the tap.
  useEffect(() => {
    if (!bell) return

    const closeNotificationPanel = (event) => {
      const notificationRef = window.matchMedia('(min-width: 861px)').matches
        ? desktopNotificationRef
        : mobileNotificationRef

      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setBell(false)
      }
    }

    document.addEventListener('pointerdown', closeNotificationPanel)
    return () => document.removeEventListener('pointerdown', closeNotificationPanel)
  }, [bell])

  // Toast Auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  // Body Scroll Lock for Modals, Mobile Drawer, and Details Panel
  useEffect(() => {
    if (details !== null || callback !== null || menu) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [details, callback, menu])

  const addAction = (title, detail) => {
    const entry = { id: crypto.randomUUID(), title, detail, at: Date.now() }
    setActivities((prev) => [entry, ...prev])
    setNotes((prev) => [{ ...entry, read: false }, ...prev])
  }

  const handleFilterApplied = (msg) => {
    addAction('Filter applied', msg.replace('Filter applied · ', ''))
    setToast(msg)
  }

  const handleReview = (i) => {
    if (!reviewed.has(i)) {
      setReviewed((prev) => new Set(prev).add(i))
      const target = callsList[i]
      addAction('Call reviewed', label(target))
      setToast(`Call marked as reviewed for ${label(target)}.`)
    }
    setDetails(null)
  }

  const handleCallbackConfirm = (i) => {
    const target = callsList[i]
    setCallback(null)
    addAction('Callback initiated', label(target))
    setToast(`Callback initiated for ${label(target)}.`)
  }

  const handleMarkAllRead = () => {
    setNotes((prev) => prev.map((n) => ({ ...n, read: true })))
    setToast('All notifications marked as read.')
  }

  const handleMarkOneRead = (id) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const unreadCount = notes.filter((x) => !x.read).length

  const sharedProps = {
    callsList,
    filters,
    setFilters,
    onApplied: handleFilterApplied,
    reviewed,
    onDetails: setDetails,
    onCallback: setCallback,
    onReview: handleReview
  }

  return (
    <div className={`app ${collapsed ? 'is-collapsed' : ''}`}>
      {/* Desktop Sidebar */}
      <DesktopSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Container */}
      <div className="main">
        <Header
          onMenu={() => setMenu(true)}
          onBell={() => setBell((isOpen) => !isOpen)}
          unread={unreadCount}
          bellOpen={bell}
          notifRef={desktopNotificationRef}
          mobileNotifRef={mobileNotificationRef}
          notes={notes}
          onMarkAllRead={handleMarkAllRead}
          onMarkOneRead={handleMarkOneRead}
          onCloseNotif={() => setBell(false)}
        />

        {/* Application Page Routes */}
        <Routes>
          <Route path="/" element={<DashboardPage callsList={callsList} activities={activities} />} />
          <Route path="/dashboard" element={<DashboardPage callsList={callsList} activities={activities} />} />
          <Route path="/calls" element={<CallsPage {...sharedProps} />} />
          <Route
            path="/patients"
            element={<PlaceholderPage title="Patients" desc="Patient records and medical history." />}
          />
          <Route
            path="/appointments"
            element={<PlaceholderPage title="Appointments" desc="Clinic scheduling and consultation calendar." />}
          />
          <Route
            path="/analytics"
            element={<PlaceholderPage title="Analytics" desc="Detailed communication metrics and insights." />}
          />
          <Route
            path="/settings"
            element={<PlaceholderPage title="Settings" desc="Clinic configuration and preferences." />}
          />
        </Routes>
      </div>

      {/* Mobile Drawer */}
      {menu && <MobileDrawer onClose={() => setMenu(false)} />}

      {/* Details Slide-in / Modal */}
      {details !== null && (
        <CallDetails
          callsList={callsList}
          index={details}
          onClose={() => setDetails(null)}
          {...sharedProps}
        />
      )}

      {/* Callback Modal */}
      {callback !== null && (
        <CallbackModal
          callsList={callsList}
          index={callback}
          onCancel={() => setCallback(null)}
          onConfirm={handleCallbackConfirm}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast" role="status">
          <I name="check" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}
