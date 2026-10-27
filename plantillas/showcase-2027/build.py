"""Genera la serie de emails del Showcase 2027 para entrenadores NCAA."""
import os, sys
from datetime import date

OUT = sys.argv[1]
IMG = "https://www.eturesports.com/images/"
SC = "https://www.eturesports.com/showcase"
REG = SC + "#register"
RECAP = "https://www.youtube.com/watch?v=uDv4ezw4sfA&amp;t=70s"

RED, RED2, INK, MUTED, LINE = "#9f1b20", "#c0272d", "#1d1d1f", "#45454a", "#ececef"


def p(text, style=""):
    return f'<p style="margin:0 0 16px;{style}">{text}</p>'


def h2(text):
    return f'<h2 style="margin:0 0 12px;font-size:22px;line-height:29px;font-weight:800;color:{INK};">{text}</h2>'


def eyebrow(text, color=RED):
    return f'<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:{color};">{text}</p>'


def section(inner, pad="30px 36px 6px"):
    return f'<tr><td class="px" style="padding:{pad};font-size:16px;line-height:26px;color:{INK};">{inner}</td></tr>'


def button(label, href=REG):
    return f'''<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" style="border-radius:999px;background:{RED2};"><a href="{href}" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">{label} &rarr;</a></td>
</tr></table>'''


def cta(label, href=REG, note=""):
    n = f'<p style="margin:12px 0 0;font-size:13px;line-height:20px;color:#6e6e73;">{note}</p>' if note else ""
    return f'<tr><td class="px" align="center" style="padding:26px 36px 6px;">{button(label, href)}{n}</td></tr>'


def image(src, alt, href=SC):
    return f'<tr><td style="padding:30px 0 0;"><a href="{href}"><img src="{src}" width="600" alt="{alt}" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></a></td></tr>'


def box(inner, bg="#f7f7f8", border=""):
    b = f"border:{border};" if border else ""
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{bg};border-radius:12px;{b}"><tr><td style="padding:22px 24px;font-size:15px;line-height:23px;color:{INK};">{inner}</td></tr></table>'


def rows(items):
    """Lista de (título, texto) en filas con viñeta roja."""
    out = []
    for i, (title, text) in enumerate(items):
        last = i == len(items) - 1
        pad = "0" if last else "0 0 12px"
        out.append(f'<tr><td width="22" valign="top" style="padding:{pad};color:{RED2};font-weight:800;">&#9632;</td>'
                   f'<td valign="top" style="padding:{pad};"><strong>{title}</strong>{(" — " + text) if text else ""}</td></tr>')
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:15px;line-height:23px;">{"".join(out)}</table>'


def stats(items):
    cells = "".join(
        f'<td class="stat" width="{100 // len(items)}%" align="center" valign="top" style="padding:16px 4px;">'
        f'<p style="margin:0;font-size:32px;line-height:36px;font-weight:800;color:#ffffff;">{n}</p>'
        f'<p style="margin:6px 0 0;font-size:12px;line-height:17px;color:#a1a1a6;">{t}</p></td>'
        for n, t in items)
    return f'''<tr><td style="padding:34px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{INK};">
<tr><td class="px" style="padding:22px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>{cells}</tr></table></td></tr>
</table></td></tr>'''


def countdown(text):
    return (f'<p style="margin:0 0 14px;display:inline-block;background:#ffffff;color:{RED};font-size:12px;font-weight:800;'
            f'letter-spacing:1.5px;text-transform:uppercase;padding:6px 12px;border-radius:999px;">{text}</p>')


SIGNATURE = section(
    p("See you in Valencia,", "margin:0 0 4px;")
    + p("Anthony Esquivel", "margin:0;font-weight:700;")
    + p("College Recruiting Coordinator · ETURE Sports<br>Former Associate Head Coach, Furman University",
        "margin:0;font-size:14px;line-height:21px;color:#6e6e73;"),
    pad="30px 36px 34px")


def page(n, title, preheader, hero_img, hero_alt, eyebrow_txt, headline, standfirst, count, body):
    return f'''<!DOCTYPE html>
<!--
  ETURE Showcase 2027 — serie para entrenadores NCAA · email {n:02d}/10
  Asunto: {title}

  Etiquetas: {{{{firstName}}}} (si falta: "Coach") · {{{{company}}}} = universidad (si falta: "your program")
  El pie de baja lo añade Eture Mailer al enviar.
-->
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>ETURE Showcase 2027</title>
<style>
  body {{ margin:0; padding:0; background:#f2f2f4; }}
  a {{ color:{RED}; }}
  @media only screen and (max-width:620px) {{
    .container {{ width:100% !important; }}
    .px {{ padding-left:22px !important; padding-right:22px !important; }}
    .stat {{ display:inline-block !important; width:50% !important; padding:14px 0 !important; }}
    .h1 {{ font-size:30px !important; line-height:34px !important; }}
    .hide-m {{ display:none !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:#f2f2f4;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f2f2f4;">{preheader}{"&#8199;&#847;" * 40}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f2f4;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:{INK};">

  <tr><td class="px" style="padding:22px 36px;border-bottom:1px solid {LINE};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle"><a href="https://www.eturesports.com/" style="text-decoration:none;">
        <img src="https://www.eturesports.com/logo-mark.png" width="56" alt="ETURE" style="display:inline-block;vertical-align:middle;border:0;width:56px;height:auto;">
        <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:16px;font-weight:800;letter-spacing:2px;color:{INK};">ETURE&nbsp;SHOWCASE</span></a></td>
      <td class="hide-m" align="right" valign="middle" style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6e6e73;">Feb 8–11, 2027 · Valencia</td>
    </tr></table>
  </td></tr>

  <tr><td style="background:{RED};"><a href="{SC}"><img src="{hero_img}" width="600" alt="{hero_alt}" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></a></td></tr>
  <tr><td class="px" style="background:{RED};padding:28px 36px 32px;">
    {countdown(count)}
    {eyebrow(eyebrow_txt, "#f3c4c6")}
    <h1 class="h1" style="margin:0;font-size:34px;line-height:39px;font-weight:800;color:#ffffff;">{headline}</h1>
    <p style="margin:14px 0 0;font-size:17px;line-height:26px;color:#fbe9ea;">{standfirst}</p>
  </td></tr>

{body}

{SIGNATURE}

  <tr><td class="px" align="center" style="background:{INK};padding:26px 36px;font-size:13px;line-height:20px;color:#a1a1a6;">
    <p style="margin:0 0 8px;color:#ffffff;font-weight:700;letter-spacing:1px;">ETURE Showcase · VII edition</p>
    <p style="margin:0 0 12px;">February 8–11, 2027 · Eture Sports Valencia, Carretera Ademúz km-12, 46184 Valencia, Spain</p>
    <p style="margin:0;">
      <a href="{REG}" style="color:#dc8184;text-decoration:none;">Register</a>&nbsp;&nbsp;·&nbsp;&nbsp;
      <a href="mailto:showcase@eturesports.com" style="color:#dc8184;text-decoration:none;">showcase@eturesports.com</a>&nbsp;&nbsp;·&nbsp;&nbsp;
      <a href="https://europeanrecruiting.com" style="color:#dc8184;text-decoration:none;">European Recruiting Soccer Tour</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>
'''


GREETING = p("Hi {{firstName | Coach}},")

EMAILS = []

# 01 — Save the date
EMAILS.append(dict(
    date="2026-11-03", slug="save-the-date",
    subject="Save the date: ETURE Showcase, Feb 8–11, 2027 in Valencia",
    preheader="Europe's largest college soccer showcase is back for its VII edition — 150+ players, one week, one place.",
    img=IMG + "home/ho-029.jpg", alt="Coaches and staff at the ETURE Showcase",
    eyebrow="VII edition · Valencia, Spain",     headline="Save the date for Europe's largest college soccer showcase.",
    standfirst="February 8–11, 2027. More than 150 American, Spanish and international players, ready for the NCAA — all in one place.",
    body=section(GREETING
        + p("I wanted you to be among the first to know: the <strong>ETURE Showcase</strong> returns to Valencia from <strong>February 8 to 11, 2027</strong> for its seventh edition.")
        + p("Last February, more than 80 NCAA coaches — UCLA, Clemson, UNC, Northwestern, Cal, Portland, Oregon State and many more — spent four days with us evaluating players who are game-ready and already living the student-athlete routine.")
        + p("It's <strong>not an open trial</strong>. Every player on the field is part of the ETURE environment: prepared, evaluated and ready for the next step. If {{company | your program}} is building its 2027 or 2028 roster, this is the most efficient week you'll spend in Europe.", "margin:0;"))
        + stats([("+80", "NCAA coaches at the 2026 edition"), ("150+", "Players competing"), ("4", "Days, from arrival to signature")])
        + cta("Confirm your attendance", note="Hotel, meals and transfers are organized by us.")
        + section(p('<a href="' + RECAP + '" style="font-weight:700;color:' + RED2 + ';text-decoration:none;">&#9654;&nbsp; Watch the 2026 recap</a>', "margin:0;"), pad="18px 36px 6px"),
))

# 02 — Los jugadores
EMAILS.append(dict(
    date="2026-11-13", slug="the-players",
    subject="Who you'll evaluate at the ETURE Showcase",
    preheader="A curated pool of game-ready players — not an open trial. Here's who will be on the field in Valencia.",
    img=IMG + "methodology/me-03-competition.jpg", alt="ETURE players competing",
    eyebrow="The players",     headline="Game-ready players, already living the student-athlete routine.",
    standfirst="The ETURE Showcase is a curated event: every player on the field trains and competes inside our system.",
    body=section(GREETING
        + p("The question every coach asks before flying to Europe is simple: <em>will the players be worth the trip?</em> Here's how we make sure they are.")
        + box(rows([
            ("Curated, not open", "only players from the ETURE environment take part, so you won't waste games on athletes who aren't ready."),
            ("American, Spanish and international", "a mix you won't find at a single U.S. event, all prepared for the NCAA academic and eligibility process."),
            ("Coached daily in Spain", "they train and compete in a European club structure, at Spanish speed of play."),
            ("Proven pathway", "ETURE players have reached the MLS Draft, the USL and professional football in Spain."),
        ]))
        + p("Want a head start? Tell us the positions and graduation years you're recruiting when you register, and we'll have profiles and video ready before you land.", "margin:16px 0 0;"))
        + stats([("+200", "Americans placed in NCAA D1"), ("90%", "Placement rate D1, D2 &amp; D3"), ("70%", "Of D1 programs have signed an ETURE player")])
        + cta("Register and tell us your needs"),
))

# 03 — Lo que dicen los entrenadores
EMAILS.append(dict(
    date="2026-11-23", slug="coaches-testimonials",
    subject="What UCLA, UNC and Cal coaches said after the Showcase",
    preheader="Filmed between games at the last edition: head and assistant coaches on why they came to Valencia.",
    img=IMG + "methodology/me-04-exposure-03.jpg", alt="Coach on the field at ETURE",
    eyebrow="In their words",     headline="Don't take our word for it. Take theirs.",
    standfirst="At the 2026 edition we filmed coaches between games, in front of the backdrop, to ask them one thing: was it worth it?",
    body=section(GREETING
        + p("Some of the coaches who joined us last February and shared their view on camera:")
        + box(rows([
            ("Ryan Jordan", "Head Coach, UCLA"),
            ("Michael Seabolt", "Head Coach, Missouri State University"),
            ("Jeff Negalnha", "Assistant Coach, UNC"),
            ("Leonard Griffin", "Assistant Coach, California Golden Bears"),
            ("Josep Silvestre", "Assistant Coach, Bryant University"),
            ("Óscar Currás", "Assistant Coach, Sacred Heart University"),
        ]))
        + p('<a href="https://www.eturesports.com/coach-testimonials" style="font-weight:700;color:' + RED2 + ';text-decoration:none;">&#9654;&nbsp; Watch the coach interviews</a>', "margin:18px 0 0;"))
        + image(IMG + "home/ho-029.jpg", "ETURE Showcase 2026", RECAP)
        + section(h2("Join them in February")
            + p("We'd love to add {{company | your program}} to the list of programs in the stands this year.", "margin:0;"))
        + cta("Confirm your attendance"),
))

# 04 — Programa día a día
EMAILS.append(dict(
    date="2026-12-03", slug="four-days",
    subject="Four days, from arrival to signature — the Showcase schedule",
    preheader="Games on Tuesday, the ETURE FC match on Wednesday, meetings with players on Thursday. Here's the full week.",
    img=IMG + "methodology/me-04-exposure-02.jpg", alt="Coaches watching a session at ETURE",
    eyebrow="The schedule",     headline="Four days, from arrival to signature.",
    standfirst="Every day of the Showcase is designed so you leave Valencia with conversations started, not just notes.",
    body=section(GREETING
        + p("Here's how the week runs. The VII edition follows the same shape as last year's:")
        + box(rows([
            ("Monday 8 · Arrival", "airport pick-up and hotel check-in all day, then the inaugural Showcase cocktail at 8:30 PM."),
            ("Tuesday 9 · Showcase games", "8:00 AM – 5:00 PM at the ETURE campus, lunch on the field, dinner at MasFerrat."),
            ("Wednesday 10 · ETURE FC", "transfer to the ETURE FC stadium for a 7:00 PM game, Spanish barbecue at the stadium."),
            ("Thursday 11 · Meetings", "individual meetings with players and staff, 10:30 AM – 2:00 PM, to discuss interest and offers."),
        ]))
        + p('<a href="' + SC + '#schedule" style="font-weight:700;color:' + RED2 + ';text-decoration:none;">See the full schedule &rarr;</a>', "margin:16px 0 0;"))
        + cta("Save your spot"),
))

# 05 — Logística y precio
EMAILS.append(dict(
    date="2026-12-13", slug="whats-included",
    subject="Hotel, meals and transfers included — Showcase pricing",
    preheader="Three nights at AdHoc Hotel, paella at MasFerrat, daily transfers and airport pick-up. From €350.",
    img=IMG + "methodology/me-04-exposure-01.jpg", alt="ETURE coaching staff on the field",
    eyebrow="Logistics",     headline="You focus on the players. We handle the rest.",
    standfirst="One registration covers your hotel, meals and every transfer during the week.",
    body=section(GREETING
        + p("We know a trip to Europe has to be easy to justify and easy to plan. Here's everything that's included in your registration:")
        + box(rows([
            ("Three nights at AdHoc Hotel Valencia", "with breakfast, booked by us."),
            ("Two traditional paella meals", "at MasFerrat, one of the city's best restaurants."),
            ("Every transfer", "airport or train station pick-up, and daily transport from the hotel to the fields."),
            ("Cocktail dinner", "and the transfer to Vinaròs for the ETURE FC game."),
        ]))
        + p("<strong>Price per coach</strong>", "margin:20px 0 8px;")
        + box('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:15px;line-height:22px;">'
              '<tr><td style="padding:0 0 10px;">Valencia only</td><td align="right" style="padding:0 0 10px;"><strong>€550</strong> single · <strong>€350</strong> shared</td></tr>'
              '<tr><td style="padding:0;">With another Tour stop</td><td align="right" style="padding:0;"><strong>€500</strong> single · <strong>€300</strong> shared</td></tr>'
              '</table>', bg="#ffffff", border="1px solid " + LINE)
        + p("A shared room is two coaches, from your staff or another university. One tip: <strong>don't book the Showcase nights yourself</strong> — we do it for you. If you want to stay longer, book only the extra nights with the hotel.", "margin:16px 0 0;"))
        + cta("Register now"),
))

# 06 — Fiestas + aftermovie
EMAILS.append(dict(
    date="2026-12-23", slug="happy-holidays",
    subject="Happy holidays from Valencia 🎄 (and 3 minutes of Showcase)",
    preheader="Before the break: last year's Showcase in three minutes. See you in February.",
    img=IMG + "home/hero-desktop.jpg", alt="ETURE players now playing college and pro soccer",
    eyebrow="Season's greetings",     headline="Happy holidays from all of us in Valencia.",
    standfirst="Thank you for everything you do for student-athletes. Here's something to watch over the break.",
    body=section(GREETING
        + p("From everyone at ETURE, thank you for another season of opening doors for young players. Many of the athletes in the photo above are on college rosters today because a coach like you took the time to see them play.")
        + p("If you have three minutes over the holidays, here's what last year's Showcase looked like — four days in Valencia and Sant Jordi:", "margin:0;"))
        + cta("&#9654;&nbsp; Watch the Showcase recap", RECAP)
        + section(p("When you're back in January, registration is open and we'd love to welcome {{company | your program}} in February. Enjoy the holidays.", "margin:0;"), pad="26px 36px 6px"),
))

# 07 — European Recruiting Soccer Tour
EMAILS.append(dict(
    date="2027-01-02", slug="european-tour",
    subject="Four showcases, four countries, one trip to Europe",
    preheader="Iceland, Spain, Sweden and Denmark between Feb 5 and 15 — and a lower Showcase price if you combine stops.",
    img=IMG + "methodology/me-04-exposure-04.jpg", alt="Coach evaluating players at ETURE",
    eyebrow="European Recruiting Soccer Tour",     headline="Make the most of your trip: four showcases in ten days.",
    standfirst="ETURE co-founded and organizes the European Recruiting Soccer Tour with some of Europe's leading recruiting agencies.",
    body=section(GREETING
        + p("Happy new year! If you're planning your February recruiting trip, here's a way to see much more in a single journey. Four showcases in four countries, one after another:")
        + box(rows([
            ("Feb 5–6 · Iceland", "Garðabær, hosted by Soccer &amp; Education USA"),
            ("Feb 8–11 · Spain", "Valencia, hosted by ETURE Sports"),
            ("Feb 12–13 · Sweden", "Gothenburg, hosted by Kumlin Recruiting"),
            ("Feb 14–15 · Denmark", "Copenhagen, hosted by NSSA"),
        ]))
        + p("Combine Valencia with any other stop and the Showcase price drops to <strong>€500 single / €300 shared</strong>. When you register, simply tick every stop you can make.", "margin:16px 0 0;"))
        + cta("Plan my Tour", note='More on the circuit at <a href="https://europeanrecruiting.com" style="color:#6e6e73;">europeanrecruiting.com</a>'),
))

# 08 — LaLiga, AFE y ETURE FC
EMAILS.append(dict(
    date="2027-01-12", slug="laliga-afe",
    subject="LaLiga clubs, the AFE and a Spanish game night",
    preheader="The Showcase is co-organized by Spain's players' union, and LaLiga clubs come to watch too.",
    img=IMG + "home/ho-034.jpg", alt="ETURE alumnus playing professionally",
    eyebrow="Real football, real standards",     headline="You won't be the only ones in the stands.",
    standfirst="The ETURE Showcase sits inside Spanish professional football — and it shows in who's watching.",
    body=section(GREETING
        + p("Three things that make Valencia different from any other showcase you'll attend:")
        + box(rows([
            ("Co-organized with the AFE", "the Asociación de Futbolistas Españoles, the Spanish players' union, puts its name to how this event treats players. Its president, David Aganzo, is part of it."),
            ("LaLiga clubs attend", "representatives from Levante UD, Villarreal CF, Valencia CF, Rayo Vallecano and Real Racing Club have been at the Showcase."),
            ("A Spanish game night", "on Wednesday we travel to the ETURE FC stadium to watch our club compete, followed by a barbecue at the ground."),
        ]))
        + p("It's also why our pathway has produced MLS Draft picks, USL signings and players like Álvaro García Pascual, who debuted with Sevilla FC.", "margin:16px 0 0;"))
        + cta("Confirm your attendance"),
))

# 09 — Qué estás reclutando
EMAILS.append(dict(
    date="2027-01-22", slug="recruiting-needs",
    subject="{{firstName | Coach}}, what positions are you recruiting?",
    preheader="Tell us your roster needs now and we'll have player profiles and video ready before you land.",
    img=IMG + "highschool/hi-056.jpg", alt="ETURE players before a session",
    eyebrow="Your roster needs",     headline="Tell us what you need. We'll do the homework.",
    standfirst="The coaches who get the most out of the Showcase arrive with a shortlist. We'll build it with you.",
    body=section(GREETING
        + p("With the Showcase a little over two weeks away, we're starting to prepare player lists for each program.")
        + p("If you share a few details, we'll send you profiles, highlights and academic information on the players who fit — before you get on the plane:")
        + box(rows([
            ("Positions", "where your roster needs help."),
            ("Graduation years", "2027, 2028 or transfers."),
            ("Profile", "physical, technical or academic requirements that matter to you."),
        ]))
        + p('Just reply to this email, or fill in the "What you are recruiting" field when you register.', "margin:16px 0 0;"))
        + cta("Register and share your needs"),
))

# 10 — Última llamada
EMAILS.append(dict(
    date="2027-02-01", slug="final-call",
    subject="One week to go: final call for the ETURE Showcase",
    preheader="Last registrations for Valencia, Feb 8–11. Here's what you need to know before you fly.",
    img=IMG + "methodology/me-04-exposure-05.jpg", alt="ETURE staff in Valencia",
    eyebrow="Final call",     headline="One week to go. There's still time to join us.",
    standfirst="The VII edition of the ETURE Showcase starts next Monday. Here's everything you need before you fly.",
    body=section(GREETING
        + p("We're putting the final touches on the Showcase and we'd still love to have {{company | your program}} with us. If you're coming, here's your checklist:")
        + box(rows([
            ("Register", "if you haven't yet, so we can book your hotel and pick-up."),
            ("Send us your flight", "we pick you up at Valencia airport or train station on Monday, Feb 8."),
            ("Don't book the Showcase nights", "we've got them. Book only extra nights directly with AdHoc Hotel."),
            ("Bring your shortlist", "share your positions and grad years and we'll have profiles ready."),
        ]))
        + p('Questions? Write to <a href="mailto:showcase@eturesports.com" style="color:' + RED2 + ';font-weight:700;text-decoration:none;">showcase@eturesports.com</a> or simply reply to this email.', "margin:16px 0 0;"))
        + cta("Register before it starts", note="Feb 8–11, 2027 · Eture Sports Valencia"),
))

def countdown_text(d):
    days = (date(2027, 2, 8) - date.fromisoformat(d)).days
    return f"{days} days to go"


os.makedirs(OUT, exist_ok=True)
for i, e in enumerate(EMAILS, 1):
    html = page(i, e["subject"], e["preheader"], e["img"], e["alt"], e["eyebrow"], e["headline"],
                e["standfirst"], countdown_text(e["date"]), e["body"])
    with open(os.path.join(OUT, f'{i:02d}-{e["date"]}-{e["slug"]}.html'), "w") as f:
        f.write(html)
    print(f'{i:02d}', e["date"], e["subject"])
