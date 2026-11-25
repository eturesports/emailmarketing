"""Newsletter: Eture Sports en el MLS NEXT Fest (Phoenix, 2–13 dic 2026).

    python3 scripts/newsletters/mls_next_fest_2026.py

Datos del evento según el calendario oficial de MLS NEXT: 2–13 de diciembre de
2026, Arizona Athletic Grounds y Red Mountain Park (Mesa, área de Phoenix),
U13–U19, más de 1.600 equipos.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (  # noqa: E402
    BRAND, FONT, INK, LINE, OPS, OPS_PATH, SOFT, SURFACE, TINT,
    button, eyebrow, full_image, h2, img, linker, page, para, stats_row, whatsapp, write,
)

link = linker("mls-next-fest-2026")

COPY = {
    "en": {
        "title": "See you at MLS NEXT Fest",
        "preheader": "Dec 2–13 · Phoenix, Arizona. Our recruiting team will be at the fields — let's meet in person.",
        "label": "MLS NEXT Fest 2026",
        "alt_hero": "Ten Eture players now in NCAA programmes, in the kit of the universities that signed them",
        "eyebrow": "MLS NEXT Fest · Dec 2–13, 2026 · Phoenix, AZ",
        "headline": "See you in Phoenix",
        "sub": "Eture's recruiting team is traveling to MLS NEXT Fest. If you're playing &mdash; or there to watch &mdash; let's meet.",
        "cta": "Book a meeting in Arizona",
        "hello": "Hi {{firstName | there}},",
        "intro": [
            "MLS NEXT Fest brings the best academy players in the country to one place, and this year <strong>we'll be there too</strong>.",
            "It's the best chance to sit down face to face, as a family, and talk about the road from academy soccer to a college roster &mdash; and how a season in Spain can fit into it.",
        ],
        "event_title": "The event",
        "event": [
            ("Dates", "December 2–13, 2026"),
            ("Venues", "Arizona Athletic Grounds &amp; Red Mountain Park, Mesa (Phoenix area)"),
            ("Age groups", "U13 to U19 · 1,600+ teams"),
        ],
        "what_title": "What we can do together in Phoenix",
        "what": [
            ("01", "Meet the family", "A relaxed conversation at the venue with player and parents. Programs, timing, costs: every question on the table."),
            ("02", "Watch you play", "Send us your team, age group and game schedule. If it fits our schedule at the fields, we'll come and watch."),
            ("03", "An honest read", "Where you stand today and which route makes sense: ID Summer Camp, Gap Year, a season with Eture FC or straight to recruitment."),
        ],
        "photo_alt": "An Eture player striking the ball in front of a full stand in Spain",
        "photo_caption": "From the fields in Spain to NCAA rosters: that's the road we'll talk about in Phoenix.",
        "proof_title": "Who you'll be talking to",
        "proof_text": "Eture is built by former NCAA players and coaches &mdash; like Dana Taylor, our US Director and former Oregon State head coach, or Tommy Thompson, former MLS NEXT player with San Jose. And every player we've placed since 2015 is in our operations database, by name, university and season.",
        "stats": [(OPS["d1_players"], "Division I players since 2015"), (OPS["playing_now"], "playing in college right now"), (OPS["universities"], "U.S. universities"), (OPS["scholarships"]["en"], "in scholarships")],
        "proof_cta": "Explore our operations",
        "steps_title": "How to meet us",
        "steps": [
            "Book a time below, or message us on WhatsApp with your <strong>team, age group and schedule</strong>.",
            "We confirm the day and the meeting point at the venue.",
            "We meet in Phoenix. No commitment, no sales pitch &mdash; just answers.",
        ],
        "final_title": "Our calendar in Phoenix is limited",
        "final_text": "We'll only be in Arizona for a few days. Book your spot now and we'll plan around your games.",
        "whatsapp": "Message us on WhatsApp",
        "whatsapp_text": "Hi Eture Sports, I'll be at MLS NEXT Fest in Phoenix. Team / age group: ",
        "sign": "See you in Phoenix,<br /><strong>The Eture Sports team</strong>",
        "footer": "Eture Sports · Vinaròs, Spain",
    },
    "es": {
        "title": "Nos vemos en el MLS NEXT Fest",
        "preheader": "Del 2 al 13 de diciembre · Phoenix, Arizona. Nuestro equipo de reclutamiento estará en los campos: veámonos en persona.",
        "label": "MLS NEXT Fest 2026",
        "alt_hero": "Diez jugadores de Eture que hoy están en programas de la NCAA, con la equipación de las universidades que los ficharon",
        "eyebrow": "MLS NEXT Fest · 2–13 dic 2026 · Phoenix, AZ",
        "headline": "Nos vemos en Phoenix",
        "sub": "El equipo de reclutamiento de Eture viaja al MLS NEXT Fest. Si juegas &mdash; o vas a verlo &mdash;, quedemos.",
        "cta": "Reservar una reunión en Arizona",
        "hello": "Hola {{firstName | familia}},",
        "intro": [
            "El MLS NEXT Fest reúne en un mismo sitio a los mejores jugadores de academia del país, y este año <strong>nosotros también estaremos allí</strong>.",
            "Es la mejor ocasión para sentarnos cara a cara, en familia, y hablar del camino que va del fútbol de academia a una plantilla universitaria &mdash; y de cómo encaja en él una temporada en España.",
        ],
        "event_title": "El evento",
        "event": [
            ("Fechas", "Del 2 al 13 de diciembre de 2026"),
            ("Sedes", "Arizona Athletic Grounds y Red Mountain Park, Mesa (área de Phoenix)"),
            ("Categorías", "De U13 a U19 · más de 1.600 equipos"),
        ],
        "what_title": "Qué podemos hacer juntos en Phoenix",
        "what": [
            ("01", "Conocer a la familia", "Una conversación tranquila en las instalaciones, con el jugador y sus padres. Programas, plazos, costes: todas las preguntas sobre la mesa."),
            ("02", "Verte jugar", "Mándanos tu equipo, tu categoría y tu calendario de partidos. Si encaja con nuestra agenda en los campos, iremos a verte."),
            ("03", "Una valoración honesta", "Dónde estás hoy y qué camino tiene sentido: ID Summer Camp, Gap Year, una temporada con el Eture FC o directamente el reclutamiento."),
        ],
        "photo_alt": "Un jugador de Eture golpeando el balón delante de una grada llena en España",
        "photo_caption": "De los campos de España a las plantillas de la NCAA: ese es el camino del que hablaremos en Phoenix.",
        "proof_title": "Con quién vas a hablar",
        "proof_text": "Eture lo forman exjugadores y exentrenadores de la NCAA &mdash; como Dana Taylor, nuestro director en EE.&nbsp;UU. y exentrenador jefe de Oregon State, o Tommy Thompson, exjugador de MLS NEXT con San Jose. Y cada jugador que hemos colocado desde 2015 está en nuestra base de operaciones, con su nombre, su universidad y su temporada.",
        "stats": [(OPS["d1_players"], "jugadores en Division I desde 2015"), (OPS["playing_now"], "jugando en la universidad ahora mismo"), (OPS["universities"], "universidades de EE.&nbsp;UU."), (OPS["scholarships"]["es"], "en becas")],
        "proof_cta": "Ver nuestras operaciones",
        "steps_title": "Cómo quedar con nosotros",
        "steps": [
            "Reserva una hora aquí abajo o escríbenos por WhatsApp con tu <strong>equipo, categoría y calendario</strong>.",
            "Te confirmamos el día y el punto de encuentro en las instalaciones.",
            "Nos vemos en Phoenix. Sin compromiso y sin discursos de venta: solo respuestas.",
        ],
        "final_title": "Nuestra agenda en Phoenix es limitada",
        "final_text": "Solo estaremos unos días en Arizona. Reserva tu hueco ahora y nos organizamos según tus partidos.",
        "whatsapp": "Escríbenos por WhatsApp",
        "whatsapp_text": "Hola Eture Sports, estaré en el MLS NEXT Fest de Phoenix. Equipo / categoría: ",
        "sign": "Nos vemos en Phoenix,<br /><strong>El equipo de Eture Sports</strong>",
        "footer": "Eture Sports · Vinaròs, España",
    },
}


def build(lang, c):
    call = link("/lp/book-a-call?for=programs", lang)
    wa = whatsapp(c["whatsapp_text"])

    event_rows = "".join(
        f"""<tr>
          <td width="110" valign="top" style="padding:10px 0;border-top:1px solid {LINE};font-family:{FONT};font-size:12px;line-height:18px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:{BRAND};">{k}</td>
          <td valign="top" style="padding:10px 0;border-top:1px solid {LINE};font-family:{FONT};font-size:14px;line-height:20px;color:{INK};">{v}</td>
        </tr>"""
        for k, v in c["event"]
    )

    what = "".join(
        f"""<td class="stack" width="33%" valign="top" style="padding:0 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border-radius:14px;">
            <tr><td style="padding:18px 16px;font-family:{FONT};">
              <div style="font-size:22px;line-height:26px;font-weight:700;color:{BRAND};">{n}</div>
              <div style="font-size:16px;line-height:21px;font-weight:700;color:{INK};padding:6px 0 6px;">{t}</div>
              <div style="font-size:13px;line-height:20px;color:{SOFT};">{d}</div>
            </td></tr>
          </table>
        </td>"""
        for n, t, d in c["what"]
    )

    steps = "".join(
        f"""<tr>
          <td width="34" valign="top" style="padding:0 0 14px;">
            <div style="width:26px;height:26px;line-height:26px;border-radius:13px;background:{BRAND};color:#ffffff;text-align:center;font-family:{FONT};font-size:13px;font-weight:700;">{i}</div>
          </td>
          <td valign="top" style="padding:2px 0 14px 8px;font-family:{FONT};font-size:15px;line-height:22px;color:{INK};">{s}</td>
        </tr>"""
        for i, s in enumerate(c["steps"], start=1)
    )

    intro = "".join(para(p) for p in c["intro"])

    body = f"""
      <!-- Hero -->
      <tr><td style="padding:0;line-height:0;font-size:0;">
        {full_image(img('/images/heroes/trials-wide-1280.jpg'), c['alt_hero'], call)}
      </td></tr>
      <tr><td class="px" bgcolor="{INK}" style="background:{INK};padding:32px 32px 30px;">
        {eyebrow(c['eyebrow'], '#ff8a8f')}
        <h1 class="h1" style="margin:0 0 12px;font-family:{FONT};font-size:34px;line-height:40px;font-weight:700;color:#ffffff;">{c['headline']}</h1>
        {para(c['sub'], '#d2d2d7', margin='0 0 22px')}
        {button(call, c['cta'])}{button(wa, c['whatsapp'], primary=False, on_dark=True)}
      </td></tr>

      <!-- Intro -->
      <tr><td class="px" style="padding:32px 32px 8px;">
        {para(c['hello'])}
        {intro}
      </td></tr>

      <!-- El evento -->
      <tr><td class="px" style="padding:8px 32px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{TINT}" style="background:{TINT};border-radius:16px;border-left:4px solid {BRAND};">
          <tr><td style="padding:20px 22px 12px;">
            {h2(c['event_title'], size=19)}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{event_rows}</table>
          </td></tr>
        </table>
      </td></tr>

      <!-- Qué haremos -->
      <tr><td class="px" bgcolor="{SURFACE}" style="background:{SURFACE};padding:30px 26px 30px;">
        <div style="padding:0 6px;">{h2(c['what_title'], size=22)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>{what}</tr></table>
      </td></tr>

      <!-- Foto -->
      <tr><td style="padding:0;line-height:0;font-size:0;">
        {full_image(img('/images/showcase-77.jpg'), c['photo_alt'])}
      </td></tr>
      <tr><td class="px" style="padding:10px 32px 0;font-family:{FONT};font-size:12px;line-height:17px;color:{SOFT};">{c['photo_caption']}</td></tr>

      <!-- Con quién -->
      <tr><td class="px" style="padding:30px 32px 8px;">
        {h2(c['proof_title'], size=22)}
        {para(c['proof_text'], SOFT, 15, '0 0 20px')}
        {stats_row(c['stats'])}
        <p style="margin:4px 0 0;font-family:{FONT};font-size:14px;line-height:20px;"><a href="{link(OPS_PATH[lang], lang)}" target="_blank" style="color:{BRAND};font-weight:600;text-decoration:none;">{c['proof_cta']} &rarr;</a></p>
      </td></tr>

      <!-- Cómo quedar -->
      <tr><td class="px" style="padding:30px 32px 10px;">
        {h2(c['steps_title'], size=22)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{steps}</table>
      </td></tr>

      <!-- Cierre -->
      <tr><td class="px" style="padding:10px 20px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{BRAND}" style="background:{BRAND};border-radius:20px;">
          <tr><td align="center" style="padding:30px 24px 26px;text-align:center;">
            {h2(c['final_title'], '#ffffff')}
            {para(c['final_text'], '#fbe3e4', 15, '0 0 22px')}
            <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#ffffff" style="border-radius:999px;">
              <a href="{call}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:{FONT};font-size:14px;font-weight:600;line-height:18px;color:{BRAND};text-decoration:none;border-radius:999px;">{c['cta']} &rarr;</a>
            </td></tr></table>
            <p style="margin:16px 0 0;font-family:{FONT};font-size:14px;line-height:20px;"><a href="{wa}" target="_blank" style="color:#ffffff;font-weight:600;text-decoration:underline;">{c['whatsapp']}</a></p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td class="px" style="padding:28px 32px 32px;">
        {para(c['sign'], size=15, margin='0')}
      </td></tr>
"""
    return page(
        lang=lang,
        title=c["title"],
        preheader=c["preheader"],
        label=c["label"],
        home=link("/", lang),
        body=body,
        footer=c["footer"],
    )


if __name__ == "__main__":
    write("mls-next-fest-2026", {lang: build(lang, c) for lang, c in COPY.items()})
