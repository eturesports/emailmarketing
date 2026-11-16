/**
 * Vuelca los correos del Showcase 2027 a HTML para revisarlos
 * en el navegador o enviarlos a quien tenga que aprobarlos.
 *
 *   npx tsx scripts/export-showcase-2027.ts
 *
 * Las etiquetas {{firstName | Coach}} se dejan tal cual: las resuelve la
 * plataforma al enviar.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SHOWCASE_2027_ISSUES, SHOWCASE_2027_MAILMETEOR } from "../prisma/campaigns/showcase-2027";

const outDir = join(process.cwd(), "campaigns", "showcase-2027");
mkdirSync(outDir, { recursive: true });

for (const issue of SHOWCASE_2027_ISSUES) {
  const file = `${String(issue.issue).padStart(2, "0")}-${issue.sendDate}.html`;
  const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${issue.subject}</title></head>
<body style="margin:0;">${issue.html}</body></html>
`;
  writeFileSync(join(outDir, file), page);
  console.log(`✔ ${file}  ·  ${issue.subject}`);
}

// Correos que salen por Mailmeteor: página de revisión y cuerpo suelto para
// pegar en su editor HTML.
for (const email of SHOWCASE_2027_MAILMETEOR) {
  const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${email.subject}</title></head>
<body style="margin:0;">${email.html}</body></html>
`;
  writeFileSync(join(outDir, `${email.key}.html`), page);
  writeFileSync(join(outDir, `${email.key}.mailmeteor.html`), email.html);
  console.log(`✔ ${email.key}.html  ·  ${email.sendDate}  ·  ${email.subject}  →  ${email.list}`);
}
