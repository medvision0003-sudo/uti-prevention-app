import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001'
const DEFAULT_HYDRATION_GOAL = 2000
const WATER_GLASS_ML = 250
const SYMPTOM_OPTIONS = [
  ['burning_urination', 'Burning when urinating'],
  ['urgency', 'Urinary urgency'],
  ['frequent_urination', 'Frequent urination'],
  ['lower_abdominal_pain', 'Lower abdominal pain'],
  ['blood_in_urine', 'Blood in urine'],
  ['fever', 'Fever'],
  ['back_or_flank_pain', 'Back or side pain'],
  ['nausea_or_vomiting', 'Nausea or vomiting']
]
const INTAKE_HISTORY_OPTIONS = [
  ['recurrent_uti', 'Recurrent urinary tract infection (UTI)'],
  ['diabetes', 'Diabetes'],
  ['constipation', 'Constipation'],
  ['loose_motions', 'History of loose motions'],
  ['recent_travel', 'Recent travel'],
  ['other_urological_history', 'Other urological history'],
  ['prior_intervention', 'Prior intervention or procedure'],
  ['prior_stone_surgery', 'Prior stone surgery']
]
const EMPTY_INTAKE = {
  age: '',
  last_menstrual_period: '',
  postmenopausal: null,
  hysterectomy: null,
  menopause_duration: null,
  recurrent_uti: null,
  diabetes: null,
  constipation: null,
  loose_motions: null,
  recent_travel: null,
  other_urological_history: null,
  prior_intervention: null,
  prior_stone_surgery: null,
  note: ''
}
const PAGE_HASHES = {
  home: '#/',
  intake: '#/clinic-intake',
  water: '#/water-log',
  bladder: '#/bladder-log',
  checkin: '#/daily-check-in'
}

function getCurrentPage() {
  return Object.keys(PAGE_HASHES).find(page => PAGE_HASHES[page] === window.location.hash) || 'home'
}

function getSavedHydrationGoal() {
  const savedGoal = Number(localStorage.getItem('hydrationGoal'))
  return Number.isInteger(savedGoal) && savedGoal >= 250 && savedGoal <= 10000
    ? savedGoal
    : DEFAULT_HYDRATION_GOAL
}

function getLocalDateString() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatWaterTimestamp(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  }).format(new Date(timestamp))
}

function WaterGlassIcon() {
  return (
    <svg className="water-glass-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path className="water-glass-fill" d="M6.5 11h11l-.7 8H7.2z" />
      <path className="water-glass-outline" d="M6 3h12l-1.3 17H7.3L6 3Z" />
    </svg>
  )
}

function getAPIErrorMessage(detail, fallback) {
  if (typeof detail === 'string' && detail.trim()) return detail

  if (Array.isArray(detail)) {
    const messages = detail
      .map(item => {
        if (typeof item === 'string') return item
        if (!item || typeof item !== 'object') return ''

        const location = Array.isArray(item.loc) ? item.loc : []
        const field = location[location.length - 1]
        const label = typeof field === 'string'
          ? field.replaceAll('_', ' ').replace(/^\w/, letter => letter.toUpperCase())
          : ''
        const message = item.type === 'value_error' && field === 'email'
          ? 'Enter a valid email address.'
          : item.msg

        return typeof message === 'string'
          ? `${label ? `${label}: ` : ''}${message}`
          : ''
      })
      .filter(Boolean)

    if (messages.length) return messages.join(' ')
  }

  return fallback
}

async function fetchTodayWater(accessToken) {
  const response = await fetch(`${API}/api/water/today`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  const data = await response.json()
  if (!response.ok) throw new Error(getAPIErrorMessage(data.detail, 'Unable to load water entries'))
  return data
}

function getRequestErrorMessage(error) {
  if (error instanceof Error && error.message === 'Failed to fetch') {
    return `Unable to reach the API at ${API}. Start the backend or set VITE_API_URL in frontend/.env to the active backend port.`
  }

  return error.message || 'Unable to reach the API. Is FastAPI running?'
}

export default function App() {
  const [mode, setMode] = useState('register')
  const [fullName, setFullName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [user, setUser] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [waterSummary, setWaterSummary] = useState(null)
  const [waterAmount, setWaterAmount] = useState('')
  const [hydrationGoal, setHydrationGoal] = useState(getSavedHydrationGoal)
  const [savingWater, setSavingWater] = useState(false)
  const [waterMessage, setWaterMessage] = useState('')
  const [page, setPage] = useState(getCurrentPage)
  const [bladderSummary, setBladderSummary] = useState(null)
  const [checkIn, setCheckIn] = useState(null)
  const [checkInHistory, setCheckInHistory] = useState([])
  const [symptoms, setSymptoms] = useState([])
  const [savingBladder, setSavingBladder] = useState(false)
  const [savingCheckIn, setSavingCheckIn] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pageMessage, setPageMessage] = useState('')
  const [intake, setIntake] = useState(EMPTY_INTAKE)
  const [savingIntake, setSavingIntake] = useState(false)
  const profileComplete = Boolean(user?.full_name?.trim() && user?.contact_number?.trim())

  useEffect(() => {
    function syncPage() {
      setPage(getCurrentPage())
      setPageMessage('')
    }
    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  function navigate(nextPage) {
    if (getCurrentPage() === nextPage) {
      setPage(nextPage)
      setPageMessage('')
    } else {
      window.location.hash = PAGE_HASHES[nextPage]
    }
  }

  useEffect(() => {
    localStorage.setItem('hydrationGoal', String(hydrationGoal))
  }, [hydrationGoal])

  useEffect(() => {
    if (!token) {
      setWaterSummary(null)
      return undefined
    }

    let cancelled = false
    fetchTodayWater(token)
      .then(data => {
        if (!cancelled) setWaterSummary(data)
      })
      .catch(error => {
        if (!cancelled) setWaterMessage(getRequestErrorMessage(error))
      })

    return () => { cancelled = true }
  }, [token])

  useEffect(() => {
    if (!token || page !== 'bladder') return undefined
    let cancelled = false
    fetch(`${API}/api/bladder/today`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(getAPIErrorMessage(data.detail, 'Unable to load bladder log'))
        if (!cancelled) setBladderSummary(data)
      })
      .catch(error => {
        if (!cancelled) setPageMessage(getRequestErrorMessage(error))
      })
    return () => { cancelled = true }
  }, [token, page])

  useEffect(() => {
    if (!token || page !== 'intake') return undefined
    let cancelled = false
    fetch(`${API}/api/intake`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(getAPIErrorMessage(data.detail, 'Unable to load clinic intake'))
        if (!cancelled) {
          setIntake(data.completed
            ? { ...EMPTY_INTAKE, ...data, age: String(data.age), last_menstrual_period: data.last_menstrual_period || '', note: data.note || '' }
            : EMPTY_INTAKE)
        }
      })
      .catch(error => {
        if (!cancelled) setPageMessage(getRequestErrorMessage(error))
      })
    return () => { cancelled = true }
  }, [token, page])

  useEffect(() => {
    if (!token || page !== 'checkin') return undefined
    let cancelled = false
    Promise.all([
      fetch(`${API}/api/check-in/today`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(getAPIErrorMessage(data.detail, 'Unable to load daily check-in'))
        return data
      }),
      fetch(`${API}/api/check-in/history?limit=14`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(getAPIErrorMessage(data.detail, 'Unable to load check-in history'))
        return data
      })
    ])
      .then(([today, history]) => {
        if (cancelled) return
        setCheckIn(today)
        setCheckInHistory(history.entries)
        setSymptoms(today.symptoms)
      })
      .catch(error => {
        if (!cancelled) setPageMessage(getRequestErrorMessage(error))
      })
    return () => { cancelled = true }
  }, [token, page])

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    setBusy(true)
    try {
      const response = await fetch(`${API}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(mode === 'register' ? { full_name: fullName, contact_number: contactNumber } : {})
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(getAPIErrorMessage(data.detail, 'Request failed'))
      setToken(data.access_token)
      setUser(data.user)
      setFullName(data.user.full_name || '')
      setContactNumber(data.user.contact_number || '')
      setMessage(mode === 'register' ? 'Account created successfully.' : 'Signed in successfully.')
    } catch (error) {
      setMessage(getRequestErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function checkSession() {
    setMessage('')
    setBusy(true)
    try {
      const response = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (!response.ok) throw new Error(getAPIErrorMessage(data.detail, 'Session check failed'))
      setUser(data)
      setFullName(data.full_name || '')
      setContactNumber(data.contact_number || '')
      setMessage('Your protected API request succeeded.')
    } catch (error) {
      setMessage(getRequestErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    setToken('')
    setUser(null)
    setFullName('')
    setContactNumber('')
    setPassword('')
    setWaterSummary(null)
    setBladderSummary(null)
    setCheckIn(null)
    setCheckInHistory([])
    navigate('home')
    setMessage('You have signed out.')
  }

  async function saveProfile(event) {
    event.preventDefault()
    setPageMessage('')
    setSavingProfile(true)
    try {
      const response = await fetch(`${API}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ full_name: fullName, contact_number: contactNumber })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(getAPIErrorMessage(data.detail, 'Unable to save patient details'))
      setUser(data)
      setPageMessage('Patient details saved. Your tracking logs are now ready.')
    } catch (error) {
      setPageMessage(getRequestErrorMessage(error))
    } finally {
      setSavingProfile(false)
    }
  }

  async function exportPatientData() {
    setPageMessage('')
    setExporting(true)
    try {
      const response = await fetch(`${API}/api/export/excel`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(getAPIErrorMessage(data.detail, 'Unable to export patient data'))
      }
      const workbook = await response.blob()
      const url = URL.createObjectURL(workbook)
      const link = document.createElement('a')
      link.href = url
      link.download = `bladderwise-${user.patient_id}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setPageMessage('Your patient workbook was downloaded.')
    } catch (error) {
      setPageMessage(getRequestErrorMessage(error))
    } finally {
      setExporting(false)
    }
  }

  async function addBladderEntry() {
    setPageMessage('')
    setSavingBladder(true)
    try {
      const createResponse = await fetch(`${API}/api/bladder`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const created = await createResponse.json()
      if (!createResponse.ok) throw new Error(getAPIErrorMessage(created.detail, 'Unable to save bladder entry'))
      const response = await fetch(`${API}/api/bladder/today`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const summary = await response.json()
      if (!response.ok) throw new Error(getAPIErrorMessage(summary.detail, 'Unable to refresh bladder log'))
      setBladderSummary(summary)
      setPageMessage('Urination time recorded.')
    } catch (error) {
      setPageMessage(getRequestErrorMessage(error))
    } finally {
      setSavingBladder(false)
    }
  }

  async function saveCheckIn(event) {
    event.preventDefault()
    setPageMessage('')
    setSavingCheckIn(true)
    try {
      const response = await fetch(`${API}/api/check-in/today`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symptoms })
      })
      const saved = await response.json()
      if (!response.ok) throw new Error(getAPIErrorMessage(saved.detail, 'Unable to save daily check-in'))
      setCheckIn(saved)
      const historyResponse = await fetch(`${API}/api/check-in/history?limit=14`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const history = await historyResponse.json()
      if (!historyResponse.ok) throw new Error(getAPIErrorMessage(history.detail, 'Unable to refresh check-in history'))
      setCheckInHistory(history.entries)
      setPageMessage('Daily check-in saved.')
    } catch (error) {
      setPageMessage(getRequestErrorMessage(error))
    } finally {
      setSavingCheckIn(false)
    }
  }

  function toggleSymptom(symptom) {
    setSymptoms(current => current.includes(symptom)
      ? current.filter(item => item !== symptom)
      : [...current, symptom])
  }

  async function addWater(amount) {
    setWaterMessage('')
    setSavingWater(true)
    try {
      const response = await fetch(`${API}/api/water`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount_ml: amount })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(getAPIErrorMessage(data.detail, 'Unable to save water entry'))
      const summary = await fetchTodayWater(token)
      setWaterSummary(summary)
      setWaterAmount('')
      const glasses = data.amount_ml / WATER_GLASS_ML
      const glassLabel = Number.isInteger(glasses)
        ? `${glasses} ${glasses === 1 ? 'glass' : 'glasses'} (${data.amount_ml} ml)`
        : `${data.amount_ml} ml`
      setWaterMessage(`Saved ${glassLabel} of water.`)
    } catch (error) {
      setWaterMessage(getRequestErrorMessage(error))
    } finally {
      setSavingWater(false)
    }
  }

  function submitCustomWater(event) {
    event.preventDefault()
    const amount = Number(waterAmount)
    if (Number.isInteger(amount) && amount > 0 && amount <= 5000) {
      addWater(amount)
    }
  }

  async function saveIntake(event) {
    event.preventDefault()
    setPageMessage('')
    setSavingIntake(true)
    try {
      const { age, last_menstrual_period, note, ...history } = intake
      const response = await fetch(`${API}/api/intake`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...history,
          age: Number(age),
          last_menstrual_period: last_menstrual_period || null,
          note: note.trim() || null,
          menopause_duration: intake.postmenopausal ? intake.menopause_duration : null
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(getAPIErrorMessage(data.detail, 'Unable to save clinic intake'))
      setIntake({ ...EMPTY_INTAKE, ...data, age: String(data.age), last_menstrual_period: data.last_menstrual_period || '', note: data.note || '' })
      setPageMessage('Clinic intake saved.')
    } catch (error) {
      setPageMessage(getRequestErrorMessage(error))
    } finally {
      setSavingIntake(false)
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand-mark">B</div>
        <div><strong>BladderWise</strong><span>Daily bladder-health habits</span></div>
        <span className="prototype">RESEARCH PROTOTYPE</span>
      </header>

      <section className="hero">
        <div className="eyebrow">SMALL HABITS · INFORMED CARE</div>
        <h1>Build healthy habits,<br /><em>one day at a time.</em></h1>
        <p className="intro">A simple place to track daily habits and learn about bladder health. This prototype does not diagnose or rule out a UTI.</p>
      </section>

      {!user ? (
        <section className="auth-card">
          <div className="tabs">
            <button className={mode === 'register' ? 'tab active' : 'tab'} onClick={() => { setMode('register'); setMessage('') }}>Create account</button>
            <button className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => { setMode('login'); setMessage('') }}>Sign in</button>
          </div>
          <h2>{mode === 'register' ? 'Welcome to BladderWise' : 'Welcome back'}</h2>
          <p className="muted">{mode === 'register' ? 'Create an account to begin your journey.' : 'Sign in to access your dashboard.'}</p>
          <form onSubmit={submit}>
            {mode === 'register' && <>
              <label htmlFor="full-name">Patient name</label>
              <input
                id="full-name"
                type="text"
                autoComplete="name"
                maxLength="160"
                required
                value={fullName}
                onChange={event => setFullName(event.target.value)}
                placeholder="Your full name"
              />
              <label htmlFor="contact-number">Contact number</label>
              <input
                id="contact-number"
                type="tel"
                autoComplete="tel"
                minLength="7"
                maxLength="32"
                required
                value={contactNumber}
                onChange={event => setContactNumber(event.target.value)}
                placeholder="+91 98765 43210"
              />
            </>}
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 10 : 1} required value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 10 characters' : 'Your password'} />
            {mode === 'register' && <p className="hint">Use at least 10 characters. Never reuse a password from another account.</p>}
            <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create my account' : 'Sign in'}</button>
          </form>
          {message && <p className="message" role="status">{message}</p>}
          <p className="privacy-note">Use fictional data during development. Do not enter real patient information into this prototype.</p>
        </section>
      ) : (
        <section className="dashboard">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">{page === 'home' ? 'YOUR SPACE' : page === 'intake' ? 'CLINIC-ASSISTED INTAKE' : 'DAILY TRACKING'}</div>
              <h2>{page === 'intake' ? 'Patient intake' : page === 'water' ? 'Water intake' : page === 'bladder' ? 'Bladder log' : page === 'checkin' ? 'Daily check-in' : 'Welcome'}</h2>
              <p className="muted">{page === 'home' ? user.email : 'Your entries are private to your account.'}</p>
            </div>
            <div className="welcome-actions">
              {page !== 'home' && <button className="secondary" onClick={() => navigate('home')}>← Dashboard</button>}
              <button className="secondary" onClick={exportPatientData} disabled={exporting}>
                {exporting ? 'Preparing Excel…' : 'Export my Excel workbook'}
              </button>
              <button className="secondary" onClick={logout}>Sign out</button>
            </div>
          </div>
          {!profileComplete && <form className="profile-completion" onSubmit={saveProfile}>
            <h3>Complete your patient details</h3>
            <p className="muted">Add your name and contact number before starting your tracking logs.</p>
            <label htmlFor="profile-full-name">Patient name</label>
            <input id="profile-full-name" type="text" autoComplete="name" maxLength="160" required value={fullName} onChange={event => setFullName(event.target.value)} />
            <label htmlFor="profile-contact-number">Contact number</label>
            <input id="profile-contact-number" type="tel" autoComplete="tel" minLength="7" maxLength="32" required value={contactNumber} onChange={event => setContactNumber(event.target.value)} placeholder="+91 98765 43210" />
            <button className="primary" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save patient details'}</button>
            {pageMessage && <p className="message" role="status">{pageMessage}</p>}
          </form>}
          {profileComplete && page === 'home' && <>
            <div className="status-card">
              <div className="status-icon">✓</div>
              <div>
                <strong>Your account is ready</strong>
                <p>Patient ID: <strong>{user.patient_id}</strong></p>
                <p>{user.full_name} · {user.contact_number}</p>
                <p>Your tracking entries are private to your account.</p>
              </div>
            </div>
            <div className="grid tracking-grid">
              <button className="feature-card tracking-link" onClick={() => navigate('intake')}>
                <span className="step-number">CLINIC INTAKE</span><span className="feature-icon">☑</span><h3>Patient history</h3><p>Complete the intake together with clinic staff.</p><span className="coming">Open patient intake →</span>
              </button>
              <button className="feature-card tracking-link" onClick={() => navigate('water')}>
                <span className="step-number">ONGOING LOG</span><span className="feature-icon">💧</span><h3>Water intake</h3><p>Record drinks and review your daily total.</p><span className="coming">Open water log →</span>
              </button>
              <button className="feature-card tracking-link" onClick={() => navigate('bladder')}>
                <span className="step-number">OPTIONAL TRACKING</span><span className="feature-icon">◷</span><h3>Bladder log</h3><p>Keep a simple record of urination times.</p><span className="coming">Open bladder log →</span>
              </button>
              <button className="feature-card tracking-link" onClick={() => navigate('checkin')}>
                <span className="step-number">ONGOING LOG</span><span className="feature-icon">♡</span><h3>Daily symptoms</h3><p>Record symptoms and review recent entries.</p><span className="coming">Open symptom log →</span>
              </button>
            </div>
            <button className="secondary" disabled={busy} onClick={checkSession}>Test protected API connection</button>
            {message && <p className="message" role="status">{message}</p>}
          </>}
          {profileComplete && page === 'intake' && <section className="tracking-page" aria-labelledby="intake-heading">
            <div className="tracking-page-heading">
              <div><span className="feature-icon">☑</span><h3 id="intake-heading">Clinic-assisted patient intake</h3></div>
              <span className="daily-count">{intake.updated_at ? 'Saved' : 'New intake'}</span>
            </div>
            <p className="muted">Clinic staff can complete this short history with the patient. Select yes or no for each history item.</p>
            <form className="checkin-form intake-form" onSubmit={saveIntake}>
              <fieldset>
                <legend>Demographics</legend>
                <label htmlFor="intake-age">Age</label>
                <input
                  id="intake-age"
                  type="number"
                  min="1"
                  max="120"
                  required
                  value={intake.age}
                  onChange={event => setIntake(current => ({ ...current, age: event.target.value }))}
                  placeholder="Age in years"
                />
              </fieldset>
              <fieldset>
                <legend>Menstrual and menopausal history</legend>
                <label htmlFor="last-menstrual-period">Date of last menstrual period (LMP)</label>
                <input
                  id="last-menstrual-period"
                  type="date"
                  max={getLocalDateString()}
                  value={intake.last_menstrual_period}
                  onChange={event => setIntake(current => ({ ...current, last_menstrual_period: event.target.value }))}
                />
                {[
                  ['postmenopausal', 'Postmenopausal'],
                  ['hysterectomy', 'History of hysterectomy']
                ].map(([field, label]) => (
                  <div className="intake-question" key={field}>
                    <strong>{label}</strong>
                    <div className="yes-no-options">
                      {[['yes', true], ['no', false]].map(([answer, value]) => (
                        <label className="choice-row" key={answer}>
                          <input
                            type="radio"
                            name={`intake-${field}`}
                            required
                            checked={intake[field] === value}
                            onChange={() => setIntake(current => ({
                              ...current,
                              [field]: value,
                              ...(field === 'postmenopausal' && !value ? { menopause_duration: null } : {})
                            }))}
                          />
                          {answer === 'yes' ? 'Yes' : 'No'}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {intake.postmenopausal && <div className="intake-band">
                  <label htmlFor="menopause-duration">Approximate time since menopause</label>
                  <select
                    id="menopause-duration"
                    required
                    value={intake.menopause_duration || ''}
                    onChange={event => setIntake(current => ({ ...current, menopause_duration: event.target.value || null }))}
                  >
                    <option value="">Select a time band</option>
                    <option value="early">Perimenopausal / early (roughly first 5 years)</option>
                    <option value="recent">Recent (roughly 5–7 years)</option>
                    <option value="late">Late (roughly 7 years and beyond)</option>
                  </select>
                  <p className="hint">These are approximate draft bands. Confirm the clinical cut-offs with a clinician before using them for care decisions.</p>
                </div>}
              </fieldset>
              <fieldset>
                <legend>General medical and urological history</legend>
                <div className="intake-history-grid">
                  {INTAKE_HISTORY_OPTIONS.map(([field, label]) => (
                    <div className="intake-question" key={field}>
                      <strong>{label}</strong>
                      <div className="yes-no-options">
                        {[['yes', true], ['no', false]].map(([answer, value]) => (
                          <label className="choice-row" key={answer}>
                            <input
                              type="radio"
                              name={`intake-${field}`}
                              required
                              checked={intake[field] === value}
                              onChange={() => setIntake(current => ({ ...current, [field]: value }))}
                            />
                            {answer === 'yes' ? 'Yes' : 'No'}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
              <details className="intake-note">
                <summary>Add an optional note</summary>
                <label htmlFor="intake-note">Specific details (optional)</label>
                <textarea
                  id="intake-note"
                  maxLength="2000"
                  rows="4"
                  value={intake.note}
                  onChange={event => setIntake(current => ({ ...current, note: event.target.value }))}
                  placeholder="Add details only when needed"
                />
              </details>
              <button className="primary" disabled={savingIntake}>
                {savingIntake ? 'Saving…' : intake.updated_at ? 'Update patient intake' : 'Save patient intake'}
              </button>
            </form>
            {pageMessage && <p className="message" role="status">{pageMessage}</p>}
          </section>}
          {profileComplete && page === 'water' && <section className="water-card" aria-labelledby="water-heading">
            <div className="water-heading">
              <div>
                <span className="feature-icon">💧</span>
                <h3 id="water-heading">Water intake</h3>
                <p>Today's total · {waterSummary?.date || 'Loading…'}</p>
              </div>
              <label className="goal-field" htmlFor="hydration-goal">
                Daily goal (ml)
                <input
                  id="hydration-goal"
                  type="number"
                  min="250"
                  max="10000"
                  step="50"
                  value={hydrationGoal}
                  onChange={event => {
                    const goal = Number(event.target.value)
                    if (Number.isInteger(goal) && goal >= 250 && goal <= 10000) {
                      setHydrationGoal(goal)
                    }
                  }}
                />
              </label>
            </div>
            <div className="water-progress" aria-label={`${waterSummary?.total_ml || 0} of ${hydrationGoal} millilitres`}>
              <div
                className="water-progress-fill"
                style={{ width: `${Math.min(((waterSummary?.total_ml || 0) / hydrationGoal) * 100, 100)}%` }}
              />
            </div>
            <div className="water-total">
              <strong>{waterSummary?.total_ml || 0} ml</strong>
              <span>of {hydrationGoal} ml personal goal</span>
            </div>
            <p className="glass-size-note">Choose how many glasses you drank. 1 glass = {WATER_GLASS_ML} ml.</p>
            <div className="quick-add glass-quick-add" aria-label="Log water by glass">
              {[1, 2].map(glassCount => (
                <button
                  className="secondary glass-button"
                  key={glassCount}
                  type="button"
                  disabled={savingWater}
                  aria-label={`Log ${glassCount} ${glassCount === 1 ? 'glass' : 'glasses'}, ${glassCount * WATER_GLASS_ML} millilitres`}
                  onClick={() => addWater(glassCount * WATER_GLASS_ML)}
                >
                  <span className="glass-icons">
                    {Array.from({ length: glassCount }, (_, index) => <WaterGlassIcon key={index} />)}
                  </span>
                  <span>{glassCount} {glassCount === 1 ? 'glass' : 'glasses'} · {glassCount * WATER_GLASS_ML} ml</span>
                </button>
              ))}
            </div>
            <form className="custom-water-form" onSubmit={submitCustomWater}>
              <label htmlFor="water-amount">Custom amount (ml)</label>
              <div className="custom-water-controls">
                <input
                  id="water-amount"
                  type="number"
                  min="1"
                  max="5000"
                  required
                  value={waterAmount}
                  onChange={event => setWaterAmount(event.target.value)}
                  placeholder="e.g. 300"
                />
                <button className="primary" disabled={savingWater || !waterAmount}>
                  {savingWater ? 'Saving…' : 'Log water'}
                </button>
              </div>
              <p className="hint">Entries can be 1–5,000 ml. Your personal goal is for tracking only, not medical advice.</p>
            </form>
            <div className="water-history">
              <strong>Today's drinks</strong>
              {waterSummary?.entries?.length ? (
                <ul>
                  {waterSummary.entries.map(entry => (
                    <li key={entry.id}>
                      <span>
                        {entry.amount_ml % WATER_GLASS_ML === 0 && <>
                          {entry.amount_ml / WATER_GLASS_ML} {entry.amount_ml / WATER_GLASS_ML === 1 ? 'glass' : 'glasses'} ·{' '}
                        </>}
                        {entry.amount_ml} ml
                      </span>
                      <time dateTime={entry.logged_at}>{formatWaterTimestamp(entry.logged_at)}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{waterSummary ? 'No water entries yet today.' : 'Loading today’s entries…'}</p>
              )}
            </div>
            {waterMessage && <p className="message" role="status">{waterMessage}</p>}
          </section>}
          {profileComplete && page === 'bladder' && <section className="tracking-page" aria-labelledby="bladder-heading">
            <div className="tracking-page-heading">
              <div><span className="feature-icon">◷</span><h3 id="bladder-heading">Today's bladder log</h3></div>
              <span className="daily-count">{bladderSummary?.total ?? '…'} {bladderSummary?.total === 1 ? 'entry' : 'entries'}</span>
            </div>
            <p className="muted">Record each time you urinate. Entries use India local time for today's log.</p>
            <button className="primary" disabled={savingBladder} onClick={addBladderEntry}>
              {savingBladder ? 'Saving…' : 'Log urination now'}
            </button>
            <div className="water-history">
              <strong>{bladderSummary ? `Entries for ${bladderSummary.date}` : "Today's entries"}</strong>
              {bladderSummary?.entries?.length ? <ul>
                {bladderSummary.entries.map(entry => <li key={entry.id}>
                  <span>Urination</span>
                  <time dateTime={entry.logged_at}>{new Date(entry.logged_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
                </li>)}
              </ul> : <p className="muted">{bladderSummary ? 'No entries yet today.' : 'Loading today’s entries…'}</p>}
            </div>
          </section>}
          {profileComplete && page === 'checkin' && <section className="tracking-page" aria-labelledby="checkin-heading">
            <div className="tracking-page-heading">
              <div><span className="feature-icon">♡</span><h3 id="checkin-heading">How are you feeling today?</h3></div>
              <span className="daily-count">{checkIn?.date || 'Loading…'}</span>
            </div>
            <p className="muted">Log symptoms only. Your general bowel and medical history belongs in the clinic intake.</p>
            <form className="checkin-form" onSubmit={saveCheckIn}>
              <fieldset>
                <legend>Symptoms (select any that apply)</legend>
                <div className="symptom-grid">
                  {SYMPTOM_OPTIONS.map(([value, label]) => <label className="choice-row" key={value}>
                    <input type="checkbox" checked={symptoms.includes(value)} onChange={() => toggleSymptom(value)} />
                    {label}
                  </label>)}
                </div>
              </fieldset>
              <button className="primary" disabled={savingCheckIn || !checkIn}>
                {savingCheckIn ? 'Saving…' : checkIn?.updated_at ? 'Update today’s check-in' : 'Save today’s check-in'}
              </button>
            </form>
            {pageMessage && <p className="message" role="status">{pageMessage}</p>}
            {checkIn?.guidance?.length > 0 && <div className="guidance-card">
              <strong>Guidance based on your selections</strong>
              <ul>{checkIn.guidance.map(item => <li key={item}>{item}</li>)}</ul>
              <p>Rules-based educational information only—not a diagnosis or clinician-reviewed medical advice.</p>
            </div>}
            <div className="water-history">
              <strong>Recent check-ins</strong>
              {checkInHistory.length ? <ul>{checkInHistory.map(entry => <li key={entry.date}>
                <span>{entry.date}</span>
                <span>{entry.symptoms.length ? `${entry.symptoms.length} symptom${entry.symptoms.length === 1 ? '' : 's'}` : 'No symptoms'}</span>
              </li>)}</ul> : <p className="muted">Your saved daily check-ins will appear here.</p>}
            </div>
          </section>}
          {profileComplete && pageMessage && page !== 'checkin' && page !== 'intake' && <p className="message" role="status">{pageMessage}</p>}
        </section>
      )}
      <footer>Educational support only · Not a substitute for medical care</footer>
    </main>
  )
}
