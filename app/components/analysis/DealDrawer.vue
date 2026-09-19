<script setup lang="ts">
import type { Deal } from '~/data/deals'
import { formatCount, rankField } from '~/utils/deal-analysis'
import { patternsFor, storyReviewFor } from '~/utils/story-patterns'
import { metadataFor } from '~/utils/deal-formatting'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ title: string, description: string, deals: Deal[] }>()
const visibleCount = ref(20)
const genres = computed(() => rankField(props.deals, 'genre').slice(0, 3))
watch(() => [props.title, open.value], () => {
  visibleCount.value = 20
})
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="title"
    :description="`${formatCount(deals.length)} entries. ${description}`"
    :ui="{ content: 'analysis-drawer w-full sm:max-w-2xl', header: 'analysis-drawer-header', body: 'analysis-drawer-body' }"
  >
    <template #body>
      <p
        v-if="genres.length"
        class="analysis-drawer-summary"
      >
        Recorded genres: {{ genres.map(row => `${row.label} ${row.count}`).join(' · ') }}
      </p>
      <ol class="analysis-deal-list">
        <li
          v-for="deal in deals.slice(0, visibleCount)"
          :key="deal.id"
        >
          <article>
            <p class="analysis-deal-meta">
              {{ deal.year }} · {{ deal.genre || 'Genre not listed' }}
            </p>
            <h3>{{ deal.title || 'Untitled' }}</h3>
            <p
              v-if="deal.writers"
              class="analysis-deal-writers"
            >
              {{ deal.writers }}
            </p>
            <p class="analysis-deal-logline">
              {{ deal.logline }}
            </p>
            <div
              v-if="patternsFor(deal).length"
              class="analysis-deal-patterns"
            >
              <span>AI interpretation</span>
              <ul>
                <li
                  v-for="pattern in patternsFor(deal)"
                  :key="pattern.key"
                  :title="pattern.description"
                >
                  {{ pattern.label }}
                </li>
              </ul>
            </div>
            <details class="analysis-deal-details">
              <summary>Source details &amp; saved analysis</summary>
              <AnalysisStoryBreakdown :deal="deal" />
              <dl>
                <div
                  v-for="item in metadataFor(deal)"
                  :key="item.label"
                >
                  <dt>{{ item.label === 'Release date' ? 'Recorded deal date' : item.label }}</dt><dd>{{ item.value }}</dd>
                </div>
                <div><dt>Source page</dt><dd>{{ deal.sourcePage }}</dd></div>
              </dl>
              <div
                v-if="patternsFor(deal).length"
                class="analysis-tag-evidence"
              >
                <p>Tags are based on the source logline quoted above, not the full screenplay.</p>
                <p
                  v-for="pattern in patternsFor(deal)"
                  :key="pattern.key"
                >
                  <strong>{{ pattern.label }}.</strong> {{ pattern.description }}
                </p>
              </div>
              <p
                v-else-if="!storyReviewFor(deal)?.structure"
                class="analysis-note"
              >
                {{ storyReviewFor(deal) ? 'Reviewed; none of the eight patterns was confidently assigned.' : 'This logline has not been reviewed for story patterns, or has changed since its review.' }}
              </p>
            </details>
          </article>
        </li>
      </ol>
      <div
        v-if="visibleCount < deals.length"
        class="analysis-more"
      >
        <UButton
          color="neutral"
          variant="outline"
          @click="visibleCount += 20"
        >
          Show 20 more entries
        </UButton>
        <span>{{ Math.min(visibleCount, deals.length) }} of {{ formatCount(deals.length) }}</span>
      </div>
    </template>
  </USlideover>
</template>
