"""Genera la newsletter de programas 2027 (EN y ES) a partir de un único esqueleto.

    python3 scripts/newsletters/programas_2027.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (  # noqa: E402
    BRAND, DISPLAY, DIVIDER, FAINT, FONT, INK, SEASONS, SOFT, SURFACE,
    button, callout, card, display, drive, eyebrow, full_image, h2, hero, img, lead, linker, page, para,
    season_chart, section_header, stats_strip, write,
)

link = linker("programs-2027")

# Formulario de solicitud de cada programa, en el mismo orden que PROGRAM_IMAGES.
# El College Transfer no tiene página en /application: su solicitud es el
# formulario #apply de la propia página del programa.
APPLY_PATHS = {
    "en": [
        ("/application/summer-camp", ""),
        ("/application/highschool", ""),
        ("/application/gap-year", ""),
        ("/programs/college-soccer-transfer-program", "#apply"),
        ("/application/trials", ""),
    ],
    "es": [
        ("/solicitud/summer-camp", ""),
        ("/solicitud/highschool", ""),
        ("/solicitud/gap-year", ""),
        ("/programas/transfer-futbol-universitario", "#apply"),
        ("/solicitud/trials", ""),
    ],
}
APPLY_ALL = {"en": "/application", "es": "/solicitud"}

# Fotos de cada programa. Cada entrada es una lista de (url, clave de texto):
# una foto ocupa toda la tarjeta, dos van en mitades y tres en columnas.
# Las de Drive son las que ha elegido marketing; deben seguir compartidas
# como «cualquiera con el enlace» o el email se quedará sin ellas.
PROGRAM_MEDIA = [
    [(img("/images/progress/isaac-id-camp.jpg"), "camp")],
    [(drive("1p17CJdRWE6LB3Qf7j-KVZmMLxNZnRjus", 640), "hs_study"),
     (drive("1IjZd8008karyoj2QlCGUQ1DWnO2LKCMu", 640), "hs_play")],
    [(drive("1UYacH-HmHVMpHFUDTRDA8csFGweLhqZP", 640), "gy_train"),
     (drive("10ulaRcuIdtINAwr3gZU5TCJz0NnmyRPj", 640), "gy_compete")],
    [(img("/images/transfers/shane-williams-from.jpg", 384), "tr_from"),
     (img("/images/transfers/shane-williams-eture.jpg", 384), "tr_eture"),
     (img("/images/transfers/shane-williams-to.jpg", 384), "tr_to")],
    [(drive("1E7WbJxZT_sdZpDwWWKgqze4I6O0nIPp-"), "trial")],
]
SHANE_ANCHOR = "#shane-williams-2d97"

COPY = {
    "en": {
        "lang": "en",
        "title": "Your pathway to college soccer starts in Spain",
        "preheader": "Five programs, one pathway: summer camp, high school, gap year, college transfer and a one-week trial.",
        "view": "Programs 2027",
        "eyebrow": "Eture Sports · Programs in Spain",
        "headline": "Your pathway to college soccer starts in Spain",
        "sub": "A summer, a school year, a full season or a fresh start after the portal.",
        "hello": "Hi {{firstName | there}},",
        "intro": [
            "Whether you are the player chasing a college roster spot or the parent helping plan the next step, the hardest part is knowing which route fits. That is why we built five different ways in &mdash; all leading to the same place: college soccer in the United States.",
            "Here is the full picture, so you can decide together.",
        ],
        "stats": [
            ("437", "Division I players since 2015"),
            ("329", "Eture players on a college roster this season"),
            ("302", "U.S. universities"),
            ("$60M", "in scholarships"),
        ],
        "section": "The programs",
        "section_sub": "Five ways in. One pathway.",
        "programs": [
            ("Three weeks · Every summer · 9th to 11th grade", "Eture ID Summer Camp",
             "For high school players who want to develop, get identified and live a summer in Spain.",
             "6th edition · 28 June – 16 July 2027 · optional two-week extension"),
            ("Full school year · Ages 14 to 18", "Eture High School Program",
             "For student-athletes who want to start the pathway early, without giving up their education.",
             "Grades 9–12 · Full season · 10 minutes from Vinaròs beach"),
            ("Full season · Ages 18+", "Eture FC Gap Year",
             "For players who have finished high school and won't put a deadline on their dream.",
             "One full season · Residence, meals, gym and recovery included"),
            ("One season · College players in the transfer portal", "College Transfer Program",
             "For college players stuck in the portal, short on minutes or looking to reset after a tough season.",
             "One season · Honest evaluation before you commit"),
            ("One week · Ages 15+", "Eture Identification Trial",
             "For anyone who wants to find out before committing to a season.",
             "€1,600 per player, all in, flights excluded"),
        ],
        "apply": "Apply now",
        "call": "Book a call",
        "kickers": {"which": "Your stage", "parents": "A note for parents", "toros": "Since 2015", "final": "Next step"},
        "parents_heading": "Talk to our admissions team",
        "which_title": "Not sure which one fits?",
        "which": [
            ("In high school, 9th–11th grade", "Start with the <strong>ID Summer Camp</strong>, or the <strong>High School Program</strong> for a full school year."),
            ("Finished high school", "The <strong>Eture FC Gap Year</strong>: a full season in Spain before college."),
            ("Already in college", "The <strong>College Transfer Program</strong>, if you are in the portal or need a reset."),
            ("Want to test it first", "The <strong>Identification Trial</strong>: one week, before committing to a season."),
        ],
        "parents_title": "A note for parents",
        "parents": "Sending your son or daughter abroad is a family decision, and you should have every answer before you make it: where they will live, how school fits in, what a season really looks like and what it costs. Book a call with our team &mdash; we will walk you through the program that fits your player, honestly, including when it is not the right moment.",
        "parents_cta": "Book a call with our team",
        "toros_title": "Toros in the NCAA",
        "toros_sub": "Some of the Eture players now competing in Division I.",
        "jaden": {
            "eyebrow": "College Transfer Program · Success story",
            "title": "Jaden Dubon: from the NAIA to NCAA Division I, through Spain",
            "lead": "Three shirts, three seasons. Jaden left Corban, spent <strong>one season with Eture FC</strong> in Spain, and today he is <strong>a key piece at George Washington, an NCAA Division I program</strong>.",
            "steps": [
                ("2022 · NAIA", "Corban University", "Freshman season: <strong>7 goals</strong>, 3 starts and 1 assist, in a Corban team that went 16-3-2.", "Jaden Dubon celebrating a goal for Corban University"),
                ("23/24 · Spain", "Eture FC", "<strong>14 goals in 19 games.</strong> A goal every 90 minutes in Spanish football, and the film that opened the door to Division I.", "Jaden Dubon playing for Eture FC in Spain"),
                ("Since 2024 · NCAA Division I", "George Washington University", "<strong>A key piece at a Division I program.</strong> A-10 Offensive Player of the Week and MVP of the UMBC/Navy tournament.", "Jaden Dubon playing for George Washington University"),
            ],
            "cta": "See his operation",
            "hero_alt": "Jaden Dubon's transfer: Corban University (NAIA), Eture FC, then George Washington University (NCAA Division I)",
        },
        "ops": {
            "eyebrow": "Operations &amp; Stats",
            "title": "More than 10 years of history. Every operation, with a name.",
            "text": "Anyone can quote a number. <strong>Ours is a list</strong>: every player we have placed since 2015 is in our operations database, by name, university and season. Check any of them before you trust us with your future.",
            "stats": [("790", "operations"), ("729", "players"), ("302", "universities"), ("55.3%", "in Division I")],
            "chart": "Placements per season, 15/16 – 25/26",
            "cta": "Explore all 790 operations",
            "path": "/college-operations",
        },
        "final_title": "Limited spots in every program",
        "final_text": "Applications are reviewed one by one. If one of these programs feels right, start your application today &mdash; or talk to us first.",
        "final_apply": "Start your application",
        "whatsapp": "Prefer WhatsApp? Write to us",
        "whatsapp_text": "Hi%20Eture%20Sports%2C%20I%27d%20like%20to%20know%20more%20about%20your%20programs.",
        "sign": "See you on the pitch,<br /><strong>The Eture Sports team</strong>",
        "footer": "Eture Sports · Vinaròs, Spain",
        "alt_logo": "Eture Sports",
        "alt_hero": "Ten Eture players now in NCAA programmes, in the kit of the universities that signed them",
        "media": {
            "camp": ("Isaac Rosenthal at the ID Summer Camp · today at Northwestern, Division I", "Isaac Rosenthal as a young goalkeeper at the Eture ID Summer Camp"),
            "hs_study": ("In the classroom", "Eture High School students studying together at the residence"),
            "hs_play": ("On the pitch", "Eture High School players competing in a night match"),
            "gy_train": ("Training", "Eture FC Gap Year players in a training session"),
            "gy_compete": ("Competing", "Eture FC Gap Year players competing in a match"),
            "tr_from": ("Colgate", "Shane Williams keeping goal for Colgate University"),
            "tr_eture": ("Eture FC", "Shane Williams keeping goal for Eture FC in Spain"),
            "tr_to": ("Vermont · D-I", "Shane Williams in a University of Vermont shirt"),
            "trial": ("", "Players training on the pitch during an Eture Identification Trial"),
        },
        "shane": "<strong>Shane Williams:</strong> left Colgate, spent a season keeping goal for Eture FC in Spain and signed with the University of Vermont, NCAA Division I. Same goalkeeper, three shirts.",
        "shane_cta": "See the operation",
    },
    "es": {
        "lang": "es",
        "title": "Tu camino al fútbol universitario empieza en España",
        "preheader": "Cinco programas, un solo camino: campus de verano, instituto, gap year, transfer universitario y una prueba de una semana.",
        "view": "Programas 2027",
        "eyebrow": "Eture Sports · Programas en España",
        "headline": "Tu camino al fútbol universitario empieza en España",
        "sub": "Un verano, un curso escolar, una temporada completa o un nuevo comienzo tras el portal.",
        "hello": "Hola {{firstName | familia}},",
        "intro": [
            "Tanto si eres el jugador que persigue un hueco en una plantilla universitaria como si eres el padre o la madre que ayuda a planificar el siguiente paso, lo más difícil es saber qué camino encaja. Por eso hemos creado cinco formas de entrar &mdash; todas hacia el mismo destino: el fútbol universitario en Estados Unidos.",
            "Aquí tenéis la foto completa, para que lo decidáis juntos.",
        ],
        "stats": [
            ("437", "jugadores en Division I desde 2015"),
            ("329", "jugadores Eture en una plantilla universitaria esta temporada"),
            ("302", "universidades de EE.&nbsp;UU."),
            ("60&nbsp;M$", "en becas"),
        ],
        "section": "Los programas",
        "section_sub": "Cinco formas de entrar. Un solo camino.",
        "programs": [
            ("Tres semanas · Cada verano · 9th a 11th grade", "Eture ID Summer Camp",
             "Para jugadores de instituto que quieren mejorar, ser identificados y vivir un verano en España.",
             "6.ª edición · 28 de junio – 16 de julio de 2027 · ampliación opcional de dos semanas"),
            ("Curso escolar completo · De 14 a 18 años", "Eture High School Program",
             "Para estudiantes-deportistas que quieren empezar el camino pronto sin renunciar a sus estudios.",
             "Grados 9–12 · Temporada completa · A 10 minutos de la playa de Vinaròs"),
            ("Temporada completa · Mayores de 18", "Eture FC Gap Year",
             "Para jugadores que han terminado el instituto y no ponen fecha límite a su sueño.",
             "Una temporada completa · Residencia, comidas, gimnasio y recuperación incluidos"),
            ("Una temporada · Universitarios en el transfer portal", "College Transfer Program",
             "Para universitarios atascados en el portal, sin minutos o que quieren reiniciar tras una mala temporada.",
             "Una temporada · Evaluación honesta antes de comprometerte"),
            ("Una semana · Mayores de 15", "Eture Identification Trial",
             "Para quien quiere comprobarlo antes de comprometerse a una temporada.",
             "1.600 € por jugador, todo incluido salvo vuelos"),
        ],
        "apply": "Solicitar plaza",
        "call": "Reservar llamada",
        "kickers": {"which": "Tu etapa", "parents": "Unas líneas para los padres", "toros": "Desde 2015", "final": "Siguiente paso"},
        "parents_heading": "Habla con nuestro equipo de admisiones",
        "which_title": "¿No sabéis cuál encaja?",
        "which": [
            ("En el instituto, 9th–11th grade", "Empieza por el <strong>ID Summer Camp</strong>, o el <strong>High School Program</strong> para un curso completo."),
            ("Instituto terminado", "El <strong>Eture FC Gap Year</strong>: una temporada completa en España antes de la universidad."),
            ("Ya en la universidad", "El <strong>College Transfer Program</strong>, si estás en el portal o necesitas reiniciar."),
            ("Quiero probar antes", "El <strong>Identification Trial</strong>: una semana, antes de comprometerte a una temporada."),
        ],
        "parents_title": "Unas líneas para los padres",
        "parents": "Que vuestro hijo o hija se vaya fuera es una decisión de familia, y conviene tener todas las respuestas antes de tomarla: dónde va a vivir, cómo encajan los estudios, cómo es de verdad una temporada y cuánto cuesta. Reservad una llamada con nuestro equipo &mdash; os explicaremos con honestidad el programa que encaja con vuestro jugador, también cuando no es el momento.",
        "parents_cta": "Reservar una llamada con el equipo",
        "toros_title": "Toros en la NCAA",
        "toros_sub": "Algunos de los jugadores Eture que hoy compiten en Division I.",
        "jaden": {
            "eyebrow": "College Transfer Program · Caso de éxito",
            "title": "Jaden Dubon: de la NAIA a la NCAA Division I, pasando por España",
            "lead": "Tres camisetas, tres temporadas. Jaden dejó Corban, pasó <strong>una temporada en el Eture FC</strong> en España y hoy es <strong>una pieza clave en George Washington, un programa de NCAA Division I</strong>.",
            "steps": [
                ("2022 · NAIA", "Corban University", "Temporada de freshman: <strong>7 goles</strong>, 3 titularidades y 1 asistencia, en un Corban que acabó 16-3-2.", "Jaden Dubon celebrando un gol con Corban University"),
                ("23/24 · España", "Eture FC", "<strong>14 goles en 19 partidos.</strong> Un gol cada 90 minutos en el fútbol español y el vídeo que le abrió la puerta de Division I.", "Jaden Dubon jugando con el Eture FC en España"),
                ("Desde 2024 · NCAA Division I", "George Washington University", "<strong>Pieza clave en un programa de Division I.</strong> Jugador ofensivo de la semana de la A-10 y MVP del torneo UMBC/Navy.", "Jaden Dubon jugando con George Washington University"),
            ],
            "cta": "Ver su operación",
            "hero_alt": "El transfer de Jaden Dubon: Corban University (NAIA), Eture FC y George Washington University (NCAA Division I)",
        },
        "ops": {
            "eyebrow": "Operaciones y estadísticas",
            "title": "Más de 10 años de historia. Cada operación, con nombre.",
            "text": "Cualquiera puede dar una cifra. <strong>Lo nuestro es una lista</strong>: cada jugador que hemos colocado desde 2015 está en nuestra base de operaciones, con su nombre, su universidad y su temporada. Comprobad cualquiera antes de confiarnos vuestro futuro.",
            "stats": [("790", "operaciones"), ("729", "jugadores"), ("302", "universidades"), ("55,3&nbsp;%", "en Division I")],
            "chart": "Colocaciones por temporada, 15/16 – 25/26",
            "cta": "Ver las 790 operaciones",
            "path": "/operaciones-universitarias",
        },
        "final_title": "Plazas limitadas en todos los programas",
        "final_text": "Revisamos las solicitudes una a una. Si alguno de estos programas os encaja, empezad hoy la solicitud &mdash; o hablad antes con nosotros.",
        "final_apply": "Empezar la solicitud",
        "whatsapp": "¿Preferís WhatsApp? Escribidnos",
        "whatsapp_text": "Hola%20Eture%20Sports%2C%20me%20gustar%C3%ADa%20saber%20m%C3%A1s%20sobre%20vuestros%20programas.",
        "sign": "Nos vemos en el campo,<br /><strong>El equipo de Eture Sports</strong>",
        "footer": "Eture Sports · Vinaròs, España",
        "alt_logo": "Eture Sports",
        "alt_hero": "Diez jugadores de Eture que hoy están en programas de la NCAA, con la equipación de las universidades que los ficharon",
        "media": {
            "camp": ("Isaac Rosenthal en el ID Summer Camp · hoy en Northwestern, Division I", "Isaac Rosenthal de niño, de portero en el Eture ID Summer Camp"),
            "hs_study": ("En clase", "Alumnos del Eture High School estudiando juntos en la residencia"),
            "hs_play": ("En el campo", "Jugadores del Eture High School compitiendo en un partido de noche"),
            "gy_train": ("Entrenando", "Jugadores del Eture FC Gap Year en un entrenamiento"),
            "gy_compete": ("Compitiendo", "Jugadores del Eture FC Gap Year compitiendo en un partido"),
            "tr_from": ("Colgate", "Shane Williams bajo palos con Colgate University"),
            "tr_eture": ("Eture FC", "Shane Williams bajo palos con el Eture FC en España"),
            "tr_to": ("Vermont · D-I", "Shane Williams con la camiseta de la University of Vermont"),
            "trial": ("", "Jugadores entrenando en el campo durante un Eture Identification Trial"),
        },
        "shane": "<strong>Shane Williams:</strong> dejó Colgate, pasó una temporada de portero en el Eture FC en España y firmó con la University of Vermont, NCAA Division I. El mismo portero, tres camisetas.",
        "shane_cta": "Ver la operación",
    },
}

TOROS = [
    ("Barrett Saul", "West Virginia", "21/22", "barrett-saul"),
    ("Landan Grange", "Virginia Tech", "24/25", "landan-grange"),
    ("Isaiah Easley", "Clemson", "21/22", "isaiah-esley"),
    ("Isaac Rosenthal", "Northwestern", "25/26", "isaac-rosenthal"),
    ("Nate Chandler", "Washington", "25/26", "nate-chandler"),
    ("Whit Schatz", "Fairleigh Dickinson", "25/26", "whit-schatz"),
    ("Zain Thompson", "NJIT", "25/26", "zain-thompson"),
]
JADEN_HERO = "/images/heroes/collegeTransfers-wide-1280.jpg"

JADEN_IMAGES = [
    "/images/transfers/jaden-dubon-corban.jpg",
    "/images/transfers/jaden-dubon-eture-fc.jpg",
    "/images/transfers/jaden-dubon-george-washington.jpg",
]
JADEN_ANCHOR = "#jaden-dubon-8946"


def build(c):
    lang = c["lang"]
    call = link("/lp/book-a-call?for=programs", lang)
    apply_all = link(APPLY_ALL[lang], lang)
    k = c["kickers"]

    def media_block(items, href):
        texts = c["media"]
        if len(items) == 1:
            url, key = items[0]
            label, alt = texts[key]
            caption = (
                f"""<tr><td style="padding:12px 24px 0;font-family:{FONT};font-size:12px;line-height:17px;color:{FAINT};">{label}</td></tr>"""
                if label else ""
            )
            return f"""<tr><td style="padding:0;line-height:0;font-size:0;">
            <a href="{href}" target="_blank"><img src="{url}" width="536" alt="{alt}" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:24px 24px 0 0;" /></a>
          </td></tr>{caption}"""
        n = len(items)
        gap = 4
        # Las fotos de tres columnas no comparten proporción: se recortan a 4:5
        # para que queden alineadas (Outlook ignora el recorte y las muestra enteras).
        crop_open = f'<div class="crop3" style="height:{round(536 / n * 1.25)}px;overflow:hidden;">' if n == 3 else ""
        crop_close = "</div>" if n == 3 else ""
        cells = ""
        for i, (url, key) in enumerate(items):
            label, alt = texts[key]
            left = 0 if i == 0 else gap // 2
            right = 0 if i == n - 1 else gap // 2
            arrow = "" if i == n - 1 or n < 3 else " &rarr;"
            radius = "24px 0 0 0" if i == 0 else ("0 24px 0 0" if i == n - 1 else "0")
            cells += f"""<td width="{round(100 / n)}%" valign="top" style="padding:0 {right}px 0 {left}px;">
              <a href="{href}" target="_blank" style="text-decoration:none;"><div style="border-radius:{radius};overflow:hidden;">{crop_open}<img src="{url}" width="{536 // n}" alt="{alt}" style="display:block;width:100%;max-width:{536 // n}px;height:auto;border:0;" />{crop_close}</div></a>
              {eyebrow(label + arrow, BRAND, 'center').replace('margin:0 0 10px', 'margin:0;padding-top:10px')}
            </td>"""
        return f"""<tr><td style="padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;"><tr>{cells}</tr></table>
          </td></tr>"""

    programs = ""
    for i, ((kicker, name, desc, detail), media, (apply_path, apply_anchor)) in enumerate(
        zip(c["programs"], PROGRAM_MEDIA, APPLY_PATHS[lang]), start=1
    ):
        apply_url = link(apply_path, lang, apply_anchor)
        story = (
            lead(f"""{c['shane']} <a href="{link(c['ops']['path'], lang, SHANE_ANCHOR)}" target="_blank" style="color:{BRAND};font-weight:500;text-decoration:none;white-space:nowrap;">{c['shane_cta']} &rarr;</a>""", size=14, margin="0 0 18px")
            if len(media) == 3 else ""
        )
        programs += f"""
      <tr><td style="padding:0 32px 20px;" class="px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border-radius:24px;">
          {media_block(media, apply_url)}
          <tr><td style="padding:24px 24px 18px;">
            {eyebrow(f'0{i} / 05 · {kicker}')}
            {display(name, BRAND, 24, upper=False, margin='0 0 10px', tag='h3')}
            {lead(desc, margin='0 0 10px')}
            {lead(detail, FAINT, 12, margin='0 0 18px')}
            {story}
            <div style="margin-left:-4px;">{button(apply_url, c['apply'])}{button(call, c['call'], variant='secondary')}</div>
          </td></tr>
        </table>
      </td></tr>"""

    which = "".join(
        f"""<tr>
          <td valign="top" style="padding:14px 0;border-top:1px solid {DIVIDER};">
            {h2(who, BRAND, 18).replace('margin:0 0 14px', 'margin:0 0 4px')}
            {lead(what, margin='0')}
          </td>
        </tr>"""
        for who, what in c["which"]
    )

    ops_link = link(c["ops"]["path"], lang)

    toros = ""
    for row in (TOROS[:4], TOROS[4:]):
        cells = "".join(
            f"""<td width="25%" valign="top" style="padding:0 5px 12px;">
              <a href="{ops_link}" target="_blank" style="text-decoration:none;color:{INK};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
                <tr><td style="padding:0;line-height:0;font-size:0;">
                  <img src="{img('/images/toros/' + slug + '.jpg', 384)}" width="126" alt="{n}, {u}" style="display:block;width:100%;max-width:126px;height:auto;border:0;border-radius:16px 16px 0 0;" />
                </td></tr>
                <tr><td class="tcell" style="padding:10px 10px 12px;">
                  <div class="tname" style="font-family:{DISPLAY};font-size:14px;line-height:17px;font-weight:700;letter-spacing:-.02em;color:{INK};">{n}</div>
                  <div class="tmeta" style="font-family:{FONT};font-size:11px;line-height:16px;color:{SOFT};padding-top:2px;">{u}<br />{s}</div>
                </td></tr>
              </table></a>
            </td>"""
            for n, u, s, slug in row
        )
        width = "100%" if len(row) == 4 else "75%"
        toros += f"""<table role="presentation" align="center" width="{width}" cellpadding="0" cellspacing="0" border="0" style="width:{width};margin:0 auto;table-layout:fixed;"><tr>{cells.replace('width="25%"', 'width="' + str(round(100 / len(row))) + '%"')}</tr></table>"""

    j = c["jaden"]
    jaden_steps = ""
    for (when, club, note, alt), path in zip(j["steps"], JADEN_IMAGES):
        jaden_steps += f"""<tr>
          <td class="stack" width="200" valign="top" style="padding:0 0 20px;line-height:0;font-size:0;">
            <img src="{img(path, 640)}" width="200" alt="{alt}" class="fluid" style="display:block;width:100%;max-width:200px;height:auto;border:0;border-radius:16px;" />
          </td>
          <td class="stack" valign="top" style="padding:0 0 20px 18px;">
            {eyebrow(when, '#ff8a8f').replace('margin:0 0 10px', 'margin:0 0 6px')}
            {display(club, '#ffffff', 20, upper=False, margin='0 0 6px')}
            {lead(note, '#d2d2d7', 14, margin='0')}
          </td>
        </tr>"""
    jaden_link = ops_link + JADEN_ANCHOR

    o = c["ops"]
    whatsapp = f"https://wa.me/15554437440?text={c['whatsapp_text']}"
    intro = "".join(para(p) for p in c["intro"])

    body = f"""
      <!-- Hero -->
      <tr><td style="padding:0;line-height:0;font-size:0;">
        {full_image(img('/images/heroes/trials-wide-1280.jpg'), c['alt_hero'], apply_all)}
      </td></tr>
      {hero(c['eyebrow'], c['headline'], c['sub'], button(apply_all, c['apply']))}

      <!-- Intro -->
      <tr><td class="px" style="padding:34px 32px 10px;">
        {para(c['hello'])}
        {intro}
      </td></tr>

      <!-- Cifras -->
      <tr><td class="px" style="padding:6px 32px 36px;">
        {stats_strip(c['stats'])}
      </td></tr>

      <!-- Programas -->
      <tr><td class="px" bgcolor="{SURFACE}" style="background:{SURFACE};padding:38px 32px 22px;">
        {section_header(c['section'], c['section_sub'])}
      </td></tr>
      <tr><td bgcolor="{SURFACE}" style="background:{SURFACE};padding:0 0 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{programs}</table>
      </td></tr>

      <!-- Cuál encaja -->
      <tr><td class="px" style="padding:38px 32px 30px;">
        <div style="padding-bottom:18px;">{section_header(k['which'], c['which_title'])}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{which}</table>
      </td></tr>

      <!-- Padres -->
      <tr><td class="px" style="padding:0 20px 36px;">
        {callout(k['parents'], c['parents_heading'], c['parents'], button(call, c['parents_cta'], variant='light') + button(whatsapp, c['whatsapp'], variant='ghost'))}
      </td></tr>

      <!-- Jaden Dubon -->
      <tr><td bgcolor="{INK}" style="background:{INK};padding:0;line-height:0;font-size:0;">
        {full_image(img(JADEN_HERO), j['hero_alt'], jaden_link)}
      </td></tr>
      <tr><td class="px" bgcolor="{INK}" style="background:{INK};padding:36px 32px 20px;">
        <div style="padding-bottom:26px;">{section_header(j['eyebrow'], j['title'], j['lead'], dark=True, size=26)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{jaden_steps}</table>
        <div style="padding:4px 0 18px;text-align:center;">{button(jaden_link, j['cta'])}</div>
      </td></tr>

      <!-- Toros -->
      <tr><td class="px" bgcolor="{SURFACE}" style="background:{SURFACE};padding:38px 27px 24px;">
        <div style="padding:0 5px 22px;">{section_header(k['toros'], c['toros_title'], c['toros_sub'])}</div>
        {toros}
      </td></tr>

      <!-- Operaciones -->
      <tr><td class="px" style="padding:38px 32px 10px;">
        {section_header(o['eyebrow'], o['title'], o['text'], size=26)}
      </td></tr>
      <tr><td class="px" style="padding:16px 32px 0;">
        {stats_strip(o['stats'])}
      </td></tr>
      <tr><td class="px" style="padding:14px 32px 0;">
        {season_chart(o['chart'])}
      </td></tr>
      <tr><td class="px" align="center" style="padding:22px 32px 36px;text-align:center;">
        {button(ops_link, o['cta'] + ' &rarr;')}
      </td></tr>

      <!-- Cierre -->
      <tr><td class="px" style="padding:0 20px;">
        {callout(k['final'], c['final_title'], c['final_text'], button(apply_all, c['final_apply'], variant='light') + button(call, c['call'], variant='ghost'))}
      </td></tr>
      <tr><td class="px" style="padding:30px 32px 32px;">
        {para(c['sign'], size=15, margin='0')}
      </td></tr>
"""
    return page(lang=lang, title=c["title"], preheader=c["preheader"], label=c["view"],
                home=link("/", lang), body=body, footer=c["footer"])


if __name__ == "__main__":
    write("programas-jugadores-padres", {lang: build(c) for lang, c in COPY.items()})
