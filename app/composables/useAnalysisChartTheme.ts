import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface AnalysisChartTheme {
  paper: string
  ink: string
  inkSoft: string
  muted: string
  faint: string
  rule: string
  ruleSoft: string
  accent: string
  accentStrong: string
  fontFamily: string
}

const fallbackTheme: AnalysisChartTheme = {
  paper: '#f3efe5',
  ink: '#171716',
  inkSoft: '#3d3a35',
  muted: '#6b675f',
  faint: '#928d82',
  rule: 'rgba(23, 23, 22, 0.18)',
  ruleSoft: 'rgba(23, 23, 22, 0.1)',
  accent: '#d7aa00',
  accentStrong: '#bc9000',
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif'
}

function withAlpha(color: string, alpha: number) {
  if (!color.startsWith('#')) return color

  const hex = color.slice(1)
  const value = hex.length === 3 ? hex.split('').map(part => part + part).join('') : hex
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export function useAnalysisChartTheme() {
  const colorMode = useColorMode()
  const theme = ref<AnalysisChartTheme>(fallbackTheme)
  const reducedMotion = ref(false)
  let motionQuery: MediaQueryList | null = null

  function refresh() {
    if (!import.meta.client) return

    const rootStyles = getComputedStyle(document.documentElement)
    const read = (name: string, fallback: string) => rootStyles.getPropertyValue(name).trim() || fallback

    theme.value = {
      paper: read('--archive-paper', fallbackTheme.paper),
      ink: read('--archive-ink', fallbackTheme.ink),
      inkSoft: read('--archive-ink-soft', fallbackTheme.inkSoft),
      muted: read('--archive-muted', fallbackTheme.muted),
      faint: read('--archive-faint', fallbackTheme.faint),
      rule: read('--archive-rule', fallbackTheme.rule),
      ruleSoft: read('--archive-rule-soft', fallbackTheme.ruleSoft),
      accent: read('--archive-accent', fallbackTheme.accent),
      accentStrong: read('--archive-accent-strong', fallbackTheme.accentStrong),
      fontFamily: read('--font-sans', fallbackTheme.fontFamily)
    }
    reducedMotion.value = motionQuery?.matches ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function handleMotionChange(event: MediaQueryListEvent) {
    reducedMotion.value = event.matches
  }

  refresh()

  onMounted(() => {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener('change', handleMotionChange)
    refresh()
  })

  watch(colorMode, () => {
    nextTick(refresh)
  })

  onBeforeUnmount(() => {
    motionQuery?.removeEventListener('change', handleMotionChange)
  })

  return { theme, reducedMotion, withAlpha }
}
