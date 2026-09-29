import type {
  ApiCategory,
  ApiDeck,
  ApiDeckDetail,
  ApiStatementCard,
  ApiPendingCard,
  ApiUser,
  ApiRoom,
  ApiRoomHistory,
  ApiUserStats,
} from './types'

import { getApiToken, getApiBaseUrl } from '@/lib/api'

const API_BASE = 'https://relfi-games.alphamindsdev.workers.dev/api'
const AM_AUTH_TOKEN_KEY = 'am-auth-token'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/)
  if (match) return match[1]
  return localStorage.getItem('relfi_token')
}

function setToken(token: string) {
  localStorage.setItem('relfi_token', token)
  document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax; Secure`
}

function clearToken() {
  localStorage.removeItem('relfi_token')
  document.cookie = 'token=; path=/; max-age=0'
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: 'Unknown error' }))) as any
    throw new ApiError(res.status, body.code || 'API_ERROR', body.error || 'Request failed')
  }

  return res.json()
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ===== Auth =====

export async function signup(email: string, password: string, displayName: string) {
  const data = await request<{ token: string; user: ApiUser }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, display_name: displayName }),
  })
  setToken(data.token)
  return data
}

export async function login(email: string, password: string) {
  const data = await request<{ token: string; user: ApiUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  return data
}

export async function requestMagicLink(email: string) {
  return request<{ message: string }>('/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function exchangeMagicLink(token: string) {
  const data = await request<{ token: string }>(`/auth/magic-link/verify?token=${token}`)
  setToken(data.token)
  return data
}

export function logout() {
  clearToken()
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

// Get AlphaMinds token from memory or localStorage
function getAlphaMindsToken(): string | null {
  // First try the in-memory token (set by authStore)
  const memToken = getApiToken()
  if (memToken) return memToken
  // Fallback to localStorage (persisted across page loads)
  if (typeof window !== 'undefined') {
    return localStorage.getItem(AM_AUTH_TOKEN_KEY)
  }
  return null
}

export function hasAlphaMindsToken(): boolean {
  return !!getAlphaMindsToken()
}

// Embedded SSO (AlphaMinds → Rel-Fi): ask the AlphaMinds API (same-origin) for a
// short-lived handoff JWT derived from the member's session, then exchange it at
// the Rel-Fi worker for a Rel-Fi token. No AlphaMinds session cookie is exposed.
export async function getHandoff(): Promise<string> {
  const alphaToken = getAlphaMindsToken()
  if (!alphaToken) {
    throw new ApiError(401, 'NOT_AUTHENTICATED', 'AlphaMinds session required')
  }
  const base = getApiBaseUrl()
  const res = await fetch(`${base}/v1/auth/relfi-handoff`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${alphaToken}`,
    },
  })
  if (!res.ok) {
    throw new ApiError(res.status, 'HANDOFF_FAILED', 'Failed to get handoff token')
  }
  const data = (await res.json()) as { handoff: string }
  return data.handoff
}

export async function embeddedLogin(handoff: string): Promise<{ token: string; user: ApiUser }> {
  const res = await fetch(`${API_BASE}/auth/embedded`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handoff }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
    throw new ApiError(res.status, body.code || 'EMBEDDED_LOGIN_FAILED', body.error || 'Embedded login failed')
  }
  const data = (await res.json()) as { token: string; user: ApiUser }
  setToken(data.token)
  return data
}

// ===== Categories =====

export async function getCategories(): Promise<ApiCategory[]> {
  return request('/categories')
}

export async function getCategory(id: string): Promise<ApiCategory> {
  return request(`/categories/${id}`)
}

export async function createCategory(data: Partial<ApiCategory>): Promise<ApiCategory> {
  return request('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCategory(id: string, data: Partial<ApiCategory>): Promise<ApiCategory> {
  return request(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteCategory(id: string): Promise<void> {
  await request(`/categories/${id}`, { method: 'DELETE' })
}

// ===== Decks =====

export async function getDecks(published?: boolean): Promise<ApiDeck[]> {
  const qs = published ? '?published=true' : ''
  return request(`/decks${qs}`)
}

export async function getDeck(id: string): Promise<ApiDeckDetail> {
  return request(`/decks/${id}`)
}

export async function createDeck(data: { title: string; description?: string; category_ids?: string[] }): Promise<ApiDeck> {
  return request('/decks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateDeck(id: string, data: Partial<ApiDeck>): Promise<ApiDeck> {
  return request(`/decks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteDeck(id: string): Promise<void> {
  await request(`/decks/${id}`, { method: 'DELETE' })
}

export async function publishDeck(id: string): Promise<void> {
  await request(`/decks/${id}/publish`, { method: 'POST' })
}

// ===== Statement Cards =====

export async function createCard(deckId: string, data: {
  statement_text?: string
  statement_image_url?: string
  correct_category_id: string
  friction_explanation?: string
  clue_variant?: string
  clue_payload?: string
  clue_type?: string
  clue_content?: string
  difficulty?: string
}): Promise<ApiStatementCard> {
  return request(`/decks/${deckId}/cards`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCard(deckId: string, cardId: string, data: Partial<ApiStatementCard>): Promise<ApiStatementCard> {
  return request(`/decks/${deckId}/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function uploadClueImage(file: File): Promise<{ url: string; key: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const token = getToken()
  const res = await fetch(`${API_BASE}/upload/clue-image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: 'Upload failed' }))) as any
    throw new ApiError(res.status, 'UPLOAD_FAILED', body.error || 'Upload failed')
  }
  return res.json()
}

export async function uploadTutorial(file: File): Promise<{ url: string; uploadedAt: number }> {
  const formData = new FormData()
  formData.append('file', file)
  const token = getToken()
  const res = await fetch(`${API_BASE}/upload/tutorial`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: 'Upload failed' }))) as any
    throw new ApiError(res.status, 'UPLOAD_FAILED', body.error || 'Upload failed')
  }
  return res.json()
}

export async function getTutorialInfo(): Promise<{ exists: boolean; url?: string; filename?: string; uploadedAt?: number }> {
  const res = await fetch(`${API_BASE}/tutorial/info`)
  if (!res.ok) return { exists: false }
  const data = (await res.json()) as any
  if (data.exists) {
    data.url = `${API_BASE}/tutorial/video`
  }
  return data
}

export const TUTORIAL_VIDEO_URL = `${API_BASE.replace('/api', '')}/api/tutorial/video`

export async function deleteCard(deckId: string, cardId: string): Promise<void> {
  await request(`/decks/${deckId}/cards/${cardId}`, { method: 'DELETE' })
}

// ===== Statement image uploads & pending cards =====

export async function uploadStatementImage(file: File): Promise<{ url: string; key: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const token = getToken()
  const res = await fetch(`${API_BASE}/upload/statement-image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: 'Upload failed' }))) as any
    throw new ApiError(res.status, 'UPLOAD_FAILED', body.error || 'Upload failed')
  }
  return res.json()
}

export async function uploadBulkStatementImages(deckId: string, files: File[]): Promise<{ success: boolean; imported: number; cards: ApiPendingCard[] }> {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  const token = getToken()
  const res = await fetch(`${API_BASE}/decks/${deckId}/cards/bulk-images`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: 'Upload failed' }))) as any
    throw new ApiError(res.status, 'IMPORT_FAILED', body.error || 'Upload failed')
  }
  return res.json()
}

export async function getPendingCards(deckId: string): Promise<ApiPendingCard[]> {
  return request(`/decks/${deckId}/cards/pending`)
}

export async function convertPendingCard(deckId: string, pendingId: string, data: Partial<ApiStatementCard>): Promise<ApiStatementCard> {
  return request(`/decks/${deckId}/cards/pending/${pendingId}/convert`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deletePendingCard(deckId: string, pendingId: string): Promise<void> {
  await request(`/decks/${deckId}/cards/pending/${pendingId}`, { method: 'DELETE' })
}

export async function bulkImportCards(deckId: string, file: File): Promise<{ success: boolean; imported: number }> {
  const formData = new FormData()
  formData.append('file', file)
  const token = getToken()
  const res = await fetch(`${API_BASE}/decks/${deckId}/cards/bulk-import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) throw new ApiError(res.status, 'IMPORT_FAILED', 'Import failed')
  return res.json()
}

// ===== Rooms =====

export async function createRoom(deckId: string, mode: string): Promise<{ room_id: string; room_code: string }> {
  return request('/rooms', {
    method: 'POST',
    body: JSON.stringify({ deck_id: deckId, mode }),
  })
}

export async function getRoom(code: string): Promise<ApiRoom> {
  return request(`/rooms/${code}`)
}

export async function joinRoom(code: string): Promise<{ room_id: string; ticket: string }> {
  return request(`/rooms/${code}/join`, { method: 'POST' })
}

export async function getRoomHistory(roomId: string): Promise<ApiRoomHistory[]> {
  return request(`/rooms/${roomId}/history`)
}

// ===== Users =====

export async function getMe(): Promise<ApiUser> {
  return request('/users/me')
}

export async function updateMe(data: { display_name?: string; avatar_url?: string }): Promise<ApiUser> {
  return request('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function getMyStats(): Promise<ApiUserStats> {
  return request('/users/me/stats')
}

// ===== AlphaMinds Integration =====

export interface AlphaMindsGameResult {
  gameId: string;
  roomCode: string;
  mode: 'solo' | 'seer_skeptic' | 'multiplayer_seer';
  tokensEarned: number;
  roundsPlayed: number;
  finalRank?: number;
  totalPlayers: number;
  completedAt: string;
  metadata?: Record<string, unknown>;
}

export interface AlphaMindsStats {
  becoming_score: number;
  connection_score: number;
  wellness_score: number;
  play_score: number;
  humanity_score: number;
  total_score: number;
  impact_score: number;
  current_streak_days: number;
  longest_streak_days: number;
  total_points: number;
  volunteer_hours: number;
  challenges_completed: number;
  events_attended: number;
  posts_authored: number;
  rooms_joined: number;
  detectors_completed: number;
  last_activity_at: string | null;
}

export interface AlphaMindsLeaderboardEntry {
  id: string;
  display_name: string;
  username: string;
  avatar_r2_key: string | null;
  primary_house: string;
  play_score: number;
  total_score: number;
  total_points: number;
  challenges_completed: number;
}

export interface AlphaMindsLeaderboardResponse {
  leaderboard: AlphaMindsLeaderboardEntry[];
  currentUserRank: number | null;
}

async function alphaMindsRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getApiToken()
  if (!token) {
    throw new ApiError(401, 'NOT_AUTHENTICATED', 'AlphaMinds session required')
  }
  const base = getApiBaseUrl()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  }
  const res = await fetch(`${base}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: 'Unknown error' }))) as any
    throw new ApiError(res.status, body.code || 'API_ERROR', body.error || 'Request failed')
  }
  return res.json()
}

export async function submitGameResult(data: AlphaMindsGameResult): Promise<{ success: boolean; stats: AlphaMindsStats }> {
  return alphaMindsRequest<{ success: boolean; stats: AlphaMindsStats }>('/v1/relfi/game-result', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getAlphaMindsStats(): Promise<{ stats: AlphaMindsStats }> {
  return alphaMindsRequest<{ stats: AlphaMindsStats }>('/v1/relfi/stats')
}

export async function getAlphaMindsLeaderboard(limit = 50, offset = 0): Promise<AlphaMindsLeaderboardResponse> {
  return alphaMindsRequest<AlphaMindsLeaderboardResponse>(`/v1/relfi/leaderboard?limit=${limit}&offset=${offset}`)
}
