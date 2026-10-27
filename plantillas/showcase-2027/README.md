# Showcase 2027 — serie para entrenadores NCAA

Diez correos, uno cada 10 días, hasta el ETURE Showcase (VII edición,
8–11 de febrero de 2027, Valencia). Todos llevan a la inscripción de
`eturesports.com/showcase#register`.

| # | Envío | Asunto | Ángulo |
|---|---|---|---|
| 01 | mar 3 nov 2026 | Save the date: ETURE Showcase, Feb 8–11, 2027 in Valencia | Anuncio de fechas |
| 02 | vie 13 nov | Who you'll evaluate at the ETURE Showcase | Los jugadores: no es una prueba abierta |
| 03 | lun 23 nov | What UCLA, UNC and Cal coaches said after the Showcase | Testimonios de entrenadores |
| 04 | jue 3 dic | Four days, from arrival to signature — the Showcase schedule | Programa día a día |
| 05 | dom 13 dic | Hotel, meals and transfers included — Showcase pricing | Qué incluye y precios |
| 06 | mié 23 dic | Happy holidays from Valencia 🎄 (and 3 minutes of Showcase) | Felicitación + vídeo |
| 07 | sáb 2 ene 2027 | Four showcases, four countries, one trip to Europe | European Recruiting Soccer Tour |
| 08 | mar 12 ene | LaLiga clubs, the AFE and a Spanish game night | AFE, clubes de LaLiga, ETURE FC |
| 09 | vie 22 ene | {{firstName \| Coach}}, what positions are you recruiting? | Necesidades de plantilla |
| 10 | lun 1 feb | One week to go: final call for the ETURE Showcase | Última llamada y checklist |

Los envíos 05 y 07 caen en fin de semana: conviene moverlos al lunes
siguiente (14 dic y 4 ene) o al viernes anterior.

## Etiquetas

- `{{firstName}}` — nombre del entrenador; si falta, «Coach».
- `{{company}}` — universidad; si falta, «your program».

## Cómo enviarlos

Cada correo es una **campaña programada** en Eture Mailer, a la misma lista
de entrenadores, y no una secuencia: las secuencias admiten 5 pasos y estos
son 10, y además cada correo tiene que salir aunque el anterior se haya
abierto. Quien se inscriba conviene sacarlo de la lista para que no reciba
los recordatorios siguientes.

## Editar

Los HTML se generan con `build.py` (textos, fechas y la cuenta atrás de
cada correo). Para cambiar algo en todos, como la firma, edita el script y
regenera:

```bash
python3 plantillas/showcase-2027/build.py plantillas/showcase-2027
```
