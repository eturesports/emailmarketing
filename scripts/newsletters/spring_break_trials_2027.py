"""Newsletter: Spring Break Identification Trials, marzo de 2027.

    python3 scripts/newsletters/spring_break_trials_2027.py

Envío previsto: segunda quincena de enero de 2027. Datos de /trials:
tres semanas (7–13, 14–20 y 21–27 de marzo), 1.600 € todo incluido salvo
vuelos, y lo que incluye la semana.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (  # noqa: E402
    BRAND, DISPLAY, FONT, INK, OPS, SOFT, SURFACE,
    button, callout, card, display, drive, eyebrow, full_image, h2, hero, img, lead, linker, page, para,
    section_header, stats_strip, whatsapp, write,
)

link = linker("spring-break-trials-2027")

# Semana → parámetro del formulario de solicitud (el mismo en EN y ES).
WEEKS = [
    ("7–13", "Spring+break+%C2%B7+7%E2%80%9313+March+2027"),
    ("14–20", "Spring+break+%C2%B7+14%E2%80%9320+March+2027"),
    ("21–27", "Spring+break+%C2%B7+21%E2%80%9327+March+2027"),
]
TRIAL_PHOTO = drive("1E7WbJxZT_sdZpDwWWKgqze4I6O0nIPp-", 640)

COPY = {
    "en": {
        "title": "Spend spring break in Spain",
        "preheader": "One week with Eture FC: training, a showcase match and LaLiga. Three weeks in March, €1,600 all in.",
        "label": "Spring Break 2027",
        "kickers": {"weeks": "March 2027", "week": "The week", "proof": "Since 2015", "final": "Limited spots"},
        "final_title": "One week to find out",
        "final_text": "Spots are limited in every week. Book yours now, or message us with any question first.",
        "alt_hero": "Both teams lining up at Mestalla under the floodlights",
        "eyebrow": "Eture Identification Trial · March 2027",
        "headline": "Spend spring break in Spain",
        "sub": "One week training with Eture FC, playing in front of scouts and watching LaLiga. Find out before committing to a season.",
        "cta": "Book your week",
        "hello": "Hi {{firstName | there}},",
        "intro": [
            "A full season abroad is a big decision. That's why we built the Identification Trial: <strong>one week in Spain, living and training like an Eture FC player</strong>, so player and family can see it with their own eyes first.",
            "This spring there are three weeks to choose from. Spots are limited in each one.",
        ],
        "weeks_title": "Choose your week",
        "month": "March 2027",
        "week_cta": "Book",
        "price": "€1,600",
        "price_text": "per player, all in · flights excluded",
        "included_title": "What the week includes",
        "included": [
            "Meals &amp; board", "Insurance", "Training sessions with Eture FC", "A LaLiga match",
            "Scouting from partnered Spanish clubs &amp; scouts", "NCAA recruiting seminar",
            "Cultural activities: Peñíscola Castle", "Eture FC Gap Year Program introduction",
        ],
        "photo_alt": [
            "Players training on the pitch during an Eture Identification Trial",
            "A college coach talking to Eture players at the side of the pitch",
        ],
        "photo_label": ["On the pitch", "In front of scouts"],
        "proof_title": "Where the week can lead",
        "proof": [(OPS["d1_players"], "Division I players since 2015"), (OPS["playing_now"], "playing in college right now"), (OPS["scholarships"]["en"], "in scholarships")],
        "skip_title": "Can't make it in March?",
        "skip_text": "The trial is completely optional: it's not a requirement to apply to the Eture FC programs. You can apply directly.",
        "skip_cta": "Apply directly to Eture FC",
        "whatsapp": "Message us on WhatsApp",
        "whatsapp_text": "Hi Eture Sports, I have a question about the Spring Break Identification Trial.",
        "sign": "See you in March,<br /><strong>The Eture Sports team</strong>",
        "footer": "Eture Sports · Vinaròs, Spain",
    },
    "es": {
        "title": "Pasa tu spring break en España",
        "preheader": "Una semana con el Eture FC: entrenamientos, un partido showcase y LaLiga. Tres semanas en marzo, 1.600 € todo incluido.",
        "label": "Spring Break 2027",
        "kickers": {"weeks": "Marzo 2027", "week": "La semana", "proof": "Desde 2015", "final": "Plazas limitadas"},
        "final_title": "Una semana para comprobarlo",
        "final_text": "Las plazas de cada semana son limitadas. Reserva la tuya ahora, o escríbenos antes con cualquier duda.",
        "alt_hero": "Los dos equipos alineados en Mestalla bajo los focos",
        "eyebrow": "Eture Identification Trial · Marzo 2027",
        "headline": "Pasa tu spring break en España",
        "sub": "Una semana entrenando con el Eture FC, jugando delante de ojeadores y viendo LaLiga. Compruébalo antes de comprometerte a una temporada.",
        "cta": "Reservar tu semana",
        "hello": "Hola {{firstName | familia}},",
        "intro": [
            "Una temporada entera fuera es una decisión grande. Por eso creamos el Identification Trial: <strong>una semana en España viviendo y entrenando como un jugador del Eture FC</strong>, para que jugador y familia lo vean antes con sus propios ojos.",
            "Esta primavera hay tres semanas para elegir. Las plazas de cada una son limitadas.",
        ],
        "weeks_title": "Elige tu semana",
        "month": "Marzo 2027",
        "week_cta": "Reservar",
        "price": "1.600 €",
        "price_text": "por jugador, todo incluido · vuelos aparte",
        "included_title": "Qué incluye la semana",
        "included": [
            "Alojamiento y comidas", "Seguro", "Entrenamientos con el Eture FC", "Un partido de LaLiga",
            "Ojeadores de clubes españoles colaboradores", "Seminario sobre reclutamiento NCAA",
            "Actividades culturales: castillo de Peñíscola", "Presentación del Eture FC Gap Year",
        ],
        "photo_alt": [
            "Jugadores entrenando en el campo durante un Eture Identification Trial",
            "Un entrenador universitario hablando con jugadores de Eture a pie de campo",
        ],
        "photo_label": ["En el campo", "Delante de ojeadores"],
        "proof_title": "Adónde puede llevar esa semana",
        "proof": [(OPS["d1_players"], "jugadores en Division I desde 2015"), (OPS["playing_now"], "jugando en la universidad ahora mismo"), (OPS["scholarships"]["es"], "en becas")],
        "skip_title": "¿No puedes en marzo?",
        "skip_text": "La prueba es totalmente opcional: no es un requisito para solicitar los programas del Eture FC. Puedes solicitar directamente.",
        "skip_cta": "Solicitar directamente el Eture FC",
        "whatsapp": "Escríbenos por WhatsApp",
        "whatsapp_text": "Hola Eture Sports, tengo una pregunta sobre el Spring Break Identification Trial.",
        "sign": "Nos vemos en marzo,<br /><strong>El equipo de Eture Sports</strong>",
        "footer": "Eture Sports · Vinaròs, España",
    },
}


def build(lang, c):
    trials_path = "/application/trials" if lang == "en" else "/solicitud/trials"
    trials = link(trials_path, lang)
    direct = link("/application/gap-year" if lang == "en" else "/solicitud/gap-year", lang)
    wa = whatsapp(c["whatsapp_text"])
    intro = "".join(para(p) for p in c["intro"])

    k = c["kickers"]

    weeks = "".join(
        f"""<td class="stack" width="33%" valign="top" style="padding:0 5px;">
          {card(eyebrow(c['month'], SOFT, 'center') + display(days, BRAND, 36, align='center', margin='0 0 14px') + f'<div style="text-align:center;">{button(link(trials_path + "?week=" + week, lang), c["week_cta"])}</div>', '#ffffff', '22px 10px 14px')}
        </td>"""
        for days, week in WEEKS
    )

    half = len(c["included"]) // 2
    def col(items):
        return "".join(
            f'<p style="margin:0 0 10px;font-family:{FONT};font-size:14px;line-height:20px;color:{INK};"><span style="color:{BRAND};font-weight:700;">&#10003;</span>&nbsp; {item}</p>'
            for item in items
        )
    included = f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="stack" width="50%" valign="top" style="padding-right:10px;">{col(c['included'][:half])}</td>
      <td class="stack" width="50%" valign="top">{col(c['included'][half:])}</td>
    </tr></table>"""

    photos = "".join(
        f"""<td width="50%" valign="top" style="padding:0 {'3px 0 0' if i == 0 else '0 0 3px'};">
          <div class="crop2" style="height:178px;overflow:hidden;border-radius:{'16px 0 0 16px' if i == 0 else '0 16px 16px 0'};"><img src="{src}" width="300" alt="{alt}" style="display:block;width:100%;max-width:300px;height:auto;border:0;" /></div>
          {eyebrow(label, BRAND, 'center').replace('margin:0 0 10px', 'margin:0;padding-top:10px')}
        </td>"""
        for i, (src, alt, label) in enumerate(zip(
            [TRIAL_PHOTO, img("/images/methodology/me-04-exposure-01.jpg", 640)], c["photo_alt"], c["photo_label"]))
    )

    price = (
        display(c["price"], BRAND, 44, margin="0 0 2px")
        + lead(c["price_text"], margin="0 0 20px")
        + h2(c["included_title"], BRAND, 20)
        + included
    )

    body = f"""
      <!-- Hero -->
      <tr><td style="padding:0;line-height:0;font-size:0;">
        {full_image(img('/images/laliga/ll-mestalla.jpg'), c['alt_hero'], trials)}
      </td></tr>
      {hero(c['eyebrow'], c['headline'], c['sub'], button(trials, c['cta']))}

      <!-- Intro -->
      <tr><td class="px" style="padding:34px 32px 18px;">
        {para(c['hello'])}
        {intro}
      </td></tr>

      <!-- Semanas -->
      <tr><td class="px" bgcolor="{SURFACE}" style="background:{SURFACE};padding:36px 27px 32px;">
        <div style="padding:0 5px 22px;">{section_header(k['weeks'], c['weeks_title'])}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>{weeks}</tr></table>
      </td></tr>

      <!-- Precio e incluido -->
      <tr><td class="px" style="padding:36px 32px 12px;">
        <div style="padding-bottom:22px;">{section_header(k['week'], c['included_title'])}</div>
        {card(price.replace(h2(c['included_title'], BRAND, 20), ''), SURFACE, '26px 26px 16px')}
      </td></tr>

      <!-- Fotos -->
      <tr><td class="px" style="padding:12px 32px 10px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;"><tr>{photos}</tr></table>
      </td></tr>

      <!-- Prueba social -->
      <tr><td class="px" style="padding:30px 32px 10px;">
        <div style="padding-bottom:20px;">{section_header(k['proof'], c['proof_title'])}</div>
        {stats_strip(c['proof'])}
      </td></tr>

      <!-- Sin prueba -->
      <tr><td class="px" style="padding:22px 32px 8px;">
        {card(h2(c['skip_title'], BRAND, 20) + lead(c['skip_text'], margin='0 0 12px') + f'<a href="{direct}" target="_blank" style="font-family:{FONT};font-size:14px;line-height:20px;font-weight:500;color:{BRAND};text-decoration:none;">{c["skip_cta"]} &rarr;</a>', SURFACE, '24px')}
      </td></tr>

      <!-- Cierre -->
      <tr><td class="px" style="padding:24px 20px 0;">
        {callout(k['final'], c['final_title'], c['final_text'], button(trials, c['cta'], variant='light') + button(wa, c['whatsapp'], variant='ghost'))}
      </td></tr>
      <tr><td class="px" style="padding:30px 32px 32px;">
        {para(c['sign'], size=15, margin='0')}
      </td></tr>
"""
    return page(lang=lang, title=c["title"], preheader=c["preheader"], label=c["label"],
                home=link("/", lang), body=body, footer=c["footer"])


if __name__ == "__main__":
    write("spring-break-trials-2027", {lang: build(lang, c) for lang, c in COPY.items()})
