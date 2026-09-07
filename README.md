# Eture Mailer

Plataforma de email marketing de **Eture Esports**, al estilo de Mailmeteor, que
envía las campañas **a través de Gmail (Google Workspace)** en lugar de un
proveedor externo.

Enviar desde Gmail significa que los correos salen firmados con el DKIM de
vuestro dominio, quedan en la carpeta «Enviados» del usuario y heredan la
reputación de entrega de la cuenta. A cambio, Google impone un límite **por
cuenta**, que la plataforma controla y respeta automáticamente — y que se puede
subir bastante (ver [Capacidad de envío](#capacidad-de-envío)).

---

## Qué incluye

**Contactos**
- Importación desde **CSV, TSV y Excel (.xlsx/.xls)** con reconocimiento
  automático de columnas: `email`, `correo`, `Correo electrónico`, `nombre`,
  `apellidos`, `empresa`… y detección del separador (`,`, `;` o tabulador), tal
  y como exporta Excel en español.
- Las columnas que no encajan con un campo conocido se guardan como **campos
  personalizados** y quedan disponibles en los correos como `{{equipo}}`.
- Deduplicación por email (dentro del propio fichero y contra la base), opción
  de actualizar los existentes y aviso fila a fila de lo descartado.
- Fichas con historial de envíos, aperturas y clics; búsqueda, filtros,
  acciones en lote y exportación a CSV compatible con Excel.

**Listas**
- Agrupación de contactos por segmento (prensa, patrocinadores, comunidad…).
- Un contacto que esté en varias listas de una campaña recibe **un solo correo**.

**Campañas**
- Editor de HTML con previsualización aislada e inserción de etiquetas de
  combinación con un clic.
- Etiquetas tipo `{{firstName}}` y con valor por defecto: `{{firstName | equipo}}`.
- Envío de prueba, programación, pausa/reanudación y reintento de fallidos.
- Ritmo de envío configurable (60–5.000 correos/hora) para cuidar la
  entregabilidad.
- Seguimiento de **aperturas** (píxel) y **clics** (redirector firmado), enlace
  de baja obligatorio y cabecera `List-Unsubscribe` de un clic (RFC 8058), que
  es lo que hace que Gmail muestre su propio botón «Cancelar suscripción».

**Secuencias de seguimiento**
- Hasta 5 correos automáticos por campaña, con espera y condición propias:
  a todos, a quien no abrió o a quien no hizo clic.
- Salen del **mismo remitente y en el mismo hilo** que el mensaje original, así
  que se leen como continuación y no como un correo nuevo.
- Nadie que se haya dado de baja, haya rebotado o haya marcado el correo como
  spam vuelve a recibir nada, aunque la condición encaje.

**Remitentes**
- Entidad propia, separada de los usuarios: una cuenta de Google puede tener
  varios alias «enviar como» y cada uno es un remitente; un remitente de Resend
  no necesita cuenta de Google.
- Cada uno con su vía de envío, su tope y su ritmo.

**Plantillas**
- Diseños reutilizables con miniatura. Al crear una campaña se **copia** el
  contenido, así que editar la plantilla después no altera lo ya enviado.

**Capacidad**
- Tres vías de salida, elegibles por cuenta: API de Gmail (2.000/24 h), relay
  SMTP de Workspace (10.000/24 h) y Resend (el techo de tu plan).
- Grupo de remitentes: una campaña puede repartirse entre varias cuentas del
  dominio, sumando la capacidad de todas.
- Contabilidad sobre ventana móvil de 24 h, como la aplica Google.
- Rebotes y quejas de spam procesados por webhook cuando se envía con Resend.

**Equipo y control**
- Acceso restringido por dominio de Google Workspace.
- Roles (propietario / administrador / miembro) y activación de cuentas.
- Tope propio por cuenta, por debajo del de Google, y contador en tiempo real.

---

## Capacidad de envío

Google limita **por cuenta, no por dominio**, y lo hace sobre una **ventana
móvil de 24 horas**: quien envía 2.000 correos a las 23:00 no recupera capacidad
a medianoche, sino a las 23:00 del día siguiente. La plataforma lleva la cuenta
igual (cubos horarios en `lib/quota.ts`), así que nunca cree tener margen que
Google no le va a dar.

Sobre esa base hay dos palancas, **combinables**:

### 1. Relay SMTP en lugar de la API de Gmail — ×5 por cuenta

| Vía | Límite por cuenta / 24 h | Requisitos |
| --- | --- | --- |
| API de Gmail | 2.000 | Ninguno: basta con iniciar sesión |
| Relay SMTP de Workspace | **10.000** | Habilitarlo en la consola de administración + contraseña de aplicación |

Para activarlo, un administrador debe ir a **Consola de administración →
Aplicaciones → Google Workspace → Gmail → Enrutamiento → Servicio de
retransmisión SMTP**, crear una regla con «Solo direcciones de mis dominios» y
«Requerir autenticación SMTP», y marcar «Requerir cifrado TLS». Después, cada
usuario genera una [contraseña de aplicación](https://myaccount.google.com/apppasswords)
y la pega en **Ajustes → Vía de envío**. La plataforma valida las credenciales
contra el relay antes de guardarlas, así que un error de configuración se
descubre ahí y no a mitad de una campaña.

Contrapartida: los correos enviados por el relay **no quedan en la carpeta
«Enviados»** del usuario.

### 2. Grupo de remitentes — ×N cuentas

Una campaña puede repartirse entre varios remitentes desde su pestaña
**Remitentes**. El envío rota entre ellos, de modo que todos avanzan a un ritmo
parecido en vez de agotar uno y pasar al siguiente. Si uno se queda sin cuota, o
el proveedor lo limita, se aparta solo y la campaña continúa con el resto.

Un detalle que importa: **el sujeto de la cuota no es el remitente**. Dos alias
de la misma cuenta de Google son dos remitentes, pero comparten un único límite
de 2.000, y todos los remitentes de Resend comparten el plan del equipo. La
plataforma agrupa por ese sujeto y reparte el hueco disponible, en lugar de
anunciar una capacidad que no existe.

Combinando ambas:

| Configuración | Correos / 24 h |
| --- | --- |
| 1 cuenta, API de Gmail (por defecto) | 2.000 |
| 1 cuenta, relay SMTP | 10.000 |
| 4 cuentas, relay SMTP | **40.000** |
| 10 cuentas, relay SMTP | **100.000** |
| Resend | **el techo de tu plan** |

El techo del dominio se ve en **Ajustes → Capacidad del dominio** y en el
resumen; la capacidad concreta de una campaña, en su pestaña **Remitentes**.

Las cuentas del grupo pueden ser buzones normales del equipo o cuentas creadas
sólo para enviar (`envios1@`, `envios2@`…). Cada una consume una licencia de
Workspace, que es el coste real de subir el techo por esta vía.

### 3. Resend — sin techo por dirección

Para lo que Workspace no cubre, la plataforma puede enviar por **Resend**. Se
elige por cuenta en **Ajustes → Vía de envío**, igual que las otras dos, así que
conviven: los envíos que interesa que salgan del buzón de una persona siguen por
Gmail, y las campañas grandes van por Resend.

| | Gmail / relay | Resend |
| --- | --- | --- |
| Techo por dirección | 2.000 / 10.000 cada 24 h | El de tu plan |
| Sale del buzón del usuario | Sí (queda en «Enviados») | No |
| DKIM del dominio | Automático | Verificando el dominio en Resend |
| Rebotes y quejas de spam | **No se notifican** | Webhook en tiempo real |
| Coste | Licencias de Workspace | Plan de Resend |

Configuración (sólo administradores, en **Ajustes → Resend**):

1. Verifica `eturesports.com` en Resend (registros SPF y DKIM).
2. Pega la clave de API. Se valida contra Resend antes de guardarse — y se
   rechaza si no hay ningún dominio verificado, que es el fallo más habitual.
3. Crea un webhook en Resend apuntando a `{APP_URL}/api/webhooks/resend` con los
   eventos `email.bounced` y `email.complained`, y pega su secreto.

Ese último paso es el que más aporta: **con Gmail no hay forma de enterarse de
un rebote**, así que la base se degrada campaña tras campaña. Con el webhook, un
rebote permanente marca el contacto como `BOUNCED` y una queja de spam lo saca
de todos los envíos, automáticamente. Los rebotes temporales (buzón lleno,
servidor caído) se ignoran a propósito: no significan que la dirección sea mala.

Las peticiones se firman con el esquema de Svix y se verifican antes de tocar
nada; una firma inválida o una petición de hace más de cinco minutos se
rechazan con un 401.

Los envíos por Resend llevan una clave de idempotencia por destinatario, de modo
que un reintento tras un fallo de red no puede duplicar un correo.

---

## Secuencias de seguimiento

Cada campaña puede llevar hasta cinco correos de seguimiento. Se configuran en
la pestaña **Secuencia** y cada paso tiene tres cosas: cuánto espera desde el
envío inicial, a quién va y qué dice.

| Condición | A quién llega |
| --- | --- |
| A todos | A todo el que recibió el mensaje inicial |
| A quien no lo abrió | A quien no registró apertura |
| A quien no hizo clic | A quien no pulsó ningún enlace |

Decisiones que conviene conocer:

- **La condición se evalúa contra el envío inicial**, no contra el seguimiento
  anterior. Es lo que se espera al escribir «a quien no haya abierto» y evita
  cadenas de condiciones imposibles de razonar.
- **El seguimiento sale del mismo remitente** que el mensaje original a ese
  contacto, y con las cabeceras `In-Reply-To` y `References` apuntando a él, de
  modo que aparece dentro del mismo hilo. Con Gmail, además, se adjunta al hilo
  nativo. Si el asunto se deja vacío, hereda el original con «Re:».
- **La cola es la misma** que la del envío inicial: un seguimiento es otra fila
  de `Recipient`, así que hereda el ritmo, la cuota, el seguimiento de aperturas
  y las estadísticas sin lógica duplicada.
- **Una baja cancela los seguimientos pendientes** de ese contacto en el acto.
- Un paso que ya se envió **no se puede editar**: cambiar su contenido después
  falsearía el histórico de lo que la gente recibió. Se desactiva y se crea otro.

Una limitación que conviene tener presente: **no se detecta si alguien
respondió**. Saberlo exigiría permiso de lectura sobre el buzón, y la
plataforma sólo pide permiso de envío. Para captación en frío, apoyarse en «no
hizo clic» es más seguro que en «no abrió», porque el píxel de apertura lo
bloquean muchos clientes de correo.

---

## Puesta en marcha

### 1. Requisitos

- Node.js 20.9 o superior.
- Una cuenta de Google Workspace del dominio de Eture.

### 2. Instalar

```bash
npm install
cp .env.example .env
```

> El paquete `xlsx` se instala desde el CDN oficial de SheetJS
> (`cdn.sheetjs.com`), que es la vía recomendada por sus autores: la copia
> publicada en npm está sin mantenimiento y arrastra vulnerabilidades conocidas.

### 3. Credenciales de Google

1. Entra en [Google Cloud Console](https://console.cloud.google.com/) y crea un
   proyecto.
2. **APIs y servicios → Biblioteca** → habilita **Gmail API**.
3. **Pantalla de consentimiento OAuth** → tipo **Interno** (así sólo entra gente
   del dominio y no hace falta pasar la verificación de Google).
4. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**.
   - URI de redireccionamiento autorizado: `http://localhost:3000/api/auth/callback`
     en desarrollo, y `https://TU-DOMINIO/api/auth/callback` en producción.
5. Copia el ID y el secreto de cliente al fichero `.env`.

### 4. Completar el `.env`

```bash
# Genera dos claves distintas
openssl rand -base64 32   # → SESSION_SECRET
openssl rand -base64 32   # → ENCRYPTION_KEY
openssl rand -hex 24      # → CRON_SECRET
```

Ajusta también `ALLOWED_DOMAINS` (por defecto `eturesports.com`): sólo las cuentas de
esos dominios podrán entrar.

### 5. Base de datos y arranque

```bash
npm run db:push    # crea el esquema (SQLite en prisma/dev.db)
npm run db:seed    # listas y plantillas de ejemplo
npm run dev
```

Abre <http://localhost:3000> y entra con tu cuenta de Google. **El primer
usuario que entre se convierte en propietario.**

### 6. El worker de envío

Los correos no se mandan dentro de la petición HTTP que pulsa «Enviar»: se
encolan y un worker los va sacando por lotes. En desarrollo:

```bash
npm run worker            # bucle continuo, una pasada por minuto
npm run worker -- --once  # una sola pasada (para cron del sistema)
```

En producción hay dos opciones equivalentes:

- **Vercel** — el fichero `vercel.json` ya programa `/api/cron` cada 5 minutos.
- **Servidor propio** — un cron que llame al endpoint:

  ```cron
  */5 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://TU-DOMINIO/api/cron
  ```

Sin worker las campañas se quedan a medias: el primer lote sale al pulsar
«Enviar» y el resto espera indefinidamente.

---

## Despliegue

`APP_URL` **debe ser una URL pública con HTTPS**. Es la base de los enlaces de
seguimiento y de baja que viajan dentro de cada correo: si apunta a `localhost`,
ni el píxel de apertura ni el enlace de baja funcionarán en el buzón del
destinatario.

### PostgreSQL en lugar de SQLite

SQLite es suficiente para el uso de un equipo, pero si despliegas en Vercel
necesitas una base gestionada (el sistema de ficheros es efímero). El cambio son
dos líneas:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"   // antes: "sqlite"
  url      = env("DATABASE_URL")
}
```

```bash
DATABASE_URL="postgresql://usuario:clave@host:5432/eture_mailer"
npm run db:push
```

El esquema no usa enums nativos ni arrays, así que es compatible con ambos
motores sin más cambios.

---

## Cómo está montado

```
src/
  app/
    (panel)/              Panel: resumen, campañas, contactos, listas, remitentes…
    api/                  Route handlers (auth, contactos, campañas, cron, tracking)
    baja/[token]/         Página pública de cancelación de suscripción
    login/
  components/             Interfaz (servidor + cliente)
  lib/
    api.ts                Errores y respuestas de los route handlers
    auth.ts               Sesión y permisos
    constants.ts          Estados, roles y alias de importación
    crypto.ts             Cifrado AES-256-GCM de los tokens de Gmail
    db.ts                 Cliente Prisma
    gmail.ts              Construcción del MIME y envío
    google.ts             OAuth y refresco de tokens
    import.ts             Lectura de CSV/Excel e importación
    merge.ts              Motor de etiquetas de combinación
    quota.ts              Cuota en ventana móvil de 24 h
    resend.ts             Cliente de Resend y verificación de webhooks
    sender.ts             Cola de envío, grupo de remitentes y ritmo
    settings.ts           Configuración de la organización (cifrada)
    transport.ts          Gmail API / relay SMTP / Resend
    tracking.ts           Píxel, redirector de clics y pie de baja
    unsubscribe.ts        Bajas
prisma/                   Esquema y semilla
scripts/worker.ts         Worker de envío para servidor propio
```

### Decisiones que conviene conocer

- **Cola persistente.** Cada par (campaña, contacto) es una fila `Recipient` que
  es a la vez la cola y el registro del resultado. Un envío de 5.000 correos no
  depende de que una petición HTTP siga viva media hora, sobrevive a un
  reinicio y se puede pausar y reanudar.
- **Tokens cifrados.** El *refresh token* de Gmail permite enviar en nombre del
  usuario de forma indefinida, así que se guarda cifrado con `ENCRYPTION_KEY`:
  una copia del fichero de base de datos, por sí sola, no sirve de nada.
- **Enlaces de clic firmados.** El redirector `/api/track/c/...` valida un HMAC
  del destino antes de redirigir. Sin esa firma sería un redirector abierto,
  perfecto para camuflar phishing detrás de vuestro dominio.
- **Escapado del contenido.** Los valores de los contactos se escapan al
  insertarse en el HTML del correo, de modo que un contacto cuyo nombre sea
  `<script>` no puede inyectar marcado en el correo de otro.
- **Cierre de sesión por POST.** Como enlace GET, el *prefetch* del navegador lo
  visitaría al pasar el ratón por encima y cerraría la sesión sin que nadie
  pulse nada.
- **Cuota diaria por usuario y día**, en la zona horaria configurada, para no
  chocar con el límite de Google a mitad de campaña.

---

## Comandos

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilar y servir en producción |
| `npm run typecheck` | Comprobación de tipos |
| `npm run db:push` | Aplicar el esquema a la base de datos |
| `npm run db:studio` | Explorador visual de la base de datos |
| `npm run db:seed` | Listas y plantillas de ejemplo |
| `npm run worker` | Procesar la cola de envío |

---

## Aviso legal

Envía únicamente a contactos que hayan dado su consentimiento. Todas las
campañas incluyen enlace de baja y cabecera `List-Unsubscribe`, que es lo que
exigen el RGPD y la LSSI, pero la licitud de la base de datos es responsabilidad
de quien la importa.
