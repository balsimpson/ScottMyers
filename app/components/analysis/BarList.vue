<script setup lang="ts">
import type { AnalysisBar } from '~/utils/deal-analysis'
import { formatCount } from '~/utils/deal-analysis'

const props = withDefaults(defineProps<{ rows: AnalysisBar[], limit?: number }>(), { limit: 10 })
defineEmits<{ select: [row: AnalysisBar] }>()
const max = computed(() => Math.max(1, ...props.rows.map(row => row.count)))
</script>

<template>
  <ol class="analysis-bars">
    <li
      v-for="row in rows.slice(0, limit)"
      :key="row.key"
    >
      <button
        type="button"
        class="analysis-bar-button"
        :disabled="!row.count"
        :aria-label="`${row.label}: ${formatCount(row.count)} entries, ${row.share}%. View entries`"
        @click="$emit('select', row)"
      >
        <span class="analysis-bar-label">
          <span>{{ row.label }}</span>
          <span>{{ formatCount(row.count) }} <small>{{ row.share }}%</small></span>
        </span>
        <span
          class="analysis-bar-track"
          aria-hidden="true"
        >
          <span
            class="analysis-bar-fill"
            :style="{ width: `${row.count / max * 100}%` }"
          />
        </span>
      </button>
    </li>
  </ol>
</template>
