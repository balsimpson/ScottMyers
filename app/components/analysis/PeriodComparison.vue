<script setup lang="ts">
import type { ChartData, ChartOptions } from 'chart.js'
import { Bar } from 'vue-chartjs'
import type { AnalysisBar, GenreTrend } from '~/utils/deal-analysis'
import { formatCount } from '~/utils/deal-analysis'

const props = defineProps<{ trend: GenreTrend }>()
const emit = defineEmits<{ select: [row: AnalysisBar, title: string] }>()
const { theme, reducedMotion, withAlpha } = useAnalysisChartTheme()
const palette = ['#d7aa00', '#8e6047', '#5e7c70', '#766b8f', '#66788a', '#ad6a5a', '#9c8549', '#8a6b62', '#557c8a', '#6b7187']

const chartLabel = computed(() => `Genre share by year: ${props.trend.series.map(series => series.label).join(', ')}`)

function genreColor(index: number, key?: string) {
  if (key === '__other__') return '#9b9588'
  if (key === '__unspecified__') return '#c4beb1'
  return palette[index % palette.length] ?? theme.value.accent
}

function pointFor(yearIndex: number, seriesIndex: number) {
  const key = props.trend.series[seriesIndex]?.key
  return props.trend.years[yearIndex]?.points.find(point => point.key === key)
}

function selectPoint(yearIndex: number, seriesIndex: number) {
  const year = props.trend.years[yearIndex]
  const point = pointFor(yearIndex, seriesIndex)
  if (!year || !point?.count) return

  emit('select', point, `Genre: ${point.label} · ${year.label}`)
}

const chartData = computed<ChartData<'bar', number[], string>>(() => ({
  labels: props.trend.years.map(year => year.label),
  datasets: props.trend.series.map((series, seriesIndex) => {
    const color = genreColor(seriesIndex, series.key)

    return {
      label: series.label,
      data: props.trend.years.map((_year, yearIndex) => pointFor(yearIndex, seriesIndex)?.share ?? 0),
      borderColor: theme.value.paper,
      backgroundColor: withAlpha(color, 0.88),
      borderWidth: 1.5,
      borderRadius: 2,
      borderSkipped: false,
      barPercentage: 0.92,
      categoryPercentage: 0.9
    }
  })
}))

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: reducedMotion.value ? 0 : 650,
    easing: 'easeOutCubic'
  },
  interaction: { mode: 'nearest', intersect: true },
  plugins: {
    legend: {
      position: 'top',
      align: 'start',
      labels: {
        usePointStyle: true,
        pointStyle: 'line',
        color: theme.value.inkSoft,
        boxWidth: 24,
        padding: 12,
        font: { family: theme.value.fontFamily, size: 11 }
      }
    },
    tooltip: {
      callbacks: {
        title: items => `Year ${props.trend.years[items[0]?.dataIndex ?? 0]?.label ?? ''}`,
        label: (context) => {
          const point = pointFor(context.dataIndex, context.datasetIndex)
          return `${context.dataset.label}: ${point?.share ?? Number(context.parsed.y).toFixed(1)}% · ${formatCount(point?.count ?? 0)} entries`
        },
        footer: (items) => {
          const year = props.trend.years[items[0]?.dataIndex ?? 0]
          return year ? `Year total: ${formatCount(year.total)} entries` : ''
        }
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: {
        color: theme.value.muted,
        autoSkip: false,
        maxRotation: 0,
        callback: (_value, index) => {
          const row = props.trend.years[index]
          return row && (index === 0 || index === props.trend.years.length - 1 || row.year % 5 === 0) ? row.label : ''
        }
      }
    },
    y: {
      stacked: true,
      beginAtZero: true,
      max: 100,
      grid: { color: theme.value.ruleSoft },
      ticks: {
        color: theme.value.muted,
        callback: value => `${value}%`
      }
    }
  },
  onClick: (_event, elements) => {
    const element = elements[0]
    if (element) selectPoint(element.index, element.datasetIndex)
  }
}))
</script>

<template>
  <section
    class="analysis-section"
    aria-labelledby="comparison-heading"
  >
    <div class="analysis-section-heading">
      <div>
        <h2 id="comparison-heading">
          Genre mix over time
        </h2>
        <p>Compare the share of each genre year by year. Select a point to open the matching entries.</p>
      </div>
    </div>
    <p
      v-if="!trend.series.length"
      class="analysis-note"
      role="status"
    >
      No recorded genres are available for this selection.
    </p>
    <figure
      v-else
      class="analysis-chart analysis-comparison-figure analysis-genre-trend-figure"
    >
      <div class="analysis-canvas-wrap analysis-canvas-wrap--comparison">
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
      <details class="analysis-data-details analysis-comparison-details">
        <summary>View yearly genre shares</summary>
        <div
          class="analysis-table-scroll"
          role="region"
          aria-label="Yearly genre shares"
          tabindex="0"
        >
          <table class="analysis-comparison-table analysis-trend-table">
            <caption class="visually-hidden">
              Genre shares by year. Select a percentage to open the matching entries.
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  Year
                </th>
                <th
                  v-for="(series, seriesIndex) in trend.series"
                  :key="series.key"
                  scope="col"
                  :style="{ color: genreColor(seriesIndex, series.key) }"
                >
                  {{ series.label }}
                </th>
                <th scope="col">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, yearIndex) in trend.years"
                :key="row.year"
              >
                <th scope="row">
                  {{ row.label }}
                </th>
                <td
                  v-for="(series, seriesIndex) in trend.series"
                  :key="series.key"
                >
                  <button
                    type="button"
                    :disabled="!pointFor(yearIndex, seriesIndex)?.count"
                    :style="{ color: genreColor(seriesIndex, series.key) }"
                    :aria-label="`${series.label}, ${row.label}: ${pointFor(yearIndex, seriesIndex)?.count ?? 0} entries. View entries`"
                    @click="selectPoint(yearIndex, seriesIndex)"
                  >
                    {{ pointFor(yearIndex, seriesIndex)?.count ? `${pointFor(yearIndex, seriesIndex)?.share}%` : '—' }}
                    <small>{{ formatCount(pointFor(yearIndex, seriesIndex)?.count ?? 0) }} entries</small>
                  </button>
                </td>
                <td>{{ formatCount(row.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
      <figcaption>Select a point to open matching entries. Shares use that year's filtered entries as the denominator.</figcaption>
    </figure>
  </section>
</template>
