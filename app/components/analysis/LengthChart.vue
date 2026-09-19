<script setup lang="ts">
import type { ChartData, ChartOptions } from 'chart.js'
import { Bar } from 'vue-chartjs'
import type { AnalysisBar } from '~/utils/deal-analysis'
import { formatCount } from '~/utils/deal-analysis'

const props = defineProps<{ rows: AnalysisBar[] }>()
const emit = defineEmits<{ select: [row: AnalysisBar] }>()
const { theme, reducedMotion, withAlpha } = useAnalysisChartTheme()
const chartLabel = computed(() => `Logline length distribution: ${props.rows.map(row => `${row.label}, ${row.count} entries`).join('; ')}`)

const chartData = computed<ChartData<'bar', number[], string>>(() => ({
  labels: props.rows.map(row => row.label),
  datasets: [{
    label: 'Loglines',
    data: props.rows.map(row => row.count),
    backgroundColor: props.rows.map((_row, index) => index === 2 ? theme.value.accentStrong : withAlpha(theme.value.accent, 0.68)),
    borderColor: theme.value.accentStrong,
    borderWidth: 1,
    borderRadius: 4,
    borderSkipped: false,
    barPercentage: 0.7,
    categoryPercentage: 0.72
  }]
}))

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: reducedMotion.value ? 0 : 560,
    easing: 'easeOutCubic'
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => {
          const row = props.rows[context.dataIndex]
          return `${formatCount(row?.count ?? Number(context.parsed.y))} entries · ${row?.share ?? 0}% of selected archive`
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: theme.value.inkSoft }
    },
    y: {
      beginAtZero: true,
      grid: { color: theme.value.ruleSoft },
      ticks: {
        color: theme.value.muted,
        precision: 0,
        callback: value => formatCount(Number(value))
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
    class="analysis-chart analysis-distribution-figure"
  >
    <div class="analysis-canvas-wrap analysis-canvas-wrap--distribution">
      <ClientOnly>
        <Bar
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
    <figcaption>Shorter and longer loglines are grouped into five word-count ranges.</figcaption>
  </figure>
</template>
