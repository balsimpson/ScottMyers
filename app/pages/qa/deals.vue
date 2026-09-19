<script setup lang="ts">
import './deals.css'

import {
  deals,
  filterDeals,
  SOURCE_CLAIMED_COUNT,
  sourceDealFields,
  type Deal,
  type SourceDealField
} from '~/data/deals'

const { data: loadedDeals } = await useFetch<Deal[]>('/api/deals', {
  default: () => deals
})

const workingDeals = ref<Deal[]>([])
watch(loadedDeals, (value) => {
  if (value) workingDeals.value = value.map(deal => ({ ...deal }))
}, { immediate: true })

const query = ref('')
const year = ref('all')
const genre = ref('all')
const agency = ref('all')
const editingId = ref<string | null>(null)
const editDraft = ref<Record<SourceDealField, string> | null>(null)
const savingId = ref<string | null>(null)
const saveError = ref('')
const saveMessage = ref('')

const fieldLabels: Record<SourceDealField, string> = {
  entryNumber: 'Entry number',
  year: 'Year',
  title: 'Title',
  logline: 'Logline',
  writers: 'Writers',
  genre: 'Genre',
  agency: 'Agency',
  management: 'Management',
  lawyer: 'Lawyer',
  studio: 'Studio',
  productionCompany: 'Production company',
  producer: 'Producer',
  date: 'Date',
  notes: 'Notes',
  sourcePage: 'Source page'
}

const multilineFields = new Set<SourceDealField>(['logline', 'notes'])
const numberFormatter = new Intl.NumberFormat('en-US')

const yearOptions = computed(() => [
  { label: 'All years', value: 'all' },
  ...[...new Set(workingDeals.value.map(deal => deal.year))]
    .sort((left, right) => right - left)
    .map(value => ({ label: String(value), value: String(value) }))
])

const genreOptions = computed(() => [
  { label: 'All genres', value: 'all' },
  ...facetOptionsFromDeals('genre').map(value => ({ label: value, value }))
])

const agencyOptions = computed(() => [
  { label: 'All agencies', value: 'all' },
  ...facetOptionsFromDeals('agency').map(value => ({ label: value, value }))
])

const filteredDeals = computed(() => filterDeals(
  workingDeals.value.filter(deal => year.value === 'all' || String(deal.year) === year.value),
  query.value,
  genre.value,
  agency.value
))

const hasFilters = computed(() => Boolean(query.value.trim()) || year.value !== 'all' || genre.value !== 'all' || agency.value !== 'all')

function facetOptionsFromDeals(field: 'genre' | 'agency') {
  return [...new Set(
    workingDeals.value
      .map(deal => field === 'genre' ? deal.genreGroup : deal[field])
      .filter((value): value is string => Boolean(value))
  )].sort((left, right) => left.localeCompare(right))
}

function editDeal(deal: Deal) {
  editingId.value = deal.id
  saveError.value = ''
  saveMessage.value = ''
  editDraft.value = Object.fromEntries(
    sourceDealFields.map(key => [key, deal[key] === null ? '' : String(deal[key])])
  ) as Record<SourceDealField, string>
}

function cancelEdit() {
  editingId.value = null
  editDraft.value = null
  saveError.value = ''
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data
    if (data && typeof data === 'object' && 'statusMessage' in data && typeof data.statusMessage === 'string') {
      return data.statusMessage
    }
  }
  return 'The deal could not be saved. Check the fields and try again.'
}

async function saveDeal(dealId: string) {
  if (!editDraft.value) return

  savingId.value = dealId
  saveError.value = ''
  saveMessage.value = ''

  try {
    const savedDeal = await $fetch<Deal>(`/api/deals/${encodeURIComponent(dealId)}`, {
      method: 'PUT',
      body: editDraft.value
    })

    workingDeals.value = workingDeals.value.map(deal => deal.id === dealId ? savedDeal : deal)
    editingId.value = null
    editDraft.value = null
    saveMessage.value = `${savedDeal.title || 'Deal'} saved to data/deals.json.`
  } catch (error) {
    saveError.value = errorMessage(error)
  } finally {
    savingId.value = null
  }
}

function clearFilters() {
  query.value = ''
  year.value = 'all'
  genre.value = 'all'
  agency.value = 'all'
}
</script>

<template>
  <main class="qa-shell">
    <div class="qa-frame">
      <div class="qa-topline">
        <NuxtLink to="/">← Archive</NuxtLink>
        <span>Dataset QA</span>
      </div>

      <div class="qa-title-row">
        <h1 class="qa-title">
          Every deal.
        </h1>
        <p class="qa-intro">
          Search the extracted records, scan the source details, and correct a record without leaving the archive.
        </p>
      </div>

      <section class="qa-alerts" aria-label="Dataset status">
        <UAlert color="success" variant="soft" icon="i-lucide-badge-check" title="Valid JSON"
          :description="`${numberFormatter.format(workingDeals.length)} records loaded from data/deals.json.`" />
        <UAlert color="warning" variant="soft" icon="i-lucide-alert-triangle" title="Source count retained"
          :description="`The PDF states ${numberFormatter.format(SOURCE_CLAIMED_COUNT)} deals; extraction preserves ${numberFormatter.format(workingDeals.length)} numbered records. Difference: ${numberFormatter.format(workingDeals.length - SOURCE_CLAIMED_COUNT)}.`" />
      </section>

      <div class="qa-toolbar">
        <UInput v-model="query" class="qa-toolbar-search" color="neutral" variant="outline" size="lg"
          placeholder="Search every field" aria-label="Search every extracted field">
          <template #leading>
            <UIcon name="i-lucide-search" class="size-5 text-muted" />
          </template>
        </UInput>

        <div class="qa-toolbar-filters">
          <USelect v-model="year" color="neutral" variant="outline" :items="yearOptions" :ui="{ base: 'w-full' }"
            aria-label="Filter by year" />
          <USelect v-model="genre" color="neutral" variant="outline" :items="genreOptions" :ui="{ base: 'w-full' }"
            aria-label="Filter by genre" />
          <USelect v-model="agency" color="neutral" variant="outline" :items="agencyOptions" :ui="{ base: 'w-full' }"
            aria-label="Filter by agency" />
          <UButton v-if="hasFilters" label="Clear" color="neutral" variant="ghost" @click="clearFilters" />
        </div>
      </div>

      <div class="qa-count-row">
        <p class="qa-record-count">
          Showing {{ numberFormatter.format(filteredDeals.length) }} of {{ numberFormatter.format(workingDeals.length)
          }}
          records · {{numberFormatter.format(workingDeals.filter(deal => deal.logline).length)}} loglines · {{
            numberFormatter.format(workingDeals.filter(deal => deal.title).length) }} titled entries
        </p>
        <p v-if="saveMessage" class="qa-save-message" role="status">
          <UIcon name="i-lucide-check" />
          {{ saveMessage }}
        </p>
      </div>

      <div class="qa-records">
        <article v-for="deal in filteredDeals" :key="deal.id" class="qa-record">
          <div class="qa-record-main">
            <p class="qa-record-index">
              {{ deal.year }} · entry {{ deal.entryNumber }}
            </p>

            <div class="qa-record-copy">
              <h2 class="qa-record-title" :class="{ 'qa-record-title--untitled': !deal.title }">
                {{ deal.title || 'Untitled entry' }}
              </h2>
              <p class="qa-logline">
                {{ deal.logline }}
              </p>
              <p v-if="deal.writers" class="qa-record-writers">
                <span>Writers</span> {{ deal.writers }}
              </p>
            </div>

            <div class="qa-record-facts">
              <span v-if="deal.genre">{{ deal.genre }}</span>
              <span v-if="deal.dealAmount">Deal {{ deal.dealAmount }}</span>
              <span v-if="deal.date">{{ deal.date }}</span>
              <span v-if="deal.studio || deal.productionCompany">
                {{ [deal.studio, deal.productionCompany].filter(Boolean).join(' · ') }}
              </span>
              <span>PDF p. {{ deal.sourcePage }}</span>
            </div>

            <p v-if="deal.sourceNote" class="qa-source-note">
              <UIcon name="i-lucide-info" />
              {{ deal.sourceNote }}
            </p>
          </div>

          <div class="qa-record-action">
            <UButton :label="editingId === deal.id ? 'Editing' : 'Edit'" color="neutral"
              :variant="editingId === deal.id ? 'soft' : 'ghost'" :disabled="editingId === deal.id"
              icon="i-lucide-pencil-line" @click="editDeal(deal)" />
          </div>

          <form v-if="editingId === deal.id && editDraft" class="qa-editor" @submit.prevent="saveDeal(deal.id)">
            <div class="qa-editor-head">
              <div>
                <p class="qa-editor-label">
                  Edit source fields
                </p>
                <p class="qa-editor-help">
                  Changes are written directly to <code>data/deals.json</code>.
                </p>
              </div>
              <UIcon name="i-lucide-file-pen-line" />
            </div>

            <div class="qa-editor-fields">
              <label v-for="field in sourceDealFields" :key="field" class="qa-editor-field"
                :class="{ 'qa-editor-field--wide': multilineFields.has(field) }">
                <span>{{ fieldLabels[field] }}</span>
                <UTextarea v-if="multilineFields.has(field)" v-model="editDraft[field]"
                  :rows="field === 'logline' ? 3 : 2" :aria-label="fieldLabels[field]" />
                <UInput v-else v-model="editDraft[field]"
                  :type="field === 'entryNumber' || field === 'year' || field === 'sourcePage' ? 'number' : 'text'"
                  :aria-label="fieldLabels[field]" />
              </label>
            </div>

            <UAlert v-if="saveError" color="error" variant="soft" icon="i-lucide-circle-alert" title="Save failed"
              :description="saveError" />

            <div class="qa-editor-actions">
              <UButton type="button" label="Cancel" color="neutral" variant="ghost" @click="cancelEdit" />
              <UButton type="submit" label="Save changes" color="primary" icon="i-lucide-save"
                :loading="savingId === deal.id" />
            </div>
          </form>
        </article>
      </div>
    </div>
  </main>
</template>
