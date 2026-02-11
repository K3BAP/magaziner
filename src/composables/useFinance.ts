import { ref, computed } from 'vue';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

export interface FinanceMember {
    id: string;
    name: string;
}

export interface FinanceCategory {
    id: string;
    name: string;
    icon?: string;
}

export interface FinanceSplit {
    member_id: string;
    split_amount: number;
    split_percentage?: number;
}

export interface FinanceTransaction {
    id: string;
    type: 'expense' | 'payment';
    title?: string;
    amount: number;
    payer_id: string;
    receiver_id?: string;
    category_id?: string;
    date: string;
    notes?: string;
    created_at: string;
    splits?: FinanceSplit[];
    payer?: FinanceMember;
    receiver?: FinanceMember;
    category?: FinanceCategory;
}

// Global State
const members = ref<FinanceMember[]>([]);
const categories = ref<FinanceCategory[]>([]);
const transactions = ref<FinanceTransaction[]>([]);
const loading = ref(false);

export function useFinance() {
    const { user } = useAuth();

    const fetchMembers = async () => {
        if (!user.value) return;
        const { data, error } = await supabase
            .from('finance_members')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) console.error('Error fetching members:', error);
        else members.value = data || [];
    };

    const fetchCategories = async () => {
        if (!user.value) return;
        const { data, error } = await supabase
            .from('finance_categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) console.error('Error fetching categories:', error);
        else categories.value = data || [];
    };

    const fetchTransactions = async () => {
        if (!user.value) return;
        loading.value = true;

        // Fetch transactions with related data
        // Note: Supabase join syntax for nested data
        const { data, error } = await supabase
            .from('finance_transactions')
            .select(`
        *,
        splits:finance_splits(*),
        payer:finance_members!payer_id(name),
        receiver:finance_members!receiver_id(name),
        category:finance_categories(name, icon)
      `)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching transactions:', error);
        } else {
            // Map data to match interface (flatten joins if needed, usually Supabase returns objects)
            transactions.value = (data as any[]).map(t => ({
                ...t,
                payer: t.payer,
                receiver: t.receiver,
                category: t.category,
                splits: t.splits
            }));
        }
        loading.value = false;
    };

    const addMember = async (name: string) => {
        if (!user.value) return null;
        const { data, error } = await supabase
            .from('finance_members')
            .insert({ user_id: user.value.id, name })
            .select()
            .single();

        if (error) {
            console.error('Error adding member:', error);
            return null;
        }
        members.value.push(data);
        return data;
    };

    const updateMember = async (id: string, name: string) => {
        if (!user.value) return;
        const { error } = await supabase
            .from('finance_members')
            .update({ name })
            .eq('id', id);

        if (error) {
            console.error('Error updating member:', error);
            return false;
        }

        // Local update
        const m = members.value.find(m => m.id === id);
        if (m) m.name = name;
        return true;
    };

    const deleteMember = async (id: string) => {
        if (!confirm('Person wirklich löschen? Alle zugehörigen Transaktionen bleiben erhalten, aber der Name verschwindet aus der Historie (wird "Unbekannt").')) return;

        const { error } = await supabase
            .from('finance_members')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting member:', error);
            alert('Fehler beim Löschen. Möglicherweise existieren noch Abhängigkeiten.');
            return false;
        }

        members.value = members.value.filter(m => m.id !== id);
        return true;
    };

    const addCategory = async (name: string, icon?: string) => {
        if (!user.value) return null;
        const { data, error } = await supabase
            .from('finance_categories')
            .insert({ user_id: user.value.id, name, icon })
            .select()
            .single();

        if (error) {
            console.error('Error adding category:', error);
            return null;
        }
        categories.value.push(data);
        return data;
    };

    const updateCategory = async (id: string, name: string, icon?: string) => {
        if (!user.value) return;
        const { error } = await supabase
            .from('finance_categories')
            .update({ name, icon })
            .eq('id', id);

        if (error) {
            console.error('Error updating category:', error);
            return false;
        }

        const c = categories.value.find(c => c.id === id);
        if (c) {
            c.name = name;
            c.icon = icon;
        }
        return true;
    };

    const deleteCategory = async (id: string) => {
        if (!confirm('Kategorie löschen?')) return;

        const { error } = await supabase
            .from('finance_categories')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting category:', error);
            return false;
        }

        categories.value = categories.value.filter(c => c.id !== id);
        return true;
    };

    const seedDefaultCategories = async () => {
        if (!user.value) return;
        const defaults = [
            { name: 'Lebensmittel', icon: '🍎' },
            { name: 'Restaurant', icon: '🍽️' },
            { name: 'Fortbewegung', icon: '🚗' },
            { name: 'Unterhaltung', icon: '🎬' },
            { name: 'Wohnen', icon: '🏠' },
            { name: 'Urlaub', icon: '✈️' },
            { name: 'Versicherung', icon: '🛡️' },
            { name: 'Sonstiges', icon: '📦' }
        ];

        const { error } = await supabase
            .from('finance_categories')
            .insert(defaults.map(d => ({ ...d, user_id: user.value?.id })));

        if (error) console.error('Error seeding categories:', error);
        else await fetchCategories();
    };

    const addTransaction = async (
        type: 'expense' | 'payment',
        amount: number,
        payer_id: string,
        date: string,
        title?: string,
        receiver_id?: string, // for payments
        category_id?: string, // for expenses
        splits?: { member_id: string; amount: number; percentage?: number }[],
        notes?: string
    ) => {
        if (!user.value) return null;

        // 1. Insert Transaction
        const { data: trans, error: transError } = await supabase
            .from('finance_transactions')
            .insert({
                user_id: user.value.id,
                type,
                amount,
                payer_id,
                receiver_id,
                category_id,
                title,
                date,
                notes
            })
            .select()
            .single();

        if (transError || !trans) {
            console.error('Error adding transaction:', transError);
            return null;
        }

        // 2. Insert Splits (if expense)
        if (type === 'expense' && splits && splits.length > 0) {
            const splitsPayload = splits.map(s => ({
                transaction_id: trans.id,
                member_id: s.member_id,
                split_amount: s.amount,
                split_percentage: s.percentage
            }));

            const { error: splitError } = await supabase
                .from('finance_splits')
                .insert(splitsPayload);

            if (splitError) {
                console.error('Error adding splits:', splitError);
                // Should ideally rollback transaction here, but for now simple error logging
                // In a real app we might want to delete the transaction
            }
        }

        await fetchTransactions(); // Refresh to get full joined data
        return trans;
    };

    const updateTransaction = async (
        id: string,
        type: 'expense' | 'payment',
        amount: number,
        payer_id: string,
        date: string,
        title?: string,
        receiver_id?: string,
        category_id?: string,
        splits?: { member_id: string; amount: number; percentage?: number }[],
        notes?: string
    ) => {
        if (!user.value) return null;

        // 1. Update Transaction Base
        const { error: transError } = await supabase
            .from('finance_transactions')
            .update({
                type,
                amount,
                payer_id,
                receiver_id,
                category_id,
                title,
                date,
                notes
            })
            .eq('id', id);

        if (transError) {
            console.error('Error updating transaction:', transError);
            return null;
        }

        // 2. Handle Splits (Delete all old, Insert new)
        if (type === 'expense') {
            // Delete old splits
            await supabase.from('finance_splits').delete().eq('transaction_id', id);

            // Insert new splits
            if (splits && splits.length > 0) {
                const splitsPayload = splits.map(s => ({
                    transaction_id: id,
                    member_id: s.member_id,
                    split_amount: s.amount,
                    split_percentage: s.percentage
                }));
                const { error: splitError } = await supabase.from('finance_splits').insert(splitsPayload);
                if (splitError) console.error('Error updating splits:', splitError);
            }
        }

        await fetchTransactions(); // Refresh
        return true;
    };

    const deleteTransaction = async (id: string) => {
        const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
        if (error) console.error('Error deleting transaction', error);
        else {
            transactions.value = transactions.value.filter(t => t.id !== id);
        }
    };

    // --- Computed Logic ---

    // Calculate Balances
    // Positive = Member receives money (paid more than consumed)
    // Negative = Member owes money (consumed more than paid)
    const balances = computed(() => {
        const raw: Record<string, number> = {};
        members.value.forEach(m => raw[m.id] = 0);

        transactions.value.forEach(t => {
            const amount = Number(t.amount); // Ensure number

            if (t.type === 'expense') {
                // Payer gets +Amount (they paid for it)
                if (raw[t.payer_id] !== undefined) raw[t.payer_id] += amount;

                // Consumers get -SplitAmount (they consumed it)
                if (t.splits) {
                    t.splits.forEach(s => {
                        if (raw[s.member_id] !== undefined) raw[s.member_id] -= Number(s.split_amount);
                    });
                }
            } else if (t.type === 'payment') {
                // Payment: Payer gives money to Receiver
                // Current view: Payer settles debt -> Payer gets + (debt reduced), Receiver gets - (claim reduced)?
                // Wait, standard accounting:
                // Payer gives 50€. 
                // Payer 'paid' 50€ (credit). Receiver 'received' 50€ (debit/consumption logic?).

                // Simpler View: Who owes the "Group"?
                // If I owe 50€ to Group, and I pay 50€ to Alice (who is +50€), 
                // My balance should go up +50 (to 0). Alice's balance should go down -50 (to 0).

                if (raw[t.payer_id] !== undefined) raw[t.payer_id] += amount;
                if (t.receiver_id && raw[t.receiver_id] !== undefined) raw[t.receiver_id] -= amount;
            }
        });

        return members.value.map(m => ({
            ...m,
            balance: raw[m.id] || 0
        }));
    });

    return {
        members,
        categories,
        transactions,
        loading,
        balances,
        fetchMembers,
        fetchCategories,
        fetchTransactions,
        addMember,
        addCategory,
        updateCategory,
        deleteCategory,
        seedDefaultCategories,
        addTransaction,
        updateTransaction,
        updateMember,
        deleteMember,
        deleteTransaction
    };
}
