import {
  deals,
  type Deal
} from '~/data/deals'

const RENDER_RADIUS = 2
const SCROLL_SETTLE_DELAY = 140

export function useDealFeed() {
  const feedViewport = ref<HTMLElement | null>(null)
  const shuffledDeals = ref<Deal[]>(deals)
  const renderIndex = ref(0)
  const detailsReady = ref(false)

  let scrollEndTimer: ReturnType<typeof setTimeout> | undefined
  let renderFrame: number | undefined
  let shuffleFrame: number | undefined
  let feedVersion = 0
  let navigationVersion = 0
  let supportsScrollEnd = false
  let disposed = false

  function createShuffleSeed() {
    const seed = new Uint32Array(1)

    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(seed)
      return seed[0] ?? 0
    }

    return Math.floor(Math.random() * 0x100000000)
  }

  function createSeededRandom(seed: number) {
    let state = seed >>> 0

    return () => {
      state += 0x6D2B79F5
      let value = state
      value = Math.imul(value ^ value >>> 15, value | 1)
      value ^= value + Math.imul(value ^ value >>> 7, value | 61)
      return ((value ^ value >>> 14) >>> 0) / 4294967296
    }
  }

  function shuffleDeals(source: Deal[], avoidFirstId?: string) {
    const random = createSeededRandom(createShuffleSeed())
    const candidates = source.filter(deal => deal.id !== avoidFirstId)
    const firstDeal = candidates[Math.floor(random() * candidates.length)] ?? source[0]
    if (!firstDeal) return []

    const result = source.filter(deal => deal.id !== firstDeal.id)

    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1))
      const currentDeal = result[index]
      const swapDeal = result[swapIndex]
      if (!currentDeal || !swapDeal) continue
      result[index] = swapDeal
      result[swapIndex] = currentDeal
    }

    return [firstDeal, ...result]
  }

  function updateRenderIndex() {
    const viewport = feedViewport.value
    if (!viewport || viewport.clientHeight === 0) return

    renderIndex.value = Math.min(
      Math.max(Math.round(viewport.scrollTop / viewport.clientHeight), 0),
      shuffledDeals.value.length - 1
    )
  }

  function scheduleRenderUpdate() {
    if (renderFrame !== undefined) return

    renderFrame = requestAnimationFrame(() => {
      renderFrame = undefined
      updateRenderIndex()
    })
  }

  function clearScrollEndTimer() {
    if (scrollEndTimer !== undefined) {
      clearTimeout(scrollEndTimer)
      scrollEndTimer = undefined
    }
  }

  function settleActiveDeal() {
    scrollEndTimer = undefined
    updateRenderIndex()
  }

  function handleFeedScroll() {
    scheduleRenderUpdate()

    if (supportsScrollEnd) return
    clearScrollEndTimer()
    scrollEndTimer = setTimeout(settleActiveDeal, SCROLL_SETTLE_DELAY)
  }

  function handleFeedScrollEnd() {
    clearScrollEndTimer()
    settleActiveDeal()
  }

  function isFormControl(target: EventTarget | null) {
    const element = target instanceof HTMLElement ? target : null
    return Boolean(
      element?.isContentEditable
      || element?.closest('button, input, select, textarea, [contenteditable="true"]')
    )
  }

  async function handleFeedKeydown(event: KeyboardEvent) {
    if (
      (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')
      || event.metaKey
      || event.ctrlKey
      || event.altKey
      || event.shiftKey
      || isFormControl(event.target)
    ) return

    const nextIndex = renderIndex.value + (event.key === 'ArrowDown' ? 1 : -1)
    const nextDeal = shuffledDeals.value[nextIndex]
    if (!nextDeal) return

    event.preventDefault()
    await navigateToDeal(nextDeal.id, 'smooth')
  }

  async function navigateToDeal(dealId: string, behavior: ScrollBehavior = 'auto') {
    const version = feedVersion
    const navigation = ++navigationVersion
    const targetIndex = shuffledDeals.value.findIndex(deal => deal.id === dealId)
    if (targetIndex < 0) return null

    if (shuffleFrame !== undefined) {
      cancelAnimationFrame(shuffleFrame)
      shuffleFrame = undefined
    }
    detailsReady.value = true
    renderIndex.value = targetIndex
    await nextTick()
    if (disposed || version !== feedVersion || navigation !== navigationVersion) return null

    const viewport = feedViewport.value
    const target = document.getElementById(`deal-${dealId}`)
    if (!viewport || !target) return null

    const scrollBehavior = behavior === 'smooth'
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'smooth'
      : 'auto'

    viewport.scrollTo({
      top: target.offsetTop,
      behavior: scrollBehavior
    })
    await nextTick()
    if (disposed || version !== feedVersion || navigation !== navigationVersion) return null
    return targetIndex
  }

  function shuffleFeed(shouldAnimate = false) {
    const version = ++feedVersion
    const navigation = ++navigationVersion
    const currentIndex = renderIndex.value
    const currentDeal = shuffledDeals.value[currentIndex]
    const canAnimate = shouldAnimate
      && Boolean(currentDeal)
      && currentIndex < shuffledDeals.value.length - 1
    const currentPrefix = canAnimate
      ? shuffledDeals.value.slice(0, currentIndex + 1)
      : []
    const currentPrefixIds = new Set(currentPrefix.map(deal => deal.id))
    const source = currentPrefix.length
      ? deals.filter(deal => !currentPrefixIds.has(deal.id))
      : deals
    const previousFirstId = shuffledDeals.value[0]?.id
    const nextOrder = shuffleDeals(source, currentPrefix.length ? undefined : previousFirstId)
    const nextDeals = currentPrefix.length
      ? [...currentPrefix, ...nextOrder]
      : nextOrder

    shuffledDeals.value = nextDeals
    detailsReady.value = currentPrefix.length > 0
    renderIndex.value = currentPrefix.length > 0 ? currentIndex : 0
    clearScrollEndTimer()
    if (renderFrame !== undefined) {
      cancelAnimationFrame(renderFrame)
      renderFrame = undefined
    }
    if (shuffleFrame !== undefined) {
      cancelAnimationFrame(shuffleFrame)
      shuffleFrame = undefined
    }

    nextTick(() => {
      if (disposed || version !== feedVersion || navigation !== navigationVersion) return
      shuffleFrame = requestAnimationFrame(() => {
        shuffleFrame = undefined
        if (disposed || version !== feedVersion || navigation !== navigationVersion) return
        const viewport = feedViewport.value
        if (!viewport) return

        if (currentPrefix.length > 0) {
          const nextDeal = nextOrder[0]
          if (nextDeal) void navigateToDeal(nextDeal.id, 'smooth')
          return
        }

        viewport.scrollTop = 0
        detailsReady.value = true
      })
    })
  }

  function isDealRendered(index: number) {
    return Math.abs(index - renderIndex.value) <= RENDER_RADIUS
  }

  onMounted(() => {
    disposed = false
    const viewport = feedViewport.value
    if (!viewport) return

    supportsScrollEnd = 'onscrollend' in window
    viewport.addEventListener('scroll', handleFeedScroll, { passive: true })
    if (supportsScrollEnd) viewport.addEventListener('scrollend', handleFeedScrollEnd)
    window.addEventListener('keydown', handleFeedKeydown)
    shuffleFeed()
  })

  onUnmounted(() => {
    disposed = true
    const viewport = feedViewport.value
    viewport?.removeEventListener('scroll', handleFeedScroll)
    if (supportsScrollEnd) viewport?.removeEventListener('scrollend', handleFeedScrollEnd)
    window.removeEventListener('keydown', handleFeedKeydown)
    clearScrollEndTimer()
    if (renderFrame !== undefined) cancelAnimationFrame(renderFrame)
    if (shuffleFrame !== undefined) cancelAnimationFrame(shuffleFrame)
  })

  return {
    detailsReady,
    feedViewport,
    isDealRendered,
    navigateToDeal,
    shuffledDeals,
    shuffleFeed
  }
}
