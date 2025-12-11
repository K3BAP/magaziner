<script setup lang="ts">
import type { Todo } from '../composables/useTodos';
import { useTodos } from '../composables/useTodos';

const props = defineProps<{ todo: Todo }>();
const { toggleTodo, deleteTodo } = useTodos();
</script>

<template>
  <div class="flex items-center gap-3 p-3 bg-base-100 border-b border-base-200 last:border-0 group">
    
    <input 
      type="checkbox" 
      :checked="todo.is_completed" 
      @change="toggleTodo(todo)"
      class="checkbox checkbox-primary checkbox-sm"
    />

    <span 
      class="flex-1 text-lg transition-all duration-200"
      :class="{ 'line-through text-gray-400': todo.is_completed }"
    >
      {{ todo.title }}
    </span>

    <button @click="deleteTodo(todo.id)" class="btn btn-ghost btn-xs btn-circle text-gray-400 hover:text-error">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
  </div>
</template>