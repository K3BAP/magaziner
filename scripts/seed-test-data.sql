-- =============================================================================
-- Test-Fixture für die manuelle/agentische Verifikation.
--
-- Ausführung: über den Supabase-MCP (`execute_sql`) oder im SQL-Editor. Läuft
-- privilegiert und umgeht damit RLS — es wird kein Service-Role-Key auf der
-- Platte gebraucht.
--
-- Das Skript ist idempotent: es löscht den Test-Haushalt komplett und legt ihn
-- mit festen UUIDs neu an. Beliebig oft wiederholbar.
--
-- SICHERHEIT: Es wird ausschließlich der Haushalt
-- 00000000-0000-4000-8000-000000000001 angefasst. Alle Test-UUIDs beginnen mit
-- 00000000-, echte Daten sind gen_random_uuid()-Werte — eine Kollision ist
-- praktisch ausgeschlossen. Niemals eine echte Haushalts-UUID hier eintragen.
--
-- Voraussetzung: der Test-User existiert in Supabase Auth
-- (Studio → Authentication → Add user, „Auto Confirm User" anhaken).
-- =============================================================================

do $$
declare
  v_user   uuid;
  v_hh     uuid := '00000000-0000-4000-8000-000000000001';
  v_list_a uuid := '00000000-0000-4000-8000-00000000000a';
  v_list_b uuid := '00000000-0000-4000-8000-00000000000b';
  -- Regale (Reihenfolge = position, gespiegelt aus src/utils/shoppingCategories.ts)
  v_produce   uuid := '00000000-0000-4000-8000-0000000000c0';
  v_dairy     uuid := '00000000-0000-4000-8000-0000000000c1';
  v_meat      uuid := '00000000-0000-4000-8000-0000000000c2';
  v_bakery    uuid := '00000000-0000-4000-8000-0000000000c3';
  v_frozen    uuid := '00000000-0000-4000-8000-0000000000c4';
  v_pantry    uuid := '00000000-0000-4000-8000-0000000000c5';
  v_drinks    uuid := '00000000-0000-4000-8000-0000000000c6';
  v_snacks    uuid := '00000000-0000-4000-8000-0000000000c7';
  v_household uuid := '00000000-0000-4000-8000-0000000000c8';
  v_misc      uuid := '00000000-0000-4000-8000-0000000000c9';
  v_now       timestamptz := now();
begin
  select id into v_user from auth.users where email = 'test@magaziner.test';
  if v_user is null then
    raise exception
      'Test-User test@magaziner.test fehlt. Bitte zuerst in Supabase Studio anlegen: Authentication → Add user → "Auto Confirm User" anhaken.';
  end if;

  -- Reset. Alle Kind-Tabellen hängen per ON DELETE CASCADE am Haushalt,
  -- user_profiles.active_household_id per ON DELETE SET NULL.
  delete from public.households where id = v_hh;

  insert into public.households (id, name, owner_id)
  values (v_hh, '[TEST] Verifikation', v_user);

  insert into public.household_members (household_id, user_id, role)
  values (v_hh, v_user, 'owner');

  insert into public.user_profiles (id, display_name, active_household_id)
  values (v_user, 'Testnutzer', v_hh)
  on conflict (id) do update
    set display_name = excluded.display_name,
        active_household_id = excluded.active_household_id;

  insert into public.shopping_categories (id, household_id, key, name, icon, position) values
    (v_produce,   v_hh, 'produce',   'Obst & Gemüse',        '🥦', 0),
    (v_dairy,     v_hh, 'dairy',     'Milchprodukte & Eier', '🧀', 1),
    (v_meat,      v_hh, 'meat',      'Fleisch & Fisch',      '🥩', 2),
    (v_bakery,    v_hh, 'bakery',    'Brot & Backwaren',     '🥖', 3),
    (v_frozen,    v_hh, 'frozen',    'Tiefkühl',             '🧊', 4),
    (v_pantry,    v_hh, 'pantry',    'Vorräte & Konserven',  '🥫', 5),
    (v_drinks,    v_hh, 'drinks',    'Getränke',             '🥤', 6),
    (v_snacks,    v_hh, 'snacks',    'Süßes & Snacks',       '🍫', 7),
    (v_household, v_hh, 'household', 'Haushalt & Drogerie',  '🧴', 8),
    (v_misc,      v_hh, 'misc',      'Sonstiges',            '🛒', 9);

  insert into public.shopping_lists (id, household_id, name, icon, position) values
    (v_list_a, v_hh, 'Wocheneinkauf', '🛒', 0),
    (v_list_b, v_hh, 'Drogerie',      '🧴', 1);

  -- Liste A: 4 offene + 3 abgehakte Einträge, verteilt über mehrere Regale.
  -- Die abgehakten sind der Startzustand für „Abgehakte löschen".
  insert into public.shopping_list (id, household_id, list_id, category_id, title, is_completed, created_at) values
    ('00000000-0000-4000-8000-000000000101', v_hh, v_list_a, v_produce, 'Tomaten',        false, v_now - interval '1 min'),
    ('00000000-0000-4000-8000-000000000102', v_hh, v_list_a, v_produce, 'Bananen',        true,  v_now - interval '2 min'),
    ('00000000-0000-4000-8000-000000000103', v_hh, v_list_a, v_dairy,   'Milch',          false, v_now - interval '3 min'),
    ('00000000-0000-4000-8000-000000000104', v_hh, v_list_a, v_dairy,   'Butter',         true,  v_now - interval '4 min'),
    ('00000000-0000-4000-8000-000000000105', v_hh, v_list_a, v_bakery,  'Brötchen',       false, v_now - interval '5 min'),
    ('00000000-0000-4000-8000-000000000106', v_hh, v_list_a, v_drinks,  'Sprudelwasser',  true,  v_now - interval '6 min'),
    ('00000000-0000-4000-8000-000000000107', v_hh, v_list_a, v_misc,    'Geschenkpapier', false, v_now - interval '7 min');

  -- Liste B: eigener Bestand, um die Listen-Isolation zu prüfen.
  insert into public.shopping_list (id, household_id, list_id, category_id, title, is_completed, created_at) values
    ('00000000-0000-4000-8000-000000000201', v_hh, v_list_b, v_household, 'Zahnpasta', false, v_now - interval '1 min'),
    ('00000000-0000-4000-8000-000000000202', v_hh, v_list_b, v_household, 'Duschgel',  true,  v_now - interval '2 min'),
    ('00000000-0000-4000-8000-000000000203', v_hh, v_list_b, v_household, 'Klopapier', false, v_now - interval '3 min');

  insert into public.todos (id, household_id, title, is_completed, due_date, recurrence, assignee_id) values
    ('00000000-0000-4000-8000-000000000301', v_hh, 'Bad putzen',        false, null,               null,     null),
    ('00000000-0000-4000-8000-000000000302', v_hh, 'Müll rausbringen',  true,  null,               'weekly', null),
    ('00000000-0000-4000-8000-000000000303', v_hh, 'Pfand wegbringen',  false, current_date - 2,   null,     v_user),
    ('00000000-0000-4000-8000-000000000304', v_hh, 'Blumen gießen',     false, current_date,       'weekly', null),
    ('00000000-0000-4000-8000-000000000305', v_hh, 'Steuer vorbereiten', false, current_date + 10, null,     null);

  -- Aufgaben 3.0: Räume, Chores in jedem Frische-Zustand und jedem Zuteilungs-Modus,
  -- Verlauf über drei Tage (Streak 3, 95 XP → die nächste Erledigung ≥ 5 XP ist ein Level-Up).
  insert into public.chore_areas (id, household_id, name, emoji, sort) values
    ('00000000-0000-4000-8000-000000000a01', v_hh, 'Küche', '🍳', 0),
    ('00000000-0000-4000-8000-000000000a02', v_hh, 'Bad',   '🛁', 1);

  insert into public.chores (id, household_id, title, area_id, kind, interval_days, next_due, due_date, effort, unpopular, assign_mode, rotation, current_assignee, completed_at, last_done_at, last_done_by) values
    -- heute fällig, abwechselnd
    ('00000000-0000-4000-8000-000000000b01', v_hh, 'Spülmaschine ausräumen', '00000000-0000-4000-8000-000000000a01', 'recurring', 1,  current_date,      null, 'mini',   false, 'rotate', array[v_user], v_user, null, null, null),
    -- frisch (ratio 2/7), offen
    ('00000000-0000-4000-8000-000000000b02', v_hh, 'Herd putzen',            '00000000-0000-4000-8000-000000000a01', 'recurring', 7,  current_date + 5,  null, 'small',  false, 'open',   '{}',          null,   null, null, null),
    -- bald (ratio 12/14), fair
    ('00000000-0000-4000-8000-000000000b03', v_hh, 'Kühlschrank aufräumen',  '00000000-0000-4000-8000-000000000a01', 'recurring', 14, current_date + 2,  null, 'medium', false, 'fair',   array[v_user], v_user, null, null, null),
    -- seit gestern fällig (orange), fest, unbeliebt
    ('00000000-0000-4000-8000-000000000b04', v_hh, 'Toilette putzen',        '00000000-0000-4000-8000-000000000a02', 'recurring', 7,  current_date - 1,  null, 'small',  true,  'fixed',  '{}',          v_user, null, null, null),
    -- überfällig (rot), offen → Rettungs-Bonus
    ('00000000-0000-4000-8000-000000000b05', v_hh, 'Dusche putzen',          '00000000-0000-4000-8000-000000000a02', 'recurring', 7,  current_date - 5,  null, 'medium', true,  'open',   '{}',          null,   null, null, null),
    -- ganz frisch → „zu früh“ halbiert die XP
    ('00000000-0000-4000-8000-000000000b06', v_hh, 'Fenster putzen',         null,                                   'recurring', 90, current_date + 80, null, 'large',  false, 'open',   '{}',          null,   null, null, null),
    -- einmalig: überfällig + mir zugeteilt, später, ohne Datum, erledigt
    ('00000000-0000-4000-8000-000000000b11', v_hh, 'Pfand wegbringen',       null, 'once', null, null, current_date - 2,  'small', false, 'fixed', '{}', v_user, null, null, null),
    ('00000000-0000-4000-8000-000000000b12', v_hh, 'Steuer vorbereiten',     null, 'once', null, null, current_date + 10, 'large', false, 'open',  '{}', null,   null, null, null),
    ('00000000-0000-4000-8000-000000000b13', v_hh, 'Fahrradschloss kaufen',  null, 'once', null, null, null,              'small', false, 'open',  '{}', null,   null, null, null),
    ('00000000-0000-4000-8000-000000000b14', v_hh, 'Glühbirne wechseln',     null, 'once', null, null, null,              'mini',  false, 'open',  '{}', null,
      ((current_date - 1) + time '18:00') at time zone 'Europe/Berlin', ((current_date - 1) + time '18:00') at time zone 'Europe/Berlin', v_user);

  insert into public.chore_completions (id, household_id, chore_id, chore_title, area_id, user_id, done_at, xp, coins, effort, flags) values
    ('00000000-0000-4000-8000-000000000c01', v_hh, '00000000-0000-4000-8000-000000000b02', 'Herd putzen',        '00000000-0000-4000-8000-000000000a01', v_user, ((current_date - 3) + time '19:00') at time zone 'Europe/Berlin', 30, 6, 'small',  '{on_time,unpopular}'),
    ('00000000-0000-4000-8000-000000000c02', v_hh, null,                                   'Wäsche waschen',     null,                                   v_user, ((current_date - 2) + time '09:30') at time zone 'Europe/Berlin', 25, 5, 'medium', '{on_time}'),
    ('00000000-0000-4000-8000-000000000c03', v_hh, '00000000-0000-4000-8000-000000000b14', 'Glühbirne wechseln', null,                                   v_user, ((current_date - 1) + time '18:00') at time zone 'Europe/Berlin', 40, 8, 'large',  '{}');

  insert into public.game_ledger (household_id, user_id, xp, coins, reason, ref_id, created_at)
  select v_hh, v_user, xp, coins, 'chore', id, done_at
    from public.chore_completions where household_id = v_hh;

  insert into public.game_member_state (household_id, user_id, streak_current, streak_best, streak_last_day)
  values (v_hh, v_user, 3, 3, current_date - 1);

  -- M2: Team-Energie 45 („Geht so“), laufende Woche mit drei Quests, ein ungesehener
  -- Rückblick der Vorwoche (öffnet sich beim ersten Besuch von Aufgaben), ein Abzeichen.
  insert into public.household_game_state (household_id, energy, week_start, weekly_goal_xp, goal_streak)
  values (v_hh, 45, private.game_week_start(private.game_today()), 150, 1);

  insert into public.game_quests (household_id, week_start, key, params, target, reward_coins) values
    (v_hh, private.game_week_start(private.game_today()), 'rescue',      '{}', 2, 15),
    (v_hh, private.game_week_start(private.game_today()), 'big_cleanup', '{}', 2, 20),
    (v_hh, private.game_week_start(private.game_today()), 'room_shine',  '{"area_id":"00000000-0000-4000-8000-000000000a02"}', 1, 15);

  insert into public.game_weeks (household_id, week_start, goal_xp, team_xp, goal_reached, rated, members, quests, highlights)
  values (v_hh, private.game_week_start(private.game_today()) - 7, 80, 150, true, true,
    jsonb_build_array(jsonb_build_object('user_id', v_user, 'xp', 150, 'count', 6)),
    '[{"key":"unloved","params":{},"target":3,"reward":15,"done":true},{"key":"early_bird","params":{},"target":4,"reward":10,"done":false},{"key":"no_red","params":{},"target":1,"reward":25,"done":false}]',
    jsonb_build_object('top', jsonb_build_object('title', 'Backofen reinigen', 'xp', 60, 'user_id', v_user), 'rescues', 1, 'count', 6, 'energy', 70));

  insert into public.user_badges (household_id, user_id, badge_key) values (v_hh, v_user, 'first_chore');

  -- Vorräte (2.0): Orte, Kategorien, Produkte mit allen Ablauf-Zuständen.
  insert into public.locations (id, household_id, name, icon) values
    ('00000000-0000-4000-8000-000000000401', v_hh, 'Kühlschrank',    '❄️'),
    ('00000000-0000-4000-8000-000000000402', v_hh, 'Vorratsschrank', '🥫');

  insert into public.categories (id, household_id, location_id, name) values
    ('00000000-0000-4000-8000-000000000411', v_hh, '00000000-0000-4000-8000-000000000401', 'Milchprodukte');

  insert into public.items (id, household_id, location_id, category_id, name, minimum_stock, barcode) values
    ('00000000-0000-4000-8000-000000000501', v_hh, '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000411', 'Joghurt',  2,    null),
    ('00000000-0000-4000-8000-000000000502', v_hh, '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000411', 'Käse',     null, null),
    ('00000000-0000-4000-8000-000000000503', v_hh, '00000000-0000-4000-8000-000000000401', null,                                   'Senf',     null, null),
    ('00000000-0000-4000-8000-000000000504', v_hh, '00000000-0000-4000-8000-000000000402', null,                                   'Müsli',    1,    '4000000000001'),
    ('00000000-0000-4000-8000-000000000505', v_hh, '00000000-0000-4000-8000-000000000402', null,                                   'Tomaten (Dose)', 3, null);

  insert into public.item_instances (id, household_id, item_id, quantity, expiry_date, opened_at) values
    ('00000000-0000-4000-8000-000000000601', v_hh, '00000000-0000-4000-8000-000000000501', 1, current_date - 1,  null),
    ('00000000-0000-4000-8000-000000000602', v_hh, '00000000-0000-4000-8000-000000000501', 2, current_date + 5,  null),
    ('00000000-0000-4000-8000-000000000603', v_hh, '00000000-0000-4000-8000-000000000502', 1, current_date + 30, current_date - 3),
    ('00000000-0000-4000-8000-000000000604', v_hh, '00000000-0000-4000-8000-000000000503', 1, null,              current_date - 20),
    ('00000000-0000-4000-8000-000000000605', v_hh, '00000000-0000-4000-8000-000000000504', 1, current_date + 90, null),
    ('00000000-0000-4000-8000-000000000606', v_hh, '00000000-0000-4000-8000-000000000505', 2, current_date + 400, null);

  -- Finanzen (2.0): zwei Personen, Kategorien, eine Ausgabe, eine Zahlung.
  insert into public.finance_members (id, household_id, name) values
    ('00000000-0000-4000-8000-000000000701', v_hh, 'Testnutzer'),
    ('00000000-0000-4000-8000-000000000702', v_hh, 'Mitbewohner');

  insert into public.finance_categories (id, household_id, name, icon) values
    ('00000000-0000-4000-8000-000000000711', v_hh, 'Lebensmittel', '🍎'),
    ('00000000-0000-4000-8000-000000000712', v_hh, 'Wohnen',       '🏠');

  insert into public.finance_transactions (id, household_id, type, title, amount, payer_id, receiver_id, category_id, date) values
    ('00000000-0000-4000-8000-000000000801', v_hh, 'expense', 'Wocheneinkauf Rewe', 60.00, '00000000-0000-4000-8000-000000000701', null, '00000000-0000-4000-8000-000000000711', current_date - 1),
    ('00000000-0000-4000-8000-000000000802', v_hh, 'payment', null,                 10.00, '00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000701', null, current_date);

  insert into public.finance_splits (id, transaction_id, member_id, split_amount, split_percentage) values
    ('00000000-0000-4000-8000-000000000811', '00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000701', 30.00, 50),
    ('00000000-0000-4000-8000-000000000812', '00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000702', 30.00, 50);

  insert into public.recipes (id, household_id, name, description, servings, ingredients) values
    ('00000000-0000-4000-8000-000000000901', v_hh, 'Tomatensoße',
     E'## Zubereitung\n1. Zwiebeln anschwitzen\n2. Tomaten dazu, **20 Minuten** köcheln.\n\n<img src=x onerror="alert(1)">',
     2,
     '[{"id":"i1","name":"Tomaten (Dose)","quantity":"2 Dosen"},{"id":"i2","name":"Zwiebel","quantity":"1"},{"id":"i3","name":"Olivenöl","quantity":"2 EL"}]'::jsonb);
end $$;

-- Startzustand zur Kontrolle. (Die Rezeptbeschreibung enthält absichtlich ein
-- <img onerror>, um die HTML-Bereinigung zu prüfen.)
select
  l.name                                        as liste,
  count(*)                                      as eintraege,
  count(*) filter (where s.is_completed)        as abgehakt
from public.shopping_lists l
left join public.shopping_list s on s.list_id = l.id
where l.household_id = '00000000-0000-4000-8000-000000000001'
group by l.name, l.position
order by l.position;
