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
