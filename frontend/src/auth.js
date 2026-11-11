// ============================================================
// Auth: Cognito managed login (форма) + OAuth code flow + PKCE
//
// Референс реализации — notes-serverless/smoke_test.sh.
//
// Структура формы логина Floci (проверено):
//   <form method="post" action="/cognito-idp/login">
//     <input name="_csrf" value="...">
//     <input name="response_type" value="code">
//     <input name="client_id" value="...">
//     <input name="redirect_uri" value="http://localhost:5173/callback">
//     <input name="scope" value="...">
//     <input name="state" value="...">
//     <input name="code_challenge" value="...">
//     <input name="code_challenge_method" value="S256">
//     <input name="username">
//     <input name="password">
//   </form>
//
// Браузерный flow:
//   1) login(): GET-им форму через Vite-прокси (same-origin),
//      клонируем ВСЕ её hidden-поля в новую форму, подставляем
//      username/password и submit-им. Браузер САМ следует 302
//      до http://localhost:5173/callback?code=...&state=...
//   2) App.jsx (на /callback): handleCallback() меняет code на
//      токены (POST form-encoded через прокси) -> sessionStorage.
//
// ВАЖНО: crypto.subtle доступен ТОЛЬКО в secure-контекстах
// (https:// или http://localhost / 127.0.0.1). При доступе по
// LAN-адресу (например http://192.168.x.x:5173) crypto.subtle
// будет undefined — поэтому ниже есть чистый JS-фолбэк SHA-256.
// ============================================================

import {
  COGNITO_CLIENT_ID,
  REDIRECT_URI,
  SCOPES,
  TOKEN_URL,
  LOGIN_URL_BASE,
} from './config.js'

const VERIFIER_KEY = 'notes.pkce_verifier'
const STATE_KEY = 'notes.auth_state'
const TOKEN_KEY = 'notes.tokens'

// ---------- SHA-256 (чистый JS, для фолбэка без crypto.subtle) ----------
// Сжатая реализация (свойство: возвращает Uint8Array из 32 байт).

function sha256PureJs(asciiInput) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]

  function rr(x, n) { return (x >>> n) | (x << (32 - n)) }

  const bytes = []
  for (let i = 0; i < asciiInput.length; i++) bytes.push(asciiInput.charCodeAt(i) & 0xff)

  const bitLen = bytes.length * 8
  bytes.push(0x80)
  while (bytes.length % 64 !== 56) bytes.push(0)
  // Длина в битах, big-endian, 8 байт (32-битным частям)
  for (let i = 7; i >= 0; i--) bytes.push((bitLen / Math.pow(2, i * 8)) & 0xff)

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]

  for (let off = 0; off < bytes.length; off += 64) {
    const W = new Array(64)
    for (let t = 0; t < 16; t++) {
      W[t] = (bytes[off + t * 4] << 24) | (bytes[off + t * 4 + 1] << 16)
            | (bytes[off + t * 4 + 2] << 8) | bytes[off + t * 4 + 3]
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rr(W[t - 15], 7) ^ rr(W[t - 15], 18) ^ (W[t - 15] >>> 3)
      const s1 = rr(W[t - 2], 17) ^ rr(W[t - 2], 19) ^ (W[t - 2] >>> 10)
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0
    }

    let [a, b, c, d, e, f, g, h] = H
    for (let t = 0; t < 64; t++) {
      const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + S1 + ch + K[t] + W[t]) | 0
      const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) | 0
      h = g; g = f; f = e; e = (d + t1) | 0
      d = c; c = b; b = a; a = (t1 + t2) | 0
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0
    H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0
    H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0
  }

  const out = new Uint8Array(32)
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (H[i] >>> 24) & 0xff
    out[i * 4 + 1] = (H[i] >>> 16) & 0xff
    out[i * 4 + 2] = (H[i] >>> 8) & 0xff
    out[i * 4 + 3] = H[i] & 0xff
  }
  return out
}

// ---------- PKCE ----------

function bytesToB64url(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256b64url(input) {
  // Предпочитаем Web Crypto, но он доступен только в secure-контексте.
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return bytesToB64url(new Uint8Array(digest))
  }
  // Фолбэк: чистый JS SHA-256 (работает по http://LAN-адресу).
  // PKCE-верификатор — ASCII-строка base64url, так что кодирование 1:1.
  return bytesToB64url(sha256PureJs(input))
}

function randomB64url(bytes) {
  const arr = new Uint8Array(bytes)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr)
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256)
  }
  return bytesToB64url(arr)
}

// ---------- sessionStorage ----------

function sget(k) { try { return sessionStorage.getItem(k) } catch { return null } }
function sset(k, v) { try { sessionStorage.setItem(k, v) } catch {} }
function sdel(k) { try { sessionStorage.removeItem(k) } catch {} }

export function getAccessToken() {
  const raw = sget(TOKEN_KEY)
  if (!raw) return null
  try {
    const t = JSON.parse(raw)
    if (t.expires_in && t.issued_at && Date.now() / 1000 > t.issued_at + t.expires_in - 10) {
      sdel(TOKEN_KEY)
      return null
    }
    return t.access_token
  } catch {
    return null
  }
}

export function logout() {
  sdel(TOKEN_KEY)
  history.replaceState(null, '', window.location.pathname)
  window.location.reload()
}

// ---------- 1) login: форма + credential'ы -> 302 -> /callback ----------

export async function login(username, password) {
  // PKCE: verifier держим в sessionStorage для обмена code
  const verifier = randomB64url(48)
  const challenge = await sha256b64url(verifier)
  const state = randomB64url(16)
  sset(VERIFIER_KEY, verifier)
  sset(STATE_KEY, state)

  const q = new URLSearchParams({
    response_type: 'code',
    client_id: COGNITO_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  const url = `${LOGIN_URL_BASE}?${q}`

  // GET формы (через Vite-прокси; редиректы до HTML формы браузер сам проследует)
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status} при запросе формы логина: ${text.slice(0, 300)}`)
  }
  const html = await res.text()

  // Разбираем форму: берём action и ВСЕ её поля
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const form = doc.querySelector('form')
  if (!form) throw new Error('Форма логина не найдена в ответе:\n' + html.slice(0, 400))

  const action = form.getAttribute('action')
  if (!action) throw new Error('Нет action у формы логина')

  // Собираем реальную форму: копируем все fields из ответа + username/password
  const real = document.createElement('form')
  real.method = (form.getAttribute('method') || 'post').toLowerCase()
  real.action = action // относительный путь -> Vite-прокси
  real.style.display = 'none'

  const seen = new Set()
  form.querySelectorAll('input, button, select, textarea').forEach(el => {
    const name = el.getAttribute('name')
    if (!name || seen.has(name)) return
    seen.add(name)
    if (name === 'username' || name === 'password') return // подставим сами
    const copy = document.createElement('input')
    copy.type = 'hidden'
    copy.name = name
    copy.value = el.value !== undefined && el.value !== null ? el.value : (el.getAttribute('value') || '')
    real.appendChild(copy)
  })

  const mk = (name, value) => {
    const i = document.createElement('input')
    i.type = 'hidden'
    i.name = name
    i.value = value
    real.appendChild(i)
  }
  mk('username', username)
  mk('password', password)

  document.body.appendChild(real)
  real.submit()
  // Браузер уходит на 302 -> http://localhost:5173/callback?code=...&state=...
}

// ---------- 2) /callback: code -> токены ----------

export async function handleCallback(searchParams) {
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const expected = sget(STATE_KEY)
  const verifier = sget(VERIFIER_KEY)
  if (!code) throw new Error('Нет code в URL: ' + window.location.href)
  if (expected && state && state !== expected) throw new Error('state не совпал (CSRF?)')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: COGNITO_CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
  })
  if (verifier) body.set('code_verifier', verifier)

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    credentials: 'include',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token endpoint HTTP ${res.status}: ${text}`)
  }
  const tokens = await res.json()
  if (!tokens.access_token) throw new Error('Нет access_token в ответе: ' + JSON.stringify(tokens))

  sset(TOKEN_KEY, JSON.stringify({ ...tokens, issued_at: Math.floor(Date.now() / 1000) }))
  sdel(VERIFIER_KEY)
  sdel(STATE_KEY)
  history.replaceState(null, '', window.location.pathname)
  return tokens
}
