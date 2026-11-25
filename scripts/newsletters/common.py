"""Piezas comunes de las newsletters de Eture Sports.

Cada newsletter es un script que define sus textos (EN y ES) y compone el
cuerpo con estas piezas; `page()` pone la cabecera, el pie y los estilos.
El HTML resultante se guarda en prisma/templates, desde donde lo carga la
semilla (prisma/seed.ts) como plantilla del Mailer.
"""
from pathlib import Path
from urllib.parse import quote

TEMPLATES_DIR = Path(__file__).resolve().parents[2] / "prisma" / "templates"
SITE = "https://www.eturesports.com"
WHATSAPP = "https://wa.me/15554437440"

INK = "#1d1d1f"
SOFT = "#6e6e73"
FAINT = "#86868b"
LINE = "#e8e8ed"
BRAND = "#9f1b20"
TINT = "#fbf1f1"
SURFACE = "#f5f5f7"
FONT = "'Poppins',Arial,Helvetica,sans-serif"


def img(path, w=1200):
    """Imagen de eturesports.com, servida redimensionada por Next."""
    return f"{SITE}/_next/image?url={quote(path, safe='')}&w={w}&q=75"


def drive(file_id, w=1200):
    """Foto de Google Drive compartida con enlace público, servida redimensionada."""
    return f"https://lh3.googleusercontent.com/d/{file_id}=w{w}"


def linker(campaign):
    """Devuelve link(path, lang, anchor) con las UTM de la campaña."""
    utm = f"utm_source=eture-mailer&utm_medium=email&utm_campaign={campaign}"

    def link(path, lang, anchor=""):
        prefix = "/es" if lang == "es" else ""
        sep = "&" if "?" in path else "?"
        return f"{SITE}{prefix}{path}{sep}{utm}{anchor}"

    return link


def whatsapp(text):
    return f"{WHATSAPP}?text={quote(text, safe='')}"


# Tipografía de titulares de eturesports.com (United Sans Heavy). Apple Mail,
# iOS y Outlook para Mac la cargan desde la web; Gmail y Outlook para Windows
# usan el respaldo.
DISPLAY = "'United Sans','Poppins',Arial,Helvetica,sans-serif"
DISPLAY_FONT_FACE = (
    "@font-face { font-family:'United Sans'; font-weight:700; font-style:normal; "
    f"src:url('{SITE}/fonts/united-sans/UnitedSans-Heavy.woff2') format('woff2'); }}"
)
RADIUS = 24
DIVIDER = "#e3e3e8"

# Botones en píldora, como en la web:
#   primary   rojo con texto blanco
#   secondary blanco con borde gris claro
#   light     blanco con texto rojo, sobre fondo rojo
#   ghost     transparente con borde blanco, sobre fondo rojo u oscuro
BUTTONS = {
    "primary": (BRAND, "#ffffff", BRAND),
    "secondary": ("#ffffff", INK, LINE),
    "light": ("#ffffff", BRAND, "#ffffff"),
    "ghost": ("transparent", "#ffffff", "#c9777a"),
}


def button(href, label, primary=True, on_dark=False, variant=None):
    if variant is None:
        variant = "primary" if primary else ("ghost" if on_dark else "secondary")
    bg, fg, border = BUTTONS[variant]
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:0 4px 8px;">
  <tr><td align="center" bgcolor="{bg}" style="border-radius:999px;border:1px solid {border};">
    <a href="{href}" target="_blank" style="display:inline-block;padding:12px 22px;font-family:{FONT};font-size:14px;font-weight:500;line-height:18px;color:{fg};text-decoration:none;border-radius:999px;">{label}</a>
  </td></tr>
</table>"""


def eyebrow(text, color=BRAND, align="left"):
    return f'<p style="margin:0 0 10px;font-family:{FONT};font-size:12px;line-height:16px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:{color};text-align:{align};">{text}</p>'


def display(text, color=BRAND, size=30, upper=True, align="left", margin="0 0 14px", tag="h2", cls=""):
    """Titular con la tipografía de la web: mayúsculas para secciones, normal para tarjetas."""
    transform = "text-transform:uppercase;" if upper else ""
    klass = f' class="{cls}"' if cls else ""
    return (
        f'<{tag}{klass} style="margin:{margin};font-family:{DISPLAY};font-size:{size}px;line-height:{round(size * 1.05)}px;'
        f'font-weight:700;letter-spacing:-.02em;{transform}color:{color};text-align:{align};">{text}</{tag}>'
    )


def h2(text, color=BRAND, size=22):
    """Título de tarjeta (sin mayúsculas), como «Eture ID Summer Camp» en la web."""
    return display(text, color, size, upper=False)


def lead(text, color=SOFT, size=15, align="left", margin="0 0 16px"):
    """Texto de apoyo gris; las palabras clave van en <strong>, que se pinta en tinta."""
    strong = INK if color == SOFT else "#ffffff"
    text = text.replace("<strong>", f'<strong style="color:{strong};font-weight:600;">')
    return f'<p style="margin:{margin};font-family:{FONT};font-size:{size}px;line-height:{round(size * 1.6)}px;color:{color};text-align:{align};">{text}</p>'


def section_header(kicker, title, text=None, dark=False, align="center", size=30):
    """Cabecera de sección de la web: etiqueta roja, titular en mayúsculas y texto gris."""
    title_color = "#ffffff" if dark else BRAND
    kicker_color = "#ff8a8f" if dark else BRAND
    out = eyebrow(kicker, kicker_color, align) if kicker else ""
    out += display(title, title_color, size, align=align, cls="sh")
    if text:
        out += lead(text, "#d2d2d7" if dark else SOFT, align=align, margin="0")
    return out


def para(text, color=INK, size=16, margin="0 0 16px"):
    return f'<p style="margin:{margin};font-family:{FONT};font-size:{size}px;line-height:{round(size * 1.55)}px;color:{color};">{text}</p>'


def card(inner, bg="#ffffff", padding="24px"):
    """Tarjeta de la web: esquinas muy redondeadas, sin bordes."""
    return f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{bg}" style="background:{bg};border-radius:{RADIUS}px;">
  <tr><td style="padding:{padding};">{inner}</td></tr>
</table>"""


def hero(kicker, headline, sub, buttons=""):
    """Bloque oscuro bajo la foto de cabecera, centrado como el hero de la web."""
    return f"""<tr><td class="px" bgcolor="{INK}" align="center" style="background:{INK};padding:34px 32px 30px;text-align:center;">
        {eyebrow(kicker, '#ff8a8f', 'center')}
        {display(headline, '#ffffff', 42, align='center', tag='h1', cls='h1')}
        {lead(sub, '#d2d2d7', 16, 'center', '0 0 24px' if buttons else '0')}
        {buttons}
      </td></tr>"""


def callout(kicker, title, text, buttons):
    """Bloque rojo de llamada a la acción, como «Talk to our admissions team» en la web."""
    inner = (
        eyebrow(kicker, "#f3c9cb", "center")
        + display(title, "#ffffff", 28, align="center", cls="sh")
        + lead(text, "#f6dcdd", align="center", margin="0 0 22px" if buttons else "0")
        + (f'<div style="text-align:center;">{buttons}</div>' if buttons else "")
    )
    return card(inner, BRAND, "34px 26px 28px")


def stats_strip(stats, bg=SURFACE):
    """Franja de cifras de la web: fondo gris, divisores finos y números en rojo."""
    n = len(stats)
    cells = "".join(
        f"""<td class="half" width="{round(100 / n)}%" valign="top" style="padding:18px 6px 16px;text-align:center;{'' if i == 0 else f'border-left:1px solid {DIVIDER};'}">
          <div style="font-family:{DISPLAY};font-size:28px;line-height:30px;font-weight:700;letter-spacing:-.02em;color:{BRAND};">{num}</div>
          <div style="font-family:{FONT};font-size:12px;line-height:16px;color:{SOFT};padding-top:6px;">{label}</div>
        </td>"""
        for i, (num, label) in enumerate(stats)
    )
    return f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{bg}" style="background:{bg};border-radius:{RADIUS}px;table-layout:fixed;">
  <tr>{cells}</tr>
</table>"""


# Compatibilidad con los primeros scripts.
stats_row = stats_strip


def full_image(src, alt, href=None, width=600):
    tag = f'<img src="{src}" width="{width}" alt="{alt}" style="display:block;width:100%;max-width:{width}px;height:auto;border:0;" />'
    return f'<a href="{href}" target="_blank">{tag}</a>' if href else tag


# Cifras de la base de operaciones de eturesports.com (/college-operations),
# leídas el 25 nov 2026. Se actualizan solas en la web: revisarlas antes de
# cada envío y regenerar.
OPS = {
    "operations": "790",
    "players": "729",
    "universities": "302",
    "d1_players": "437",
    "d1_share": {"en": "55.3%", "es": "55,3&nbsp;%"},
    "playing_now": "329",
    "playing_universities": "184",
    "scholarships": {"en": "$60M", "es": "60&nbsp;M$"},
}
SEASONS = [("15/16", 3), ("16/17", 1), ("17/18", 18), ("18/19", 28), ("19/20", 45), ("20/21", 41),
           ("21/22", 103), ("22/23", 109), ("23/24", 109), ("24/25", 153), ("25/26", 180)]
OPS_PATH = {"en": "/college-operations", "es": "/operaciones-universitarias"}


def season_chart(title, dark=True):
    """Gráfico de barras de colocaciones por temporada, en tablas (sin imágenes)."""
    peak = max(v for _, v in SEASONS)
    label_color = "#d2d2d7" if dark else SOFT
    bars = "".join(
        f"""<td valign="bottom" align="center" style="padding:0 2px;font-family:{FONT};">
          <div style="font-size:10px;line-height:12px;color:{label_color};padding-bottom:3px;">{v}</div>
          <div style="height:{max(3, round(v / peak * 110))}px;line-height:1px;font-size:1px;background:{'#c0272d' if i == len(SEASONS) - 1 else ('#6b1215' if dark else '#e3b5b7')};border-radius:4px 4px 0 0;">&nbsp;</div>
        </td>"""
        for i, (_, v) in enumerate(SEASONS)
    )
    labels = "".join(
        f'<td class="blabel" align="center" style="padding:6px 0 0;font-family:{FONT};font-size:9px;line-height:11px;color:{FAINT};">{season}</td>'
        for season, _ in SEASONS
    )
    bg = INK if dark else SURFACE
    return f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{bg}" style="background:{bg};border-radius:14px;">
  <tr><td style="padding:16px 14px 12px;">
    <p style="margin:0 0 12px;font-family:{FONT};font-size:12px;line-height:16px;color:{label_color};">{title}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
      <tr style="height:130px;">{bars}</tr>
      <tr>{labels}</tr>
    </table>
  </td></tr>
</table>"""


def player_grid(players, href):
    """Retratos de jugadores en una fila: [(nombre, universidad, temporada, slug de /images/toros)]."""
    n = len(players)
    cells = "".join(
        f"""<td width="{round(100 / n)}%" valign="top" style="padding:0 5px 12px;">
          <a href="{href}" target="_blank" style="text-decoration:none;color:{INK};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr><td style="padding:0;line-height:0;font-size:0;">
              <img src="{img('/images/toros/' + slug + '.jpg', 384)}" width="{520 // n}" alt="{name}, {uni}" style="display:block;width:100%;max-width:{520 // n}px;height:auto;border:0;border-radius:12px 12px 0 0;" />
            </td></tr>
            <tr><td class="tcell" style="padding:9px 10px 11px;font-family:{FONT};">
              <div class="tname" style="font-size:13px;line-height:17px;font-weight:600;color:{INK};">{name}</div>
              <div class="tmeta" style="font-size:11px;line-height:16px;color:{SOFT};">{uni}<br />{season}</div>
            </td></tr>
          </table></a>
        </td>"""
        for name, uni, season, slug in players
    )
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;"><tr>{cells}</tr></table>'


def page(*, lang, title, preheader, label, home, body, footer):
    """Documento completo: cabecera con logo, cuerpo y pie.

    El Mailer añade después el enlace de baja antes de </body>.
    """
    return f"""<!doctype html>
<html lang="{lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<title>{title}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  {DISPLAY_FONT_FACE}
  body {{ margin:0; padding:0; background:#ffffff; }}
  a {{ color:{BRAND}; }}
  @media (max-width:620px) {{
    .container {{ width:100% !important; border-radius:0 !important; }}
    .px {{ padding-left:20px !important; padding-right:20px !important; }}
    .stack {{ display:block !important; width:100% !important; box-sizing:border-box; }}
    td.stack + td.stack {{ padding-top:12px !important; }}
    .tname {{ font-size:11px !important; line-height:14px !important; }}
    .tmeta {{ font-size:9px !important; line-height:13px !important; }}
    .tcell {{ padding:8px 5px 10px !important; }}
    .crop2 {{ height:116px !important; }}
    .blabel {{ font-size:7px !important; letter-spacing:-.02em; }}
    .half {{ display:inline-block !important; width:50% !important; box-sizing:border-box; }}
    .h1 {{ font-size:34px !important; line-height:36px !important; }}
    .sh {{ font-size:24px !important; line-height:26px !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">{preheader}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;">
  <tr><td align="center" style="padding:16px 0;">
    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;">

      <!-- Cabecera -->
      <tr><td class="px" style="padding:22px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="middle"><a href="{home}" target="_blank" style="text-decoration:none;"><img src="{SITE}/icon.png" width="36" height="36" alt="Eture Sports" style="display:inline-block;vertical-align:middle;border:0;border-radius:8px;" /><span style="display:inline-block;vertical-align:middle;padding-left:10px;font-family:{FONT};font-size:17px;font-weight:700;color:{INK};">Eture Sports</span></a></td>
          <td align="right" valign="middle" style="font-family:{FONT};font-size:12px;color:{FAINT};">{label}</td>
        </tr></table>
      </td></tr>
{body}
      <tr><td class="px" style="padding:18px 32px 24px;border-top:1px solid {LINE};text-align:center;font-family:{FONT};font-size:12px;line-height:18px;color:{FAINT};">
        {footer} · <a href="{home}" target="_blank" style="color:{FAINT};">eturesports.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
"""


def write(slug, pages):
    """Guarda {slug}.{lang}.html en prisma/templates."""
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    for lang, html in pages.items():
        (TEMPLATES_DIR / f"{slug}.{lang}.html").write_text(html, encoding="utf-8")
        print("ok", f"{slug}.{lang}.html")
