<script setup lang="ts">
import type { AnalysisBar } from '~/utils/deal-analysis'
import { formatCount } from '~/utils/deal-analysis'

withDefaults(defineProps<{
  rows: AnalysisBar[]
  label?: string
}>(), { label: 'View chart data' })

defineEmits<{ select: [row: AnalysisBar] }>()
</script>

<template>
  <details class="analysis-data-details">
    <summary>{{ label }}</summary>
    <div class="analysis-table-scroll">
      <table class="analysis-chart-data-table">
        <caption class="visually-hidden">
          Chart data
        </caption>
        <thead>
          <tr>
            <th scope="col">
              Label
            </th>
            <th scope="col">
              Entries
            </th>
            <th scope="col">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.key"
          >
            <th scope="row">
              <button
                type="button"
                :disabled="!row.count"
                @click="$emit('select', row)"
              >
                {{ row.label }}
              </button>
            </th>
            <td>{{ formatCount(row.count) }}</td>
            <td>{{ row.share }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </details>
</template>
