export interface ApiEnvironment {
  DATABASE_URL: string
  JWT_SECRET: string
  PORT: string
}

export function validateEnvironment(environment: Record<string, unknown>) {
  const requiredKeys: Array<keyof ApiEnvironment> = ['DATABASE_URL', 'JWT_SECRET', 'PORT']
  const missing = requiredKeys.filter((key) => !environment[key] || String(environment[key]).trim() === '')

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  return environment
}
