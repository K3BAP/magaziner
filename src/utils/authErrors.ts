/** Supabase Auth returns English messages; show German ones to the user. */
export function authErrorMessage(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? '';
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-Mail oder Passwort stimmt nicht.';
  if (m.includes('email not confirmed')) return 'Bitte bestätige zuerst deine E-Mail-Adresse (Link im Postfach).';
  if (m.includes('user already registered')) return 'Zu dieser E-Mail gibt es schon ein Konto. Melde dich an oder setze dein Passwort zurück.';
  if (m.includes('password should be at least')) return 'Das Passwort muss mindestens 8 Zeichen lang sein.';
  if (m.includes('pwned') || m.includes('leaked') || m.includes('compromised'))
    return 'Dieses Passwort ist aus einem Datenleck bekannt. Bitte wähle ein anderes.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Zu viele Versuche. Bitte warte kurz und probier es dann noch einmal.';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'Diese E-Mail-Adresse sieht nicht gültig aus.';
  if (m.includes('same password') || m.includes('different from the old')) return 'Das neue Passwort muss sich vom alten unterscheiden.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Keine Verbindung. Bist du online?';
  return msg || 'Etwas ist schiefgelaufen. Bitte versuch es noch einmal.';
}
