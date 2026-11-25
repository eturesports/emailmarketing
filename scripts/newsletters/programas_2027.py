"""Genera la newsletter de programas 2027 (EN y ES) a partir de un único esqueleto.

    python3 scripts/newsletters/programas_2027.py
"""
import sys
from pathlib import Path

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "prisma" / "templates"
SITE = "https://www.eturesports.com"
UTM = "utm_source=eture-mailer&utm_medium=email&utm_campaign=programs-2027"


def img(path, w=1200):
    from urllib.parse import quote
    return f"{SITE}/_next/image?url={quote(path, safe='')}&w={w}&q=75"


def link(path, lang, anchor=""):
    prefix = "/es" if lang == "es" else ""
    sep = "&" if "?" in path else "?"
    return f"{SITE}{prefix}{path}{sep}{UTM}{anchor}"


INK = "#1d1d1f"
SOFT = "#6e6e73"
FAINT = "#86868b"
LINE = "#e8e8ed"
BRAND = "#9f1b20"
TINT = "#fbf1f1"
FONT = "'Poppins',Arial,Helvetica,sans-serif"

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

def drive(file_id, w=1200):
    """Foto de Google Drive compartida con enlace público, servida redimensionada."""
    return f"https://lh3.googleusercontent.com/d/{file_id}=w{w}"


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

# Colocaciones por temporada, de la base de operaciones de eturesports.com.
SEASONS = [("15/16", 3), ("16/17", 1), ("17/18", 18), ("18/19", 28), ("19/20", 45), ("20/21", 41),
           ("21/22", 103), ("22/23", 109), ("23/24", 109), ("24/25", 153), ("25/26", 180)]


def button(href, label, primary=True):
    bg = BRAND if primary else "#ffffff"
    fg = "#ffffff" if primary else INK
    border = BRAND if primary else "#c7c7cc"
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:0 8px 8px 0;">
  <tr><td align="center" bgcolor="{bg}" style="border-radius:999px;border:1px solid {border};">
    <a href="{href}" target="_blank" style="display:inline-block;padding:12px 22px;font-family:{FONT};font-size:14px;font-weight:600;line-height:18px;color:{fg};text-decoration:none;border-radius:999px;">{label}</a>
  </td></tr>
</table>"""


def build(c):
    lang = c["lang"]
    call = link("/lp/book-a-call?for=programs", lang)
    apply_all = link(APPLY_ALL[lang], lang)

    stats = "".join(
        f"""<td class="stack" width="25%" valign="top" style="padding:0 6px 16px;text-align:center;">
          <div style="font-family:{FONT};font-size:28px;line-height:32px;font-weight:700;color:{BRAND};">{n}</div>
          <div style="font-family:{FONT};font-size:12px;line-height:17px;color:{SOFT};padding-top:4px;">{label}</div>
        </td>"""
        for n, label in c["stats"]
    )

    def media_block(items, href):
        texts = c["media"]
        if len(items) == 1:
            url, key = items[0]
            label, alt = texts[key]
            caption = (
                f"""<tr><td style="padding:10px 24px 0;font-family:{FONT};font-size:12px;line-height:17px;color:{SOFT};">{label}</td></tr>"""
                if label else ""
            )
            return f"""<tr><td style="padding:0;line-height:0;font-size:0;">
            <a href="{href}" target="_blank"><img src="{url}" width="534" alt="{alt}" style="display:block;width:100%;max-width:534px;height:auto;border:0;border-radius:16px 16px 0 0;" /></a>
          </td></tr>{caption}"""
        n = len(items)
        gap = 4
        # Las fotos de tres columnas no comparten proporción: se recortan a 4:5
        # para que queden alineadas (Outlook ignora el recorte y las muestra enteras).
        crop_open = f'<div class="crop3" style="height:{round(534 / n * 1.25)}px;overflow:hidden;">' if n == 3 else ""
        crop_close = "</div>" if n == 3 else ""
        cells = ""
        for k, (url, key) in enumerate(items):
            label, alt = texts[key]
            left = 0 if k == 0 else gap // 2
            right = 0 if k == n - 1 else gap // 2
            arrow = "" if k == n - 1 or n < 3 else " &rarr;"
            cells += f"""<td width="{round(100 / n)}%" valign="top" style="padding:0 {right}px 0 {left}px;">
              <a href="{href}" target="_blank" style="text-decoration:none;">{crop_open}<img src="{url}" width="{534 // n}" alt="{alt}" style="display:block;width:100%;max-width:{534 // n}px;height:auto;border:0;" />{crop_close}</a>
              <p style="margin:0;padding:8px 6px 0;font-family:{FONT};font-size:11px;line-height:14px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:{BRAND};text-align:center;">{label}{arrow}</p>
            </td>"""
        return f"""<tr><td style="padding:0;border-radius:16px 16px 0 0;overflow:hidden;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;"><tr>{cells}</tr></table>
          </td></tr>"""

    programs = ""
    for i, ((eyebrow, name, desc, detail), media, (apply_path, apply_anchor)) in enumerate(
        zip(c["programs"], PROGRAM_MEDIA, APPLY_PATHS[lang]), start=1
    ):
        apply_url = link(apply_path, lang, apply_anchor)
        is_transfer = len(media) == 3
        story = (
            f"""<p style="margin:0 0 16px;padding:12px 14px;background:{TINT};border-radius:10px;font-family:{FONT};font-size:13px;line-height:20px;color:{INK};">{c['shane']} <a href="{link(c['ops']['path'], lang, SHANE_ANCHOR)}" target="_blank" style="color:{BRAND};font-weight:600;white-space:nowrap;">{c['shane_cta']} &rarr;</a></p>"""
            if is_transfer else ""
        )
        programs += f"""
      <tr><td style="padding:0 32px 28px;" class="px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid {LINE};border-radius:16px;overflow:hidden;">
          {media_block(media, apply_url)}
          <tr><td style="padding:22px 24px 16px;">
            <p style="margin:0 0 6px;font-family:{FONT};font-size:12px;line-height:16px;font-weight:600;letter-spacing:.04em;color:{BRAND};text-transform:uppercase;">0{i} / 05 · {eyebrow}</p>
            <h3 style="margin:0 0 8px;font-family:{FONT};font-size:21px;line-height:27px;font-weight:700;color:{INK};">{name}</h3>
            <p style="margin:0 0 12px;font-family:{FONT};font-size:15px;line-height:23px;color:{INK};">{desc}</p>
            <p style="margin:0 0 18px;font-family:{FONT};font-size:13px;line-height:19px;color:{SOFT};">{detail}</p>
            {story}
            {button(apply_url, c['apply'])}{button(call, c['call'], primary=False)}
          </td></tr>
        </table>
      </td></tr>"""

    which = "".join(
        f"""<tr>
          <td valign="top" style="padding:10px 0;border-top:1px solid {LINE};font-family:{FONT};font-size:14px;line-height:21px;color:{INK};">
            <strong style="color:{BRAND};">{who}</strong><br />{what}
          </td>
        </tr>"""
        for who, what in c["which"]
    )

    ops_link = link(c["ops"]["path"], lang)

    toros = ""
    for row in (TOROS[:4], TOROS[4:]):
        cells = "".join(
            f"""<td class="quarter" width="25%" valign="top" style="padding:0 5px 12px;">
              <a href="{ops_link}" target="_blank" style="text-decoration:none;color:{INK};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
                <tr><td style="padding:0;line-height:0;font-size:0;">
                  <img src="{img('/images/toros/' + slug + '.jpg', 384)}" width="126" alt="{n}, {u}" style="display:block;width:100%;max-width:126px;height:auto;border:0;border-radius:12px 12px 0 0;" />
                </td></tr>
                <tr><td class="tcell" style="padding:9px 10px 11px;font-family:{FONT};">
                  <div class="tname" style="font-size:13px;line-height:17px;font-weight:600;color:{INK};">{n}</div>
                  <div class="tmeta" style="font-size:11px;line-height:16px;color:{SOFT};">{u}<br />{s}</div>
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
          <td class="stack" width="200" valign="top" style="padding:0 0 18px;line-height:0;font-size:0;">
            <img src="{img(path, 640)}" width="200" alt="{alt}" class="fluid" style="display:block;width:100%;max-width:200px;height:auto;border:0;border-radius:12px;" />
          </td>
          <td class="stack" valign="top" style="padding:0 0 18px 18px;font-family:{FONT};">
            <p style="margin:0 0 4px;font-size:12px;line-height:16px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#ff8a8f;">{when}</p>
            <p style="margin:0 0 6px;font-size:17px;line-height:22px;font-weight:700;color:#ffffff;">{club}</p>
            <p style="margin:0;font-size:14px;line-height:21px;color:#d2d2d7;">{note}</p>
          </td>
        </tr>"""
    jaden_link = ops_link + JADEN_ANCHOR

    o = c["ops"]
    ops_stats = "".join(
        f"""<td class="half" width="25%" valign="top" style="padding:0 6px 16px;text-align:center;">
          <div style="font-family:{FONT};font-size:26px;line-height:30px;font-weight:700;color:#ffffff;">{n}</div>
          <div style="font-family:{FONT};font-size:12px;line-height:17px;color:#d2d2d7;padding-top:2px;">{label}</div>
        </td>"""
        for n, label in o["stats"]
    )
    peak = max(v for _, v in SEASONS)
    bars = "".join(
        f"""<td valign="bottom" align="center" style="padding:0 2px;font-family:{FONT};">
          <div style="font-size:10px;line-height:12px;color:#d2d2d7;padding-bottom:3px;">{v}</div>
          <div style="height:{max(3, round(v / peak * 110))}px;line-height:1px;font-size:1px;background:{'#c0272d' if season == '25/26' else '#6b1215'};border-radius:4px 4px 0 0;">&nbsp;</div>
        </td>"""
        for season, v in SEASONS
    )
    bar_labels = "".join(
        f'<td class="blabel" align="center" style="padding:6px 0 0;font-family:{FONT};font-size:9px;line-height:11px;color:{FAINT};">{season}</td>'
        for season, _ in SEASONS
    )

    whatsapp = f"https://wa.me/15554437440?text={c['whatsapp_text']}"
    intro = "".join(
        f'<p style="margin:0 0 16px;font-family:{FONT};font-size:16px;line-height:25px;color:{INK};">{p}</p>'
        for p in c["intro"]
    )

    return f"""<!doctype html>
<html lang="{lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<title>{c['title']}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  body {{ margin:0; padding:0; background:#f5f5f7; }}
  a {{ color:{BRAND}; }}
  @media (max-width:620px) {{
    .container {{ width:100% !important; border-radius:0 !important; }}
    .px {{ padding-left:20px !important; padding-right:20px !important; }}
    .stack {{ display:block !important; width:100% !important; box-sizing:border-box; }}
    td.stack + td.stack {{ padding-left:0 !important; }}
    .tname {{ font-size:11px !important; line-height:14px !important; }}
    .tmeta {{ font-size:9px !important; line-height:13px !important; }}
    .tcell {{ padding:8px 5px 10px !important; }}
    .crop3 {{ height:144px !important; }}
    .blabel {{ font-size:7px !important; letter-spacing:-.02em; }}
    .fluid {{ max-width:100% !important; }}
    .half {{ display:inline-block !important; width:50% !important; box-sizing:border-box; }}
    .h1 {{ font-size:28px !important; line-height:34px !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">{c['preheader']}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f7" style="background:#f5f5f7;">
  <tr><td align="center" style="padding:24px 0;">
    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;">

      <!-- Cabecera -->
      <tr><td class="px" style="padding:22px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="middle"><a href="{link('/', lang)}" target="_blank" style="text-decoration:none;"><img src="{SITE}/icon.png" width="36" height="36" alt="{c['alt_logo']}" style="display:inline-block;vertical-align:middle;border:0;border-radius:8px;" /><span style="display:inline-block;vertical-align:middle;padding-left:10px;font-family:{FONT};font-size:17px;font-weight:700;color:{INK};">Eture Sports</span></a></td>
          <td align="right" valign="middle" style="font-family:{FONT};font-size:12px;color:{FAINT};">{c['view']}</td>
        </tr></table>
      </td></tr>

      <!-- Hero -->
      <tr><td style="padding:0;line-height:0;font-size:0;">
        <a href="{apply_all}" target="_blank"><img src="{img('/images/heroes/trials-wide-1280.jpg')}" width="600" alt="{c['alt_hero']}" style="display:block;width:100%;max-width:600px;height:auto;border:0;" /></a>
      </td></tr>
      <tr><td class="px" bgcolor="{INK}" style="background:{INK};padding:32px 32px 34px;">
        <p style="margin:0 0 10px;font-family:{FONT};font-size:12px;line-height:16px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#ff8a8f;">{c['eyebrow']}</p>
        <h1 class="h1" style="margin:0 0 12px;font-family:{FONT};font-size:32px;line-height:38px;font-weight:700;color:#ffffff;">{c['headline']}</h1>
        <p style="margin:0 0 22px;font-family:{FONT};font-size:16px;line-height:24px;color:#d2d2d7;">{c['sub']}</p>
        {button(apply_all, c['apply'])}
      </td></tr>

      <!-- Intro -->
      <tr><td class="px" style="padding:32px 32px 8px;">
        <p style="margin:0 0 16px;font-family:{FONT};font-size:16px;line-height:25px;color:{INK};">{c['hello']}</p>
        {intro}
      </td></tr>

      <!-- Cifras -->
      <tr><td class="px" style="padding:8px 26px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid {LINE};border-bottom:1px solid {LINE};">
          <tr><td style="padding:22px 0 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>{stats}</tr></table></td></tr>
        </table>
      </td></tr>

      <!-- Programas -->
      <tr><td class="px" style="padding:24px 32px 22px;">
        <p style="margin:0 0 4px;font-family:{FONT};font-size:12px;line-height:16px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:{BRAND};">{c['section']}</p>
        <h2 style="margin:0;font-family:{FONT};font-size:24px;line-height:30px;font-weight:700;color:{INK};">{c['section_sub']}</h2>
      </td></tr>
      {programs}

      <!-- Cuál encaja -->
      <tr><td class="px" style="padding:4px 32px 28px;">
        <h2 style="margin:0 0 12px;font-family:{FONT};font-size:20px;line-height:26px;font-weight:700;color:{INK};">{c['which_title']}</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{which}</table>
      </td></tr>

      <!-- Padres -->
      <tr><td class="px" style="padding:0 32px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{TINT}" style="background:{TINT};border-radius:16px;border-left:4px solid {BRAND};">
          <tr><td style="padding:24px;">
            <h2 style="margin:0 0 10px;font-family:{FONT};font-size:19px;line-height:25px;font-weight:700;color:{INK};">{c['parents_title']}</h2>
            <p style="margin:0 0 18px;font-family:{FONT};font-size:15px;line-height:23px;color:{INK};">{c['parents']}</p>
            {button(call, c['parents_cta'])}
          </td></tr>
        </table>
      </td></tr>

      <!-- Jaden Dubon -->
      <tr><td bgcolor="{INK}" style="background:{INK};padding:0;line-height:0;font-size:0;">
        <a href="{jaden_link}" target="_blank"><img src="{img(JADEN_HERO)}" width="600" alt="{j['hero_alt']}" style="display:block;width:100%;max-width:600px;height:auto;border:0;" /></a>
      </td></tr>
      <tr><td class="px" bgcolor="{INK}" style="background:{INK};padding:34px 32px 16px;">
        <p style="margin:0 0 8px;font-family:{FONT};font-size:12px;line-height:16px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#ff8a8f;">{j['eyebrow']}</p>
        <h2 style="margin:0 0 12px;font-family:{FONT};font-size:24px;line-height:30px;font-weight:700;color:#ffffff;">{j['title']}</h2>
        <p style="margin:0 0 24px;font-family:{FONT};font-size:15px;line-height:23px;color:#d2d2d7;">{j['lead']}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{jaden_steps}</table>
        <div style="padding:4px 0 20px;">{button(jaden_link, j['cta'])}</div>
      </td></tr>

      <!-- Toros -->
      <tr><td class="px" bgcolor="#f5f5f7" style="background:#f5f5f7;padding:30px 27px 18px;">
        <h2 style="margin:0 5px 4px;font-family:{FONT};font-size:20px;line-height:26px;font-weight:700;color:{INK};">{c['toros_title']}</h2>
        <p style="margin:0 5px 16px;font-family:{FONT};font-size:14px;line-height:20px;color:{SOFT};">{c['toros_sub']}</p>
        {toros}
      </td></tr>

      <!-- Operaciones -->
      <tr><td class="px" style="padding:28px 20px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{BRAND}" style="background:{BRAND};border-radius:20px;">
          <tr><td style="padding:30px 24px 28px;">
            <p style="margin:0 0 8px;font-family:{FONT};font-size:12px;line-height:16px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#ffd6d8;">{o['eyebrow']}</p>
            <h2 style="margin:0 0 12px;font-family:{FONT};font-size:24px;line-height:30px;font-weight:700;color:#ffffff;">{o['title']}</h2>
            <p style="margin:0 0 24px;font-family:{FONT};font-size:15px;line-height:23px;color:#fbe3e4;">{o['text']}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>{ops_stats}</tr></table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1d1d1f" style="background:#1d1d1f;border-radius:14px;margin:8px 0 22px;">
              <tr><td style="padding:16px 14px 12px;">
                <p style="margin:0 0 12px;font-family:{FONT};font-size:12px;line-height:16px;color:#d2d2d7;">{o['chart']}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
                  <tr style="height:130px;">{bars}</tr>
                  <tr>{bar_labels}</tr>
                </table>
              </td></tr>
            </table>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#ffffff" style="border-radius:999px;">
              <a href="{ops_link}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:{FONT};font-size:14px;font-weight:600;line-height:18px;color:{BRAND};text-decoration:none;border-radius:999px;">{o['cta']} &rarr;</a>
            </td></tr></table>
          </td></tr>
        </table>
      </td></tr>

      <!-- Cierre -->
      <tr><td class="px" align="center" style="padding:36px 32px 12px;text-align:center;">
        <h2 style="margin:0 0 10px;font-family:{FONT};font-size:24px;line-height:30px;font-weight:700;color:{INK};">{c['final_title']}</h2>
        <p style="margin:0 0 22px;font-family:{FONT};font-size:15px;line-height:23px;color:{SOFT};">{c['final_text']}</p>
        {button(apply_all, c['final_apply'])}{button(call, c['call'], primary=False)}
        <p style="margin:14px 0 0;font-family:{FONT};font-size:14px;line-height:20px;"><a href="{whatsapp}" target="_blank" style="color:#128C7E;font-weight:600;text-decoration:none;">{c['whatsapp']} &rarr;</a></p>
      </td></tr>
      <tr><td class="px" style="padding:24px 32px 32px;">
        <p style="margin:0;font-family:{FONT};font-size:15px;line-height:23px;color:{INK};">{c['sign']}</p>
      </td></tr>
      <tr><td class="px" style="padding:18px 32px 24px;border-top:1px solid {LINE};text-align:center;font-family:{FONT};font-size:12px;line-height:18px;color:{FAINT};">
        {c['footer']} · <a href="{link('/', lang)}" target="_blank" style="color:{FAINT};">eturesports.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
"""


OUT.mkdir(parents=True, exist_ok=True)
for key, c in COPY.items():
    (OUT / f"programas-jugadores-padres.{key}.html").write_text(build(c), encoding="utf-8")
    print("ok", key)
