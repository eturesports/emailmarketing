/**
 * Eture Showcase 2027 — newsletter quincenal para entrenadores universitarios.
 *
 * Siete envíos, un martes de cada dos, del 10 de noviembre de 2026 al 2 de
 * febrero de 2027. El Showcase es del 8 al 11 de febrero en Valencia. El
 * objetivo único de la serie es que el entrenador rellene el registro en
 * eturesports.com/showcase#register.
 *
 * Los correos van en inglés: el destinatario es staff técnico de NCAA, NAIA y
 * NJCAA, igual que la invitación enviada en octubre.
 *
 * Cada número se exporta como plantilla (categoría «Showcase 2027») desde
 * prisma/seed.ts. Para revisarlos en el navegador:
 *
 *   npx tsx scripts/export-showcase-2027.ts   → campaigns/showcase-2027/*.html
 *
 * Plan completo, calendario y checklist: campaigns/showcase-2027/README.md
 */

export const SHOWCASE_CATEGORY = "Showcase 2027";

const SHOWCASE_START = Date.UTC(2027, 1, 8);

// --- Marca (la misma paleta que la invitación de octubre) -------------------

const RED = "#9f1b20";
const INK = "#1d1d1f";
const MUTED = "#6e6e73";
const SOFT = "#86868b";
const LINE = "#e8e8ed";
const BG = "#f5f5f7";
const FONT = "Arial,Helvetica,sans-serif";

const IMG_HERO = "https://lh3.googleusercontent.com/d/1PsaL6a7X9Xn4uK7_ON7XC3XI1k7WE-aX=w1200";
const IMG_STANDS = "https://www.eturesports.com/_next/image?url=%2Fimages%2Fshowcase%2F2026%2Fg-10.webp&w=1200&q=75";
const IMG_PITCH = "https://www.eturesports.com/_next/image?url=%2Fimages%2Fshowcase%2F2026%2Fday2-2.webp&w=1200&q=75";

// --- Enlaces con UTM, para atribuir cada registro a su número ---------------

function link(path: string, issue: number, content: string): string {
  const [base, hash] = path.split("#");
  const params = new URLSearchParams({
    utm_source: "eture-mailer",
    utm_medium: "email",
    utm_campaign: "showcase-2027-coach-brief",
    utm_content: `no${issue}-${content}`,
  });
  return `${base}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

const REGISTER = "https://www.eturesports.com/showcase#register";
const SCHEDULE = "https://www.eturesports.com/showcase#schedule";
const OPERATIONS = "https://www.eturesports.com/college-operations";
const TOUR = "https://www.europeanrecruiting.com";

// --- Bloques ----------------------------------------------------------------

function daysToGo(sendDate: string): number {
  const [y, m, d] = sendDate.split("-").map(Number);
  return Math.round((SHOWCASE_START - Date.UTC(y, m - 1, d)) / 86_400_000);
}

const p = (html: string, extra = "") =>
  `<p style="font-family:${FONT};font-size:16px;line-height:26px;color:${INK};margin:0 0 16px;${extra}">${html}</p>`;

const small = (html: string) =>
  `<p style="font-family:${FONT};font-size:13px;line-height:20px;color:${SOFT};margin:8px 0 0;">${html}</p>`;

const kicker = (text: string, color = RED) =>
  `<p style="font-family:${FONT};font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${color};margin:0 0 10px;">${text}</p>`;

const h2 = (text: string, color = INK) =>
  `<h2 style="font-family:${FONT};font-size:24px;line-height:30px;font-weight:700;letter-spacing:-0.4px;color:${color};margin:0 0 14px;">${text}</h2>`;

function button(label: string, href: string, dark = false): string {
  const bg = dark ? INK : RED;
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:8px 0 8px;"><tr><td style="border-radius:30px;background:${bg};">
  <a href="${href}" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:15px;line-height:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:30px;">${label}</a>
</td></tr></table>`;
}

const section = (inner: string, padding = "32px 40px 8px") =>
  `<tr><td style="padding:${padding};">${inner}</td></tr>`;

const image = (src: string, alt: string, rounded = true) =>
  `<tr><td style="padding:${rounded ? "24px 40px 0" : "0"};"><img src="${src}" alt="${alt}" width="${rounded ? 520 : 600}" style="display:block;width:100%;max-width:${rounded ? 520 : 600}px;height:auto;border:0;${rounded ? "border-radius:14px;" : ""}" /></td></tr>`;

function stats(items: Array<[string, string]>, title: string): string {
  const cells = items
    .map(
      ([value, label]) => `<td width="${Math.floor(100 / items.length)}%" valign="top" style="padding:0 4px;text-align:center;">
  <p style="font-family:${FONT};font-size:32px;line-height:38px;font-weight:700;letter-spacing:-0.8px;color:#ffffff;margin:0 0 6px;">${value}</p>
  <p style="font-family:${FONT};font-size:13px;line-height:19px;color:#b7b7bd;margin:0;">${label}</p>
</td>`,
    )
    .join("");
  return `<tr><td style="padding:36px 24px;background:${INK};">
  <p style="font-family:${FONT};font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#ff6b6b;text-align:center;margin:0 0 22px;">${title}</p>
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
</td></tr>`;
}

function rows(items: Array<[string, string]>): string {
  const trs = items
    .map(
      ([left, right]) => `<tr>
  <td style="border-bottom:1px solid ${LINE};padding:10px 0;font-family:${FONT};font-size:15px;line-height:21px;color:${INK};">${left}</td>
  <td style="border-bottom:1px solid ${LINE};padding:10px 0;font-family:${FONT};font-size:14px;line-height:21px;color:${MUTED};text-align:right;">${right}</td>
</tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">${trs}</table>`;
}

function days(items: Array<[string, string, string]>): string {
  return items
    .map(
      ([day, date, text]) => `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-bottom:1px solid ${LINE};"><tr><td style="padding:14px 4px;">
  <p style="font-family:${FONT};font-size:15px;line-height:22px;color:${INK};margin:0 0 4px;"><strong>${day}</strong><span style="color:${SOFT};">&nbsp;&nbsp;·&nbsp;&nbsp;${date}</span></p>
  <p style="font-family:${FONT};font-size:14px;line-height:22px;color:${MUTED};margin:0;">${text}</p>
</td></tr></table>`,
    )
    .join("");
}

const box = (inner: string) =>
  `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${BG};border-radius:20px;margin:0 0 16px;"><tr><td style="padding:26px 28px;">${inner}</td></tr></table>`;

const check = (text: string) =>
  `<p style="font-family:${FONT};font-size:15px;line-height:22px;color:${INK};margin:0 0 8px;"><strong style="color:${RED};">✓&nbsp;&nbsp;</strong>${text}</p>`;

function closing(issue: number, headline: string, line: string): string {
  return `<tr><td style="padding:40px;background:${INK};text-align:center;">
  <h2 style="font-family:${FONT};font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.6px;color:#ffffff;margin:0 0 10px;">${headline}</h2>
  <p style="font-family:${FONT};font-size:16px;line-height:24px;color:#d2d2d7;margin:0 0 24px;">${line}</p>
  <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0"><tr><td style="border-radius:30px;background:${RED};">
    <a href="${link(REGISTER, issue, "closing")}" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:15px;line-height:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:30px;">Register your staff</a>
  </td></tr></table>
  <p style="font-family:${FONT};font-size:14px;line-height:22px;color:#b7b7bd;margin:20px 0 0;">Questions? Just reply, or write to <a href="mailto:showcase@eturesports.com" style="color:#ffffff;text-decoration:none;">showcase@eturesports.com</a></p>
</td></tr>`;
}

type ShellOptions = {
  issue: number;
  sendDate: string;
  preheader: string;
  topic: string;
  body: string;
};

function shell({ issue, sendDate, preheader, topic, body }: ShellOptions): string {
  const left = daysToGo(sendDate);
  return `<div style="background:${BG};margin:0;padding:0;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BG};font-size:1px;line-height:1px;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${BG};"><tr><td style="padding:32px 12px;">
<table role="presentation" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${LINE};border-radius:20px;overflow:hidden;">
<tr><td style="padding:28px 24px 26px;text-align:center;">
  <p style="font-family:${FONT};font-size:12px;line-height:18px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${RED};margin:0 0 14px;">The Coach Brief&nbsp;&nbsp;·&nbsp;&nbsp;No. ${issue}</p>
  <h1 style="font-family:${FONT};font-size:38px;line-height:42px;font-weight:800;letter-spacing:-1px;text-transform:uppercase;color:${INK};margin:0 0 10px;">Eture Showcase 2027</h1>
  <p style="font-family:${FONT};font-size:12px;line-height:18px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};margin:0;">8–11 February&nbsp;&nbsp;·&nbsp;&nbsp;Valencia, Spain&nbsp;&nbsp;·&nbsp;&nbsp;<span style="color:${RED};">${left} days to go</span></p>
  <p style="font-family:${FONT};font-size:14px;line-height:20px;color:${SOFT};margin:14px 0 0;">In this issue: ${topic}</p>
</td></tr>
${body}
<tr><td style="padding:32px 40px 32px;">
  <p style="font-family:${FONT};font-size:15px;line-height:22px;color:${INK};margin:0;"><strong>The Eture Showcase Team</strong><br /><span style="color:${MUTED};">Eture Sports | The Soccer Company</span></p>
  <p style="font-family:${FONT};font-size:12px;line-height:19px;color:${SOFT};margin:18px 0 0;">Eture Sports · Carretera Ademúz km-12, 46184 Valencia, Spain<br />You are receiving The Coach Brief because you work with college soccer programs we recruit for.</p>
</td></tr>
</table>
</td></tr></table>
</div>`;
}

// --- Los siete números ------------------------------------------------------

export type ShowcaseIssue = {
  issue: number;
  /** Fecha de envío prevista (martes), hora de Madrid en el README. */
  sendDate: string;
  /** Nombre de la plantilla en la plataforma. */
  name: string;
  subject: string;
  previewText: string;
  /** Asunto alternativo para test A/B o reenvío a quien no abrió. */
  altSubject: string;
  html: string;
};

function issue1(): ShowcaseIssue {
  const n = 1;
  const sendDate = "2026-11-10";
  const previewText = "68 college programs were in the stands last February. Here is what changes for 2027.";
  return {
    issue: n,
    sendDate,
    name: "Showcase 2027 · No. 1 · 90 days to Valencia",
    subject: "90 days to Valencia: Eture Showcase 2027",
    altSubject: "{{firstName | Coach}}, 68 programs came last year. Will you?",
    previewText,
    html: shell({
      issue: n,
      sendDate,
      preheader: previewText,
      topic: "the 2026 recap, what is new for 2027 and how to register.",
      body: [
        image(IMG_HERO, "Eture Showcase 2027, Valencia", false),
        section(
          [
            h2("Europe's largest college soccer showcase is 90 days away."),
            p("Hi {{firstName | Coach}},"),
            p(
              "Here is what you need to decide whether Valencia is worth the trip for {{company | your program}}. Players, logistics, numbers. No filler.",
            ),
            p(
              "The VII edition runs <strong>8–11 February 2027</strong>. Around <strong>150 selected players</strong> from our recruiting agency and our residential academy, four days, one venue.",
            ),
          ].join(""),
        ),
        stats(
          [
            ["68", "college programs in the stands in 2026"],
            ["140+", "programs across all editions"],
            ["780+", "college placements since 2015"],
          ],
          "The 2026 edition in numbers",
        ),
        section(
          [
            kicker("Who came last February"),
            h2("Power 4, mid-majors, D2 and NAIA. Side by side."),
            p(
              "UCLA, Cal, North Carolina, Wake Forest, NC State, Northwestern, Penn State, Indiana, Rutgers, Clemson, Louisville, Kentucky, Pitt and West Virginia were in Valencia, alongside programs like Franklin Pierce, Southern New Hampshire, Saint Michael's, Lenoir-Rhyne, Rogers State and Iowa Western.",
            ),
            p(
              "That mix matters: every player on the field has a realistic destination, and you are not competing for the same ten players as everyone else.",
            ),
          ].join(""),
        ),
        section(
          [
            kicker("New for 2027"),
            h2("Valencia is now one stop of a four-country tour."),
            p(
              "We are co-organising the <strong>European Recruiting Soccer Tour</strong>: Iceland, Spain, Sweden and Denmark, 5–15 February. Add any other stop and your Eture Showcase package drops to <strong>€500 single / €300 per coach sharing</strong>.",
            ),
            button("Register for Valencia", link(REGISTER, n, "cta1")),
            small(`Hotel, meals, transport and every game included, from €300 per coach. <a href="${link(SCHEDULE, n, "schedule")}" style="color:${RED};text-decoration:none;">See the programme →</a>`),
          ].join(""),
        ),
        image(IMG_STANDS, "College coaches evaluating players from the stands at the Eture Showcase 2026"),
        closing(n, "See you in Valencia.", "Register your staff, choose your rooms and we take care of the rest."),
      ].join("\n"),
    }),
  };
}

function issue2(): ShowcaseIssue {
  const n = 2;
  const sendDate = "2026-11-24";
  const previewText = "Spanish academy players, American gap-year players and a full season of senior football.";
  return {
    issue: n,
    sendDate,
    name: "Showcase 2027 · No. 2 · The players",
    subject: "Who you'll see on the field in Valencia",
    altSubject: "The players behind 141 Division I placements this fall",
    previewText,
    html: shell({
      issue: n,
      sendDate,
      preheader: previewText,
      topic: "the player pool, where last year's players signed and how they are doing this fall.",
      body: [
        section(
          [
            h2("Made in adversity. Ready for the NCAA."),
            p("Hi {{firstName | Coach}},"),
            p("Happy Thanksgiving week. This issue is about the only thing that really matters at a showcase: the players."),
            p(
              "Every player on the field in Valencia has come through our recruiting agency or our residential development program in Spain. <strong>We know their game, their character and their goals</strong>, because we work with them every day.",
            ),
          ].join(""),
          "32px 40px 8px",
        ),
        section(
          [
            kicker("Three profiles"),
            box(
              [
                check("<strong>Spanish players</strong> formed in academy football and shaped in senior competition. Today, 40% of the Spanish players in Division I came through Eture."),
                check("<strong>American gap-year players</strong> who spent a season in our residential program in Spain and return to the NCAA with senior minutes in their legs."),
                check("<strong>International players</strong> who train daily at our Valencia and Vinaròs campuses."),
              ].join(""),
            ),
            p(
              "All of them get a full season of senior football with <strong>Eture FC</strong> and the academic preparation to arrive eligible.",
            ),
          ].join(""),
        ),
        section(
          [
            kicker("Last season, Eture players signed with"),
            rows([
              ["<strong>Finot Pie</strong>", "UCLA"],
              ["<strong>Victor Ciaurriz</strong>", "UCLA"],
              [`<strong>Aidan Ahmad</strong> <span style="color:${RED};font-size:12px;font-weight:700;">GAP YEAR</span>`, "Cal (UC Berkeley)"],
              [`<strong>Isaac Rosenthal</strong> <span style="color:${RED};font-size:12px;font-weight:700;">GAP YEAR</span>`, "Northwestern University"],
              [`<strong>Nicholas Brown</strong> <span style="color:${RED};font-size:12px;font-weight:700;">GAP YEAR</span>`, "Dartmouth College"],
              ["<strong>Sergio Canos</strong>", "Brown University"],
              ["<strong>Bruno Bertran</strong>", "University of Pittsburgh"],
              ["<strong>Héctor Criado</strong>", "Rutgers University"],
              ["<strong>Mark Chust</strong>", "West Virginia University"],
              ["<strong>Mario Albert</strong>", "Creighton University"],
            ]),
            p(`<strong style="color:${RED};">141 placements in Division I</strong> for fall 2026.`),
            button("See all operations →", link(OPERATIONS, n, "operations"), true),
          ].join(""),
        ),
        stats(
          [
            ["234", "Eture players on the field this fall"],
            ["1,390", "starts"],
            ["362", "goals + assists"],
          ],
          "Fall 2026 so far",
        ),
        section(
          [
            h2("They play from day one."),
            p(
              "This fall, Eture players logged more than <strong>121,000 minutes</strong> across Division I, II, III and NAIA. Two out of three appearances were starts. That is the profile you will be evaluating in February.",
            ),
            button("Register for Valencia", link(REGISTER, n, "cta1")),
          ].join(""),
          "32px 40px 32px",
        ),
        image(IMG_PITCH, "Coaches and players together on the Eture campus pitch, Showcase 2026", false),
        closing(n, "Come and see them play.", "8–11 February, Valencia. Hotel, meals and transport included."),
      ].join("\n"),
    }),
  };
}

function issue3(): ShowcaseIssue {
  const n = 3;
  const sendDate = "2026-12-08";
  const previewText = "Day by day: arrival, two days of games, Eture FC under the lights and one-to-one meetings.";
  return {
    issue: n,
    sendDate,
    name: "Showcase 2027 · No. 3 · Programme and package",
    subject: "Four days in Valencia, planned to the minute",
    altSubject: "What €350 covers at the Eture Showcase",
    previewText,
    html: shell({
      issue: n,
      sendDate,
      preheader: previewText,
      topic: "the day-by-day programme, what the coach package covers and how to get there.",
      body: [
        section(
          [
            h2("From arrival to signature."),
            p("Hi {{firstName | Coach}},"),
            p(
              "We get asked the same thing every year: <em>what does the trip actually look like?</em> Here it is, day by day. You land, and we handle the rest.",
            ),
            days([
              ["Monday", "8 February", "Airport pick-up and check-in at the AdHoc Hotel<br />Inaugural Showcase cocktail, 8:30 PM"],
              ["Tuesday", "9 February", "Showcase games at the Eture campus, 8:00 AM – 5:00 PM<br />Dinner at MasFerrat"],
              ["Wednesday", "10 February", "Showcase games, then Eture FC under the lights at Sant Jordi, 7:00 PM<br />Spanish barbecue at the stadium"],
              ["Thursday", "11 February", "One-to-one meetings: player interest, offers and next steps<br />Lunch downtown"],
            ]),
            small("Itinerary may be adjusted. The final schedule and player book are sent to every registered coach in January."),
          ].join(""),
        ),
        section(
          [
            box(
              [
                kicker("Coach package"),
                `<p style="font-family:${FONT};font-size:32px;line-height:38px;font-weight:700;color:${INK};margin:0 0 16px;">From €300 <span style="font-size:16px;color:${MUTED};font-weight:400;">per coach</span></p>`,
                rows([
                  ["<strong>Valencia only</strong> · single room", `<strong style="color:${RED};">€550</strong>`],
                  ["<strong>Valencia only</strong> · shared room, per coach", `<strong style="color:${RED};">€350</strong>`],
                  ["<strong>+ another Tour stop</strong> · single room", `<strong style="color:${RED};">€500</strong>`],
                  ["<strong>+ another Tour stop</strong> · shared room, per coach", `<strong style="color:${RED};">€300</strong>`],
                ]),
                check("Three nights at the AdHoc Hotel, breakfast included"),
                check("Two traditional paella meals at MasFerrat"),
                check("Welcome cocktail dinner"),
                check("Daily transport from the hotel to the fields"),
                check("Airport or train-station pick-up in Valencia"),
                check("Transfer to Vinaròs for the Eture FC game"),
              ].join(""),
            ),
          ].join(""),
        ),
        section(
          [
            kicker("Quick answers"),
            p("<strong>Do I book the hotel?</strong><br />No. Eture books your Showcase nights. Extra nights before or after go directly with the hotel."),
            p("<strong>Can I share a room with a coach from another program?</strong><br />Yes. A shared room is two coaches, from your staff or from another university. Tell us when you register."),
            p("<strong>Is airfare included?</strong><br />No. Fly into Valencia (VLC), or into Madrid and take the high-speed train to Valencia. We pick you up at the airport or the train station."),
            button("Register and choose your room", link(REGISTER, n, "cta1")),
          ].join(""),
          "32px 40px 32px",
        ),
        closing(n, "Your seat in the stands is waiting.", "Register now and we will confirm your room and pick-up."),
      ].join("\n"),
    }),
  };
}

function issue4(): ShowcaseIssue {
  const n = 4;
  const sendDate = "2026-12-22";
  const previewText = "A short one before the break: our year in numbers, and one thing to do before January.";
  return {
    issue: n,
    sendDate,
    name: "Showcase 2027 · No. 4 · Year in numbers",
    subject: "Our 2026 in numbers (and one thing before the break)",
    altSubject: "Happy holidays from Valencia, {{firstName | Coach}}",
    previewText,
    html: shell({
      issue: n,
      sendDate,
      preheader: previewText,
      topic: "a short holiday edition with our year in numbers.",
      body: [
        section(
          [
            h2("Thank you for a great 2026."),
            p("Hi {{firstName | Coach}},"),
            p(
              "A short one before the holidays. 2026 was the biggest year in Eture's history, and it happened because coaches like you trusted our players. Here is what that looked like.",
            ),
          ].join(""),
        ),
        stats(
          [
            ["328", "Eture players on U.S. college rosters today"],
            ["141", "Division I placements for fall 2026"],
            ["68", "programs at the 2026 Showcase"],
          ],
          "Eture in 2026",
        ),
        section(
          [
            kicker("One thing before the break"),
            h2("The player book goes out in January."),
            p(
              "Every registered coach receives the final schedule and the <strong>player book</strong>, with profiles of the players on the field, in January. Register before you log off for the holidays and you will be on the list from the first send.",
            ),
            p("It takes two minutes: your staff, your rooms, and any other Tour stops you can make."),
            button("Register in two minutes", link(REGISTER, n, "cta1")),
          ].join(""),
          "32px 40px 32px",
        ),
        image(IMG_STANDS, "College coaches evaluating players from the stands at the Eture Showcase 2026", false),
        closing(n, "Happy holidays from Valencia.", "See you on 8 February."),
      ].join("\n"),
    }),
  };
}

function issue5(): ShowcaseIssue {
  const n = 5;
  const sendDate = "2027-01-05";
  const previewText = "Iceland, Spain, Sweden and Denmark in ten days. Add a stop and your Valencia package drops to €300.";
  return {
    issue: n,
    sendDate,
    name: "Showcase 2027 · No. 5 · European Recruiting Soccer Tour",
    subject: "Four countries, one trip: the European Recruiting Soccer Tour",
    altSubject: "Make February your European recruiting trip",
    previewText,
    html: shell({
      issue: n,
      sendDate,
      preheader: previewText,
      topic: "the European Recruiting Soccer Tour and how to plan the trip.",
      body: [
        section(
          [
            h2("One flight to Europe. Four player pools."),
            p("Hi {{firstName | Coach}}, happy new year."),
            p(
              "If you are crossing the Atlantic for Valencia, make it count. From <strong>5 to 15 February</strong> we are co-organising the <strong>European Recruiting Soccer Tour</strong>: a private showcase circuit for U.S. college programs. Each stop is hosted by the agency that places that country's players in the NCAA, NAIA and NJCAA.",
            ),
            rows([
              ["<strong>Iceland</strong> · Garðabær<br /><span style=\"color:#6e6e73;font-size:13px;\">Soccer &amp; Education USA</span>", "5 – 6 Feb"],
              [`<strong style="color:${RED};">Spain</strong> · Valencia<br /><span style="color:#6e6e73;font-size:13px;">Eture Sports</span>`, `<strong style="color:${RED};">8 – 11 Feb</strong>`],
              ["<strong>Sweden</strong> · Gothenburg<br /><span style=\"color:#6e6e73;font-size:13px;\">Kumlin Recruiting</span>", "12 – 13 Feb"],
              ["<strong>Denmark</strong> · Copenhagen<br /><span style=\"color:#6e6e73;font-size:13px;\">NSSA</span>", "14 – 15 Feb"],
            ]),
          ].join(""),
        ),
        section(
          box(
            [
              kicker("Tour discount"),
              p(
                "Attend Valencia plus <strong>any</strong> other stop and your Eture Showcase package drops from €550 to <strong>€500 single</strong>, or from €350 to <strong>€300 per coach sharing</strong>. Tick every stop you can make when you register.",
                "margin:0;",
              ),
            ].join(""),
          ),
        ),
        section(
          [
            kicker("Three ways to plan it"),
            p("<strong>The full circuit.</strong> Iceland → Valencia → Gothenburg → Copenhagen. Ten days, four countries."),
            p("<strong>The southern swing.</strong> Iceland on the 5th–6th, then straight to Valencia for the 8th."),
            p("<strong>The northern swing.</strong> Valencia 8–11, then Gothenburg and Copenhagen to close the trip."),
            button("Register and pick your stops", link(REGISTER, n, "cta1")),
            small(`Full circuit, venues and the other stops' registration at <a href="${link(TOUR, n, "tour")}" style="color:${RED};text-decoration:none;">europeanrecruiting.com</a>`),
          ].join(""),
          "32px 40px 32px",
        ),
        closing(n, "Valencia is the stop in the middle.", "Start or end your European trip with us."),
      ].join("\n"),
    }),
  };
}

function issue6(): ShowcaseIssue {
  const n = 6;
  const sendDate = "2027-01-19";
  const previewText = "Tell us the positions you are recruiting for and we will flag the right players before you land.";
  return {
    issue: n,
    sendDate,
    name: "Showcase 2027 · No. 6 · The player book",
    subject: "The Showcase player book is going out",
    altSubject: "{{firstName | Coach}}, which positions are you recruiting for?",
    previewText,
    html: shell({
      issue: n,
      sendDate,
      preheader: previewText,
      topic: "the player book, how to prepare your one-to-one meetings and who is coming.",
      body: [
        section(
          [
            h2("Arrive knowing who to watch."),
            p("Hi {{firstName | Coach}},"),
            p(
              "Three weeks to go. This month we are sending every registered coach the final schedule and the <strong>player book</strong> with the players who will be on the field in Valencia.",
            ),
            p(
              "Coaches who get the most out of the Showcase do one thing before they fly: they tell us what they need. Reply to this email with the <strong>positions and profiles</strong> you are recruiting for, and we will flag the right players in your book and schedule your Thursday one-to-one meetings around them.",
            ),
            button("Register to receive the player book", link(REGISTER, n, "cta1")),
          ].join(""),
        ),
        section(
          [
            kicker("How Thursday works"),
            box(
              [
                check("You tell us which players you want to talk to after two days of games"),
                check("We set up one-to-one meetings with those players and our staff"),
                check("You talk player interest, offers and next steps, face to face"),
              ].join(""),
            ),
          ].join(""),
        ),
        section(
          [
            kicker("Already registered for 2027"),
            // PENDIENTE: actualizar con los programas confirmados antes de enviar.
            p("[PENDIENTE: lista de programas ya registrados, p. ej. «UCLA, Wake Forest, Providence, Sacred Heart…»]", `color:${RED};`),
            p("Join them in the stands."),
            button("Register your staff", link(REGISTER, n, "cta2")),
          ].join(""),
          "32px 40px 32px",
        ),
        closing(n, "Three weeks to Valencia.", "Register now so your player book arrives with everyone else's."),
      ].join("\n"),
    }),
  };
}

function issue7(): ShowcaseIssue {
  const n = 7;
  const sendDate = "2027-02-02";
  const previewText = "Six days to go. Everything you need for Valencia on one page.";
  return {
    issue: n,
    sendDate,
    name: "Showcase 2027 · No. 7 · Final call",
    subject: "Final call: 6 days to the Eture Showcase",
    altSubject: "{{firstName | Coach}}, there is still time to join us in Valencia",
    previewText,
    html: shell({
      issue: n,
      sendDate,
      preheader: previewText,
      topic: "everything you need for Valencia, on one page.",
      body: [
        section(
          [
            h2("Six days to kickoff."),
            p("Hi {{firstName | Coach}},"),
            p(
              "This is the last Coach Brief before the Showcase. If Valencia is still on your list, this is the week to confirm: we need your details to book your room and your pick-up.",
            ),
            button("Confirm your attendance", link(REGISTER, n, "cta1")),
          ].join(""),
        ),
        section(
          [
            kicker("At a glance"),
            rows([
              ["<strong>When</strong>", "Mon 8 – Thu 11 February 2027"],
              ["<strong>Where</strong>", "Eture campus, Valencia, Spain"],
              ["<strong>Hotel</strong>", "AdHoc Hotel, booked by Eture"],
              ["<strong>Players</strong>", "Around 150, from our agency and academy"],
              ["<strong>Price</strong>", "From €300 per coach, all-inclusive"],
              ["<strong>Arrival</strong>", "Pick-up at Valencia airport or train station"],
            ]),
          ].join(""),
        ),
        section(
          [
            kicker("The four days"),
            days([
              ["Mon 8", "Arrival", "Pick-up, check-in, inaugural cocktail at 8:30 PM"],
              ["Tue 9", "Games", "Showcase games 8:00 AM – 5:00 PM, dinner at MasFerrat"],
              ["Wed 10", "Games + Eture FC", "Showcase games, Eture FC under the lights, barbecue at the stadium"],
              ["Thu 11", "Meetings", "One-to-one meetings: interest, offers and next steps"],
            ]),
          ].join(""),
          "32px 40px 32px",
        ),
        closing(n, "See you in Valencia.", "Questions about travel or rooms? Reply and we will answer today."),
      ].join("\n"),
    }),
  };
}

export const SHOWCASE_2027_ISSUES: ShowcaseIssue[] = [issue1(), issue2(), issue3(), issue4(), issue5(), issue6(), issue7()];
