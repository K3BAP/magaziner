import { ref } from 'vue';
import { supabase } from '../supabase';
import { toast } from './useToast';

/**
 * Web-Push opt-in for this device.
 *
 * The subscription lives in the browser (PushManager); we mirror it into
 * `push_subscriptions` via the `register_push_subscription` RPC so the
 * `send-push` Edge Function can reach it. Sending is entirely server-side
 * (DB triggers / cron → outbox → pg_net → Edge Function). Each device picks
 * its topics (`push_subscriptions.topics`, set via `set_push_topics`).
 */

export type PushTopic = 'finance' | 'digest' | 'chore_done' | 'reward' | 'energy';

export const PUSH_TOPICS: { key: PushTopic; label: string; hint: string }[] = [
  { key: 'digest', label: 'Morgen-Übersicht', hint: 'Jeden Morgen, was heute für dich dran ist.' },
  { key: 'chore_done', label: 'Erledigte Aufgaben', hint: 'Wenn jemand anderes eine Aufgabe abhakt.' },
  { key: 'reward', label: 'Gutscheine', hint: 'Wenn jemand eine Belohnung einlöst.' },
  { key: 'energy', label: 'Energie-Warnung', hint: 'Wenn die Team-Energie unter 30 fällt.' },
  { key: 'finance', label: 'Finanzen', hint: 'Neue Ausgaben und Zahlungen der anderen.' },
];
const ALL_TOPICS = PUSH_TOPICS.map((t) => t.key);

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

const supported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window &&
  !!VAPID_PUBLIC_KEY;

const permission = ref<NotificationPermission>(supported ? Notification.permission : 'default');
const subscribed = ref(false);
const busy = ref(false);
const topics = ref<PushTopic[]>([...ALL_TOPICS]);
let endpoint: string | null = null;

/** iPhone/iPad (iPadOS reports itself as a Mac with touch). */
export const isIos =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export const isStandalone =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

/** The app's service worker, or null (e.g. in `npm run dev`, where none is registered). */
async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!supported) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  if (reg.active) return reg;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
  ]);
}

async function save(sub: PushSubscription) {
  const { keys } = sub.toJSON();
  if (!keys?.p256dh || !keys?.auth) throw new Error('Subscription ohne Schlüssel');
  const { error } = await supabase.rpc('register_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
  endpoint = sub.endpoint;
  const { data } = await supabase.from('push_subscriptions').select('topics').eq('endpoint', sub.endpoint).maybeSingle();
  if (data?.topics) topics.value = data.topics as PushTopic[];
}

/** Switch one topic for this device. */
async function setTopic(topic: PushTopic, on: boolean) {
  if (!endpoint) return;
  const prev = topics.value;
  const next = on ? [...new Set([...prev, topic])] : prev.filter((t) => t !== topic);
  topics.value = next;
  const { data, error } = await supabase.rpc('set_push_topics', { p_endpoint: endpoint, p_topics: next });
  if (error) {
    topics.value = prev;
    toast.error('Einstellung konnte nicht gespeichert werden.', error);
    return;
  }
  topics.value = (data ?? next) as PushTopic[];
}

async function removeRow(endpoint: string) {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  if (error) throw error;
}

/**
 * Reads this device's state and re-links an existing subscription to the
 * signed-in user (covers browser-side endpoint rotation and account switches).
 */
async function refresh() {
  if (!supported) return;
  permission.value = Notification.permission;
  try {
    const reg = await getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub || permission.value !== 'granted') {
      subscribed.value = false;
      return;
    }
    await save(sub);
    subscribed.value = true;
  } catch (e) {
    console.error('Push-Status konnte nicht geprüft werden', e);
  }
}

/** Must be called from a click handler — Safari only asks inside a user gesture. */
async function enable() {
  if (!supported || busy.value) return;
  busy.value = true;
  try {
    // First thing, before any other await, so the user gesture still counts.
    permission.value = await Notification.requestPermission();
    if (permission.value !== 'granted') {
      toast.warning('Benachrichtigungen sind im Browser nicht erlaubt.');
      return;
    }
    const reg = await getRegistration();
    if (!reg) {
      toast.error('Die App ist noch nicht vollständig geladen. Lade sie neu und versuch es nochmal.');
      return;
    }
    const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY!);
    let sub = await reg.pushManager.getSubscription();
    if (sub && !sameKey(sub.options.applicationServerKey, key)) {
      await sub.unsubscribe();
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await save(sub);
    subscribed.value = true;
    toast.success('Benachrichtigungen sind an');
  } catch (e) {
    toast.error('Benachrichtigungen konnten nicht aktiviert werden.', e);
  } finally {
    busy.value = false;
  }
}

async function disable() {
  if (!supported || busy.value) return;
  busy.value = true;
  try {
    const sub = await (await getRegistration())?.pushManager.getSubscription();
    if (sub) {
      await removeRow(sub.endpoint);
      await sub.unsubscribe();
    }
    subscribed.value = false;
    toast.success('Benachrichtigungen sind aus');
  } catch (e) {
    toast.error('Benachrichtigungen konnten nicht deaktiviert werden.', e);
  } finally {
    busy.value = false;
  }
}

/**
 * Called before sign-out: this device should stop receiving the leaving
 * user's notifications. Best effort, never throws.
 */
export async function forgetPushOnThisDevice() {
  if (!supported) return;
  try {
    const sub = await (await getRegistration())?.pushManager.getSubscription();
    if (!sub) return;
    await removeRow(sub.endpoint).catch(() => {});
    await sub.unsubscribe();
  } catch {
    /* ignore */
  } finally {
    subscribed.value = false;
  }
}

export function usePush() {
  return { supported, permission, subscribed, busy, topics, refresh, enable, disable, setTopic };
}
