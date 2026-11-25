"""Newsletter: planifica 2027, las fechas clave del año.

    python3 scripts/newsletters/planifica_2027.py

Envío previsto: primera semana de enero de 2027. Fechas de eturesports.com
(/showcase, /trials, /programs/eture-id-camp).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (  # noqa: E402
    BRAND, FONT, OPS, SOFT, SURFACE,
    button, callout, card, eyebrow, full_image, h2, hero, img, lead, linker, page, para,
    section_header, stats_strip, whatsapp, write,
)

link = linker("plan-2027")

# (clave, ruta de solicitud EN, ruta ES) — las rutas ES van sin /es, lo pone link().
EVENTS = [
    ("showcase", "/showcase", "/showcase"),
    ("trials", "/application/trials", "/solicitud/trials"),
    ("camp", "/application/summer-camp", "/solicitud/summer-camp"),
    ("season", "/application", "/solicitud"),
]

COPY = {
    "en": {
        "title": "Your 2027, month by month",
        "preheader": "Showcase in February, trials in March, Summer Camp in June: the dates that decide a college roster spot in 2028.",
        "label": "Plan 2027",
        "kickers": {"calendar": "The year ahead", "calendar_title": "Four dates to plan around", "proof": "Since 2015", "parents": "Not sure which one fits?"},
        "alt_hero": "The Eture FC squad arm in arm in the changing room before a match",
        "eyebrow": "New year · Plan 2027",
        "headline": "Your 2027, month by month",
        "sub": "The decisions that put a player on a college roster in 2028 are made this year. These are the dates that matter.",
        "hello": "Hi {{firstName | there}}, happy new year!",
        "intro": "Whether you're a player or a parent, the hardest part of the college pathway is timing: when to apply, when to be seen, when to commit. Here's our whole year on one page, so you can plan it together.",
        "events": {
            "showcase": ("8–11 FEB", "Eture Showcase · Valencia",
                         "The VII edition of our annual showcase. U.S. college programs and professional scouts come to Spain to watch Eture players live &mdash; it's where a season in Spain turns into offers.",
                         "See the Showcase"),
            "trials": ("MARCH", "Spring Break Identification Trials",
                       "One week in Spain to find out before committing to a season: 7–13, 14–20 or 21–27 March. €1,600 per player, all in, flights excluded.",
                       "Book your trial week"),
            "camp": ("28 JUN – 16 JUL", "Eture ID Summer Camp",
                     "Our 6th edition, for 9th to 11th grade: three weeks of training, competition and college exposure, with an optional extension to 30 July.",
                     "Apply to the Summer Camp"),
            "season": ("SEASON 27/28", "Gap Year · High School · College Transfer",
                       "A full season in Spain in 27/28. Spots are filled one application at a time, and the best ones go first.",
                       "Start your application"),
        },
        "showcase_note": "The Showcase is not an open trial: it's for players already in the Eture system.",
        "proof": [(OPS["d1_players"], "Division I players since 2015"), (OPS["playing_now"], "playing in college right now"), (OPS["universities"], "U.S. universities")],
        "parents_title": "Talk to our admissions team",
        "parents_text": "Tell us their age, level and goals, and we'll tell you honestly which of these dates makes sense &mdash; or if it's better to wait.",
        "call": "Book a call",
        "whatsapp": "Message us on WhatsApp",
        "whatsapp_text": "Hi Eture Sports, I'd like help planning 2027 for my player.",
        "sign": "Here's to a great 2027,<br /><strong>The Eture Sports team</strong>",
        "footer": "Eture Sports · Vinaròs, Spain",
    },
    "es": {
        "title": "Tu 2027, mes a mes",
        "preheader": "Showcase en febrero, pruebas en marzo, Summer Camp en junio: las fechas que deciden una plaza universitaria en 2028.",
        "label": "Planifica 2027",
        "kickers": {"calendar": "El año que viene", "calendar_title": "Cuatro fechas para planificar", "proof": "Desde 2015", "parents": "¿No sabéis cuál encaja?"},
        "alt_hero": "La plantilla del Eture FC abrazada en el vestuario antes de un partido",
        "eyebrow": "Año nuevo · Planifica 2027",
        "headline": "Tu 2027, mes a mes",
        "sub": "Las decisiones que llevan a un jugador a una plantilla universitaria en 2028 se toman este año. Estas son las fechas que importan.",
        "hello": "Hola {{firstName | familia}}, ¡feliz año nuevo!",
        "intro": "Seas jugador o padre, lo más difícil del camino universitario son los tiempos: cuándo solicitar, cuándo dejarse ver, cuándo comprometerse. Aquí tenéis nuestro año entero en una página, para planificarlo juntos.",
        "events": {
            "showcase": ("8–11 FEB", "Eture Showcase · Valencia",
                         "La VII edición de nuestro showcase anual. Programas universitarios de EE.&nbsp;UU. y ojeadores profesionales vienen a España a ver en directo a los jugadores Eture &mdash; es donde una temporada en España se convierte en ofertas.",
                         "Ver el Showcase"),
            "trials": ("MARZO", "Spring Break Identification Trials",
                       "Una semana en España para comprobarlo antes de comprometerse a una temporada: del 7 al 13, del 14 al 20 o del 21 al 27 de marzo. 1.600 € por jugador, todo incluido salvo vuelos.",
                       "Reservar semana de prueba"),
            "camp": ("28 JUN – 16 JUL", "Eture ID Summer Camp",
                     "Nuestra 6.ª edición, de 9th a 11th grade: tres semanas de entrenamiento, competición y visibilidad universitaria, con ampliación opcional hasta el 30 de julio.",
                     "Solicitar el Summer Camp"),
            "season": ("TEMPORADA 27/28", "Gap Year · High School · College Transfer",
                       "Una temporada completa en España en la 27/28. Las plazas se cubren solicitud a solicitud, y las mejores se van primero.",
                       "Empezar la solicitud"),
        },
        "showcase_note": "El Showcase no es una prueba abierta: es para jugadores que ya están dentro del sistema Eture.",
        "proof": [(OPS["d1_players"], "jugadores en Division I desde 2015"), (OPS["playing_now"], "jugando en la universidad ahora mismo"), (OPS["universities"], "universidades de EE.&nbsp;UU.")],
        "parents_title": "Habla con nuestro equipo de admisiones",
        "parents_text": "Contadnos su edad, su nivel y sus objetivos, y os diremos con honestidad cuál de estas fechas tiene sentido &mdash; o si es mejor esperar.",
        "call": "Reservar llamada",
        "whatsapp": "Escríbenos por WhatsApp",
        "whatsapp_text": "Hola Eture Sports, me gustaría ayuda para planificar 2027 para mi jugador.",
        "sign": "Por un gran 2027,<br /><strong>El equipo de Eture Sports</strong>",
        "footer": "Eture Sports · Vinaròs, España",
    },
}


def build(lang, c):
    call = link("/lp/book-a-call?for=programs", lang)
    wa = whatsapp(c["whatsapp_text"])
    k = c["kickers"]

    timeline = ""
    for key, path_en, path_es in EVENTS:
        when, title, text, cta = c["events"][key]
        href = link(path_en if lang == "en" else path_es, lang)
        note = lead(c["showcase_note"], size=12, margin="0 0 12px") if key == "showcase" else ""
        inner = (
            eyebrow(when)
            + h2(title, BRAND, 22)
            + lead(text, margin="0 0 12px")
            + note
            + f'<a href="{href}" target="_blank" style="font-family:{FONT};font-size:14px;line-height:20px;font-weight:500;color:{BRAND};text-decoration:none;">{cta} &rarr;</a>'
        )
        timeline += f'<tr><td style="padding:0 0 12px;">{card(inner, "#ffffff", "24px 24px 22px")}</td></tr>'

    body = f"""
      <!-- Hero -->
      <tr><td style="padding:0;line-height:0;font-size:0;">
        {full_image(img('/images/methodology/me-01-character.jpg'), c['alt_hero'], link('/lp/programs', lang))}
      </td></tr>
      {hero(c['eyebrow'], c['headline'], c['sub'])}

      <!-- Intro -->
      <tr><td class="px" style="padding:34px 32px 18px;">
        {para(c['hello'])}
        {para(c['intro'], margin='0')}
      </td></tr>

      <!-- Calendario -->
      <tr><td class="px" bgcolor="{SURFACE}" style="background:{SURFACE};padding:36px 32px 24px;">
        <div style="padding-bottom:22px;">{section_header(k['calendar'], k['calendar_title'])}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{timeline}</table>
      </td></tr>

      <!-- Prueba social -->
      <tr><td class="px" style="padding:36px 32px 10px;">
        {stats_strip(c['proof'])}
      </td></tr>

      <!-- Admisiones -->
      <tr><td class="px" style="padding:24px 20px 0;">
        {callout(k['parents'], c['parents_title'], c['parents_text'], button(call, c['call'], variant='light') + button(wa, c['whatsapp'], variant='ghost'))}
      </td></tr>
      <tr><td class="px" style="padding:30px 32px 32px;">
        {para(c['sign'], size=15, margin='0')}
      </td></tr>
"""
    return page(lang=lang, title=c["title"], preheader=c["preheader"], label=c["label"],
                home=link("/", lang), body=body, footer=c["footer"])


if __name__ == "__main__":
    write("planifica-2027", {lang: build(lang, c) for lang, c in COPY.items()})
