<script setup lang="ts">
/** A member's game profile: level, streak, coins, badges and an 8-week chart. */
import { ref, computed, watch } from 'vue';
import BottomSheet from '../ui/BottomSheet.vue';
import LevelAvatar from './LevelAvatar.vue';
import { useGame, type MemberStats } from '../../composables/useGame';
import { useChores } from '../../composables/useChores';
import { useActiveMembers } from '../../composables/useHouseholdMembers';
import { useAuth } from '../../composables/useAuth';
import { levelProgress, levelTitle } from '../../utils/game';
import { BADGE_MAP } from '../../data/gameCatalog';
import { parseLocalDate } from '../../utils/date';

const props = defineProps<{ open: boolean; userId: string | null }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'vacation'): void }>();

const { statsOf, fetchMemberStats } = useGame();
const { areaById } = useChores();
const { memberById, members } = useActiveMembers();
const { user } = useAuth();

const stats = ref<MemberStats | null>(null);
const loading = ref(false);

watch(
  () => [props.open, props.userId] as const,
  async ([o, id]) => {
    if (!o || !id) return;
    stats.value = null;
    loading.value = true;
    const s = await fetchMemberStats(id);
    if (props.userId === id) stats.value = s;
    loading.value = false;
  },
);

const member = computed(() => memberById(props.userId));
const game = computed(() => statsOf(props.userId));
const isMe = computed(() => props.userId === user.value?.id);
const progress = computed(() => levelProgress(game.value?.xp_total ?? 0));
const badges = computed(() => (game.value?.badges ?? []).filter((b) => BADGE_MAP[b.key]));
const fav = computed(() => areaById(stats.value?.fav_area?.area_id));
const maxWeek = computed(() => Math.max(1, ...(stats.value?.weeks ?? []).map((w) => w.count)));
const weekLabel = (iso: string) => parseLocalDate(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });
const awayDate = computed(() =>
  game.value?.away_until ? parseLocalDate(game.value.away_until).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) : null,
);

const tiles = computed(() => [
  { emoji: '🔥', value: game.value?.streak_current ?? 0, label: `Serie · Rekord ${game.value?.streak_best ?? 0}` },
  { emoji: '🪙', value: game.value?.coins ?? 0, label: 'Münzen' },
  { emoji: '✅', value: stats.value?.total ?? '–', label: 'Erledigt' },
  members.value.length > 1
    ? { emoji: '👏', value: stats.value?.kudos_received ?? '–', label: 'Kudos erhalten' }
    : { emoji: '🦸', value: stats.value?.rescues ?? '–', label: 'Rettungen' },
]);
</script>

<template>
  <BottomSheet :open="open" :title="isMe ? 'Dein Profil' : member?.display_name ?? 'Profil'" @close="emit('close')">
    <div v-if="userId" class="flex flex-col gap-5">
      <div class="flex items-center gap-4">
        <LevelAvatar :name="member?.display_name" :src="member?.avatar_url" :xp="game?.xp_total ?? 0" size="lg" />
        <div class="flex-1 min-w-0">
          <p class="font-display text-xl font-bold leading-tight truncate">{{ member?.display_name ?? 'Jemand' }}</p>
          <p class="text-sm text-base-content/65">Level {{ progress.level }} · {{ levelTitle(progress.level) }}</p>
          <div class="mt-2 h-2 rounded-full bg-base-content/10 overflow-hidden" role="progressbar" :aria-valuenow="progress.into" :aria-valuemax="progress.span" aria-label="Fortschritt zum nächsten Level">
            <span class="block h-full rounded-full bg-primary" :style="{ width: `${(progress.into / Math.max(1, progress.span)) * 100}%` }" />
          </div>
          <p class="text-xs text-base-content/55 mt-1 tabular-nums">
            noch {{ progress.span - progress.into }} XP bis Level {{ progress.level + 1 }} · {{ game?.xp_total ?? 0 }} XP gesamt
          </p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div v-for="t in tiles" :key="t.label" class="rounded-2xl bg-base-200 px-3 py-2.5">
          <p class="text-lg font-bold tabular-nums leading-tight"><span aria-hidden="true">{{ t.emoji }}</span> {{ t.value }}</p>
          <p class="text-xs text-base-content/60">{{ t.label }}</p>
        </div>
      </div>

      <section>
        <p class="text-xs font-bold uppercase tracking-wider text-base-content/55 mb-2">Letzte 8 Wochen</p>
        <div v-if="stats" class="flex items-end gap-1.5 h-24" role="img" :aria-label="`Erledigungen pro Woche: ${stats.weeks.map((w) => w.count).join(', ')}`">
          <div v-for="(w, i) in stats.weeks" :key="w.week_start" class="flex-1 flex flex-col items-center justify-end gap-1 h-full">
            <span class="text-[10px] tabular-nums text-base-content/55">{{ w.count || '' }}</span>
            <span
              class="w-full rounded-md"
              :class="i === stats.weeks.length - 1 ? 'bg-primary' : 'bg-primary/40'"
              :style="{ height: `${Math.max(4, (w.count / maxWeek) * 64)}px` }"
            />
            <span class="text-[10px] tabular-nums text-base-content/45">{{ weekLabel(w.week_start) }}</span>
          </div>
        </div>
        <div v-else class="h-24 rounded-2xl bg-base-200 animate-pulse" />
        <p v-if="fav" class="text-sm text-base-content/70 mt-3">
          Lieblingsraum: <b><span aria-hidden="true">{{ fav.emoji }}</span> {{ fav.name }}</b> ({{ stats?.fav_area?.count }}×)
        </p>
      </section>

      <section>
        <p class="text-xs font-bold uppercase tracking-wider text-base-content/55 mb-2">Abzeichen · {{ badges.length }}</p>
        <div v-if="badges.length" class="flex flex-wrap gap-2">
          <span v-for="b in badges" :key="b.key" class="rounded-full bg-base-200 px-3 py-1 text-sm" :title="BADGE_MAP[b.key].how">
            <span aria-hidden="true">{{ BADGE_MAP[b.key].emoji }}</span> {{ BADGE_MAP[b.key].title }}
          </span>
        </div>
        <p v-else class="text-sm text-base-content/55">Noch keine – das erste gibt's für die erste Aufgabe.</p>
      </section>

      <button v-if="isMe" type="button" class="btn bg-base-200 border-0 gap-2" @click="emit('vacation')">
        <span aria-hidden="true">🏖️</span>
        <template v-if="awayDate">Weg bis {{ awayDate }} · ändern</template>
        <template v-else>Ich bin weg bis …</template>
      </button>
    </div>
  </BottomSheet>
</template>
