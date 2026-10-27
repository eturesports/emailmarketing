"""Genera las series del Showcase 2027 para entrenadores de Division I y Division II.

Tono: carta de un entrenador a otro. Muchos ya conocen ETURE, así que nada de
presentaciones, superlativos ni cuentas atrás: información útil y una sola
petición clara por correo.

    python3 plantillas/showcase-2027-ncaa/build.py plantillas/showcase-2027-ncaa
"""
import os
import sys

OUT = sys.argv[1]
SC = "https://www.eturesports.com/showcase"
REG = SC + "#register"
RECAP = "https://www.youtube.com/watch?v=uDv4ezw4sfA&amp;t=70s"
INTERVIEWS = "https://www.eturesports.com/coach-testimonials"

INK, MUTED, FAINT, LINE, RED, RED2 = "#1d1d1f", "#45454a", "#6e6e73", "#e5e5ea", "#9f1b20", "#c0272d"
IMG = "https://www.eturesports.com/images/"

SIGNER = ("Anthony Esquivel", "College Recruiting Coordinator, ETURE Sports",
          "Former Associate Head Coach, Furman University")

DIVISIONS = {
    "d1": dict(
        label="Division I",
        programs="UCLA, UNC, Cal, Northwestern, Clemson, Missouri State and Portland",
        fit="which players we believe can contribute at Division I level, and which are better suited elsewhere",
        docs_extra="NCAA Eligibility Center registration and amateurism review",
        needs_extra="graduation year, or transfer status",
        stats=[("+200", "Americans placed in NCAA D1"), ("70%", "Of D1 programs have signed an ETURE player"), ("90%", "Placement rate across D1, D2 &amp; D3")],
    ),
    "d2": dict(
        label="Division II",
        programs="Franklin Pierce and other Division II programs, alongside Division I staffs",
        fit="which players we believe fit a Division II roster — athletically, academically and financially",
        docs_extra="NCAA Eligibility Center status, and a realistic picture of what each family can contribute, since most Division II packages combine athletic and academic aid",
        needs_extra="graduation year, and the kind of aid package you can offer",
        stats=[("90%", "Placement rate across D1, D2 &amp; D3"), ("+80", "College coaches in 2026"), ("5", "LaLiga clubs have attended")],
    ),
}


def p(text, last=False):
    m = "0" if last else "0 0 16px"
    return f'<p style="margin:{m};">{text}</p>'


def link(label, href):
    return f'<a href="{href}" style="color:{RED};font-weight:600;text-decoration:underline;">{label}</a>'


def facts(items):
    """Bloque gris con datos clave: lista de (etiqueta, valor)."""
    trs = "".join(
        f'<tr><td valign="top" style="padding:{"0" if i == len(items) - 1 else "0 0 10px"};width:130px;color:{FAINT};font-size:14px;">{k}</td>'
        f'<td valign="top" style="padding:{"0" if i == len(items) - 1 else "0 0 10px"};font-size:14px;line-height:21px;color:{INK};">{v}</td></tr>'
        for i, (k, v) in enumerate(items))
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;background:#f7f7f8;border-radius:8px;">'
            f'<tr><td style="padding:18px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{trs}</table></td></tr></table>')


def bullets(items):
    lis = "".join(
        f'<tr><td width="18" valign="top" style="padding:0 0 8px;color:{FAINT};">&ndash;</td>'
        f'<td valign="top" style="padding:0 0 8px;">{t}</td></tr>' for t in items)
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">{lis}</table>'


def button(label, href=REG):
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px;"><tr>'
            f'<td style="border-radius:6px;background:{RED2};"><a href="{href}" style="display:inline-block;padding:13px 24px;'
            f'font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;">{label} &rarr;</a></td></tr></table>')


def stats(items):
    """Franja discreta de cifras: lista de (cifra, texto)."""
    w = 100 // len(items)
    tds = "".join(
        f'<td class="stat" width="{w}%" align="center" valign="top" style="padding:14px 6px;">'
        f'<p style="margin:0;font-size:26px;line-height:30px;font-weight:800;color:{RED};">{n}</p>'
        f'<p style="margin:4px 0 0;font-size:12px;line-height:17px;color:{FAINT};">{t}</p></td>' for n, t in items)
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px;border-top:1px solid {LINE};border-bottom:1px solid {LINE};">'
            f'<tr>{tds}</tr></table>')


def page(div, n, subject, preheader, body):
    d = DIVISIONS[div]
    eyebrow, title, img, alt = TOPICS[n]
    name, role, past = SIGNER
    return f'''<!DOCTYPE html>
<!--
  ETURE Showcase 2027 — entrenadores {d["label"]} · email {n:02d}/10
  Asunto: {subject}

  Etiquetas: {{{{firstName}}}} (si falta: "Coach") · {{{{company}}}} = universidad (si falta: "your program")
  El pie de baja lo añade Eture Mailer al enviar.
  Generado con build.py: edita el script, no este fichero.
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
  body {{ margin:0; padding:0; background:#f5f5f7; }}
  @media only screen and (max-width:620px) {{
    .container {{ width:100% !important; }}
    .px {{ padding-left:22px !important; padding-right:22px !important; }}
    .hide-m {{ display:none !important; }}
    .stat {{ padding:12px 2px !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f5f5f7;">{preheader}{"&#8199;&#847;" * 40}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid {LINE};border-radius:10px;overflow:hidden;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:{INK};">

  <tr><td class="px" style="padding:18px 40px;border-bottom:3px solid {RED};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle"><a href="{SC}" style="text-decoration:none;">
        <img src="https://www.eturesports.com/logo-mark.png" width="44" alt="ETURE" style="display:inline-block;vertical-align:middle;border:0;width:44px;height:auto;">
        <span style="display:inline-block;vertical-align:middle;margin-left:8px;font-size:14px;font-weight:800;letter-spacing:2px;color:{INK};">ETURE&nbsp;SHOWCASE</span></a></td>
      <td class="hide-m" align="right" valign="middle" style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:{FAINT};">VII edition · Feb 8–11, 2027</td>
    </tr></table>
  </td></tr>

  <tr><td><a href="{SC}"><img src="{IMG}{img}" width="600" alt="{alt}" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></a></td></tr>

  <tr><td class="px" style="padding:28px 40px 0;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:{RED};">{eyebrow}</p>
    <h1 style="margin:0;font-size:24px;line-height:31px;font-weight:800;color:{INK};">{title}</h1>
  </td></tr>

  <tr><td class="px" style="padding:18px 40px 18px;font-size:16px;line-height:25px;color:{INK};">
{body}
  </td></tr>

  <tr><td class="px" style="padding:4px 40px 30px;font-size:15px;line-height:22px;color:{INK};">
    <p style="margin:0 0 14px;">Best regards,</p>
    <p style="margin:0;font-weight:600;">{name}</p>
    <p style="margin:0;font-size:14px;color:{FAINT};">{role}<br>{past}</p>
  </td></tr>

  <tr><td class="px" style="padding:22px 40px;background:{INK};font-size:12px;line-height:19px;color:#a1a1a6;">
    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ffffff;">ETURE Showcase · VII edition</p>
    <p style="margin:0 0 10px;">February 8–11, 2027 · Eture Sports Valencia, Carretera Ademúz km-12, 46184 Valencia, Spain</p>
    <p style="margin:0;"><a href="{REG}" style="color:#dc8184;text-decoration:none;">Register</a> &nbsp;·&nbsp; <a href="{INTERVIEWS}" style="color:#dc8184;text-decoration:none;">Coach interviews</a> &nbsp;·&nbsp; <a href="mailto:showcase@eturesports.com" style="color:#dc8184;text-decoration:none;">showcase@eturesports.com</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>
'''


HI = p("Hi {{firstName | Coach}},")

TOPICS = {
    1: ("Save the date", "February 8–11, 2027 in Valencia", "home/ho-029.jpg", "Coaches at the ETURE Showcase"),
    2: ("The players", "Who will be on the field in February", "methodology/me-03-competition.jpg", "ETURE players competing"),
    3: ("Before you travel", "Player information we can send you", "methodology/me-04-exposure-03.jpg", "ETURE coaching staff"),
    4: ("The schedule", "Four days, organised around the players", "methodology/me-04-exposure-02.jpg", "Coaches watching a session at ETURE"),
    5: ("Logistics", "One registration covers the week", "methodology/me-04-exposure-01.jpg", "ETURE staff on the field"),
    6: ("Season's greetings", "Happy holidays from Valencia", "home/hero-desktop.jpg", "ETURE players now in college and pro soccer"),
    7: ("European Recruiting Soccer Tour", "Four showcases, four countries, one trip", "methodology/me-04-exposure-04.jpg", "Coach evaluating players"),
    8: ("Your roster", "Tell us what you are looking for", "highschool/hi-056.jpg", "ETURE players before a session"),
    9: ("Travel", "Getting to Valencia", "facilities-26.jpg", "ETURE campus in Valencia"),
    10: ("Next week", "See you in Valencia", "methodology/me-04-exposure-05.jpg", "ETURE staff in Valencia"),
}


def series(div):
    d = DIVISIONS[div]
    return [
        ("2026-11-03", "dates", "ETURE Showcase 2027: February 8–11, Valencia",
         "Dates and registration for the VII edition.",
         HI
         + p("I wanted to share the dates for this year's Showcase early, so you can plan around them if February recruiting in Europe fits your calendar.")
         + facts([("Dates", "Monday 8 – Thursday 11 February 2027"),
                  ("Where", "Eture Sports, Valencia, Spain"),
                  ("Format", "Games on Tuesday, ETURE FC match on Wednesday, individual meetings on Thursday"),
                  ("Cost", "From €350 per coach, with hotel, meals and local transport included")])
         + stats([("+80", "College coaches in 2026"), ("+150", "Players competing"), ("4", "Days in Valencia")])
         + p(f"Last February we were grateful to host staff from {d['programs']}. The format stays the same: games, a night at ETURE FC, and time to sit down and talk about specific players.")
         + p("If you would like to attend, registration is open on our website. If you have any questions first, simply reply to this email.")
         + button("Register for the Showcase")),

        ("2026-11-13", "players", "The players coming to the Showcase",
         "A candid note on who will be playing in February.",
         HI
         + p("A short note on the players, since that is what decides whether the trip is worth your time.")
         + p("Every player at the Showcase trains with us in Spain — it is not an open event. The group is a mix of American, Spanish and international players, across several graduation years, and more than 150 will play over the week.")
         + stats(d["stats"])
         + p(f"Not every one of them will be right for {{{{company | your program}}}}, and we would rather say so. Before you travel, we will tell you plainly {d['fit']}.")
         + p("If it helps, reply with the positions you are looking at and we will start from there.", last=True)),

        ("2026-11-23", "player-information", "Player information we can send you",
         "Video, academics and eligibility, before you travel.",
         HI
         + p("For each player you are interested in, we can send the following before February:")
         + bullets(["Full-match video, not only highlights",
                    "Academic record and English test results",
                    d["docs_extra"][0].upper() + d["docs_extra"][1:],
                    "Our staff's honest assessment: strengths, areas to improve, character"])
         + p("This is available whether or not you attend the Showcase. Just let us know which positions and graduation years you would like to see.")
         + p(f"Some of the coaches who attended last year talked about their experience on camera; {link('the interviews are here', INTERVIEWS)} if they are useful.", last=True)),

        ("2026-12-03", "schedule", "Showcase schedule, February 8–11",
         "How the four days are organised.",
         HI
         + p("Here is how the week is organised, so you can plan your travel:")
         + facts([("Mon 8", "Airport or train station pick-up and hotel check-in during the day. Welcome cocktail at 8:30 PM."),
                  ("Tue 9", "Showcase games at the ETURE campus, 8:00 AM – 5:00 PM. Lunch at the field, dinner at MasFerrat."),
                  ("Wed 10", "Transfer to the ETURE FC stadium (Sant Jordi, Castellón) for a 7:00 PM game, dinner at the stadium."),
                  ("Thu 11", "Individual meetings, 10:30 AM – 2:00 PM, to discuss specific players.")])
         + p(f"The full schedule is on the {link('Showcase page', SC + '#schedule')}. If your travel only allows part of the week, tell us and we will help you make the most of the days you have.", last=True)),

        ("2026-12-14", "cost", "Showcase cost and what is covered",
         "Pricing per coach, and what the registration includes.",
         HI
         + p("For budgeting purposes, these are the registration fees per coach:")
         + facts([("Valencia only", "€550 single room · €350 shared room"),
                  ("With another Tour stop", "€500 single room · €300 shared room")])
         + p("The registration covers three nights at AdHoc Hotel Valencia with breakfast, airport or station pick-up, daily transport to the fields, two meals at MasFerrat, the welcome cocktail and the trip to the ETURE FC game.")
         + p("A shared room is two coaches, from your staff or another university. We book the Showcase nights for you, so please don't book them yourself; if you want to stay longer, only the extra nights need to be booked with the hotel.")
         + button("Register for the Showcase")),

        ("2026-12-23", "holidays", "Happy holidays from Valencia",
         "Thank you for your work with student-athletes this year.",
         HI
         + p("Just a short note to wish you and your staff a good break.")
         + p("Thank you for the time you give to players who are trying to find their way into college soccer. Many of the players who have come through ETURE are on rosters today because a coach was willing to take a closer look.")
         + p(f"If you have a few minutes over the holidays, {link('this is a short recap of last year’s Showcase', RECAP)}. Nothing else needed.", last=True)),

        ("2027-01-04", "european-tour", "Combining Valencia with other showcases in Europe",
         "Four events in four countries, February 5–15.",
         HI
         + p("If you are planning a longer recruiting trip, the Valencia Showcase is one of four events on the European Recruiting Soccer Tour, organised together with other agencies so coaches can cover more in one journey:")
         + facts([("Feb 5–6", "Garðabær, Iceland — Soccer &amp; Education USA"),
                  ("Feb 8–11", "Valencia, Spain — ETURE Sports"),
                  ("Feb 12–13", "Gothenburg, Sweden — Kumlin Recruiting"),
                  ("Feb 14–15", "Copenhagen, Denmark — NSSA")])
         + p("If you combine Valencia with another stop, the Valencia fee is €500 single or €300 shared. You can tick each stop you plan to attend on the registration form.")
         + p(f"More detail on the circuit is at {link('europeanrecruiting.com', 'https://europeanrecruiting.com')}.", last=True)),

        ("2027-01-12", "roster-needs", "Your roster needs for 2027",
         "Tell us what you are looking for and we will prepare a shortlist.",
         HI
         + p("We are starting to prepare player lists for the coaches attending, and for those who can't make it but would like to see profiles.")
         + p(f"If you can share a few lines on what {{{{company | your program}}}} needs — position, {d['needs_extra']} — we will send a short, honest list of players worth your time, with video and academic information.")
         + p("A reply to this email is enough. If you are registering, there is also a field for it on the form.", last=True)),

        ("2027-01-22", "travel", "Travel details for Valencia",
         "Arrival, transport and hotel for coaches attending.",
         HI
         + p("For coaches travelling to Valencia, a few practical details:")
         + bullets(["<strong>Arrival:</strong> please send us your flight or train details and we will pick you up on Monday 8.",
                    "<strong>Hotel:</strong> AdHoc Hotel Valencia. We book the Showcase nights; extra nights are booked directly with the hotel.",
                    "<strong>Wednesday:</strong> the ETURE FC game is in Sant Jordi (Castellón). Transport there and back is arranged.",
                    "<strong>Thursday:</strong> meetings run from 10:30 AM to 2:00 PM, so afternoon flights work well."])
         + p("If you have not registered yet and would still like to come, there is time — let us know and we will do our best with rooms.")
         + p('For anything else, write to <a href="mailto:showcase@eturesports.com" style="color:' + RED + ';">showcase@eturesports.com</a> or reply here.', last=True)),

        ("2027-02-01", "next-week", "The Showcase is next week",
         "Final details, and an offer if you can't make it.",
         HI
         + p("The Showcase starts next Monday in Valencia. Thank you to everyone who has registered; we will be in touch individually with your pick-up details.")
         + p("If February doesn't work for you this year, we understand. We are happy to send match video and information on any player you would like to follow, and to keep you updated after the event.")
         + p("Either way, thank you for your time this season.", last=True)),
    ]


for div in DIVISIONS:
    folder = os.path.join(OUT, div)
    os.makedirs(folder, exist_ok=True)
    for n, (date, slug, subject, pre, body) in enumerate(series(div), 1):
        with open(os.path.join(folder, f"{n:02d}-{date}-{slug}.html"), "w") as f:
            f.write(page(div, n, subject, pre, body))
        print(div, f"{n:02d}", date, subject)
