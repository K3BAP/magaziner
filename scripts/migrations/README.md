# Migrationen

Das Schema wird über die Supabase-MCP `apply_migration` gepflegt (siehe CLAUDE.md). Hier
steht die Übersicht der für 2.0 angewandten, rein additiven Migrationen:

| Name in Supabase | Inhalt |
|---|---|
| `v2_additive_columns` | `shopping_list.note`, `todos.due_date/assignee_id/recurrence/completed_at`, `items.barcode`, `user_profiles.dashboard_layout`, `recipes.servings` |
| `v2_activity_log` | Tabelle `activity_log` + Trigger auf `item_instances`, `todos`, `shopping_list` |
| `v2_realtime_and_recipe_images` | Realtime-Publication, Storage-Bucket `recipe-images` mit Policies |
| `v2_activity_log_cascade_guard` | `private.log_activity` ignoriert gelöschte Haushalte (blockiert sonst kaskadierende Löschungen) |

Den aktuellen Stand liefert immer `list_migrations` bzw. `list_tables`.
