import type { LocationQuery, LocationQueryRaw, LocationQueryValue } from 'vue-router'

export function getQueryString(value: LocationQueryValue | LocationQueryValue[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return value || ''
}

export function mergeQuery(current: LocationQuery, patch: Record<string, string | null | undefined>) {
  const next: LocationQueryRaw = { ...current }

  Object.entries(patch).forEach(([key, value]) => {
    if (!value) {
      delete next[key]
      return
    }

    next[key] = value
  })

  return next
}
