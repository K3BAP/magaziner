<script setup lang="ts">
import { ref, computed } from 'vue';
import { useFinance } from '../../composables/useFinance';
import { Chart as ChartJS, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { Bar } from 'vue-chartjs';

ChartJS.register(Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const { transactions } = useFinance();

const selectedYear = ref(new Date().getFullYear());
const selectedCategoryFilter = ref<string | null>(null);
const selectedMonthFilter = ref<number | null>(null);

const availableYears = computed(() => {
  const years = new Set(transactions.value.map(t => new Date(t.date).getFullYear()));
  years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => b - a);
});

// Expenses for selected year
const yearTransactions = computed(() => {
  return transactions.value.filter(t => {
    return t.type === 'expense' && new Date(t.date).getFullYear() === selectedYear.value;
  });
});

const filteredTransactions = computed(() => {
  return yearTransactions.value.filter(t => {
    if (selectedCategoryFilter.value && t.category?.name !== selectedCategoryFilter.value) {
      if (selectedCategoryFilter.value === 'Unkategorisiert' && t.category?.name === undefined) {
        // Match unkategorisiert
      } else {
        return false;
      }
    }
    if (selectedMonthFilter.value !== null && new Date(t.date).getMonth() !== selectedMonthFilter.value) {
      return false;
    }
    return true;
  });
});

const toggleCategory = (catName: string) => {
  if (selectedCategoryFilter.value === catName) {
    selectedCategoryFilter.value = null;
  } else {
    selectedCategoryFilter.value = catName;
  }
};

const resetFilters = () => {
  selectedCategoryFilter.value = null;
  selectedMonthFilter.value = null;
};

// --- KPIs ---
// Note: KPIs should reflect filteredTransactions
const totalExpenses = computed(() => {
  return filteredTransactions.value.reduce((sum, t) => sum + Number(t.amount), 0);
});

// For monthly stats, we want to show all months, BUT if a category is selected, we show only that category's trend.
// If a month is selected, we still show the whole year trend so the user sees the context.
const monthlyStats = computed(() => {
  const stats = new Array(12).fill(0);
  yearTransactions.value.forEach(t => {
    if (selectedCategoryFilter.value && t.category?.name !== selectedCategoryFilter.value) {
      if (selectedCategoryFilter.value === 'Unkategorisiert' && t.category?.name === undefined) {
         // keep
      } else {
         return;
      }
    }
    const month = new Date(t.date).getMonth(); // 0-11
    stats[month] += Number(t.amount);
  });
  return stats;
});

const averageMonthly = computed(() => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  
  let monthsToDivide = 12;
  if (selectedYear.value === currentYear) {
    monthsToDivide = currentMonth; // average up to current month
  }
  
  if (totalExpenses.value === 0) return 0;
  // If a month filter is active, it doesn't make sense to show an average of a single month, but let's just do it mathematically.
  if (selectedMonthFilter.value !== null) return totalExpenses.value; 
  return totalExpenses.value / monthsToDivide;
});

const highestMonthName = computed(() => {
  const maxAmount = Math.max(...monthlyStats.value);
  if (maxAmount === 0) return '-';
  const monthIndex = monthlyStats.value.findIndex(val => val === maxAmount);
  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return monthNames[monthIndex];
});

// --- Category Progress Bars ---
const categoryStats = computed(() => {
  const stats: Record<string, { amount: number; icon: string }> = {};
  yearTransactions.value.forEach(t => {
    // If a month is selected, filter categories by month
    if (selectedMonthFilter.value !== null && new Date(t.date).getMonth() !== selectedMonthFilter.value) {
      return;
    }
    
    const catName = t.category?.name || 'Unkategorisiert';
    const catIcon = t.category?.icon || '📦';
    
    if (!stats[catName]) {
      stats[catName] = { amount: 0, icon: catIcon };
    }
    stats[catName].amount += Number(t.amount);
  });
  
  return Object.entries(stats)
    .map(([name, data]) => ({ name, amount: data.amount, icon: data.icon }))
    .sort((a, b) => b.amount - a.amount);
});

const maxCategoryAmount = computed(() => {
  if (categoryStats.value.length === 0) return 0;
  return categoryStats.value[0].amount;
});

// --- Bar Chart: Monthly ---
const barData = computed(() => {
  const backgrounds = new Array(12).fill('#3b82f6');
  if (selectedMonthFilter.value !== null) {
    // Dim unselected months
    for (let i = 0; i < 12; i++) {
      if (i !== selectedMonthFilter.value) {
        backgrounds[i] = 'rgba(59, 130, 246, 0.2)'; // Faded blue
      }
    }
  }

  return {
    labels: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
    datasets: [{
      label: 'Ausgaben (€)',
      backgroundColor: backgrounds,
      borderRadius: 4,
      data: monthlyStats.value
    }]
  };
});

const barOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  onClick: (event: any, elements: any[]) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      if (selectedMonthFilter.value === index) {
        selectedMonthFilter.value = null; // Toggle off
      } else {
        selectedMonthFilter.value = index; // Toggle on
      }
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      // optional tooltip styling
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      }
    },
    x: {
      grid: {
        display: false
      }
    }
  }
}));

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

</script>

<template>
  <div class="h-full overflow-y-auto pb-24 p-4 space-y-6 relative">
    
    <!-- Header / Filter Bar -->
    <div class="flex flex-col gap-3 mb-4">
      <div class="flex justify-between items-center w-full">
        <!-- Year Selector (Segmented Control) -->
        <div class="flex overflow-x-auto bg-base-200 p-1 rounded-lg gap-1 no-scrollbar shrink">
          <button 
            v-for="year in availableYears" 
            :key="year" 
            @click="selectedYear = year"
            class="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap"
            :class="selectedYear === year ? 'bg-base-100 shadow-sm text-primary' : 'text-base-content/70 hover:text-base-content'"
          >
            {{ year }}
          </button>
        </div>

        <button 
          v-if="selectedCategoryFilter || selectedMonthFilter !== null" 
          @click="resetFilters" 
          class="btn btn-xs btn-ghost text-error shrink-0 ml-2"
        >
          Zurücksetzen
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-base-100 rounded-xl p-4 shadow-sm border border-base-200 flex flex-col justify-center items-center text-center">
        <div class="text-xs text-base-content/70 font-medium mb-1">Ausgaben</div>
        <div class="text-lg font-bold text-error">{{ formatCurrency(totalExpenses) }}</div>
      </div>
      
      <div class="bg-base-100 rounded-xl p-4 shadow-sm border border-base-200 flex flex-col justify-center items-center text-center">
        <div class="text-xs text-base-content/70 font-medium mb-1">Ø pro Monat</div>
        <div class="text-lg font-bold">{{ formatCurrency(averageMonthly) }}</div>
      </div>

      <div class="bg-base-100 rounded-xl p-4 shadow-sm border border-base-200 flex flex-col justify-center items-center text-center">
        <div class="text-xs text-base-content/70 font-medium mb-1">Stärkster Monat</div>
        <div class="text-lg font-bold">{{ highestMonthName }}</div>
      </div>
    </div>

    <!-- Monthly Bar Chart -->
    <div class="bg-base-100 rounded-xl p-4 shadow-sm border border-base-200">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-base-content">Jahresverlauf</h3>
        <span v-if="selectedCategoryFilter" class="badge badge-primary badge-sm">{{ selectedCategoryFilter }}</span>
      </div>
      <div class="h-48 relative cursor-pointer">
        <Bar :data="barData" :options="barOptions" />
      </div>
      <div class="text-[10px] text-center text-base-content/50 mt-2">Klicke auf einen Monat, um die Kategorien zu filtern</div>
    </div>

    <!-- Top Categories -->
    <div class="bg-base-100 rounded-xl p-4 shadow-sm border border-base-200">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-base-content">Top Kategorien</h3>
        <span v-if="selectedMonthFilter !== null" class="badge badge-primary badge-sm">
           {{ ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][selectedMonthFilter] }}
        </span>
      </div>
      
      <div v-if="categoryStats.length > 0" class="space-y-3">
        <div 
          v-for="cat in categoryStats" 
          :key="cat.name" 
          @click="toggleCategory(cat.name)"
          class="flex flex-col gap-1 p-2 -mx-2 rounded-lg cursor-pointer transition-colors duration-200"
          :class="[
            selectedCategoryFilter === cat.name ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-base-200 border border-transparent',
            selectedCategoryFilter && selectedCategoryFilter !== cat.name ? 'opacity-50' : 'opacity-100'
          ]"
        >
          <div class="flex justify-between items-center text-sm">
            <div class="flex items-center gap-2 font-medium">
              <span>{{ cat.icon }}</span>
              <span>{{ cat.name }}</span>
            </div>
            <span class="font-semibold" :class="{'text-primary': selectedCategoryFilter === cat.name}">
               {{ formatCurrency(cat.amount) }}
            </span>
          </div>
          <div class="w-full bg-base-200/50 rounded-full h-1.5 overflow-hidden">
            <div 
              class="h-1.5 rounded-full transition-all duration-500 ease-out" 
              :class="selectedCategoryFilter === cat.name ? 'bg-primary' : 'bg-primary/70'"
              :style="{ width: `${(cat.amount / maxCategoryAmount) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
      <div v-else class="text-center text-base-content/50 py-4 text-sm">
        Keine Ausgaben in diesem Zeitraum
      </div>
    </div>

  </div>
</template>
