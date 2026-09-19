<script setup lang="ts">
import type { AnalysisBar } from '~/utils/deal-analysis'

const props = defineProps<{ rows: AnalysisBar[] }>()
defineEmits<{ select: [row: AnalysisBar] }>()
const max = computed(() => Math.max(1, ...props.rows.map(row => row.count)))
</script>

<template>
  <figure class="analysis-chart analysis-year-figure">
    <div
      class="analysis-year-scroll"
      role="region"
      aria-label="Entries by year. Scroll horizontally for all years."
      tabindex="0"
    >
      <div
        class="analysis-year-columns"
        :style="{ gridTemplateColumns: `repeat(${rows.length}, minmax(1.25rem, 1fr))` }"
      >
        <button
          v-for="(row, index) in rows"
          :key="row.key"
          type="button"
          class="analysis-year-column"
          :disabled="!row.count"
          :aria-label="`${row.label}: ${row.count} entries, ${row.share}%. View entries`"
          :title="`${row.label}: ${row.count} entries (${row.share}%)`"
          @click="$emit('select', row)"
        >
          <span class="analysis-year-count">{{ row.count }}</span>
          <span
            class="analysis-year-track"
            aria-hidden="true"
          >
            <span :style="{ height: `${row.count / max * 100}%` }" />
          </span>
          <span class="analysis-year-label">{{ index === 0 || index === rows.length - 1 || +row.key % 5 === 0 ? row.label : '·' }}</span>
        </button>
      </div>
    </div>
    <figcaption>Choose a year to read its entries. Counts describe this collection’s coverage, not total market activity.</figcaption>
  </figure>
</template>
