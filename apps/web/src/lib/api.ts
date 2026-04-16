export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

export function normalizeApiErrorMessage(data: unknown, status: number) {
  if (data && typeof data === 'object') {
    const message = (data as { message?: unknown }).message

    if (Array.isArray(message)) {
      const normalized = message.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      if (normalized.length) {
        return normalized.join('；')
      }
    }

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return `请求失败，状态码 ${status}`
}

interface RequestOptions {
  method?: string
  body?: unknown
  token?: string
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new ApiError(normalizeApiErrorMessage(data, response.status), response.status, data)
  }

  return data as T
}
