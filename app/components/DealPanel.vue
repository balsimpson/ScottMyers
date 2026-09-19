<script setup lang="ts">
import type { Deal } from '~/data/deals'
import { metadataFor } from '~/utils/deal-formatting'

const props = defineProps<{
  deal: Deal
}>()

const metadata = computed(() => metadataFor(props.deal))

function dealTitleClass(title: string | null) {
  const length = title?.length ?? 0
  if (length > 100) return 'deal-title--epic'
  if (length > 64) return 'deal-title--long'
  return ''
}

function dealLoglineClass(logline: string) {
  if (logline.length > 700) return 'deal-logline--epic'
  if (logline.length > 500) return 'deal-logline--long'
  return ''
}
</script>

<template>
  <article class="deal-stage">
    <section class="deal-copy">
      <div
        v-if="deal.year || deal.genre"
        class="deal-eyebrow"
      >
        <span
          v-if="deal.year"
          class="deal-eyebrow-year"
        >{{ deal.year }}</span>
        <span
          v-if="deal.year && deal.genre"
          class="deal-eyebrow-separator"
          aria-hidden="true"
        >·</span>
        <span
          v-if="deal.genre"
          class="deal-eyebrow-genre"
        >{{ deal.genre }}</span>
      </div>
      <h2
        v-if="deal.title"
        :class="['deal-title', dealTitleClass(deal.title)]"
      >
        {{ deal.title }}
      </h2>

      <div
        v-if="deal.writers"
        class="deal-byline"
      >
        <p
          v-if="deal.writers"
          class="deal-writers"
        >
          {{ deal.writers }}
        </p>
      </div>

      <div class="deal-logline-wrap">
        <p :class="['deal-logline', dealLoglineClass(deal.logline)]">
          {{ deal.logline }}
        </p>
      </div>
    </section>

    <aside
      class="deal-rail"
      aria-label="Deal metadata"
    >
      <div
        v-for="metadataItem in metadata"
        :key="metadataItem.label"
        class="metadata-item"
        :aria-label="`${metadataItem.label}: ${metadataItem.value}`"
      >
        <UIcon
          :name="metadataItem.icon"
          class="metadata-icon"
          aria-hidden="true"
        />
        <span class="metadata-value">
          {{ metadataItem.value }}
        </span>
      </div>
    </aside>
  </article>
</template>
