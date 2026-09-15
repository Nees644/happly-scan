-- ===========================================================================
-- MIGRATIE · Opslag voor de factuur-pdf (15 september 2026)
--
-- De factuur gaat als bijlage mee met de mail en wordt bewaard. Bewaren hoort:
-- een klant die zijn mail kwijt is moet zijn factuur terug kunnen krijgen, en
-- de Belastingdienst vraagt zeven jaar.
--
-- De bak is niet openbaar. Wie zijn factuur wil, krijgt een tijdelijke link via
-- een route; een openbare bak zou betekenen dat wie het pad raadt de factuur
-- van een ander kan lezen.
--
-- Herhaalbaar.
-- ===========================================================================

insert into storage.buckets (id, name, public)
values ('facturen', 'facturen', false)
on conflict (id) do update set public = false;

-- Lezen mag alleen wie de factuur zelf op zijn naam heeft staan, plus de
-- beheerder. Het pad is <jaar>/<factuurnummer>.pdf, dus de koppeling loopt via
-- het nummer en niet via een map per gebruiker.
drop policy if exists "eigen factuur lezen" on storage.objects;
create policy "eigen factuur lezen" on storage.objects
  for select to authenticated using (
    bucket_id = 'facturen'
    and exists (
      select 1 from public.facturen f
       where f.pdf_pad = storage.objects.name
         and (f.gebruiker_id = auth.uid() or public.teamkracht_is_beheerder())
    )
  );

-- Schrijven gebeurt alleen door de serverfunctie met de service role; die gaat
-- langs RLS heen. Er komt dus met opzet geen insert-policy.
