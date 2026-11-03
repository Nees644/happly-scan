-- migratie-zelfstarters-gratis-2026-11-03.sql
-- De gratis trede van het Zelfstartregister. Registreren kost niets en vraagt
-- alleen een eerste meting; het nummer komt bij die meting. Verifiëren is de
-- betaalde stap en geeft badge, jaartal, plan en hermeting.
--
-- De stappen van een registratie worden:
--   open (aangemeld)  ->  geregistreerd (gemeten, nummer)  ->  betaald (geverifieerd)
-- De oude weg (eerst betalen, dan meten) blijft werken voor partners:
--   open  ->  betaald  ->  meting erbij.
-- Draai dit bestand één keer in de SQL-editor van Supabase.

alter table public.zelfstarters drop constraint if exists zelfstarters_status_check;
alter table public.zelfstarters add constraint zelfstarters_status_check
  check (status in ('open','geregistreerd','betaald','mislukt','verlopen'));

-- Een gratis registratie heeft nog geen product en geen bedrag.
alter table public.zelfstarters alter column product_code drop not null;
alter table public.zelfstarters alter column bedrag_cent set default 0;
alter table public.zelfstarters alter column btw_cent set default 0;

-- Vakgebied voor de Index en, later, de positie onder vakgenoten.
alter table public.zelfstarters add column if not exists vakgebied text;

-- De stand van de verificatiebetaling, los van de registratiestatus: een
-- mislukte betaling mag een geregistreerde nooit uit het register halen.
alter table public.zelfstarters add column if not exists betaling_status text
  check (betaling_status is null or betaling_status in ('open','betaald','mislukt','verlopen'));

-- Het als-dan plan (stap 3 van de ontwikkelstructuur), ingevuld na verificatie.
alter table public.zelfstarters add column if not exists plan jsonb;
alter table public.zelfstarters add column if not exists plan_op timestamptz;

-- Twee mails erbij: de uitslagmail na de gratis meting en het vervolg na drie
-- dagen zonder verificatie.
alter table public.zelfstarters add column if not exists mail_uitslag_op timestamptz;
alter table public.zelfstarters add column if not exists mail_vervolg_op timestamptz;
alter table public.zelfstarters add column if not exists mail_plan_op timestamptz;

-- Nieuwe registraties geven hun naam pas vrij als ze dat aanvinken.
alter table public.zelfstarters alter column openbaar set default false;
