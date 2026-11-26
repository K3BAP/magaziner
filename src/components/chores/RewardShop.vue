<script setup lang="ts">
/**
 * Belohnungs-Shop: my coins, the rewards to redeem, open vouchers (to fulfil
 * for others / my own, cancellable for 24 h) and the history.
 */
import { ref, computed } from 'vue';
import { useRewards, type Reward, type Redemption } from '../../composables/useRewards';
import { useGame } from '../../composables/useGame';
import { useActiveMembers } from '../../composables/useHouseholdMembers';
import { useAuth } from '../../composables/useAuth';
import { REWARD_SUGGESTIONS } from '../../data/gameCatalog';
import SectionHeader from '../ui/SectionHeader.vue';
import UserAvatar from '../ui/UserAvatar.vue';
import RewardSheet from './RewardSheet.vue';
import { PlusIcon, ChevronDownIcon, CheckIcon } from '@heroicons/vue/24/outline';

const { rewards, loaded, busy, toFulfil, myOpen, closed, canCancel, redeem, cancel, fulfill, addReward } = useRewards();
const { me } = useGame();
const { members, memberById } = useActiveMembers();
const { user } = useAuth();

const coins = computed(() => me.value?.coins ?? 0);
const alone = computed(() => members.value.length <= 1);
const sheetOpen = ref(false);
const editing = ref<Reward | null>(null);
const showHistory = ref(false);

const openNew = () => {
  editing.value = null;
  sheetOpen.value = true;
};
const openEdit = (r: Reward) => {
  editing.value = r;
  sheetOpen.value = true;
};

const name = (id: string | null) => (id === user.value?.id ? 'Du' : memberById(id)?.display_name ?? 'Jemand');
/** Dative for „von …“. */
const byName = (id: string | null) => (id === user.value?.id ? 'dir' : memberById(id)?.display_name ?? 'jemandem');

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

const outcome = (r: Redemption) =>
  r.cancelled_at ? 'storniert' : `erfüllt von ${byName(r.fulfilled_by)} · ${relativeTime(r.fulfilled_at!)}`;

const starterBusy = ref(false);
const adoptStarter = async (s: (typeof REWARD_SUGGESTIONS)[number]) => {
  starterBusy.value = true;
  await addReward(s);
  starterBusy.value = false;
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="surface p-4 flex items-center gap-4">
      <div class="h-14 w-14 shrink-0 rounded-2xl bg-warning/15 grid place-items-center text-3xl" aria-hidden="true">🪙</div>
      <div class="flex-1 min-w-0">
        <p class="text-xs text-base-content/60">Dein Guthaben</p>
        <p class="font-display text-3xl font-bold tabular-nums leading-tight">{{ coins }} <span class="text-base font-semibold">Münzen</span></p>
        <p class="text-xs text-base-content/55">Münzen gibt es für Aufgaben, Quests<template v-if="!alone"> und Kudos</template>.</p>
      </div>
    </section>

    <section v-if="toFulfil.length">
      <SectionHeader title="Für dich zu erfüllen" :count="toFulfil.length" />
      <ul class="surface divide-y divide-base-200 overflow-hidden ring-1 ring-accent/30">
        <li v-for="r in toFulfil" :key="r.id" class="flex items-center gap-3 px-3 py-3">
          <span class="text-2xl shrink-0" aria-hidden="true">{{ r.emoji }}</span>
          <div class="flex-1 min-w-0 text-sm leading-snug">
            <p class="font-semibold truncate">{{ r.title }}</p>
            <p class="text-xs text-base-content/55 flex items-center gap-1">
              <UserAvatar :name="memberById(r.redeemed_by)?.display_name ?? name(r.redeemed_by)" :src="memberById(r.redeemed_by)?.avatar_url" size="xs" />
              für {{ name(r.redeemed_by) }} · {{ relativeTime(r.redeemed_at) }}
            </p>
          </div>
          <button type="button" class="btn btn-sm btn-primary gap-1" :disabled="busy.has(r.id)" @click="fulfill(r)">
            <CheckIcon class="h-4 w-4" /> Erfüllt
          </button>
        </li>
      </ul>
    </section>

    <section v-if="myOpen.length">
      <SectionHeader title="Deine Gutscheine" :count="myOpen.length" />
      <ul class="surface divide-y divide-base-200 overflow-hidden">
        <li v-for="r in myOpen" :key="r.id" class="flex items-center gap-3 px-3 py-3">
          <span class="text-2xl shrink-0" aria-hidden="true">{{ r.emoji }}</span>
          <div class="flex-1 min-w-0 text-sm leading-snug">
            <p class="font-semibold truncate">{{ r.title }}</p>
            <p class="text-xs text-base-content/55">
              {{ relativeTime(r.redeemed_at) }} eingelöst<template v-if="!alone"> · wartet aufs Einlösen</template>
            </p>
          </div>
          <button v-if="canCancel(r)" type="button" class="btn btn-sm btn-ghost" :disabled="busy.has(r.id)" @click="cancel(r)">Stornieren</button>
          <button v-if="alone" type="button" class="btn btn-sm btn-primary gap-1" :disabled="busy.has(r.id)" @click="fulfill(r)">
            <CheckIcon class="h-4 w-4" /> Erfüllt
          </button>
        </li>
      </ul>
    </section>

    <section>
      <SectionHeader title="Belohnungen" :count="rewards.length">
        <button v-if="rewards.length" type="button" class="btn btn-ghost btn-xs gap-1" @click="openNew">
          <PlusIcon class="h-4 w-4" /> Neu
        </button>
      </SectionHeader>

      <ul v-if="rewards.length" class="surface divide-y divide-base-200 overflow-hidden">
        <li v-for="r in rewards" :key="r.id" class="flex items-center gap-3 pl-3 pr-2 py-2.5">
          <button type="button" class="flex flex-1 min-w-0 items-center gap-3 text-left pressable" :aria-label="`${r.title} bearbeiten`" @click="openEdit(r)">
            <span class="text-2xl shrink-0" aria-hidden="true">{{ r.emoji }}</span>
            <span class="min-w-0">
              <span class="block font-semibold text-sm truncate">{{ r.title }}</span>
              <span class="block text-xs tabular-nums text-base-content/60">{{ r.cost }} 🪙</span>
            </span>
          </button>
          <button
            v-if="coins >= r.cost"
            type="button"
            class="btn btn-sm btn-primary min-w-24"
            :disabled="busy.has(r.id)"
            @click="redeem(r)"
          >
            Einlösen
          </button>
          <span v-else class="btn btn-sm btn-disabled min-w-24 tabular-nums" aria-disabled="true">noch {{ r.cost - coins }} 🪙</span>
        </li>
      </ul>

      <div v-else-if="loaded" class="surface p-4 flex flex-col gap-3">
        <p class="text-sm text-base-content/70">
          Legt fest, wofür ihr eure Münzen ausgeben könnt. Tipp auf einen Vorschlag, um ihn zu übernehmen:
        </p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="s in REWARD_SUGGESTIONS"
            :key="s.title"
            type="button"
            class="btn btn-sm rounded-full border-0 bg-base-200 gap-1"
            :disabled="starterBusy"
            @click="adoptStarter(s)"
          >
            <span aria-hidden="true">{{ s.emoji }}</span>{{ s.title }}
            <span class="text-base-content/50 tabular-nums">{{ s.cost }}</span>
          </button>
        </div>
      </div>

      <button type="button" class="btn btn-sm bg-base-100 border-0 gap-2 w-full mt-3" @click="openNew">
        <PlusIcon class="h-4 w-4" /> Belohnung anlegen
      </button>
    </section>

    <section v-if="closed.length">
      <SectionHeader title="Verlauf" :count="closed.length">
        <button type="button" class="btn btn-ghost btn-xs gap-1" @click="showHistory = !showHistory">
          <ChevronDownIcon class="h-4 w-4 transition-transform" :class="showHistory ? '' : '-rotate-90'" />
          {{ showHistory ? 'Einklappen' : 'Anzeigen' }}
        </button>
      </SectionHeader>
      <ul v-if="showHistory" class="surface divide-y divide-base-200 overflow-hidden">
        <li v-for="r in closed" :key="r.id" class="flex items-center gap-3 px-3 py-2.5" :class="r.cancelled_at ? 'opacity-60' : ''">
          <span class="text-xl shrink-0" aria-hidden="true">{{ r.emoji }}</span>
          <div class="flex-1 min-w-0 text-sm leading-snug">
            <p class="truncate">
              <span class="font-semibold">{{ name(r.redeemed_by) }}</span> · {{ r.title }}
            </p>
            <p class="text-xs text-base-content/50">{{ outcome(r) }}</p>
          </div>
          <span class="text-xs font-semibold tabular-nums text-base-content/60" :class="r.cancelled_at ? 'line-through' : ''">−{{ r.cost }} 🪙</span>
        </li>
      </ul>
    </section>

    <RewardSheet :open="sheetOpen" :reward="editing" @close="sheetOpen = false" />
  </div>
</template>
