# The Coach Brief · Eture Showcase 2027

Newsletter quincenal para entrenadores universitarios hasta el Showcase
(**8–11 de febrero de 2027, Valencia**). Un único objetivo: que el entrenador
rellene el registro en `eturesports.com/showcase#register`.

- **Contenido:** `prisma/campaigns/showcase-2027.ts` (fuente única).
- **Plantillas en la plataforma:** `npm run db:seed` → categoría «Showcase 2027».
- **Vista previa en HTML:** `npx tsx scripts/export-showcase-2027.ts` → esta carpeta.

## Por qué así

- **En inglés**, como la invitación de octubre: el destinatario es staff de
  NCAA, NAIA y NJCAA.
- **Un tema por número**, en el orden en que un entrenador decide si viaja:
  ¿merece la pena? → ¿qué jugadores hay? → ¿qué incluye y cuánto cuesta? →
  ¿cómo encaja en mi viaje? → ¿cómo preparo la visita? → últimos detalles.
- **Martes a las 15:30 (Madrid)** = 9:30 ET / 6:30 PT: el entrenador lo ve al
  empezar la jornada, no enterrado bajo el correo de la noche.
- **Cifras sólo de fuentes verificables**: la invitación de octubre y la base de
  operaciones de Eture (consultada el 5 de noviembre de 2026).
- **Cada enlace lleva UTM** (`utm_campaign=showcase-2027-coach-brief`,
  `utm_content=noN-…`) para saber qué número genera cada registro.

## Calendario

| Nº | Envío | Asunto | Tema | Días al Showcase |
|---|---|---|---|---|
| 1 | mar 10 nov 2026 | 90 days to Valencia: Eture Showcase 2027 | Resumen 2026 (68 programas), novedades 2027 | 90 |
| 2 | mar 24 nov 2026 | Who you'll see on the field in Valencia | Perfiles de jugador, fichajes del curso pasado, cifras del otoño 2026 | 76 |
| 3 | mar 8 dic 2026 | Four days in Valencia, planned to the minute | Programa día a día, paquete y precios, preguntas frecuentes de viaje | 62 |
| 4 | mar 22 dic 2026 | Our 2026 in numbers (and one thing before the break) | Edición corta de vacaciones; el player book sale en enero | 48 |
| 5 | mar 5 ene 2027 | Four countries, one trip: the European Recruiting Soccer Tour | Gira europea, descuento combinado, tres itinerarios | 34 |
| 6 | mar 19 ene 2027 | The Showcase player book is going out | Player book, cómo funcionan las reuniones del jueves, quién viene ya | 20 |
| 7 | mar 2 feb 2027 | Final call: 6 days to the Eture Showcase | Todo en una página: fechas, hotel, precio, programa | 6 |

Cada número tiene un **asunto alternativo** (`altSubject` en el código) para
reenviarlo a los 3 días a quien no lo abrió, o para un test A/B.

## Audiencia

1. **Lista «Showcase 2027 · Entrenadores»**: los mismos contactos que recibieron
   la invitación por Mailmeteor (D1, D2, D3, NAIA y JUCO). Importarlos con la
   columna `company` = universidad, para que funcione `{{company | your program}}`.
2. **Lista «Showcase 2027 · Registrados»**: quien ya se ha registrado.
   **Antes de cada envío** hay que quitar estos contactos de la lista de
   entrenadores. La plataforma no excluye una lista de otra automáticamente,
   así que es un paso manual en *Listas*.
3. Ejecutar «Comprobar direcciones» sobre la lista antes del primer envío.

## Checklist de cada envío

- [ ] Volcar los nuevos registrados en «Registrados» y retirarlos de «Entrenadores».
- [ ] Crear la campaña desde la plantilla del número, remitente
      `contact@eturesports.com`, responder a `showcase@eturesports.com`.
- [ ] Envío de prueba a `marketing@` y revisar en Gmail móvil.
- [ ] Programar para el martes a las 15:30 (Madrid).
- [ ] 3 días después: reenviar con el asunto alternativo a quien no abrió
      (pestaña *Secuencia* → «A quien no lo abrió», espera de 3 días).

### Pendiente antes de enviar

- **Nº 2 y Nº 4:** las cifras de temporada (234 jugadores, 1.390 titularidades,
  121.000 minutos, 328 en plantillas) son de primeros de noviembre. Refrescarlas
  con la base de operaciones la víspera del envío.
- **Nº 6:** sustituir el bloque `[PENDIENTE]` por la lista de programas ya
  registrados. Es la prueba social más fuerte de la serie.
- **Nº 7:** confirmar que el registro sigue abierto el 2 de febrero y que
  quedan habitaciones. Si no, cambiar el mensaje a lista de espera.
- **Pie de baja:** la plataforma añade su pie en español («Darse de baja»).
  Para esta serie debería ir en inglés.

## KPI

| Métrica | Objetivo orientativo |
|---|---|
| Tasa de apertura | ≥ 35 % (audiencia que ya nos conoce) |
| Clics al registro / entregados | ≥ 4 % |
| Registros atribuidos (UTM) | Seguimiento por número en la analítica web |
| Bajas por envío | ≤ 0,5 %; si se supera, espaciar a mensual |

La mejor métrica es el número de programas registrados el 8 de febrero frente a
los 68 de 2026.
