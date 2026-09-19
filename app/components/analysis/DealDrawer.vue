<script setup lang="ts">
import type { Deal } from '~/data/deals'
import { formatCount } from '~/utils/deal-analysis'
import { metadataFor } from '~/utils/deal-formatting'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ title: string, deals: Deal[] }>()
const batchSize = 20
const visibleCount = ref(batchSize)
const visibleDeals = computed(() => props.deals.slice(0, visibleCount.value))
const hasMoreDeals = computed(() => visibleCount.value < props.deals.length)
const loadMoreSentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let loadFrame: number | null = null

function loadMoreDeals() {
  if (!hasMoreDeals.value || loadFrame !== null) {
    return
  }

  loadFrame = window.requestAnimationFrame(() => {
    visibleCount.value = Math.min(visibleCount.value + batchSize, props.deals.length)
    loadFrame = null
  })
}

function observeLoadMoreSentinel() {
  if (!import.meta.client) {
    return
  }

  observer?.disconnect()
  if (!loadMoreSentinel.value || !hasMoreDeals.value) {
    return
  }

  observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      loadMoreDeals()
    }
  }, { rootMargin: '0px 0px 320px' })
  observer.observe(loadMoreSentinel.value)
}

watch([() => props.title, () => props.deals, open], async () => {
  visibleCount.value = Math.min(batchSize, props.deals.length)
  await nextTick()
  observeLoadMoreSentinel()
}, { immediate: true })

onMounted(observeLoadMoreSentinel)

onBeforeUnmount(() => {
  observer?.disconnect()
  if (loadFrame !== null) {
    window.cancelAnimationFrame(loadFrame)
  }
})
</script>

<template>
  <USlideover v-model:open="open" :title="title"
    :ui="{ overlay: 'analysis-drawer-overlay', content: 'analysis-drawer w-full sm:max-w-2xl', header: 'analysis-drawer-header', body: 'analysis-drawer-body' }">
    <template #description>
      <span class="analysis-drawer-count"><strong>{{ formatCount(deals.length) }}</strong> entries</span>
    </template>
    <template #body>
      <ol class="analysis-deal-list">
        <li v-for="deal in visibleDeals" :key="deal.id">
          <article>
            <p class="analysis-deal-meta">
              <span>{{ deal.year }}</span>
              <span aria-hidden="true">·</span>
              <span class="analysis-deal-genre">{{ deal.genreGroup || deal.genre || 'Genre not listed' }}</span>
            </p>
            <h3>{{ deal.title || 'Untitled' }}</h3>
            <p v-if="deal.writers" class="analysis-deal-writers">
              {{ deal.writers }}
            </p>
            <p class="analysis-deal-logline">
              {{ deal.logline }}
            </p>
            <div v-if="metadataFor(deal).length" class="analysis-deal-metadata deal-rail">
              <div v-for="metadataItem in metadataFor(deal)" :key="metadataItem.label" class="metadata-item"
                :aria-label="`${metadataItem.label}: ${metadataItem.value}`">
                <UIcon :name="metadataItem.icon" class="metadata-icon" aria-hidden="true" />
                <span class="metadata-value">{{ metadataItem.value }}</span>
              </div>
            </div>
          </article>
        </li>
      </ol>
      <div
        v-if="hasMoreDeals"
        ref="loadMoreSentinel"
        class="analysis-list-sentinel"
        aria-hidden="true"
      />
    </template>
  </USlideover>
</template>
