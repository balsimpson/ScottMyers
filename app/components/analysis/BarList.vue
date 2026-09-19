<script setup lang="ts">
import type { ChartData, ChartOptions } from 'chart.js'
import { Bar } from 'vue-chartjs'
import type { AnalysisBar } from '~/utils/deal-analysis'
import { formatCount } from '~/utils/deal-analysis'

const props = withDefaults(defineProps<{ rows: AnalysisBar[], limit?: number }>(), { limit: 10 })
const emit = defineEmits<{ select: [row: AnalysisBar] }>()
const { theme, reducedMotion, withAlpha } = useAnalysisChartTheme()
const chartRows = computed(() => props.rows.slice(0, props.limit))
const chartHeight = computed(() => `${Math.max(190, chartRows.value.length * 35)}px`)
const chartLabel = computed(() => `Ranked archive data: ${chartRows.value.map(row => `${row.label}, ${row.count} entries`).join('; ')}`)

const chartData = computed<ChartData<'bar', number[], string>>(() => ({
  labels: chartRows.value.map(row => row.label),
  datasets: [{
    label: 'Entries',
    data: chartRows.value.map(row => row.count),
    backgroundColor: withAlpha(theme.value.accent, 0.82),
    borderColor: theme.value.accentStrong,
    borderWidth: 1,
    borderRadius: 3,
    borderSkipped: false,
    barPercentage: 0.72,
    categoryPercentage: 0.82
  }]
}))

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  animation: {
    duration: reducedMotion.value ? 0 : 560,
    easing: 'easeOutCubic'
  },
  interaction: {
    mode: 'nearest',
    intersect: true
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => {
          const row = chartRows.value[context.dataIndex]
          return `${formatCount(row?.count ?? Number(context.parsed.x))} entries · ${row?.share ?? 0}% of selected archive`
        }
      }
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: theme.value.ruleSoft },
      ticks: {
        color: theme.value.muted,
        precision: 0,
        callback: value => formatCount(Number(value))
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        color: theme.value.inkSoft,
        autoSkip: false,
        font: { family: theme.value.fontFamily, size: 12 }
      }
    }
  },
  onClick: (_event, elements) => {
    const index = elements[0]?.index
    const row = typeof index === 'number' ? chartRows.value[index] : undefined
    if (row?.count) emit('select', row)
  }
}))
</script>

<template>
  <figure
    v-if="chartRows.length"
    class="analysis-chart analysis-ranked-figure"
  >
    <div
      class="analysis-canvas-wrap"
      :style="{ height: chartHeight }"
    >
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
      :rows="chartRows"
      @select="row => emit('select', row)"
    />
    <figcaption>Select a bar to open its matching source entries.</figcaption>
  </figure>
</template>
