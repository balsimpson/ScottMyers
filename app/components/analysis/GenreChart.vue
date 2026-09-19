<script setup lang="ts">
import type { ChartData, ChartOptions } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import type { AnalysisBar } from '~/utils/deal-analysis'
import { formatCount } from '~/utils/deal-analysis'

const props = defineProps<{ rows: AnalysisBar[] }>()
const emit = defineEmits<{ select: [row: AnalysisBar] }>()
const { theme, reducedMotion } = useAnalysisChartTheme()
const palette = ['#d7aa00', '#bc9000', '#8e6047', '#5e7c70', '#766b8f', '#ad6a5a', '#66788a', '#9c8549', '#8a6b62', '#557c8a']
const chartLabel = computed(() => `Genre mix: ${props.rows.map(row => `${row.label}, ${row.count} entries`).join('; ')}`)

const chartData = computed<ChartData<'doughnut', number[], string>>(() => ({
  labels: props.rows.map(row => row.label),
  datasets: [{
    label: 'Genres',
    data: props.rows.map(row => row.count),
    backgroundColor: props.rows.map((_row, index) => palette[index % palette.length] ?? theme.value.accent),
    borderColor: theme.value.paper,
    borderWidth: 2,
    hoverOffset: 8
  }]
}))

const chartOptions = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '66%',
  animation: {
    duration: reducedMotion.value ? 0 : 620,
    easing: 'easeOutCubic'
  },
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: theme.value.inkSoft,
        boxWidth: 12,
        boxHeight: 12,
        padding: 12,
        font: { family: theme.value.fontFamily, size: 11 }
      }
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const row = props.rows[context.dataIndex]
          return `${row?.label ?? context.label}: ${formatCount(row?.count ?? Number(context.parsed))} entries · ${row?.share ?? 0}%`
        }
      }
    }
  },
  onClick: (_event, elements) => {
    const index = elements[0]?.index
    const row = typeof index === 'number' ? props.rows[index] : undefined
    if (row?.count) emit('select', row)
  }
}))
</script>

<template>
  <figure
    v-if="rows.length"
    class="analysis-chart analysis-genre-figure"
  >
    <div class="analysis-canvas-wrap analysis-canvas-wrap--genre">
      <ClientOnly>
        <Doughnut
          :data="chartData"
          :options="chartOptions"
          :aria-label="chartLabel"
        />
        <template #fallback>
          <div
            class="analysis-chart-loading"
            aria-hidden="true"
          />
        </template>
      </ClientOnly>
    </div>
    <AnalysisChartDataTable
      :rows="rows"
      @select="row => emit('select', row)"
    />
    <figcaption>Each segment represents the share of entries with that recorded genre label.</figcaption>
  </figure>
</template>
