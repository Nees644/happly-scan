# Mailteksten voor Supabase Auth

De mails die Supabase stuurt bij aanmelden en wachtwoord vergeten. Standaard
komen die van "Supabase Auth" met een Engelse tekst, en dan herkent niemand ze.
Twee dingen zetten dat recht: de afzender via Resend, en deze teksten.

Bijgewerkt 9 september 2026.

## Stap 0, waar mensen uitkomen

Onder **Authentication**, **URL Configuration**:

| Veld | Waarde |
|---|---|
| Site URL | `https://scan.happly.nl/account` |
| Redirect URLs | `https://scan.happly.nl/**` en `https://happly-scan-git-*-nees644s-projects.vercel.app/**` |

De Site URL is waar Supabase iemand heen stuurt als er verder niets is
meegegeven. Stond die op de voorpagina van de scan, dan kwam een coach uit op
een pagina die voor deelnemers is gemaakt, zonder menu en zonder een spoor naar
zijn eigen omgeving. `/account` kijkt wie je bent en wijst je de weg.

## Stap 1, de afzender

Supabase verstuurt standaard via zijn eigen server. Zet hem op Resend, dat je al
gebruikt voor de uitslagmail en waarvan het domein happly.nl al is geverifieerd.

In Supabase: **Project Settings**, **Authentication**, **SMTP Settings**, en zet
custom SMTP aan.

| Veld | Waarde |
|---|---|
| Sender email | `hallo@happly.nl` |
| Sender name | `Happly` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | je Resend API-sleutel |

Controleer die host en poort even op de SMTP-pagina van Resend zelf; dat is de
bron. De sleutel is dezelfde als `RESEND_API_KEY` in Vercel.

Zonder deze stap blijven de teksten hieronder werken, maar staat er nog steeds
Supabase Auth als afzender.

## Stap 2, de teksten

In Supabase: **Authentication**, **Emails**, en dan per sjabloon. Plak het
onderwerp in het bovenste veld en de HTML in het onderste.

De variabelen tussen accolades vult Supabase in. Laat ze staan zoals ze zijn.

### Bevestig je aanmelding (Confirm signup)

Onderwerp:

```
Bevestig je aanmelding bij Happly
```

Inhoud:

```html
<div style="background:#FBEFF5;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#1A0B2E;padding:20px 30px;color:#fff;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase">Happly</div>
    <div style="padding:28px 30px 34px;font-family:'DM Sans',Helvetica,Arial,sans-serif">
      <p style="font-size:15px;color:#3A2E46;line-height:1.7;margin:0 0 14px">Welkom bij Happly.</p>
      <p style="font-size:15px;color:#3A2E46;line-height:1.7;margin:0 0 22px">Klik op de knop hieronder om je aanmelding te bevestigen. Daarna staat de Lezer-module voor je klaar en kun je meteen beginnen met de eerste twee hoofdstukken.</p>
      <p style="margin:0 0 22px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#D6026F;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 26px;border-radius:999px">Bevestig je aanmelding</a></p>
      <p style="font-size:12.5px;color:#6A5A78;line-height:1.6;margin:0 0 8px">Werkt de knop niet, plak dan deze link in je browser:</p>
      <p style="font-size:12px;color:#6A5A78;line-height:1.6;margin:0 0 20px;word-break:break-all">{{ .ConfirmationURL }}</p>
      <p style="font-size:12.5px;color:#6A5A78;line-height:1.6;margin:0;border-top:1px solid #E7DCEC;padding-top:16px">Deze link is een dag geldig en werkt een keer. Heb je je niet aangemeld, dan hoef je niets te doen; er gebeurt dan ook niets.</p>
    </div>
  </div>
</div>
```

### Wachtwoord opnieuw instellen (Reset password)

Onderwerp:

```
Een nieuw wachtwoord voor je Happly-account
```

Inhoud:

```html
<div style="background:#FBEFF5;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#1A0B2E;padding:20px 30px;color:#fff;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase">Happly</div>
    <div style="padding:28px 30px 34px;font-family:'DM Sans',Helvetica,Arial,sans-serif">
      <p style="font-size:15px;color:#3A2E46;line-height:1.7;margin:0 0 22px">Je kunt hieronder een nieuw wachtwoord instellen voor je Happly-account.</p>
      <p style="margin:0 0 22px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#D6026F;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 26px;border-radius:999px">Nieuw wachtwoord instellen</a></p>
      <p style="font-size:12.5px;color:#6A5A78;line-height:1.6;margin:0 0 8px">Werkt de knop niet, plak dan deze link in je browser:</p>
      <p style="font-size:12px;color:#6A5A78;line-height:1.6;margin:0 0 20px;word-break:break-all">{{ .ConfirmationURL }}</p>
      <p style="font-size:12.5px;color:#6A5A78;line-height:1.6;margin:0;border-top:1px solid #E7DCEC;padding-top:16px">Heb je dit niet aangevraagd, dan hoef je niets te doen. Je huidige wachtwoord blijft gewoon werken.</p>
    </div>
  </div>
</div>
```

### Nieuw e-mailadres bevestigen (Change email address)

Onderwerp:

```
Bevestig je nieuwe e-mailadres
```

Inhoud:

```html
<div style="background:#FBEFF5;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#1A0B2E;padding:20px 30px;color:#fff;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase">Happly</div>
    <div style="padding:28px 30px 34px;font-family:'DM Sans',Helvetica,Arial,sans-serif">
      <p style="font-size:15px;color:#3A2E46;line-height:1.7;margin:0 0 22px">Je wilt het e-mailadres van je Happly-account wijzigen in {{ .Email }}. Klik op de knop om dat te bevestigen.</p>
      <p style="margin:0 0 22px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#D6026F;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 26px;border-radius:999px">Bevestig dit adres</a></p>
      <p style="font-size:12.5px;color:#6A5A78;line-height:1.6;margin:0;border-top:1px solid #E7DCEC;padding-top:16px">Heb je dit niet aangevraagd, dan hoef je niets te doen.</p>
    </div>
  </div>
</div>
```

## Waar op te letten

De teksten volgen `taalregels.md`: geen gedachtestreep, geen uitroepteken,
positief en gericht op de volgende stap. Elke mail zegt ook wat je moet doen als
je het niet was, want dat is de eerste vraag bij een mail die je niet verwachtte.

De link werkt een keer en is een dag geldig. Klikt iemand te laat, dan legt de
module uit wat er aan de hand is en staat er een knop om een nieuwe te sturen.
