<script setup lang="ts">
import { ref } from 'vue';
import { useTodos } from '../composables/useTodos';
import TodoRow from '../components/TodoRow.vue';

const { todos, addTodo, loading } = useTodos();
const newTodoTitle = ref('');

const handleAddTodo = async () => {
  if (!newTodoTitle.value.trim()) return;
  await addTodo(newTodoTitle.value);
  newTodoTitle.value = ''; // Clear input
};
</script>

<template>
  <div>
    <div class="join w-full mb-6 shadow-sm">
      <input 
        v-model="newTodoTitle" 
        @keyup.enter="handleAddTodo"
        class="input input-bordered join-item w-full" 
        placeholder="Neue Aufgabe (z.B. Müll rausbringen)..." 
      />
      <button @click="handleAddTodo" class="btn btn-primary join-item">
        Hinzufügen
      </button>
    </div>

    <div v-if="loading && todos.length === 0" class="flex justify-center py-4">
       <span class="loading loading-spinner"></span>
    </div>

    <div v-else class="card bg-base-100 shadow-sm overflow-hidden">
       <div v-if="todos.length > 0">
          <TodoRow v-for="todo in todos" :key="todo.id" :todo="todo" />
       </div>
       
       <div v-else class="p-10 text-center opacity-50 flex flex-col items-center gap-2">
          <span class="text-4xl">🎉</span>
          <span>Alles erledigt!</span>
       </div>
    </div>
  </div>
</template>