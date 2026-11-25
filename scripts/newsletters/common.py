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


def button(href, label, primary=True, on_dark=False):
    if on_dark and not primary:
        bg, fg, border = "transparent", "#ffffff", "#6e6e73"
    else:
        bg = BRAND if primary else "#ffffff"
        fg = "#ffffff" if primary else INK
        border = BRAND if primary else "#c7c7cc"
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:0 8px 8px 0;">
  <tr><td align="center" bgcolor="{bg}" style="border-radius:999px;border:1px solid {border};">
    <a href="{href}" target="_blank" style="display:inline-block;padding:12px 22px;font-family:{FONT};font-size:14px;font-weight:600;line-height:18px;color:{fg};text-decoration:none;border-radius:999px;">{label}</a>
  </td></tr>
</table>"""


def eyebrow(text, color=BRAND):
    return f'<p style="margin:0 0 8px;font-family:{FONT};font-size:12px;line-height:16px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:{color};">{text}</p>'


def h2(text, color=INK, size=24):
    return f'<h2 style="margin:0 0 12px;font-family:{FONT};font-size:{size}px;line-height:{size + 6}px;font-weight:700;color:{color};">{text}</h2>'


def para(text, color=INK, size=16, margin="0 0 16px"):
    return f'<p style="margin:{margin};font-family:{FONT};font-size:{size}px;line-height:{round(size * 1.55)}px;color:{color};">{text}</p>'


def stats_row(stats, color=BRAND, label_color=SOFT):
    cells = "".join(
        f"""<td class="half" width="{round(100 / len(stats))}%" valign="top" style="padding:0 6px 16px;text-align:center;">
          <div style="font-family:{FONT};font-size:28px;line-height:32px;font-weight:700;color:{color};">{n}</div>
          <div style="font-family:{FONT};font-size:12px;line-height:17px;color:{label_color};padding-top:4px;">{label}</div>
        </td>"""
        for n, label in stats
    )
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>{cells}</tr></table>'


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
  body {{ margin:0; padding:0; background:{SURFACE}; }}
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
    .h1 {{ font-size:28px !important; line-height:34px !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:{SURFACE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">{preheader}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{SURFACE}" style="background:{SURFACE};">
  <tr><td align="center" style="padding:24px 0;">
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
