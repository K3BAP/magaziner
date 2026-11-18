<script setup lang="ts">
import { computed } from 'vue';
import { useActivity, ACTIVITY_VERB, type ActivityKind } from '../../composables/useActivity';
import { useActiveMembers } from '../../composables/useHouseholdMembers';
import { useAuth } from '../../composables/useAuth';
import WidgetShell from './WidgetShell.vue';
import UserAvatar from '../ui/UserAvatar.vue';
import { ClockIcon } from '@heroicons/vue/24/outline';

const { entries, loading } = useActivity();
const { memberById } = useActiveMembers();
const { user } = useAuth();

// Collapse bursts („Joghurt hinzugefügt“ ×3 within a few minutes) into one line.
const shown = computed(() => {
  const out: (typeof entries.value[number] & { times: number })[] = [];
  for (const e of entries.value) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.kind === e.kind &&
      prev.subject === e.subject &&
      prev.actor_id === e.actor_id &&
      Math.abs(new Date(prev.created_at).getTime() - new Date(e.created_at).getTime()) < 10 * 60_000
    ) {
      prev.times++;
      continue;
    }
    out.push({ ...e, times: 1 });
    if (out.length >= 5) break;
  }
  return out;
});

const EMOJI: Record<ActivityKind, string> = {
  added: '➕',
  opened: '🥄',
  consumed: '➖',
  removed: '🗑️',
  bought: '🛒',
  todo_done: '✅',
};

const actorName = (id: string | null) => {
  if (!id) return 'Jemand';
  if (id === user.value?.id) return 'Du';
  return memberById(id)?.display_name ?? 'Jemand';
};

const relativeTime = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'gerade eben';
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? 'gestern' : `vor ${d} Tagen`;
  return new Date(iso).toLocaleDateString('de-DE');
};
</script>

<template>
  <WidgetShell title="Was zuletzt passiert ist" :icon="ClockIcon" tone="info" :loading="loading && entries.length === 0">
    <div v-if="shown.length === 0" class="text-sm text-base-content/50 py-2">
      Sobald jemand im Haushalt etwas einräumt, abhakt oder verbraucht, steht es hier.
    </div>
    <ul v-else class="flex flex-col -my-1">
      <li v-for="e in shown" :key="e.id" class="flex items-center gap-3 py-1.5">
        <span class="relative shrink-0">
          <UserAvatar :name="memberById(e.actor_id)?.display_name ?? actorName(e.actor_id)" :src="memberById(e.actor_id)?.avatar_url" size="sm" />
          <span class="absolute -bottom-1 -right-1 text-[11px]" aria-hidden="true">{{ EMOJI[e.kind] }}</span>
        </span>
        <div class="flex-1 min-w-0 text-sm leading-snug">
          <span class="font-semibold">{{ actorName(e.actor_id) }}</span>
          hat <span class="font-medium">{{ e.subject }}</span> {{ ACTIVITY_VERB[e.kind] }}<span v-if="e.times > 1" class="text-base-content/50"> ({{ e.times }}×)</span>
        </div>
        <span class="text-xs text-base-content/45 tabular-nums shrink-0">{{ relativeTime(e.created_at) }}</span>
      </li>
    </ul>
  </WidgetShell>
</template>
