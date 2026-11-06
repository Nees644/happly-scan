-- Zelfstartregister, 6 november 2026: twee werkvormen, de Zelfstarters Dag
-- in plaats van de Plus Class, en de Zelfstarters Alumni Dag.
--
-- Werkvorm: zelfstandig of loondienst. Dezelfde meting, dezelfde badge, een
-- andere lezing: de momenten in het als-dan plan verschillen per werkvorm.
alter table public.zelfstarters
  add column if not exists werkvorm text not null default 'zelfstandig'
    check (werkvorm in ('zelfstandig', 'loondienst')),
  add column if not exists terugkomdag_op date;

-- De Plus Class (een dag, 299) wordt de Zelfstarters Dag: een dag live met
-- een practitioner, een jaar plan en Zetjes, en de Zelfstarters Alumni Dag. 499 excl.
-- btw, inclusief Verificatie & Voorkeur. De oude rij blijft bestaan voor
-- wie er al aan hangt, maar is niet meer te koop.
update public.producten set actief = false where code = 'ZS-PLUS';

insert into public.producten
  (code, naam, prijs_ex_btw, interval, soort, fase, groep, prijsniveau, betaalwijze, bevat, voorwaarde)
values
('ZS-DAG', 'Zelfstarters Dag, founding-tarief', 49900, 'eenmalig', 'registratie', 'A', 'ZS', null, 'vooraf',
  'Verificatie & Voorkeur, een dag live met een practitioner, een jaar plan en Zetjes, de Zelfstarters Alumni Dag, de plus op de badge', 'Founding-tarief tot 31 december 2026')
on conflict (code) do update set naam = excluded.naam, prijs_ex_btw = excluded.prijs_ex_btw, bevat = excluded.bevat, actief = true;
