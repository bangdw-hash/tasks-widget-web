import { getToken } from './auth.js'

const BASE = 'https://tasks.googleapis.com/tasks/v1'

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  if (res.status === 204) return null
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.error?.message || `HTTP ${res.status}`), { status: res.status })
  }
  return res.json()
}

export async function getTaskLists() {
  const data = await req('/users/@me/lists?maxResults=100')
  return (data.items || []).map(l => ({ id: l.id, title: l.title }))
}

export async function createTaskList(title) {
  const data = await req('/users/@me/lists', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
  return { id: data.id, title: data.title }
}

export async function getTasks(listId) {
  const data = await req(
    `/lists/${encodeURIComponent(listId)}/tasks?showCompleted=false&showHidden=false&maxResults=100`
  )
  return data.items || []
}

export async function getCompletedTasks(listId, maxResults = 50) {
  const data = await req(
    `/lists/${encodeURIComponent(listId)}/tasks?showCompleted=true&showHidden=true&maxResults=100`
  )
  const items = (data.items || []).filter(t => t.status === 'completed')
  items.sort((a, b) => (b.completed || '').localeCompare(a.completed || ''))
  return items.slice(0, maxResults)
}

export async function insertTask(listId, { title, due, notes }) {
  const body = { title }
  if (due) body.due = `${due}T00:00:00.000Z`
  if (notes) body.notes = notes
  return req(`/lists/${encodeURIComponent(listId)}/tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function patchTask(listId, taskId, fields) {
  return req(`/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  })
}

export const completeTask = (listId, taskId) =>
  patchTask(listId, taskId, { status: 'completed' })

export const uncompleteTask = (listId, taskId) =>
  patchTask(listId, taskId, { status: 'needsAction' })

export const updateTask = (listId, taskId, { title, due, notes }) => {
  const body = {}
  if (title !== undefined) body.title = title
  if (due !== undefined) body.due = due ? `${due}T00:00:00.000Z` : null
  if (notes !== undefined) body.notes = notes
  return patchTask(listId, taskId, body)
}

export const deleteTask = (listId, taskId) =>
  req(`/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
  })
