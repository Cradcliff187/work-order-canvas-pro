import { vi } from 'vitest'

// Mock environment variables
vi.mock('@/lib/auth/auth-config', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}))