<script setup lang="ts">
import type { AnalysisBar } from '~/utils/deal-analysis'
import { formatCount } from '~/utils/deal-analysis'

const props = withDefaults(defineProps<{ rows: AnalysisBar[], limit?: number }>(), { limit: 10 })
const emit = defineEmits<{ select: [row: AnalysisBar] }>()
const chartRows = computed(() => props.rows.slice(0, props.limit))
const maxCount = computed(() => Math.max(chartRows.value[0]?.count ?? 0, 1))

function barWidth(row: AnalysisBar) {
  return `${Math.max(row.count ? 4 : 0, row.count / maxCount.value * 100)}%`
}
</script>

<template>
  <figure
    v-if="chartRows.length"
    class="analysis-ranked-figure"
  >
    <ol class="analysis-ranked-list">
      <li
        v-for="row in chartRows"
        :key="row.key"
      >
        <button
          type="button"
          class="analysis-ranked-row"
          :disabled="!row.count"
          :aria-label="`${row.label}: ${formatCount(row.count)} entries, ${row.share}% of selected archive. View matching entries`"
          @click="emit('select', row)"
        >
          <span class="analysis-ranked-row-label">
            <span>{{ row.label }}</span>
            <span class="analysis-ranked-row-value">
              <strong>{{ formatCount(row.count) }}</strong>
              <small>{{ row.share }}%</small>
            </span>
          </span>
          <span
            class="analysis-ranked-track"
            aria-hidden="true"
          >
            <span
              class="analysis-ranked-fill"
              :style="{ width: barWidth(row) }"
            />
          </span>
        </button>
      </li>
    </ol>
    <figcaption>Select a row to open its matching source entries.</figcaption>
  </figure>
</template>
