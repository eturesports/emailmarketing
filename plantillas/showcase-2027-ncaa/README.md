# Showcase 2027 — series para entrenadores de Division I y Division II

Dos series de diez correos, una para cada división, para entrenadores que en
su mayoría **ya conocen ETURE**. El tono es el de una carta entre colegas:
sin presentaciones, sin superlativos, sin cuentas atrás. Cada correo trae
información útil y como mucho una petición.

- `d1/` — Division I
- `d2/` — Division II

| # | Envío | Asunto | Contenido |
|---|---|---|---|
| 01 | mar 3 nov 2026 | ETURE Showcase 2027: February 8–11, Valencia | Fechas, formato, coste |
| 02 | vie 13 nov | The players coming to the Showcase | Quién juega y la promesa de ser francos con el encaje |
| 03 | lun 23 nov | Player information we can send you | Vídeo, notas, elegibilidad; también sin asistir |
| 04 | jue 3 dic | Showcase schedule, February 8–11 | Programa día a día |
| 05 | lun 14 dic | Showcase cost and what is covered | Precios y qué incluye |
| 06 | mié 23 dic | Happy holidays from Valencia | Felicitación, sin petición |
| 07 | lun 4 ene 2027 | Combining Valencia with other showcases in Europe | European Recruiting Soccer Tour |
| 08 | mar 12 ene | Your roster needs for 2027 | Pedir necesidades para preparar listas |
| 09 | vie 22 ene | Travel details for Valencia | Llegada, hotel, desplazamientos |
| 10 | lun 1 feb | The Showcase is next week | Cierre y oferta de vídeo a quien no venga |

Los envíos de domingo y sábado de la serie anterior (13 dic y 2 ene) pasan
al lunes siguiente.

## Qué cambia entre D1 y D2

Las mismas diez piezas, con estas frases adaptadas:

| | Division I | Division II |
|---|---|---|
| Programas de 2026 citados | UCLA, UNC, Cal, Northwestern, Clemson, Missouri State, Portland | Franklin Pierce y otros de D2, junto a staffs de D1 |
| Encaje de jugadores | Quién puede aportar a nivel D1 | Quién encaja en D2: deportiva, académica y económicamente |
| Información por jugador | Eligibility Center y revisión de amateurismo | Eligibility Center y lo que puede aportar cada familia (paquetes de ayuda deportiva + académica) |
| Necesidades de plantilla | Posición, año de graduación o transfer | Posición, año de graduación y tipo de ayuda que pueden ofrecer |

## Etiquetas

- `{{firstName}}` — nombre del entrenador; si falta, «Coach».
- `{{company}}` — universidad; si falta, «your program».

## Editar

Los HTML salen de `build.py`. Cambia el texto o la firma (`SIGNER`) allí y
regenera las dos series:

```bash
python3 plantillas/showcase-2027-ncaa/build.py plantillas/showcase-2027-ncaa
```
