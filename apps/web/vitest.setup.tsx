/// <reference types="vitest/globals" />
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
    update: vi.fn(),
  })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => '/dashboard'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

// Mock next-themes
vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: vi.fn(() => ({
    theme: 'system',
    setTheme: vi.fn(),
    resolvedTheme: 'light',
  })),
}))

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn().mockImplementation(() => ({
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
    removeQueries: vi.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, error: null })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

// Mock Radix UI components
vi.mock('@radix-ui/react-slot', () => ({
  Slot: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const icons = [
    'BookOpen', 'MessageSquare', 'BarChart', 'FolderOpen', 'Trophy',
    'ArrowRight', 'Target', 'Zap', 'Sparkles', 'User', 'Building',
    'GraduationCap', 'Mail', 'Lock', 'Eye', 'EyeOff', 'Loader2',
    'ChevronLeft', 'ChevronRight', 'Play', 'Pause', 'Volume2',
    'VolumeX', 'Maximize', 'Minimize', 'SkipBack', 'SkipForward',
    'AlertCircle', 'CheckCircle', 'Info', 'X', 'Menu', 'Settings',
    'LogOut', 'LayoutDashboard', 'Home', 'Search', 'FileQuestion',
    'RefreshCw'
  ]
  const mockIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg className={className} {...props} data-testid="mock-icon" />
  )
  return icons.reduce((acc, name) => ({ ...acc, [name]: mockIcon }), {})
})

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api'

// Suppress console.error in tests unless explicitly testing errors
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning: ReactDOM.render is no longer supported')) return
    if (args[0]?.includes?.('act(...)')) return
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})