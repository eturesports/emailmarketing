"""Newsletter: la temporada 25/26 en cifras y felicitación de Navidad.

    python3 scripts/newsletters/temporada_25_26_navidad.py

Envío previsto: mediados de diciembre de 2026. Cifras de common.OPS.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (  # noqa: E402
    BRAND, FONT, INK, OPS, OPS_PATH, SEASONS, SOFT, SURFACE, TINT,
    button, eyebrow, full_image, h2, img, linker, page, para, player_grid, season_chart, stats_row, write,
)

link = linker("season-25-26-christmas")

# Jugadores Eture que llegaron a Division I en 25/26 (retratos de /images/toros).
SEASON_PLAYERS = [
    ("Isaac Rosenthal", "Northwestern", "25/26", "isaac-rosenthal"),
    ("Nate Chandler", "Washington", "25/26", "nate-chandler"),
    ("Whit Schatz", "Fairleigh Dickinson", "25/26", "whit-schatz"),
    ("Zain Thompson", "NJIT", "25/26", "zain-thompson"),
]

RECORD = SEASONS[-1][1]
PREVIOUS = SEASONS[-2][1]

COPY = {
    "en": {
        "title": "180 placements. One record season.",
        "preheader": f"Season 25/26 in numbers: {RECORD} college placements, our best year ever. Thank you, and Merry Christmas.",
        "label": "Season 25/26",
        "alt_hero": "The Eture FC squad celebrating on the pitch after a night game",
        "eyebrow": "Season 25/26 in numbers",
        "headline": f"{RECORD} placements.<br />One record season.",
        "sub": "Before the year ends, a thank-you to every family that trusted us &mdash; and a look at what we built together.",
        "hello": "Hi {{firstName | there}},",
        "intro": [
            f"This season we closed <strong>{RECORD} college placements</strong> for Eture players in the United States. It's the most we've ever done in a single year &mdash; up from {PREVIOUS} the season before.",
            "Behind every one of them is a player who took a chance on Spain, and a family that backed them. Thank you.",
        ],
        "stats_title": "The year, in four numbers",
        "stats": [
            (str(RECORD), "college placements in 25/26, a record"),
            (OPS["playing_now"], f"Eture players on a roster right now, at {OPS['playing_universities']} universities"),
            (OPS["d1_share"]["en"], "of all our operations, in Division I"),
            (OPS["operations"], "operations since 2015"),
        ],
        "chart": "Placements per season, 15/16 – 25/26",
        "faces_title": "Some of the faces of 25/26",
        "faces_sub": "Eture players who started this season in Division I.",
        "ops_cta": "See every operation, by name",
        "next_title": "What's coming in 2027",
        "next": [
            ("8–11 Feb", "Eture Showcase", "VII edition in Valencia, with U.S. college programs and pro scouts in the stands."),
            ("March", "Spring Break Trials", "Three one-week trials: 7–13, 14–20 and 21–27 March."),
            ("28 Jun", "ID Summer Camp", "6th edition, 28 June – 16 July, for 9th to 11th grade."),
        ],
        "next_cta": "See all programs",
        "xmas_title": "Merry Christmas from Vinaròs",
        "xmas_text": "From the whole Eture team: thank you for this year. Enjoy the holidays with your family &mdash; we'll be back in January with everything you need to plan 2027.",
        "sign": "Happy holidays,<br /><strong>The Eture Sports team</strong>",
        "footer": "Eture Sports · Vinaròs, Spain",
    },
    "es": {
        "title": "180 colocaciones. Una temporada récord.",
        "preheader": f"La temporada 25/26 en cifras: {RECORD} colocaciones universitarias, nuestro mejor año. Gracias, y feliz Navidad.",
        "label": "Temporada 25/26",
        "alt_hero": "La plantilla del Eture FC celebrando en el campo tras un partido de noche",
        "eyebrow": "La temporada 25/26 en cifras",
        "headline": f"{RECORD} colocaciones.<br />Una temporada récord.",
        "sub": "Antes de que acabe el año, un gracias a cada familia que ha confiado en nosotros &mdash; y un repaso a lo que hemos construido juntos.",
        "hello": "Hola {{firstName | familia}},",
        "intro": [
            f"Esta temporada hemos cerrado <strong>{RECORD} colocaciones universitarias</strong> de jugadores Eture en Estados Unidos. Es lo máximo que hemos hecho nunca en un solo año &mdash; frente a {PREVIOUS} la temporada anterior.",
            "Detrás de cada una de ellas hay un jugador que apostó por España y una familia que lo apoyó. Gracias.",
        ],
        "stats_title": "El año, en cuatro cifras",
        "stats": [
            (str(RECORD), "colocaciones universitarias en 25/26, récord"),
            (OPS["playing_now"], f"jugadores Eture en una plantilla ahora mismo, en {OPS['playing_universities']} universidades"),
            (OPS["d1_share"]["es"], "de todas nuestras operaciones, en Division I"),
            (OPS["operations"], "operaciones desde 2015"),
        ],
        "chart": "Colocaciones por temporada, 15/16 – 25/26",
        "faces_title": "Algunas caras de la 25/26",
        "faces_sub": "Jugadores Eture que han empezado esta temporada en Division I.",
        "ops_cta": "Ver cada operación, con nombre",
        "next_title": "Lo que llega en 2027",
        "next": [
            ("8–11 feb", "Eture Showcase", "VII edición en Valencia, con programas universitarios de EE.&nbsp;UU. y ojeadores profesionales en la grada."),
            ("Marzo", "Spring Break Trials", "Tres pruebas de una semana: del 7 al 13, del 14 al 20 y del 21 al 27 de marzo."),
            ("28 jun", "ID Summer Camp", "6.ª edición, del 28 de junio al 16 de julio, de 9th a 11th grade."),
        ],
        "next_cta": "Ver todos los programas",
        "xmas_title": "Feliz Navidad desde Vinaròs",
        "xmas_text": "De parte de todo el equipo de Eture: gracias por este año. Disfrutad de las fiestas en familia &mdash; volvemos en enero con todo lo necesario para planificar 2027.",
        "sign": "Felices fiestas,<br /><strong>El equipo de Eture Sports</strong>",
        "footer": "Eture Sports · Vinaròs, España",
    },
}


def build(lang, c):
    ops = link(OPS_PATH[lang], lang)
    programs = link("/lp/programs", lang)
    intro = "".join(para(p) for p in c["intro"])

    next_rows = "".join(
        f"""<tr>
          <td width="86" valign="top" style="padding:12px 0;border-top:1px solid #e8e8ed;font-family:{FONT};font-size:13px;line-height:18px;font-weight:700;color:{BRAND};">{when}</td>
          <td valign="top" style="padding:12px 0;border-top:1px solid #e8e8ed;font-family:{FONT};">
            <div style="font-size:15px;line-height:20px;font-weight:700;color:{INK};">{what}</div>
            <div style="font-size:13px;line-height:19px;color:{SOFT};padding-top:2px;">{detail}</div>
          </td>
        </tr>"""
        for when, what, detail in c["next"]
    )

    body = f"""
      <!-- Hero -->
      <tr><td style="padding:0;line-height:0;font-size:0;">
        {full_image(img('/images/transfers/opportunity-eture-fc-team.jpg'), c['alt_hero'], ops)}
      </td></tr>
      <tr><td class="px" bgcolor="{INK}" style="background:{INK};padding:32px 32px 30px;">
        {eyebrow(c['eyebrow'], '#ff8a8f')}
        <h1 class="h1" style="margin:0 0 12px;font-family:{FONT};font-size:34px;line-height:40px;font-weight:700;color:#ffffff;">{c['headline']}</h1>
        {para(c['sub'], '#d2d2d7', margin='0')}
      </td></tr>

      <!-- Intro -->
      <tr><td class="px" style="padding:32px 32px 8px;">
        {para(c['hello'])}
        {intro}
      </td></tr>

      <!-- Cifras -->
      <tr><td class="px" style="padding:8px 26px 8px;">
        <div style="padding:0 6px;">{h2(c['stats_title'], size=20)}</div>
        {stats_row(c['stats'])}
      </td></tr>
      <tr><td class="px" style="padding:0 32px 30px;">
        {season_chart(c['chart'])}
      </td></tr>

      <!-- Caras -->
      <tr><td class="px" bgcolor="{SURFACE}" style="background:{SURFACE};padding:30px 27px 18px;">
        <div style="padding:0 5px;">{h2(c['faces_title'], size=20)}{para(c['faces_sub'], SOFT, 14)}</div>
        {player_grid(SEASON_PLAYERS, ops)}
        <p style="margin:6px 5px 8px;font-family:{FONT};font-size:14px;line-height:20px;"><a href="{ops}" target="_blank" style="color:{BRAND};font-weight:600;text-decoration:none;">{c['ops_cta']} &rarr;</a></p>
      </td></tr>

      <!-- 2027 -->
      <tr><td class="px" style="padding:30px 32px 26px;">
        {h2(c['next_title'], size=20)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{next_rows}</table>
        <div style="padding-top:16px;">{button(programs, c['next_cta'], primary=False)}</div>
      </td></tr>

      <!-- Navidad -->
      <tr><td class="px" style="padding:0 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{BRAND}" style="background:{BRAND};border-radius:20px;">
          <tr><td align="center" style="padding:34px 26px 30px;text-align:center;">
            <div style="font-size:30px;line-height:34px;padding-bottom:8px;">&#127876;</div>
            {h2(c['xmas_title'], '#ffffff')}
            {para(c['xmas_text'], '#fbe3e4', 15, '0')}
          </td></tr>
        </table>
      </td></tr>
      <tr><td class="px" style="padding:28px 32px 32px;">
        {para(c['sign'], size=15, margin='0')}
      </td></tr>
"""
    return page(lang=lang, title=c["title"], preheader=c["preheader"], label=c["label"],
                home=link("/", lang), body=body, footer=c["footer"])


if __name__ == "__main__":
    write("temporada-25-26-navidad", {lang: build(lang, c) for lang, c in COPY.items()})
