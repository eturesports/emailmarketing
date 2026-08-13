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

**Plantillas**
- Diseños reutilizables con miniatura. Al crear una campaña se **copia** el
  contenido, así que editar la plantilla después no altera lo ya enviado.

**Capacidad**
- Dos vías de salida por cuenta: API de Gmail (2.000/24 h) o relay SMTP de
  Workspace (10.000/24 h).
- Grupo de remitentes: una campaña puede repartirse entre varias cuentas del
  dominio, sumando la capacidad de todas.
- Contabilidad sobre ventana móvil de 24 h, como la aplica Google.

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

Una campaña puede repartirse entre varias cuentas del dominio desde la pestaña
**Remitentes**. El envío rota entre ellas, de modo que todas avanzan a un ritmo
parecido en vez de agotar una y pasar a la siguiente. Si una cuenta se queda sin
cuota, o Google la limita, se aparta sola y la campaña continúa con el resto.

Combinando ambas:

| Configuración | Correos / 24 h |
| --- | --- |
| 1 cuenta, API de Gmail (por defecto) | 2.000 |
| 1 cuenta, relay SMTP | 10.000 |
| 4 cuentas, relay SMTP | **40.000** |
| 10 cuentas, relay SMTP | **100.000** |

El techo del dominio se ve en **Ajustes → Capacidad del dominio** y en el
resumen; la capacidad concreta de una campaña, en su pestaña **Remitentes**.

Las cuentas del grupo pueden ser buzones normales del equipo o cuentas creadas
sólo para enviar (`envios1@`, `envios2@`…). Cada una consume una licencia de
Workspace, que es el coste real de subir el techo por esta vía.

### Si necesitáis más

Por encima de unas decenas de miles de correos diarios, Workspace deja de ser la
herramienta adecuada: el límite del propio relay a nivel de organización es de
4,6 millones cada 24 h, pero mucho antes conviene un proveedor de envío masivo
(Amazon SES, Brevo, Resend…). La capa de transporte (`lib/transport.ts`) está
aislada precisamente para eso: añadir un proveedor SMTP externo es implementar
un tercer caso ahí, sin tocar el resto de la plataforma. Se pierde la propiedad
de «sale de vuestro Gmail», así que es una decisión de negocio, no técnica.

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

Ajusta también `ALLOWED_DOMAINS` (por defecto `eture.es`): sólo las cuentas de
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
    (panel)/              Panel: resumen, campañas, contactos, listas, plantillas…
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
    sender.ts             Cola de envío, cuotas y ritmo
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
