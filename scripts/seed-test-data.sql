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

  insert into public.todos (id, household_id, title, is_completed) values
    ('00000000-0000-4000-8000-000000000301', v_hh, 'Bad putzen',       false),
    ('00000000-0000-4000-8000-000000000302', v_hh, 'Müll rausbringen', true);
end $$;

-- Startzustand zur Kontrolle.
select
  l.name                                        as liste,
  count(*)                                      as eintraege,
  count(*) filter (where s.is_completed)        as abgehakt
from public.shopping_lists l
left join public.shopping_list s on s.list_id = l.id
where l.household_id = '00000000-0000-4000-8000-000000000001'
group by l.name, l.position
order by l.position;
