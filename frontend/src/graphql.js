// ============================================================
// GraphQL-клиент для AppSync (через Vite-прокси, same-origin).
// Схема (schema.graphql):
//   type Note { id: ID!  title: String!  body: String!  createdAt: String }
//   Query  { notes: [Note]  note(id: ID!): Note }
//   Mutation { addNote(id: ID!, title: String!, body: String!): Note }
// ============================================================

import { GRAPHQL_URL } from './config.js'
import { getAccessToken } from './auth.js'

async function gql(query, variables = {}) {
  const token = getAccessToken()
  if (!token) throw new Error('Нет access_token — нужен логин')

  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    credentials: 'include',
  })

  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { throw new Error(`Не-JSON ответ HTTP ${res.status}: ${text.slice(0, 400)}`) }

  if (!res.ok) {
    const msg = data?.errors?.map(e => e.message).join('; ') || `HTTP ${res.status}`
    throw new Error(msg)
  }
  if (data.errors && data.errors.length) {
    throw new Error(data.errors.map(e => e.message).join('; '))
  }
  return data
}

export function fetchNotes() {
  return gql('{ notes { id title body createdAt } }').then(d => d.data.notes || [])
}

export function fetchNote(id) {
  return gql('{ note(id: $id) { id title body createdAt } }', { id })
    .then(d => d.data.note)
}

export function addNote(title, body) {
  const id = (crypto.randomUUID && crypto.randomUUID()) ||
    ('note-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8))
  return gql(
    'mutation($id: ID!, $title: String!, $body: String!) { addNote(id: $id, title: $title, body: $body) { id title body createdAt } }',
    { id, title, body },
  ).then(d => d.data.addNote)
}
