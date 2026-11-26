// send-push — Web-Push für Finanzen und Aufgaben.
//
// Aufgerufen von `private.trg_finance_push` bzw. `private.enqueue_push` (pg_net)
// mit `{ event_id }`. Event-Arten: finance, chore_done, reward_redeemed,
// energy_low, digest. Die Funktion löst das Event über `claim_push_event` (nur
// service_role) ein – ein gefälschter oder wiederholter Aufruf findet nichts
// und verschickt nichts. Deshalb läuft sie mit verify_jwt = false.
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:… oder https://…)
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase automatisch bereit.

import { createClient } from 'npm:@supabase/supabase-js@2.87.0';
import webpush from 'npm:web-push@3.6.7';

interface Subscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

type EventKind = 'finance' | 'chore_done' | 'reward_redeemed' | 'energy_low' | 'digest';

interface ClaimedEvent {
  household_id: string;
  kind?: EventKind; // missing only from a pre-M4 claim, which is always finance
  transaction_id: string | null;
  payload?: Record<string, unknown>;
  actor_name?: string | null;
  household_name?: string | null;
  transaction: {
    type: 'expense' | 'payment';
    title: string | null;
    amount: number;
    household_name: string | null;
    actor_name: string | null;
    payer_name: string | null;
    receiver_name: string | null;
  } | null;
  subscriptions: Subscription[];
}

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

interface Message {
  title: string;
  body: string;
  url: string;
  tag: string;
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

function compose(ev: ClaimedEvent): Message {
  const kind = ev.kind ?? 'finance';
  const p = ev.payload ?? {};
  const who = str(ev.actor_name) || 'Jemand';
  const house = str(ev.household_name);
  const titled = (prefix: string) => (house ? `${prefix} · ${house}` : prefix);

  switch (kind) {
    case 'chore_done': {
      const xp = num(p.xp);
      const rescue = p.rescue === true ? ' – gerettet! 🦸' : '';
      return {
        title: titled('Aufgaben'),
        body: `${who} hat „${str(p.title) || 'eine Aufgabe'}“ erledigt${xp ? ` (+${xp} XP)` : ''}${rescue}`,
        url: '/todos',
        // One line per person: a burst of completions replaces itself.
        tag: `chore-done-${ev.household_id}-${who}`,
      };
    }
    case 'reward_redeemed':
      return {
        title: titled('Gutschein eingelöst'),
        body: `${who} hat ${str(p.emoji)} „${str(p.title)}“ eingelöst – wer erfüllt ihn?`,
        url: '/todos?view=shop',
        tag: `reward-${str(p.redemption_id)}`,
      };
    case 'energy_low': {
      const red = num(p.red);
      return {
        title: titled('Team-Energie niedrig 😩'),
        body: `Nur noch ${num(p.energy)} von 100${red ? ` – ${red} ${red === 1 ? 'Aufgabe ist' : 'Aufgaben sind'} lange überfällig` : ''}. Unter 30 gibt es nur halbe Münzen.`,
        url: '/todos',
        tag: `energy-${ev.household_id}`,
      };
    }
    case 'digest': {
      const count = num(p.count);
      const late = num(p.late);
      const titles = Array.isArray(p.titles) ? (p.titles as unknown[]).map(str).filter(Boolean) : [];
      const more = count > titles.length ? ` und ${count - titles.length} weitere` : '';
      return {
        title: 'Guten Morgen! ☀️',
        body:
          `${count === 1 ? 'Heute ist eine Aufgabe dran' : `Heute sind ${count} Aufgaben dran`}` +
          `${late ? ` (${late} überfällig)` : ''}: ${titles.join(', ')}${more}.`,
        url: '/todos',
        tag: `digest-${ev.household_id}`,
      };
    }
    case 'finance':
      return composeFinance(ev);
  }
}

function composeFinance(ev: ClaimedEvent): Message {
  const t = ev.transaction!;
  const who = t.actor_name?.trim() || 'Jemand';
  const amount = euro.format(Number(t.amount));
  let body: string;
  if (t.type === 'payment') {
    const route = t.payer_name && t.receiver_name ? ` (${t.payer_name} → ${t.receiver_name})` : '';
    body = `${who} hat eine Zahlung eingetragen${route} – ${amount}`;
  } else {
    const what = t.title?.trim() ? `„${t.title.trim()}“` : 'eine Ausgabe';
    body = `${who} hat ${what} eingetragen – ${amount}`;
  }
  return {
    title: t.household_name ? `Finanzen · ${t.household_name}` : 'Finanzen',
    body,
    url: '/finance',
    tag: `finance-${ev.transaction_id}`,
  };
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let eventId: unknown;
  try {
    ({ event_id: eventId } = await req.json());
  } catch {
    return json({ error: 'invalid body' }, 400);
  }
  if (typeof eventId !== 'string' || !/^[0-9a-f-]{36}$/i.test(eventId)) {
    return json({ error: 'invalid event_id' }, 400);
  }

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:push@magaziner.invalid';
  if (!publicKey || !privateKey) {
    // Leave the event in the outbox; nothing can be signed without the keys.
    console.error(`[send-push] event ${eventId}: VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY fehlen – nichts verschickt`);
    return json({ error: 'vapid keys not configured' }, 500);
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await admin.rpc('claim_push_event', { p_event_id: eventId });
  if (error) {
    console.error(`[send-push] event ${eventId}: claim failed`, error.message);
    return json({ error: 'claim failed' }, 500);
  }
  if (!data) {
    console.log(`[send-push] event ${eventId}: unknown, already sent or subject gone`);
    return json({ sent: 0 });
  }

  const ev = data as ClaimedEvent;
  const payload = JSON.stringify(compose(ev));
  const expired: string[] = [];
  let sent = 0;

  await Promise.all(ev.subscriptions.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 60 * 60 * 24, urgency: 'normal' },
      );
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) expired.push(s.id);
      else console.error(`[send-push] subscription ${s.id}: ${status ?? ''} ${(e as Error).message}`);
    }
  }));

  if (expired.length) {
    const { error: delError } = await admin.from('push_subscriptions').delete().in('id', expired);
    if (delError) console.error('[send-push] removing expired subscriptions failed', delError.message);
  }

  console.log(
    `[send-push] event ${eventId} ${ev.kind ?? 'finance'} (household ${ev.household_id}): ` +
    `${ev.subscriptions.length} subscriptions, ${sent} sent, ${expired.length} expired removed`,
  );
  return json({ sent, expired: expired.length, total: ev.subscriptions.length });
});
