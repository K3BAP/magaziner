import { ref, computed } from 'vue';
import { supabase } from '../supabase';
import { useActiveHousehold, householdSnapshot } from './useActiveHousehold';
import { toast } from './useToast';
import { addDaysISO, daysUntil, todayLocalISO, parseLocalDate, toLocalISO } from '../utils/date';

export type Recurrence = 'daily' | 'weekly' | 'monthly';

export interface Todo {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
  due_date: string | null;
  assignee_id: string | null;
  recurrence: Recurrence | null;
  completed_at: string | null;
  household_id?: string;
}

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  daily: 'Täglich',
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
};

const todos = ref<Todo[]>([]);
const loading = ref(false);

const normalizeRow = (row: any): Todo => ({
  due_date: null,
  assignee_id: null,
  recurrence: null,
  completed_at: null,
  ...row,
  is_completed: !!row.is_completed,
});

const nextDue = (from: string | null, rec: Recurrence): string => {
  // Advance from the old due date, but never into the past.
  const base = from && daysUntil(from) >= 0 ? from : todayLocalISO();
  if (rec === 'daily') return addDaysISO(base, 1);
  if (rec === 'weekly') return addDaysISO(base, 7);
  const d = parseLocalDate(base);
  d.setMonth(d.getMonth() + 1);
  return toLocalISO(d);
};

export function useTodos() {
  const { activeHouseholdId } = useActiveHousehold();

  const sortTodos = () => {
    todos.value.sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      if (a.is_completed) return (b.completed_at ?? '').localeCompare(a.completed_at ?? '');
      if (a.due_date !== b.due_date) {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      return b.created_at.localeCompare(a.created_at);
    });
  };

  const fetchTodos = async () => {
    const isCurrent = householdSnapshot();
    try {
      loading.value = true;
      const { data, error } = await supabase.from('todos').select('*');
      if (!isCurrent()) return;
      if (error) throw error;
      todos.value = (data || []).map(normalizeRow);
      sortTodos();
    } catch (error) {
      toast.error('Aufgaben konnten nicht geladen werden.', error);
    } finally {
      loading.value = false;
    }
  };

  const insertTodo = async (fields: Partial<Todo> & { title: string }) => {
    if (!activeHouseholdId.value) {
      toast.error('Kein aktiver Haushalt.');
      return null;
    }
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic = normalizeRow({
      id: tempId,
      created_at: new Date().toISOString(),
      is_completed: false,
      ...fields,
    });
    todos.value.push(optimistic);
    sortTodos();

    const { data, error } = await supabase
      .from('todos')
      .insert({
        title: fields.title,
        due_date: fields.due_date ?? null,
        assignee_id: fields.assignee_id ?? null,
        recurrence: fields.recurrence ?? null,
        household_id: activeHouseholdId.value,
      })
      .select()
      .single();

    todos.value = todos.value.filter((t) => t.id !== tempId);
    if (error || !data) {
      toast.error('Aufgabe konnte nicht gespeichert werden.', error);
      return null;
    }
    if (!todos.value.some((t) => t.id === data.id)) todos.value.push(normalizeRow(data));
    sortTodos();
    return normalizeRow(data);
  };

  const addTodo = async (
    title: string,
    extra: Partial<Pick<Todo, 'due_date' | 'assignee_id' | 'recurrence'>> = {},
  ) => {
    const trimmed = title.trim();
    if (!trimmed) return null;
    return insertTodo({ title: trimmed, ...extra });
  };

  const updateTodo = async (
    id: string,
    patch: Partial<Pick<Todo, 'title' | 'due_date' | 'assignee_id' | 'recurrence'>>,
  ) => {
    const todo = todos.value.find((t) => t.id === id);
    if (!todo) return;
    const prev = { ...todo };
    Object.assign(todo, patch);
    sortTodos();
    const { error } = await supabase.from('todos').update(patch).eq('id', id);
    if (error) {
      Object.assign(todo, prev);
      sortTodos();
      toast.error('Aufgabe konnte nicht gespeichert werden.', error);
    }
  };

  const toggleTodo = async (todo: Todo) => {
    const prev = { is_completed: todo.is_completed, completed_at: todo.completed_at };
    todo.is_completed = !todo.is_completed;
    todo.completed_at = todo.is_completed ? new Date().toISOString() : null;
    sortTodos();

    const { error } = await supabase
      .from('todos')
      .update({ is_completed: todo.is_completed, completed_at: todo.completed_at })
      .eq('id', todo.id);

    if (error) {
      Object.assign(todo, prev);
      sortTodos();
      toast.error('Aufgabe konnte nicht aktualisiert werden.', error);
      return;
    }

    // A recurring task spawns its next occurrence when it's ticked off.
    if (todo.is_completed && todo.recurrence) {
      const due = nextDue(todo.due_date, todo.recurrence);
      const next = await insertTodo({
        title: todo.title,
        due_date: due,
        assignee_id: todo.assignee_id,
        recurrence: todo.recurrence,
      });
      if (next) {
        toast.undo(`Nächstes Mal: ${parseLocalDate(due).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}`, async () => {
          await supabase.from('todos').delete().eq('id', next.id);
          todos.value = todos.value.filter((t) => t.id !== next.id);
          await toggleTodo(todo);
        });
      }
    }
  };

  const restore = async (rows: Todo[]) => {
    const { error } = await supabase
      .from('todos')
      .upsert(rows.map(({ id, title, is_completed, created_at, due_date, assignee_id, recurrence, completed_at }) => ({
        id, title, is_completed, created_at, due_date, assignee_id, recurrence, completed_at,
        household_id: activeHouseholdId.value,
      })));
    if (error) return toast.error('Wiederherstellen fehlgeschlagen.', error);
    for (const r of rows) if (!todos.value.some((t) => t.id === r.id)) todos.value.push(r);
    sortTodos();
  };

  const deleteTodo = async (id: string) => {
    const doomed = todos.value.find((t) => t.id === id);
    if (!doomed) return;
    todos.value = todos.value.filter((t) => t.id !== id);
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) {
      todos.value.push(doomed);
      sortTodos();
      return toast.error('Aufgabe konnte nicht gelöscht werden.', error);
    }
    toast.undo(`„${doomed.title}“ gelöscht`, () => restore([doomed]));
  };

  const deleteCompleted = async () => {
    const doomed = todos.value.filter((t) => t.is_completed);
    if (doomed.length === 0) return;
    todos.value = todos.value.filter((t) => !t.is_completed);
    const { error } = await supabase.from('todos').delete().in('id', doomed.map((t) => t.id));
    if (error) {
      todos.value.push(...doomed);
      sortTodos();
      return toast.error('Erledigte konnten nicht gelöscht werden.', error);
    }
    toast.undo(
      doomed.length === 1 ? 'Eine erledigte Aufgabe gelöscht' : `${doomed.length} erledigte Aufgaben gelöscht`,
      () => restore(doomed),
    );
  };

  /** Realtime echo / changes by other members. */
  const applyRemote = (event: 'INSERT' | 'UPDATE' | 'DELETE', row: any, old: any) => {
    if (event === 'DELETE') {
      todos.value = todos.value.filter((t) => t.id !== old?.id);
      return;
    }
    const incoming = normalizeRow(row);
    const idx = todos.value.findIndex((t) => t.id === incoming.id);
    if (idx === -1) todos.value.push(incoming);
    else todos.value[idx] = { ...todos.value[idx], ...incoming };
    sortTodos();
  };

  const clearTodos = () => {
    todos.value = [];
  };

  const openTodos = computed(() => todos.value.filter((t) => !t.is_completed));
  const openCount = computed(() => openTodos.value.length);

  return {
    todos,
    openTodos,
    openCount,
    loading,
    fetchTodos,
    addTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    deleteCompleted,
    applyRemote,
    clearTodos,
  };
}
