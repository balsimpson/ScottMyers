<script setup lang="ts">
import type { Deal } from '~/data/deals'
import { formatCount } from '~/utils/deal-analysis'
import { metadataFor } from '~/utils/deal-formatting'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ title: string, deals: Deal[] }>()
const visibleCount = ref(20)
watch(() => [props.title, open.value], () => {
  visibleCount.value = 20
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
        <li v-for="deal in deals.slice(0, visibleCount)" :key="deal.id">
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
      <div v-if="visibleCount < deals.length" class="analysis-more">
        <UButton color="neutral" variant="outline" @click="visibleCount += 20">
          Show <strong>20</strong> more
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
