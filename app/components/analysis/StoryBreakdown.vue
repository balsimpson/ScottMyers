<script setup lang="ts">
import type { Deal } from '~/data/deals'
import { storyReviewFor, storyStructureFields } from '~/utils/story-patterns'

const props = defineProps<{ deal: Deal }>()
const review = computed(() => storyReviewFor(props.deal))
</script>

<template>
  <section v-if="review?.structure" class="analysis-story-breakdown" aria-label="Saved story analysis">
    <h4>Saved story analysis</h4>
    <p>AI-selected excerpts from this logline. Missing information is left unstated.</p>
    <p v-if="review.sourceStatus === 'unavailable'">
      The source does not provide a logline for this entry.
    </p>
    <p v-else-if="review.sourceStatus === 'limited'">
      The source description is too limited to establish the story’s structure.
    </p>
    <dl>
      <div v-for="field in storyStructureFields" :key="field.key">
        <dt>{{ field.label }}</dt>
        <dd>{{ review.structure[field.key] || 'Not stated in the logline' }}</dd>
      </div>
    </dl>
    <p v-if="!review.patterns.length">
      Analysed; no recurring story motif was found.
    </p>
  </section>
</template>
