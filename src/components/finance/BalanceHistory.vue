<script setup lang="ts">
/**
 * Running balance per person over time („Wer schuldet wem – seit wann?“).
 * Replays every transaction in date order through the same `balanceDeltas`
 * the current balances use, so the right end of each curve always equals the
 * number shown under „Kontostand“. Stepped lines: a balance only changes on
 * days with a transaction.
 */
import { ref, computed } from 'vue';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Filler,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';
import { Line } from 'vue-chartjs';
import { useFinance, balanceDeltas } from '../../composables/useFinance';
import { useTheme } from '../../composables/useTheme';
import { useThemeColors } from '../../composables/useThemeColors';
import { formatCurrency } from '../../utils/currency';
import { addDaysISO, parseLocalDate, todayLocalISO, formatShortDate } from '../../utils/date';

ChartJS.register(LineElement, PointElement, LinearScale, Tooltip, Filler);

const { members, transactions } = useFinance();
const { theme } = useTheme();
const { read } = useThemeColors();

// Categorical palette (validated for CVD + contrast against both app surfaces).
// The colour belongs to the person (index in the stable member list), never to
// their position among the visible lines.
const PALETTE = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9', '#e66767'],
};
const colorFor = (memberId: string) => {
  const i = members.value.findIndex((m) => m.id === memberId);
  return PALETTE[theme.value][i % 8] ?? '#888888';
};

type Range = '3m' | '1y' | 'all';
const RANGES: { id: Range; label: string }[] = [
  { id: '3m', label: '3 Monate' },
  { id: '1y', label: '1 Jahr' },
  { id: 'all', label: 'Alles' },
];
const range = ref<Range>('3m');
const hidden = ref<Set<string>>(new Set());

const toggle = (id: string) => {
  const next = new Set(hidden.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  hidden.value = next;
};

const today = todayLocalISO();

/** Oldest → newest; same-day ties in entry order. */
const ordered = computed(() =>
  [...transactions.value].sort(
    (a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at),
  ),
);

const rangeStart = computed<string | null>(() => {
  const first = ordered.value[0]?.date;
  if (!first) return null;
  const wanted = range.value === '3m' ? addDaysISO(today, -91) : range.value === '1y' ? addDaysISO(today, -365) : first;
  return wanted < first ? first : wanted;
});

/**
 * One snapshot per day with a transaction (+ one at the range start and one
 * for today), each holding everybody's balance at the end of that day.
 */
const snapshots = computed(() => {
  const start = rangeStart.value;
  if (!start) return [];
  const bal: Record<string, number> = {};
  members.value.forEach((m) => (bal[m.id] = 0));
  const snap = (date: string) => ({ date, x: parseLocalDate(date).getTime(), bal: { ...bal } });

  const out: ReturnType<typeof snap>[] = [];
  let i = 0;
  const txs = ordered.value;
  // Everything before the window only sets the starting level.
  while (i < txs.length && txs[i].date < start) {
    for (const [id, d] of balanceDeltas(txs[i])) if (id in bal) bal[id] += d;
    i++;
  }
  out.push(snap(start));
  while (i < txs.length) {
    const day = txs[i].date;
    while (i < txs.length && txs[i].date === day) {
      for (const [id, d] of balanceDeltas(txs[i])) if (id in bal) bal[id] += d;
      i++;
    }
    out.push(snap(day));
  }
  if (out[out.length - 1].date < today) out.push(snap(today));
  return out;
});

const round = (n: number) => Math.round(n * 100) / 100;

const chartData = computed(() => ({
  datasets: members.value
    .filter((m) => !hidden.value.has(m.id))
    .map((m) => {
      const color = colorFor(m.id);
      return {
        label: m.name,
        data: snapshots.value.map((s) => ({ x: s.x, y: round(s.bal[m.id] ?? 0) })),
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        // Chart.js 'before' (= true): hold the previous value, jump at the new day.
        stepped: 'before' as const,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: read('--color-base-100', '#ffffff'),
        pointHitRadius: 12,
      };
    }),
}));

const spanDays = computed(() => {
  const s = snapshots.value;
  return s.length < 2 ? 0 : (s[s.length - 1].x - s[0].x) / 86_400_000;
});

const axisDate = (ms: number) =>
  new Date(ms).toLocaleDateString(
    'de-DE',
    spanDays.value > 200 ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' },
  );

const compactEUR = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const chartOptions = computed<ChartOptions<'line'>>(() => {
  const ink = read('--color-base-content', '#1f2937');
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        itemSort: (a: TooltipItem<'line'>, b: TooltipItem<'line'>) => (b.parsed.y ?? 0) - (a.parsed.y ?? 0),
        callbacks: {
          title: (items) => (items[0] ? formatShortDate(snapshotDate(items[0].parsed.x ?? 0)) : ''),
          label: (item) => {
            const v = item.parsed.y ?? 0;
            const verb = v > 0.005 ? 'bekommt' : v < -0.005 ? 'schuldet' : 'quitt';
            return ` ${item.dataset.label}: ${v > 0.005 ? '+' : ''}${formatCurrency(v)} (${verb})`;
          },
        },
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
      },
    },
    scales: {
      x: {
        type: 'linear',
        min: snapshots.value[0]?.x,
        max: snapshots.value[snapshots.value.length - 1]?.x,
        grid: { display: false },
        border: { display: false },
        // Linear ticks land on arbitrary milliseconds (→ „17. Nov., 17. Nov.“);
        // place up to 4 ticks on whole local days instead.
        afterBuildTicks: (axis) => {
          const s = snapshots.value;
          if (s.length === 0) return;
          const first = s[0].date;
          const days = Math.round(spanDays.value);
          const steps = Math.min(3, days);
          const ticks = new Set<number>();
          for (let k = 0; k <= steps; k++) {
            const iso = addDaysISO(first, steps === 0 ? 0 : Math.round((days * k) / steps));
            ticks.add(parseLocalDate(iso).getTime());
          }
          axis.ticks = [...ticks].map((value) => ({ value }));
        },
        ticks: {
          color: ink,
          font: { size: 10 },
          maxRotation: 0,
          callback: (v) => axisDate(Number(v)),
        },
      },
      y: {
        border: { display: false },
        grid: {
          // The zero line is the „quitt“ line — make it the only strong rule.
          color: (ctx) => (ctx.tick?.value === 0 ? 'rgba(127,127,127,0.6)' : 'rgba(127,127,127,0.14)'),
          lineWidth: (ctx) => (ctx.tick?.value === 0 ? 1.5 : 1),
        },
        ticks: {
          color: ink,
          font: { size: 10 },
          maxTicksLimit: 6,
          callback: (v) => compactEUR.format(Number(v)),
        },
      },
    },
  };
});

/** x (ms) → the snapshot's local ISO date, avoiding a UTC round-trip. */
const snapshotDate = (ms: number) => snapshots.value.find((s) => s.x === ms)?.date ?? '';

const current = (id: string) => {
  const last = snapshots.value[snapshots.value.length - 1];
  return last ? round(last.bal[id] ?? 0) : 0;
};
</script>

<template>
  <div class="surface p-4">
    <div class="flex items-center justify-between gap-2 mb-3">
      <div role="radiogroup" aria-label="Zeitraum" class="flex bg-base-200 p-1 rounded-full gap-0.5">
        <button
          v-for="r in RANGES"
          :key="r.id"
          type="button"
          role="radio"
          :aria-checked="range === r.id"
          class="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
          :class="range === r.id ? 'bg-base-100 shadow-sm text-base-content' : 'text-base-content/60'"
          @click="range = r.id"
        >
          {{ r.label }}
        </button>
      </div>
    </div>

    <p v-if="snapshots.length === 0" class="text-sm text-base-content/55 py-6 text-center">
      Sobald ihr Ausgaben eintragt, siehst du hier, wie sich die Schulden entwickeln.
    </p>

    <template v-else>
      <div class="h-56 relative">
        <Line :data="chartData" :options="chartOptions" aria-label="Verlauf der Kontostände" role="img" />
      </div>

      <!-- Legend = toggles. Colour dot carries identity; text stays in ink. -->
      <div class="flex flex-wrap gap-1.5 mt-3">
        <button
          v-for="m in members"
          :key="m.id"
          type="button"
          class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-opacity"
          :class="hidden.has(m.id) ? 'border-base-300 opacity-45' : 'border-base-300 bg-base-200/60'"
          :aria-pressed="!hidden.has(m.id)"
          @click="toggle(m.id)"
        >
          <span class="h-2.5 w-2.5 rounded-full shrink-0" :style="{ backgroundColor: colorFor(m.id) }" />
          <span class="font-semibold truncate max-w-28">{{ m.name }}</span>
          <span class="tabular-nums text-base-content/60">
            {{ current(m.id) > 0.005 ? '+' : '' }}{{ formatCurrency(current(m.id)) }}
          </span>
        </button>
      </div>
      <p class="text-[11px] text-base-content/50 mt-2">
        Über der Nulllinie bekommt jemand Geld zurück, darunter hat jemand Schulden. Tippe auf einen Namen, um die Kurve ein- oder auszublenden.
      </p>
    </template>
  </div>
</template>
