import { ref } from 'vue';
import { supabase } from '../supabase';

export interface Todo {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

const todos = ref<Todo[]>([]);
const loading = ref(false);

export function useTodos() {

  // 1. Alle Todos laden
  const fetchTodos = async () => {
    try {
      loading.value = true;
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('is_completed', { ascending: true }) // Erst offene, dann erledigte
        .order('created_at', { ascending: false }); // Neueste zuerst

      if (error) throw error;
      todos.value = data || [];
    } catch (error) {
      console.error('Fehler beim Laden der Todos:', error);
    } finally {
      loading.value = false;
    }
  };

  // 2. Todo hinzufügen
  const addTodo = async (title: string) => {
    if (!title.trim()) return;

    // Optimistisch hinzufügen
    const tempId = crypto.randomUUID();
    const newTodo: Todo = {
      id: tempId,
      title,
      is_completed: false,
      created_at: new Date().toISOString()
    };
    todos.value.unshift(newTodo);

    const { data, error } = await supabase
      .from('todos')
      .insert({ title })
      .select()
      .single();

    if (error) {
      console.error('Fehler beim Speichern:', error);
      // Rollback
      todos.value = todos.value.filter(t => t.id !== tempId);
    } else if (data) {
      // Temp-Eintrag durch echten ersetzen (wegen ID)
      const index = todos.value.findIndex(t => t.id === tempId);
      if (index !== -1) todos.value[index] = data;
    }
  };

  // 3. Status umschalten (Erledigt / Offen)
  const toggleTodo = async (todo: Todo) => {
    const oldStatus = todo.is_completed;
    todo.is_completed = !oldStatus; // Sofortiges Feedback

    // Liste neu sortieren (optional, aber schick)
    todos.value.sort((a, b) => {
        if (a.is_completed === b.is_completed) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return a.is_completed ? 1 : -1;
    });

    const { error } = await supabase
      .from('todos')
      .update({ is_completed: todo.is_completed })
      .eq('id', todo.id);

    if (error) {
      todo.is_completed = oldStatus; // Rollback
      console.error('Fehler beim Update:', error);
    }
  };

  // 4. Löschen
  const deleteTodo = async (id: string) => {
    const prevTodos = [...todos.value];
    todos.value = todos.value.filter(t => t.id !== id);

    const { error } = await supabase.from('todos').delete().eq('id', id);

    if (error) {
      todos.value = prevTodos; // Rollback
      console.error('Fehler beim Löschen:', error);
    }
  };

  return {
    todos,
    loading,
    fetchTodos,
    addTodo,
    toggleTodo,
    deleteTodo
  };
}