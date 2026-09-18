-- =====================================================================
-- Balci Run — weltweite Bestenliste (Supabase / Postgres)
--
-- Einmal im Supabase-Dashboard unter "SQL Editor" ausfuehren.
-- Danach in src/online.js die Projekt-URL und den "anon public"-
-- Schluessel eintragen (Project Settings -> API).
--
-- Was die Regeln hier sicherstellen:
--   * jeder darf die Liste LESEN,
--   * jeder darf einen NEUEN Eintrag anlegen — aber nur mit Werten,
--     die zum Spiel passen (Name aus erlaubten Zeichen, Zahlen begrenzt),
--   * niemand kann Eintraege AENDERN oder LOESCHEN (es gibt dafuer
--     keine Regel, also verbietet Postgres es),
--   * hoechstens 30 neue Eintraege pro Minute insgesamt (gegen Fluten).
--
-- Ehrlicher Hinweis: Ein Browserspiel kann nie beweisen, dass eine
-- Punktzahl wirklich erspielt wurde. Wer es darauf anlegt, kann einen
-- erfundenen (aber plausiblen) Eintrag schicken. Loeschen kannst nur
-- du selbst im Dashboard (Table Editor -> scores).
-- =====================================================================

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  n          text    not null check (n ~ '^[A-ZÄÖÜ0-9 .-]{1,10}$'),
  s          integer not null check (s between 0 and 200000),
  h          integer not null check (h between 0 and 3000),
  t          integer not null check (t between 180 and 359999),
  d          integer not null check (d between 0 and 9999),
  created_at timestamptz not null default now()
);

create index if not exists scores_s_idx on public.scores (s desc);

alter table public.scores enable row level security;

drop policy if exists "scores lesen" on public.scores;
create policy "scores lesen" on public.scores
  for select to anon using (true);

drop policy if exists "scores eintragen" on public.scores;
create policy "scores eintragen" on public.scores
  for insert to anon with check (true);

-- Nur diese Spalten darf der Browser setzen; id und Zeit setzt der Server.
-- Auch angemeldete Supabase-Nutzer bekommen keine Sonderrechte.
revoke all on public.scores from anon, authenticated;
grant select (n, s, h, t, d, created_at) on public.scores to anon;
grant insert (n, s, h, t, d) on public.scores to anon;

-- Schutz gegen Fluten
create or replace function public.scores_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.scores
      where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Zu viele Eintraege gerade. Bitte spaeter nochmal.';
  end if;
  return new;
end;
$$;

drop trigger if exists scores_rate_limit on public.scores;
create trigger scores_rate_limit
  before insert on public.scores
  for each row execute function public.scores_rate_limit();
