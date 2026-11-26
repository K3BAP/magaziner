<script setup lang="ts">
/** Create or edit a reward for the shop. */
import { ref, computed, watch } from 'vue';
import BottomSheet from '../ui/BottomSheet.vue';
import { useRewards, type Reward } from '../../composables/useRewards';
import { REWARD_EMOJIS, REWARD_PRICES, REWARD_SUGGESTIONS } from '../../data/gameCatalog';
import { TrashIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{ open: boolean; reward?: Reward | null }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const { rewards, addReward, updateReward, archiveReward } = useRewards();

const emoji = ref('🎁');
const title = ref('');
const cost = ref<number | ''>(30);
const saving = ref(false);
const isEdit = computed(() => !!props.reward);

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    emoji.value = props.reward?.emoji ?? '🎁';
    title.value = props.reward?.title ?? '';
    cost.value = props.reward?.cost ?? 30;
  },
);

const taken = computed(() => new Set(rewards.value.map((r) => r.title.toLowerCase())));
const suggestions = computed(() => REWARD_SUGGESTIONS.filter((s) => !taken.value.has(s.title.toLowerCase())));
const emojis = computed(() => (REWARD_EMOJIS.includes(emoji.value) ? REWARD_EMOJIS : [emoji.value, ...REWARD_EMOJIS]));
const valid = computed(() => !!title.value.trim() && typeof cost.value === 'number' && cost.value >= 1 && cost.value <= 10000);

const pick = (s: (typeof REWARD_SUGGESTIONS)[number]) => {
  emoji.value = s.emoji;
  title.value = s.title;
  cost.value = s.cost;
};

const save = async () => {
  if (!valid.value || saving.value) return;
  saving.value = true;
  const input = { emoji: emoji.value, title: title.value.trim(), cost: Number(cost.value) };
  const ok = props.reward ? await updateReward(props.reward.id, input) : !!(await addReward(input));
  saving.value = false;
  if (ok) emit('close');
};

const remove = async () => {
  if (!props.reward) return;
  const r = props.reward;
  emit('close');
  await archiveReward(r);
};
</script>

<template>
  <BottomSheet :open="open" :title="isEdit ? 'Belohnung bearbeiten' : 'Neue Belohnung'" @close="emit('close')">
    <form class="flex flex-col gap-5" @submit.prevent="save">
      <div v-if="!isEdit && suggestions.length" class="flex flex-col gap-2">
        <span class="text-sm font-semibold">Vorschläge</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="s in suggestions"
            :key="s.title"
            type="button"
            class="btn btn-sm rounded-full border-0 gap-1"
            :class="title === s.title ? 'btn-primary' : 'bg-base-200'"
            @click="pick(s)"
          >
            <span aria-hidden="true">{{ s.emoji }}</span>{{ s.title }}
          </button>
        </div>
      </div>

      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold">Was gibt's?</span>
        <input v-model="title" class="input w-full" placeholder="z. B. Pizza-Abend" maxlength="80" required />
      </label>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold">Symbol</span>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="em in emojis"
            :key="em"
            type="button"
            class="h-9 w-9 rounded-xl text-lg"
            :class="emoji === em ? 'bg-primary/15 ring-2 ring-primary' : 'bg-base-200'"
            :aria-pressed="emoji === em"
            @click="emoji = em"
          >
            {{ em }}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold">Preis</span>
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="p in REWARD_PRICES"
            :key="p.cost"
            type="button"
            class="btn btn-sm rounded-full border-0"
            :class="cost === p.cost ? 'btn-primary' : 'bg-base-200'"
            @click="cost = p.cost"
          >
            {{ p.label }} · {{ p.cost }} 🪙
          </button>
          <label class="input input-sm w-28 rounded-full">
            <input v-model.number="cost" type="number" min="1" max="10000" inputmode="numeric" aria-label="Eigener Preis" />
            <span aria-hidden="true">🪙</span>
          </label>
        </div>
        <p class="text-xs text-base-content/55">Pro Woche sammelt man ungefähr 50–70 Münzen.</p>
      </div>
    </form>

    <template #footer>
      <button v-if="isEdit" type="button" class="btn btn-ghost text-error mr-auto gap-1" @click="remove">
        <TrashIcon class="h-5 w-5" /> Löschen
      </button>
      <button type="button" class="btn btn-primary min-w-28" :disabled="!valid || saving" @click="save">
        {{ isEdit ? 'Speichern' : 'Anlegen' }}
      </button>
    </template>
  </BottomSheet>
</template>
