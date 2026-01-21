<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useTodos } from '../../composables/useTodos';

const router = useRouter();
const { todos } = useTodos();

const openTodosCount = computed(() => todos.value.filter(t => !t.is_completed).length);
const nextTodo = computed(() => todos.value.find(t => !t.is_completed));

const goTodos = () => router.push({ name: 'todos' });
</script>

<template>
  <div class="card bg-base-100 shadow-md cursor-pointer hover:bg-base-200 transition-colors h-full" @click="goTodos">
     <div class="card-body p-4">
        <div class="flex justify-between items-start">
           <div>
              <h3 class="card-title text-sm uppercase text-gray-400">Offene Aufgaben</h3>
              <div class="text-4xl font-bold mt-2">{{ openTodosCount }}</div>
           </div>
           <div class="btn btn-circle btn-sm btn-ghost bg-base-200">
              📝
           </div>
        </div>
        
        <div v-if="nextTodo" class="mt-4 p-3 bg-base-200 rounded-lg text-sm flex items-center gap-2">
           <span class="badge badge-primary badge-xs">Next</span>
           <span class="truncate font-medium">{{ nextTodo.title }}</span>
        </div>
        <div v-else class="mt-4 text-sm text-gray-400">
           Alles erledigt! 🎉
        </div>
     </div>
  </div>
</template>
