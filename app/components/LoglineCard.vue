<script setup lang="ts">
import type { Deal } from '~/data/deals'
import { displayDealTitle, loglinePath } from '~/utils/logline-routes'

const props = defineProps<{
  deal: Deal
}>()

const title = computed(() => displayDealTitle(props.deal))
const category = computed(() => [
  props.deal.year,
  props.deal.genreGroup || props.deal.genre
].filter(Boolean).join(' · '))
</script>

<template>
  <article class="logline-card">
    <NuxtLink
      class="logline-card-link"
      :to="loglinePath(deal)"
      :aria-label="`${title} logline`"
    >
      <div class="logline-card-meta">
        <span>{{ category }}</span>
        <span>Entry {{ deal.entryNumber }}</span>
      </div>
      <h2>{{ title }}</h2>
      <p class="logline-card-copy">
        {{ deal.logline }}
      </p>
      <p
        v-if="deal.writers"
        class="logline-card-writers"
      >
        {{ deal.writers }}
      </p>
    </NuxtLink>
  </article>
</template>
