import React, { useEffect, useState, useCallback } from 'react'
import { login, handleCallback, getAccessToken, logout } from './auth.js'
import { fetchNotes, addNote } from './graphql.js'

// ============================================================
// App: /callback-обработка -> Login | Notes
// ============================================================

export default function App() {
  const [token, setToken] = useState(getAccessToken())
  const [notes, setNotes] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    try {
      const list = await fetchNotes()
      setNotes(list)
    } catch (e) {
      if (String(e.message).match(/401|unauthorized|no access|token/i) && !getAccessToken()) {
        setToken(null) // сессия протухла — на логин
      } else {
        setError(e.message)
      }
    }
  }, [])

  // Обработка callback'а: /callback?code=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      // code одноразовый — сразу чистим URL, чтобы не пытаться повторно
      history.replaceState(null, '', window.location.pathname)
      handleCallback(params)
        .then(() => { setToken(getAccessToken()); refresh() })
        .catch(e => setError('Ошибка обмена code на токены: ' + e.message))
      return
    }
    const oauthError = params.get('error')
    if (oauthError) {
      setError('Cognito вернул error: ' + oauthError + ' ' + (params.get('error_description') || ''))
      history.replaceState(null, '', window.location.pathname)
      return
    }
    if (getAccessToken()) refresh()
  }, [refresh])

  if (error) {
    return (
      <div className="panel">
        <h1>Serverless Notes</h1>
        <div className="err">{error}</div>
        <button className="btn" onClick={() => window.location.assign('/')}>На главную</button>
      </div>
    )
  }

  if (!token) {
    return <Login onSuccess={() => { setToken(getAccessToken()); refresh() }} notice={notice} />
  }

  return (
    <div className="panel">
      <header className="row">
        <h1>Serverless Notes</h1>
        <div className="row">
          <span className="muted">Cognito + AppSync + DynamoDB · Floci</span>
          <button className="btn ghost" onClick={logout}>Выйти</button>
        </div>
      </header>

      {notice && <div className="ok">{notice}</div>}

      <AddNote onAdded={(n) => { setNotes(prev => [n, ...prev]); setNotice(`Заметка «${n.id}» сохранена`); }} setBusy={setBusy} busy={busy} />

      <section>
        <div className="row">
          <h2>Заметки ({notes.length})</h2>
          <button className="btn ghost" onClick={refresh} disabled={busy}>{busy ? '…' : 'Обновить'}</button>
        </div>
        {notes.length === 0 && <div className="muted">Пусто. Добавьте первую заметку выше.</div>}
        <ul className="notes">
          {notes.map(n => (
            <li key={n.id} className="note">
              <div className="note-head">
                <strong>{n.title}</strong>
                <code className="note-id" title={n.id}>{n.id}</code>
              </div>
              <div className="note-body">{n.body}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Login({ onSuccess, notice }) {
  const [u, setU] = useState('dev@example.com')
  const [p, setP] = useState('Notes#2024')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      // login() поднимает скрытую HTML-форму с credential'ами;
      // браузер сам пройдёт POST -> 302 -> /callback?code=...
      await login(u, p)
    } catch (ex) {
      setErr(ex.message); setBusy(false)
    }
  }

  return (
    <div className="panel login">
      <h1>Вход в заметки</h1>
      <p className="muted">
        Cognito managed login (форма <code>/cognito-idp/login</code>) + OAuth code + PKCE S256.<br />
        Демо-юзер: <code>dev@example.com</code> / <code>Notes#2024</code>
      </p>
      {notice && <div className="ok">{notice}</div>}
      <form onSubmit={submit} className="form">
        <label>E-mail
          <input value={u} onChange={e => setU(e.target.value)} autoFocus required />
        </label>
        <label>Пароль
          <input type="password" value={p} onChange={e => setP(e.target.value)} required />
        </label>
        {err && <div className="err">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Логин… (редирект)' : 'Войти'}</button>
      </form>
    </div>
  )
}

function AddNote({ onAdded, setBusy, busy }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true); setErr('')
    try {
      const n = await addNote(title.trim(), body)
      setTitle(''); setBody('')
      onAdded(n)
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form add" onSubmit={submit}>
      <h2>Новая заметка</h2>
      <input placeholder="Заголовок" value={title} onChange={e => setTitle(e.target.value)} required />
      <textarea placeholder="Текст заметки" value={body} onChange={e => setBody(e.target.value)} rows={3} />
      {err && <div className="err">{err}</div>}
      <button className="btn" disabled={!title.trim() || busy}>{busy ? 'Сохранение…' : 'Добавить'}</button>
    </form>
  )
}
