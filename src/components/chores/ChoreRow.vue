<script setup lang="ts">
import { computed } from 'vue';
import { useChores, type Chore } from '../../composables/useChores';
import { useActiveMembers } from '../../composables/useHouseholdMembers';
import { useAuth } from '../../composables/useAuth';
import SwipeRow from '../ui/SwipeRow.vue';
import UserAvatar from '../ui/UserAvatar.vue';
import { CheckIcon, ArrowPathIcon, ScaleIcon, CalendarIcon } from '@heroicons/vue/24/outline';
import { relativeDayLabel } from '../../utils/date';
import { freshness, FRESHNESS_TONE, intervalLabel, xpPreview } from '../../utils/game';

const props = defineProps<{ chore: Chore; showArea?: boolean }>();
const emit = defineEmits<{ (e: 'edit', chore: Chore): void }>();

const { complete, archiveChore, completing, areaById } = useChores();
const { memberById } = useActiveMembers();
const { user } = useAuth();

const done = computed(() => props.chore.kind === 'once' && !!props.chore.completed_at);
const busy = computed(() => completing.value.has(props.chore.id));
const fresh = computed(() => (done.value ? null : freshness(props.chore)));
const preview = computed(() => xpPreview(props.chore, user.value?.id));
const assignee = computed(() => memberById(props.chore.current_assignee));
const area = computed(() => (props.showArea ? areaById(props.chore.area_id) : null));

/** Bar fill: 100 % right after doing it, empty when due. */
const fillPct = computed(() => {
  const f = fresh.value;
  if (!f || props.chore.kind !== 'recurring') return null;
  return Math.max(0, Math.min(1, 1 - f.ratio)) * 100;
});

const dueText = computed(() => {
  const c = props.chore;
  const f = fresh.value;
  if (c.kind === 'recurring' && c.next_due) {
    if (!f) return intervalLabel(c.interval_days!);
    if (f.daysLeft === 0) return 'Heute fällig';
    if (f.daysLeft < 0) return f.daysLeft === -1 ? 'Seit gestern fällig' : `Seit ${-f.daysLeft} Tagen fällig`;
    return f.daysLeft === 1 ? 'Morgen fällig' : `In ${f.daysLeft} Tagen`;
  }
  if (c.due_date) return relativeDayLabel(c.due_date);
  return null;
});

const dueClass = computed(() => {
  const s = fresh.value?.state;
  if (s === 'overdue') return 'text-error font-semibold';
  if (s === 'due') return 'text-error/80 font-semibold';
  if (s === 'today') return 'text-warning font-semibold';
  return 'text-base-content/55';
});

const onComplete = () => {
  if (done.value || busy.value) return;
  navigator.vibrate?.(10);
  complete(props.chore);
};
</script>

<template>
  <SwipeRow :disabled="busy" @swipe="archiveChore(chore.id)">
    <div class="flex items-center gap-2.5 pl-2 pr-3 min-h-16" :class="done ? 'opacity-60' : ''">
      <button
        type="button"
        class="h-11 w-11 shrink-0 flex items-center justify-center"
        :aria-label="done ? 'Erledigt' : `${chore.title} erledigen`"
        :disabled="done || busy"
        @click="onComplete"
      >
        <span
          class="check h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all"
          :class="[
            done || busy ? 'bg-success border-success text-success-content' : 'border-base-content/30',
            busy ? 'is-popping' : '',
          ]"
        >
          <CheckIcon v-if="done || busy" class="h-4 w-4 stroke-[3]" />
        </span>
      </button>

      <button type="button" class="flex-1 min-w-0 text-left py-2.5" @click="emit('edit', chore)">
        <span class="flex items-center gap-1.5">
          <span v-if="area" class="text-sm shrink-0" aria-hidden="true">{{ area.emoji }}</span>
          <span class="block text-[16px] leading-snug truncate" :class="done ? 'line-through' : ''">{{ chore.title }}</span>
        </span>
        <span v-if="fillPct !== null" class="mt-1.5 block h-1.5 w-full max-w-48 rounded-full bg-base-content/10 overflow-hidden">
          <span
            class="block h-full rounded-full transition-[width] duration-500"
            :class="FRESHNESS_TONE[fresh!.state]"
            :style="{ width: `${Math.max(fillPct, fresh!.state === 'fresh' || fresh!.state === 'soon' ? 6 : 100)}%` }"
          />
        </span>
        <span v-if="dueText || chore.kind === 'recurring'" class="flex items-center gap-2 text-xs mt-1">
          <span v-if="dueText" class="flex items-center gap-1" :class="dueClass">
            <CalendarIcon v-if="chore.kind === 'once'" class="h-3.5 w-3.5" />{{ dueText }}
          </span>
          <span v-if="chore.kind === 'recurring'" class="text-base-content/45">{{ intervalLabel(chore.interval_days!) }}</span>
        </span>
      </button>

      <div class="flex flex-col items-end gap-1 shrink-0">
        <span
          v-if="!done"
          class="text-xs font-bold tabular-nums rounded-full px-2 py-0.5"
          :class="preview.flags.includes('rescue') ? 'bg-error/15 text-error' : preview.flags.includes('early') ? 'bg-base-200 text-base-content/50' : 'bg-primary/10 text-primary'"
          :title="preview.flags.includes('rescue') ? 'Rettungs-Bonus' : preview.flags.includes('on_time') ? 'Pünktlich-Bonus' : undefined"
        >
          +{{ preview.xp }}<span v-if="preview.flags.includes('rescue')"> 🦸</span><span v-else-if="preview.flags.includes('on_time')"> ⏱</span>
        </span>
        <span class="flex items-center gap-1 text-base-content/45">
          <ArrowPathIcon v-if="chore.assign_mode === 'rotate'" class="h-3.5 w-3.5" aria-label="Abwechselnd" />
          <ScaleIcon v-else-if="chore.assign_mode === 'fair'" class="h-3.5 w-3.5" aria-label="Fair" />
          <UserAvatar v-if="assignee" :name="assignee.display_name" :src="assignee.avatar_url" size="xs" />
          <span v-else-if="chore.assign_mode === 'open'" class="text-[11px]">offen</span>
        </span>
      </div>
    </div>
  </SwipeRow>
</template>

<style scoped>
.check.is-popping {
  animation: pop 0.45s ease-out;
}
@keyframes pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
</style>
