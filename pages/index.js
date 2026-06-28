import React, { useState, useEffect, useMemo } from "react";
import Head from "next/head";

/*
  Sun & Fun am Kaiserwasser — Event-Seite + Anmeldung + Admin
  Version 2: klar & modern, viel Weiß, drei dezente Farbvarianten (A/B/C)
  Admin-Passwort: 3246
*/

const ADMIN_PW = "3246";

const SPORTS = [
  { id: "tennis", label: "Tennis", counter: true },
  { id: "beach", label: "Beachvolleyball", counter: true },
  { id: "sup", label: "Stand-Up Paddle", counter: true },
  { id: "tretboot", label: "Tretboot", counter: true },
  { id: "fussball", label: "Fußballturnier (ab 12 Anmeldungen)", counter: true },
  { id: "baden", label: "Schwimmen / Liegewiese / einfach genießen", counter: false },
];
const COUNTED_SPORTS = SPORTS.filter((s) => s.counter);

function sportSummary(r) {
  const parts = [];
  const sc = r.sportCounts || {};
  COUNTED_SPORTS.forEach((s) => {
    const n = Number(sc[s.id]) || 0;
    if (n > 0) parts.push(`${s.label.replace(" (ab 12 Anmeldungen)", "")} ${n}`);
  });
  if (r.baden) parts.push("Liegewiese");
  return parts.join(", ") || "–";
}

const ARRIVAL = [
  { id: "ab13", label: "Ab 13:00 — Sun & Fun" },
  { id: "ab17", label: "Ab 17:00 — Aperitif" },
  { id: "abends", label: "Nur abends" },
];

const TRAVEL = [
  { id: "auto", label: "Mit dem Auto" },
  { id: "oeffi", label: "Öffentliche Verkehrsmittel" },
  { id: "moedling", label: "Aus Richtung Mödling (für Mitfahr-Koordination)" },
];

function staySummary(r) {
  if (r.attending !== "yes") return "–";
  return r.stay === "yes" ? "Ja" : "Nein";
}

const DEFAULT_SETTINGS = {
  spotify: "",
  fotoVorher: "",
  fotoTag: "",
  arcotelLink:
    "mailto:reservation.kaiserwasser@arcotel.com?subject=Zimmeranfrage%20Sun%20%26%20Fun%2029.08.2026%20(UNICREDITGROUP)",
  moedlingReserveLink:
    "mailto:office@city-hotel.cc?subject=Zimmerreservierung%20Sun%20und%20Fun%2029.08.2026",
};

// ---------- API-Hilfsfunktionen (ersetzen window.storage) ----------
async function apiGetSettings() {
  try {
    const r = await fetch("/api/settings");
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function apiSaveSettings(value) {
  try {
    const r = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function apiGetRegistrations() {
  try {
    const r = await fetch("/api/registrations");
    if (!r.ok) return [];
    return await r.json();
  } catch {
    return [];
  }
}

async function apiSaveRegistration(record) {
  try {
    const r = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function apiDeleteRegistration(id) {
  try {
    const r = await fetch("/api/registrations?id=" + encodeURIComponent(id), {
      method: "DELETE",
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function loadSportCounts() {
  const regs = await apiGetRegistrations();
  const counts = {};
  regs.forEach((r) => {
    if (r.attending === "yes") {
      const sc = r.sportCounts || {};
      Object.keys(sc).forEach((id) => (counts[id] = (counts[id] || 0) + (Number(sc[id]) || 0)));
    }
  });
  return counts;
}

export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [view, setView] = useState("info");
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState("dark");

  useEffect(() => {
    (async () => {
      const s = await apiGetSettings();
      if (s) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...s });
        } catch {}
      }
      setLoaded(true);
    })();
  }, []);

  return (
    <>
      <Head>
        <title>Sun &amp; Fun am Kaiserwasser · 29. August 2026</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="kw-root" data-theme="a" data-mode={mode}>
        <style>{CSS}</style>
        <ThemeSwitcher mode={mode} setMode={setMode} />
        {view === "info" && (
          <InfoPage settings={settings} onAdmin={() => setView("admin")} loaded={loaded} />
        )}
        {view === "admin" && (
          <AdminPage settings={settings} setSettings={setSettings} onBack={() => setView("info")} />
        )}
      </div>
    </>
  );
}

function ThemeSwitcher({ mode, setMode }) {
  return (
    <div className="theme-switch">
      <button
        className="mode-toggle"
        onClick={() => setMode(mode === "dark" ? "light" : "dark")}
        title={mode === "dark" ? "Heller Modus" : "Dunkler Modus"}
        aria-label="Zwischen hellem und dunklem Modus umschalten"
      >
        {mode === "dark" ? "☀" : "☾"}
      </button>
    </div>
  );
}

// =====================================================
//  INFO PAGE
// =====================================================
function InfoPage({ settings, onAdmin, loaded }) {
  const [sportCounts, setSportCounts] = useState({});
  const reloadCounts = async () => setSportCounts(await loadSportCounts());
  useEffect(() => {
    reloadCounts();
  }, []);

  return (
    <div className="page">
      <Hero />
      <main className="container">
        <QuickFacts />
        <Section eyebrow="Der Tag" title="So läuft der Tag ab">
          <Timeline />
        </Section>
        <Section eyebrow="Aktiv sein" title="Sport & Wasser">
          <p className="lead">
            Die ganze Anlage steht uns offen — Wasser, Beach, Tennis und
            Fußball. Was du nutzen möchtest, gibst du bei der Anmeldung an,
            damit ich alles reservieren kann.
          </p>
          <div className="chips">
            {SPORTS.map((s) => {
              const base = s.label.replace(" (ab 12 Anmeldungen)", "");
              const n = sportCounts[s.id] || 0;
              return (
                <span className="chip" key={s.id}>
                  {base}
                  {s.counter && (
                    <span className="chip-count">{s.id === "fussball" ? `${n}/12` : n}</span>
                  )}
                </span>
              );
            })}
          </div>
          <p className="note">
            Das Fußballturnier findet ab 12 Mitspielern statt — die Zahl am
            Button zeigt, wie viele schon dabei sind.
          </p>
        </Section>
        <Section eyebrow="Für den Tag" title="Was du mitbringen solltest">
          <div className="bring">
            {["Badesachen", "Handtuch", "Sportkleidung", "Sportschuhe", "Sonnencreme"].map((b) => (
              <div className="bring-item" key={b}>{b}</div>
            ))}
          </div>
        </Section>
        <Section eyebrow="Hinkommen" title="Anreise">
          <div className="cards">
            <div className="card">
              <h4>Öffentlich</h4>
              <p>U1 bis Station <strong>Alte Donau</strong>, dann ca. 5 Minuten zu Fuß zur Anlage.</p>
            </div>
            <div className="card">
              <h4>Mit dem Auto</h4>
              <p>Tiefgarage direkt am UniCredit Center (kostenpflichtig, nur begrenzt Plätze).</p>
              <p className="navi">Fürs Navi: <strong>Eiswerkstraße 20, 1220 Wien</strong></p>
            </div>
          </div>
        </Section>
        <Section eyebrow="Statt Geschenk" title="Zeit & gemeinsame Erlebnisse">
          <div className="gift">
            <p>
              Das größte Geschenk seid ihr — eure Anwesenheit und gemeinsame
              Erlebnisse. Wer trotzdem etwas mitbringen möchte: ein Gutschein für
              eine gemeinsame Aktion (Wandern, Brunch, Konzert, ein Bier nach
              Feierabend).
            </p>
          </div>
        </Section>
        <Section eyebrow="Mitmachen" title="Musik & Fotos">
          <div className="cards">
            <LinkCard
              title="Spotify-Playlist"
              desc="Füg deine Lieblingssongs hinzu — ich spiele sie am Fest."
              url={settings.spotify}
              cta="Playlist öffnen"
            />
            <LinkCard
              title="Erinnerungsfotos vorab"
              desc="Lade alte Fotos hoch, die ich am Tag zeige."
              url={settings.fotoVorher}
              cta="Fotos hochladen"
            />
            <LinkCard
              title="Fotos vom Fest"
              desc="Mach am Tag Fotos und lade sie hier hoch."
              url={settings.fotoTag}
              cta="Fotos teilen"
            />
          </div>
        </Section>
        <Section eyebrow="Bist du dabei?" title="Jetzt anmelden">
          <RegistrationForm loaded={loaded} settings={settings} onSubmitted={reloadCounts} />
        </Section>
      </main>
      <footer className="footer">
        <div className="footer-info">
          <span>Sun &amp; Fun am Kaiserwasser · 29. August 2026</span>
          <span className="footer-contact">
            Fragen? Christian: <a href="tel:+436648121762">+43 664 8121762</a>
          </span>
        </div>
        <button className="admin-link" onClick={onAdmin}>Administrator</button>
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <header className="hero">
      <div className="hero-orb" aria-hidden="true" />
      <div className="hero-content">
        <p className="hero-eyebrow">Lasst uns gemeinsam feiern</p>
        <h1 className="hero-title">
          Sun <span>&amp;</span> Fun
          <br />
          am Kaiserwasser
        </h1>
        <p className="hero-meta">Samstag, 29. August 2026 · ab 13:00 Uhr</p>
        <p className="hero-loc">UniCredit Center Am Kaiserwasser, Wien</p>
        <button className="hero-cta" onClick={scrollToForm}>Anmelden</button>
      </div>
      <svg className="hero-line" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path className="line-wave" d="M0,60 C240,100 480,20 720,60 C960,100 1200,20 1440,60" fill="none" />
      </svg>
    </header>
  );
}

function scrollToForm() {
  const els = document.querySelectorAll(".section");
  const last = els[els.length - 1];
  if (last) last.scrollIntoView({ behavior: "smooth" });
}

function QuickFacts() {
  const facts = [
    { k: "Wann", v: "Sa, 29. August 2026", s: "ab 13:00 Uhr" },
    { k: "Wo", v: "Am Kaiserwasser", s: "Eiswerkstraße 20, 1220 Wien" },
    { k: "Was", v: "Chillen, Sport und Grillen", s: "den ganzen Tag am Wasser" },
  ];
  return (
    <div className="facts">
      {facts.map((f) => (
        <div className="fact" key={f.k}>
          <span className="fact-k">{f.k}</span>
          <span className="fact-v">{f.v}</span>
          <span className="fact-s">{f.s}</span>
        </div>
      ))}
    </div>
  );
}

function Timeline() {
  const items = [
    { t: "13:00", h: "Sun & Fun", d: "Chillen, Beachvolley, Stand-Up Paddle, Tennis etc." },
    { t: "17:00", h: "Aperitif", d: "Anstoßen auf der Terrasse." },
    { t: "17:30", h: "Grillbuffet", d: "Frisch vom Griller." },
    { t: "ab 20:00", h: "Party", d: "Musik, tanzen, ausklingen." },
  ];
  return (
    <ol className="timeline">
      {items.map((it) => (
        <li className="tl-item" key={it.t}>
          <span className="tl-time">{it.t}</span>
          <div className="tl-body">
            <h4>{it.h}</h4>
            <p>{it.d}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Section({ eyebrow, title, children }) {
  return (
    <section className="section">
      <div className="section-head">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}

function LinkCard({ title, desc, url, cta }) {
  const active = url && url.trim().length > 0;
  return (
    <div className="card linkcard">
      <h4>{title}</h4>
      <p>{desc}</p>
      {active ? (
        <a className="btn btn-accent" href={url} target="_blank" rel="noreferrer">{cta}</a>
      ) : (
        <span className="btn btn-ghost" aria-disabled="true">Link folgt</span>
      )}
    </div>
  );
}

function BookLink({ url, label }) {
  if (!url || !url.trim()) return null;
  const isMail = url.trim().toLowerCase().startsWith("mailto:");
  const extra = isMail ? {} : { target: "_blank", rel: "noreferrer" };
  return (
    <a className="btn btn-accent hotel-book" href={url} {...extra}>{label}</a>
  );
}

function HotelOptions({ settings }) {
  return (
    <div className="hotels">
      <p className="lead">Zwei Empfehlungen zum Übernachten:</p>
      <div className="cards">
        <div className="card hotel">
          <h4>ARCOTEL Kaiserwasser</h4>
          <p className="hotel-sub">Direkt neben der Anlage</p>
          <ul className="prices">
            <li><span>Einzelzimmer</span><span>€ 120,– / Nacht</span></li>
            <li><span>Doppelzimmer</span><span>€ 140,– / Nacht</span></li>
            <li><span>Suite</span><span>€ 178,– / Nacht</span></li>
          </ul>
          <p className="note">
            Preise pro Zimmer, inkl. Frühstück (Suite für 2 Erw. + 2 Kinder).
            Buchung selbst mit Stichwort <strong>UNICREDITGROUP</strong> —
            spätestens 21 Tage vor Anreise.
          </p>
          <BookLink url={settings.arcotelLink} label="Zimmer reservieren" />
        </div>
        <div className="card hotel">
          <h4>City Hotel Mödling</h4>
          <p className="hotel-sub">Alternative Möglichkeit</p>
          <ul className="prices">
            <li><span>Einzelzimmer</span><span>€ 100,– / Nacht</span></li>
            <li><span>Doppelzimmer</span><span>€ 120,– / Nacht</span></li>
          </ul>
          <p className="note">Hier kannst du direkt reservieren:</p>
          <BookLink url={settings.moedlingReserveLink} label="Zimmer reservieren" />
        </div>
      </div>
    </div>
  );
}

// =====================================================
//  REGISTRATION FORM
// =====================================================
const EMPTY_FORM = {
  attending: "",
  nachname: "",
  vorname: "",
  partner: "",
  kids: 0,
  arrival: "",
  sportCounts: { tennis: 0, beach: 0, sup: 0, tretboot: 0, fussball: 0 },
  baden: false,
  travel: "",
  stay: "",
  message: "",
};

function RegistrationForm({ loaded, settings, onSubmitted }) {
  const [f, setF] = useState(EMPTY_FORM);
  const [status, setStatus] = useState("idle");
  const [errors, setErrors] = useState({});

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setSportCount = (id, val) =>
    setF((p) => ({ ...p, sportCounts: { ...p.sportCounts, [id]: Math.max(0, val) } }));

  function validate() {
    const e = {};
    if (!f.attending) e.attending = "Bitte wähle aus.";
    if (!f.nachname.trim()) e.nachname = "Bitte gib deinen Nachnamen an.";
    if (!f.vorname.trim()) e.vorname = "Bitte gib deinen Vornamen an.";
    if (f.attending === "yes") {
      if (!f.arrival) e.arrival = "Wann kommst du?";
      if (!f.travel) e.travel = "Wie reist du an?";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setStatus("saving");
    const id = "reg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    const record = {
      id,
      ts: new Date().toISOString(),
      attending: f.attending,
      nachname: f.nachname.trim(),
      vorname: f.vorname.trim(),
      partner: f.attending === "yes" ? f.partner === "yes" : false,
      kids: f.attending === "yes" ? Number(f.kids) || 0 : 0,
      arrival: f.attending === "yes" ? f.arrival : "",
      sportCounts: f.attending === "yes" ? f.sportCounts : {},
      baden: f.attending === "yes" ? f.baden : false,
      travel: f.attending === "yes" ? f.travel : "",
      stay: f.attending === "yes" ? f.stay : "",
      message: f.message.trim(),
    };
    const ok = await apiSaveRegistration(record);
    if (ok && onSubmitted) onSubmitted();
    setStatus(ok ? "done" : "error");
  }

  if (status === "done") {
    return (
      <div className="thanks">
        <div className="thanks-mark">✓</div>
        <h3>{f.attending === "yes" ? "Du bist dabei!" : "Schade, aber danke fürs Bescheidsagen."}</h3>
        <p>
          {f.attending === "yes"
            ? "Deine Anmeldung ist eingegangen. Ich freue mich auf dich!"
            : "Deine Rückmeldung ist gespeichert."}
        </p>
        {f.attending === "yes" && f.stay === "yes" && (
          <div className="thanks-hotels">
            <h4 className="thanks-hotels-title">Übernachtung — wähle dein Hotel</h4>
            <HotelOptions settings={settings} />
          </div>
        )}
        <button className="btn btn-ghost" onClick={() => { setF(EMPTY_FORM); setStatus("idle"); }}>
          Weitere Anmeldung
        </button>
      </div>
    );
  }

  return (
    <div className="form" id="anmelden">
      <Field label="Kommst du?" error={errors.attending} required>
        <div className="seg">
          <button type="button" className={"seg-btn " + (f.attending === "yes" ? "on" : "")} onClick={() => set("attending", "yes")}>
            Ja, ich bin dabei!
          </button>
          <button type="button" className={"seg-btn " + (f.attending === "no" ? "on" : "")} onClick={() => set("attending", "no")}>
            Leider nein
          </button>
        </div>
      </Field>
      <div className="grid2">
        <Field label="Nachname" error={errors.nachname} required>
          <input className="inp" value={f.nachname} onChange={(e) => set("nachname", e.target.value)} placeholder="Nachname" />
        </Field>
        <Field label="Vorname" error={errors.vorname} required>
          <input className="inp" value={f.vorname} onChange={(e) => set("vorname", e.target.value)} placeholder="Vorname" />
        </Field>
      </div>
      {f.attending && (
        <>
          {f.attending === "yes" && (
            <>
              <div className="grid2">
                <Field label="Partner/in dabei?">
                  <div className="seg">
                    <button type="button" className={"seg-btn " + (f.partner === "yes" ? "on" : "")} onClick={() => set("partner", "yes")}>Ja</button>
                    <button type="button" className={"seg-btn " + (f.partner === "no" ? "on" : "")} onClick={() => set("partner", "no")}>Nein</button>
                  </div>
                </Field>
                <Field label="Anzahl Kinder (bis 14 Jahre)">
                  <div className="stepper">
                    <button type="button" onClick={() => set("kids", Math.max(0, Number(f.kids) - 1))}>−</button>
                    <span>{f.kids}</span>
                    <button type="button" onClick={() => set("kids", Number(f.kids) + 1)}>+</button>
                  </div>
                </Field>
              </div>
              <Field label="Wann kommst du?" error={errors.arrival} required>
                <div className="opts">
                  {ARRIVAL.map((a) => (
                    <label key={a.id} className={"opt " + (f.arrival === a.id ? "on" : "")}>
                      <input type="radio" name="arrival" checked={f.arrival === a.id} onChange={() => set("arrival", a.id)} />
                      {a.label}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Wer macht welchen Sport mit?" hint="Anzahl Personen aus eurer Gruppe (inkl. dir, Partner, Kindern)">
                <div className="sportcounts">
                  {COUNTED_SPORTS.map((s) => (
                    <div className="sportcount-row" key={s.id}>
                      <span className="sportcount-label">{s.label.replace(" (ab 12 Anmeldungen)", "")}</span>
                      <div className="stepper stepper-sm">
                        <button type="button" onClick={() => setSportCount(s.id, (f.sportCounts[s.id] || 0) - 1)}>−</button>
                        <span>{f.sportCounts[s.id] || 0}</span>
                        <button type="button" onClick={() => setSportCount(s.id, (f.sportCounts[s.id] || 0) + 1)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </Field>
              <Field label="Einfach nur entspannen?">
                <label className={"opt " + (f.baden ? "on" : "")}>
                  <input type="checkbox" checked={f.baden} onChange={() => set("baden", !f.baden)} />
                  Schwimmen / Liegewiese / einfach genießen
                </label>
              </Field>
              <Field label="Wie reist du an?" error={errors.travel} required>
                <div className="opts">
                  {TRAVEL.map((t) => (
                    <label key={t.id} className={"opt " + (f.travel === t.id ? "on" : "")}>
                      <input type="radio" name="travel" checked={f.travel === t.id} onChange={() => set("travel", t.id)} />
                      {t.label}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Brauchst du eine Übernachtungsmöglichkeit?">
                <div className="seg">
                  <button type="button" className={"seg-btn " + (f.stay === "yes" ? "on" : "")} onClick={() => set("stay", "yes")}>Ja</button>
                  <button type="button" className={"seg-btn " + (f.stay === "no" ? "on" : "")} onClick={() => set("stay", "no")}>Nein</button>
                </div>
              </Field>
            </>
          )}
          <Field label={f.attending === "no" ? "Eine Nachricht (optional)" : "Noch etwas? (optional)"}>
            <textarea
              className="inp"
              rows={3}
              value={f.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder={f.attending === "no" ? "Liebe Grüße…" : "Anmerkungen…"}
            />
          </Field>
          {status === "error" && <p className="form-error">Das Speichern hat nicht geklappt. Bitte versuch es nochmal.</p>}
          <button className="btn btn-primary big" onClick={submit} disabled={status === "saving" || !loaded}>
            {status === "saving" ? "Wird gesendet…" : "Anmeldung absenden"}
          </button>
          <p className="privacy">Deine Angaben werden nur für die Organisation der Feier verwendet.</p>
        </>
      )}
    </div>
  );
}

function Field({ label, hint, error, required, children }) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {required && <span className="req"> *</span>}
        {hint && <span className="field-hint"> · {hint}</span>}
      </label>
      {children}
      {error && <span className="field-err">{error}</span>}
    </div>
  );
}

// =====================================================
//  ADMIN
// =====================================================
function AdminPage({ settings, setSettings, onBack }) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);

  if (!authed) {
    return (
      <div className="admin-gate">
        <div className="gate-box">
          <h2>Administrator</h2>
          <p>Bitte Passwort eingeben.</p>
          <input
            className="inp"
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setPwErr(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { if (pw === ADMIN_PW) setAuthed(true); else setPwErr(true); } }}
            placeholder="Passwort"
          />
          {pwErr && <span className="field-err">Falsches Passwort.</span>}
          <div className="gate-actions">
            <button className="btn btn-ghost" onClick={onBack}>Zurück</button>
            <button className="btn btn-primary" onClick={() => (pw === ADMIN_PW ? setAuthed(true) : setPwErr(true))}>Öffnen</button>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard settings={settings} setSettings={setSettings} onBack={onBack} />;
}

function AdminDashboard({ settings, setSettings, onBack }) {
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("anmeldungen");
  const [sortKey, setSortKey] = useState("nachname");
  const [sortDir, setSortDir] = useState("asc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const out = await apiGetRegistrations();
    setRegs(out);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function removeReg(id) {
    if (!window.confirm("Diese Anmeldung wirklich löschen?")) return;
    await apiDeleteRegistration(id);
    setRegs((p) => p.filter((r) => r.id !== id));
  }

  const yes = regs.filter((r) => r.attending === "yes");
  const no = regs.filter((r) => r.attending === "no");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = regs.filter((r) => {
      if (filterStatus === "yes" && r.attending !== "yes") return false;
      if (filterStatus === "no" && r.attending !== "no") return false;
      if (q) {
        const name = ((r.nachname || "") + " " + (r.vorname || "")).toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
    const val = (r) => {
      switch (sortKey) {
        case "nachname": return (r.nachname || "").toLowerCase();
        case "vorname": return (r.vorname || "").toLowerCase();
        case "status": return r.attending || "";
        case "arrival": return r.arrival || "";
        case "stay": return r.stay || "";
        case "ts": return r.ts || "";
        default: return "";
      }
    };
    return [...filtered].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [regs, sortKey, sortDir, filterStatus, search]);

  const stats = useMemo(() => {
    const adults = yes.reduce((sum, r) => sum + 1 + (r.partner ? 1 : 0), 0);
    const children = yes.reduce((sum, r) => sum + (Number(r.kids) || 0), 0);
    const totalPeople = adults + children;
    const perSport = {};
    SPORTS.forEach((s) => (perSport[s.id] = 0));
    yes.forEach((r) => {
      const sc = r.sportCounts || {};
      COUNTED_SPORTS.forEach((s) => (perSport[s.id] += Number(sc[s.id]) || 0));
      if (r.baden) perSport["baden"] += 1;
    });
    const perArrival = {};
    ARRIVAL.forEach((a) => (perArrival[a.id] = 0));
    yes.forEach((r) => { if (r.arrival) perArrival[r.arrival] = (perArrival[r.arrival] || 0) + 1; });
    return { totalPeople, adults, children, perSport, perArrival };
  }, [regs]);

  function exportCSV() {
    const head = ["Nachname", "Vorname", "Status", "Partner", "Kinder", "Ankunft", "Sport", "Anreise", "Übernachtung", "Nachricht", "Zeitpunkt"];
    const rows = shown.map((r) => [
      r.nachname || "",
      r.vorname || "",
      r.attending === "yes" ? "Zusage" : "Absage",
      r.partner ? "ja" : "nein",
      r.kids || 0,
      ARRIVAL.find((a) => a.id === r.arrival)?.label || "",
      sportSummary(r),
      TRAVEL.find((t) => t.id === r.travel)?.label || "",
      staySummary(r),
      (r.message || "").replace(/\n/g, " "),
      new Date(r.ts).toLocaleString("de-AT"),
    ]);
    const csv = [head, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "anmeldungen_kaiserwasser.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="admin">
      <div className="admin-top">
        <h2>Administrator</h2>
        <button className="btn btn-ghost" onClick={onBack}>Zur Event-Seite</button>
      </div>
      <div className="admin-tabs">
        <button className={tab === "anmeldungen" ? "on" : ""} onClick={() => setTab("anmeldungen")}>Anmeldungen</button>
        <button className={tab === "einstellungen" ? "on" : ""} onClick={() => setTab("einstellungen")}>Einstellungen</button>
      </div>
      {tab === "anmeldungen" && (
        <>
          <div className="stat-grid">
            <Stat big label="Personen gesamt" value={stats.totalPeople} sub="Erwachsene + Kinder" />
            <Stat label="Erwachsene" value={stats.adults} sub="inkl. Partner" />
            <Stat label="Kinder" value={stats.children} sub="bis 14 Jahre" />
          </div>
          <div className="stat-grid stat-grid-2">
            <Stat label="Zusagen" value={yes.length} />
            <Stat label="Absagen" value={no.length} />
          </div>
          <div className="stat-cols">
            <div className="stat-col">
              <h4>Nach Ankunftszeit</h4>
              {ARRIVAL.map((a) => (
                <div className="bar-row" key={a.id}>
                  <span>{a.label.split(" — ")[0]}</span>
                  <strong>{stats.perArrival[a.id] || 0}</strong>
                </div>
              ))}
            </div>
            <div className="stat-col">
              <h4>Nach Sport</h4>
              {SPORTS.map((s) => (
                <div className="bar-row" key={s.id}>
                  <span>{s.label.replace(" (ab 12 Anmeldungen)", "")}</span>
                  <strong>{stats.perSport[s.id] || 0}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="admin-actions">
            <button className="btn btn-accent" onClick={exportCSV} disabled={shown.length === 0}>Als Excel/CSV exportieren</button>
            <button className="btn btn-ghost" onClick={load}>Aktualisieren</button>
          </div>
          {regs.length > 0 && (
            <div className="admin-filters">
              <input className="inp" placeholder="Name suchen…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="inp" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Alle anzeigen</option>
                <option value="yes">Nur Zusagen</option>
                <option value="no">Nur Absagen</option>
              </select>
              <select className="inp" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                <option value="nachname">Sortieren: Nachname</option>
                <option value="vorname">Sortieren: Vorname</option>
                <option value="status">Sortieren: Status</option>
                <option value="arrival">Sortieren: Ankunft</option>
                <option value="stay">Sortieren: Übernachtung</option>
                <option value="ts">Sortieren: Zeitpunkt</option>
              </select>
              <button className="btn btn-ghost sortdir" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} title={sortDir === "asc" ? "Aufsteigend" : "Absteigend"}>
                {sortDir === "asc" ? "↑ A–Z" : "↓ Z–A"}
              </button>
            </div>
          )}
          {loading ? (
            <p className="muted">Lädt…</p>
          ) : regs.length === 0 ? (
            <div className="empty">Noch keine Anmeldungen. Sobald sich jemand anmeldet, erscheint es hier.</div>
          ) : shown.length === 0 ? (
            <div className="empty">Keine Treffer für deine Suche/deinen Filter.</div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Nachname</th><th>Vorname</th><th>Status</th><th>Begl.</th>
                    <th>Ankunft</th><th>Sport</th><th>Anreise</th><th>Übernachtung</th><th>Nachricht</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id} className={r.attending === "no" ? "row-no" : ""}>
                      <td data-l="Nachname"><strong>{r.nachname || "–"}</strong></td>
                      <td data-l="Vorname">{r.vorname || "–"}</td>
                      <td data-l="Status">
                        <span className={"tag " + (r.attending === "yes" ? "tag-yes" : "tag-no")}>
                          {r.attending === "yes" ? "Zusage" : "Absage"}
                        </span>
                      </td>
                      <td data-l="Begleitung">
                        {r.attending === "yes"
                          ? `${r.partner ? "+Partner " : ""}${r.kids ? "+" + r.kids + " Kind(er)" : ""}` || "–"
                          : "–"}
                      </td>
                      <td data-l="Ankunft">{ARRIVAL.find((a) => a.id === r.arrival)?.label.split(" — ")[0] || "–"}</td>
                      <td data-l="Sport">{sportSummary(r)}</td>
                      <td data-l="Anreise">{TRAVEL.find((t) => t.id === r.travel)?.label.split(" (")[0] || "–"}</td>
                      <td data-l="Übernachtung">{staySummary(r)}</td>
                      <td data-l="Nachricht">{r.message ? r.message : "–"}</td>
                      <td data-l=""><button className="del" onClick={() => removeReg(r.id)} title="Löschen">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {tab === "einstellungen" && <SettingsPanel settings={settings} setSettings={setSettings} />}
    </div>
  );
}

function Stat({ label, value, sub, big }) {
  return (
    <div className={"stat " + (big ? "stat-big" : "")}>
      <span className="stat-val">{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

function SettingsPanel({ settings, setSettings }) {
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(settings), [settings]);

  const set = (k, v) => { setDraft((p) => ({ ...p, [k]: v })); setSaved(false); };

  async function save() {
    await apiSaveSettings(draft);
    setSettings(draft);
    setSaved(true);
  }

  return (
    <div className="settings">
      <p className="muted">
        Hier trägst du die Links und Texte ein, die auf der Event-Seite erscheinen. Einfach einfügen und
        speichern — die Seite zeigt sie dann automatisch an.
      </p>
      <Field label="Spotify-Playlist (Link)">
        <input className="inp" value={draft.spotify} onChange={(e) => set("spotify", e.target.value)} placeholder="https://open.spotify.com/…" />
      </Field>
      <Field label="Foto-Link „Erinnerungsfotos vorab"">
        <input className="inp" value={draft.fotoVorher} onChange={(e) => set("fotoVorher", e.target.value)} placeholder="https://photos.app.goo.gl/…" />
      </Field>
      <Field label="Foto-Link „Fotos vom Fest"">
        <input className="inp" value={draft.fotoTag} onChange={(e) => set("fotoTag", e.target.value)} placeholder="https://photos.app.goo.gl/…" />
      </Field>
      <Field label="ARCOTEL — Buchungslink" hint="vorausgefüllt: E-Mail ans Reservierungsteam">
        <input className="inp" value={draft.arcotelLink} onChange={(e) => set("arcotelLink", e.target.value)} placeholder="mailto:… oder https://…" />
      </Field>
      <Field label="City Hotel Mödling — Reservierungskontakt" hint="vorausgefüllt: E-Mail ans Hotel">
        <input className="inp" value={draft.moedlingReserveLink} onChange={(e) => set("moedlingReserveLink", e.target.value)} placeholder="mailto:… oder https://…" />
      </Field>
      <button className="btn btn-primary" onClick={save}>Speichern</button>
      {saved && <span className="saved-note">Gespeichert ✓</span>}
    </div>
  );
}

// =====================================================
//  STYLES
// =====================================================
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600&display=swap');

.kw-root{
  --font-d:'Bricolage Grotesque',system-ui,sans-serif;
  --font-b:'Inter',system-ui,sans-serif;
  font-family:var(--font-b);
  -webkit-font-smoothing:antialiased;
}
.kw-root *{box-sizing:border-box}

/* ---------- THEME A: Seeglas (kühles Teal) ---------- */
.kw-root[data-theme="a"]{
  --bg:#ffffff;
  --bg-soft:#f6f9f9;
  --surface:#ffffff;
  --tint:#eef5f5;
  --ink:#15252b;
  --muted:#637377;
  --line:#e7ecec;
  --line-2:#dfe6e6;
  --accent:#127c84;
  --accent-deep:#0d5c63;
  --on-accent:#ffffff;
}
/* ---------- THEME B: Sonnengruß (warmes Amber) ---------- */
.kw-root[data-theme="b"]{
  --bg:#ffffff;
  --bg-soft:#faf8f3;
  --surface:#ffffff;
  --tint:#f7f0e3;
  --ink:#231d15;
  --muted:#766e62;
  --line:#ece6db;
  --line-2:#e3dccd;
  --accent:#c8821f;
  --accent-deep:#a66912;
  --on-accent:#2a2007;
}
/* ---------- THEME C: Abendsteg (Navy + Koralle) ---------- */
.kw-root[data-theme="c"]{
  --bg:#ffffff;
  --bg-soft:#f7f8fa;
  --surface:#ffffff;
  --tint:#eef1f6;
  --ink:#16223a;
  --muted:#5f6b80;
  --line:#e6e9ef;
  --line-2:#dce0e9;
  --accent:#e15a40;
  --accent-deep:#c5462f;
  --on-accent:#ffffff;
}

/* ---------- DARK MODE ---------- */
.kw-root[data-mode="dark"]{
  --bg:#0e1316;
  --bg-soft:#151c20;
  --surface:#1a2329;
  --ink:#eef3f4;
  --muted:#9aa8ae;
  --line:#252e34;
  --line-2:#333e45;
  --tint:color-mix(in srgb, var(--accent) 24%, #1a2329);
  --on-accent:#0e1316;
}
.kw-root[data-mode="dark"][data-theme="a"]{--accent:#34bcc6;--accent-deep:#28a3ac}
.kw-root[data-mode="dark"][data-theme="b"]{--accent:#e8aa44;--accent-deep:#d0922f}
.kw-root[data-mode="dark"][data-theme="c"]{--accent:#f27a60;--accent-deep:#dd6147}

.kw-root{color:var(--ink);background:var(--bg);min-height:100vh;overflow-x:hidden}
.page{background:var(--bg);min-height:100vh}

/* THEME SWITCH */
.theme-switch{position:fixed;top:14px;right:14px;z-index:50;display:flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--line-2);border-radius:999px;padding:7px 10px;box-shadow:0 6px 20px rgba(10,16,20,.16)}
.mode-toggle{width:26px;height:26px;border-radius:50%;border:1px solid var(--line-2);background:var(--bg-soft);color:var(--ink);cursor:pointer;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;transition:border-color .15s ease,transform .15s ease}
.mode-toggle:hover{border-color:var(--ink);transform:scale(1.08)}

/* HERO */
.hero{position:relative;background:var(--bg);padding:120px 22px 70px;text-align:center;overflow:hidden}
.hero-orb{position:absolute;top:-120px;left:50%;transform:translateX(-50%);width:520px;height:520px;border-radius:50%;background:radial-gradient(circle at 50% 50%, var(--tint), transparent 68%);pointer-events:none}
.hero-content{position:relative;z-index:2;max-width:760px;margin:0 auto}
.hero-eyebrow{font-weight:600;letter-spacing:.16em;text-transform:uppercase;font-size:12px;color:var(--accent);margin:0 0 18px}
.hero-title{font-family:var(--font-d);font-weight:800;font-size:clamp(46px,9vw,104px);line-height:.92;letter-spacing:-.02em;margin:0;color:var(--ink)}
.hero-title span{color:var(--accent)}
.hero-meta{font-family:var(--font-d);font-weight:600;font-size:clamp(17px,2.4vw,21px);margin:26px 0 4px;color:var(--ink)}
.hero-loc{font-size:15px;color:var(--muted);margin:0 0 30px}
.hero-cta{display:inline-block;background:var(--accent);color:var(--on-accent);border:none;cursor:pointer;font-family:var(--font-d);font-weight:600;font-size:16px;padding:15px 42px;border-radius:999px;transition:transform .15s ease,background .15s ease}
.hero-cta:hover{transform:translateY(-2px);background:var(--accent-deep)}
.hero-line{position:absolute;left:0;bottom:0;width:100%;height:80px;opacity:.5}
.line-wave{stroke:var(--accent);stroke-width:2;animation:drift 12s ease-in-out infinite alternate}
@keyframes drift{from{transform:translateX(-24px)}to{transform:translateX(24px)}}

/* LAYOUT */
.container{max-width:880px;margin:0 auto;padding:0 22px}
.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:34px 0 6px}
.fact{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px 18px;display:flex;flex-direction:column;gap:3px}
.fact-k{font-weight:600;text-transform:uppercase;letter-spacing:.1em;font-size:11px;color:var(--accent)}
.fact-v{font-family:var(--font-d);font-weight:700;font-size:18px;line-height:1.15}
.fact-s{font-size:13px;color:var(--muted)}

.section{padding:46px 0;border-bottom:1px solid var(--line)}
.section:last-child{border-bottom:none}
.section-head{margin-bottom:22px}
.eyebrow{font-weight:600;text-transform:uppercase;letter-spacing:.14em;font-size:12px;color:var(--accent)}
.section-head h2{font-family:var(--font-d);font-weight:800;font-size:clamp(26px,5vw,38px);margin:6px 0 0;line-height:1.05;letter-spacing:-.01em}
.lead{font-size:17px;line-height:1.55;margin:0 0 18px;max-width:60ch}
.note{font-size:14px;color:var(--muted);margin:12px 0 0}
.note a{color:var(--accent);text-decoration:none;font-weight:600;word-break:break-word}
.note a:hover{text-decoration:underline}

/* TIMELINE */
.timeline{list-style:none;margin:0;padding:0}
.tl-item{display:grid;grid-template-columns:96px 1fr;gap:18px;padding:16px 0;border-bottom:1px solid var(--line)}
.tl-item:last-child{border-bottom:none}
.tl-time{font-family:var(--font-d);font-weight:800;font-size:18px;color:var(--accent);padding-top:2px}
.tl-body h4{font-family:var(--font-d);font-weight:700;font-size:18px;margin:0 0 3px}
.tl-body p{margin:0;color:var(--muted);font-size:15px}

/* CHIPS / BRING */
.chips{display:flex;flex-wrap:wrap;gap:10px}
.chip{display:inline-flex;align-items:center;background:var(--bg-soft);border:1px solid var(--line);border-radius:999px;padding:9px 16px;font-weight:500;font-size:15px}
.chip-count{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:20px;padding:0 7px;margin-left:9px;border-radius:999px;background:var(--accent);color:var(--on-accent);font-size:12px;font-weight:700;line-height:1}
.bring{display:flex;flex-wrap:wrap;gap:10px}
.bring-item{background:var(--bg-soft);border:1px solid var(--line);border-radius:12px;padding:12px 18px;font-weight:500;font-size:15px}

/* CARDS */
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:22px}
.card h4{font-family:var(--font-d);font-weight:700;font-size:19px;margin:0 0 8px}
.card p{margin:0 0 8px;font-size:15px;line-height:1.5}
.card .navi{color:var(--muted);font-size:14px}
.hotel-sub{color:var(--accent)!important;font-weight:600;font-size:14px!important}
.hotel-book{margin-top:12px}
.prices{list-style:none;margin:10px 0;padding:0}
.prices li{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line);font-size:15px}
.prices li:last-child{border-bottom:none}
.prices span:last-child{font-family:var(--font-d);font-weight:700}
.gift{background:var(--bg-soft);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:14px;padding:24px}
.gift p{margin:0;font-size:17px;line-height:1.6}

/* BUTTONS */
.btn{display:inline-block;border:none;cursor:pointer;font-family:var(--font-d);font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px;text-decoration:none;text-align:center;transition:transform .15s ease,background .15s ease,opacity .15s ease}
.btn:hover{transform:translateY(-1px)}
.btn-primary{background:var(--accent);color:var(--on-accent)}
.btn-primary:hover{background:var(--accent-deep)}
.btn-accent{background:var(--accent);color:var(--on-accent)}
.btn-accent:hover{background:var(--accent-deep)}
.btn-ghost{background:transparent;color:var(--ink);border:1.5px solid var(--line-2)}
.btn-ghost:hover{border-color:var(--ink)}
.btn-ghost[aria-disabled="true"]{opacity:.45;cursor:default}
.btn.big{width:100%;padding:16px;font-size:17px;margin-top:8px}
.btn:disabled{opacity:.5;cursor:default;transform:none}
.linkcard .btn{margin-top:6px}

/* FORM */
.form{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:26px}
.field{margin-bottom:20px}
.field-label{display:block;font-weight:600;font-size:15px;margin-bottom:9px}
.req{color:var(--accent)}
.field-hint{color:var(--muted);font-weight:400}
.field-err{display:block;color:var(--accent-deep);font-size:13px;margin-top:6px;font-weight:500}
.inp{width:100%;border:1.5px solid var(--line-2);border-radius:11px;padding:13px 15px;font-family:var(--font-b);font-size:16px;background:var(--bg-soft);color:var(--ink);transition:border-color .15s ease,background .15s ease}
.inp:focus{outline:none;border-color:var(--accent);background:var(--surface)}
textarea.inp{resize:vertical}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.seg{display:flex;gap:8px}
.seg-btn{flex:1;border:1.5px solid var(--line-2);background:var(--bg-soft);border-radius:11px;padding:13px;font-family:var(--font-b);font-weight:600;font-size:15px;color:var(--ink);cursor:pointer;transition:all .15s ease}
.seg-btn.on{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
.stepper{display:flex;align-items:center;border:1.5px solid var(--line-2);border-radius:11px;overflow:hidden;width:fit-content;background:var(--bg-soft)}
.stepper button{border:none;background:transparent;width:48px;height:48px;font-size:22px;cursor:pointer;color:var(--accent)}
.stepper span{min-width:46px;text-align:center;font-family:var(--font-d);font-weight:700;font-size:18px}
.stepper-sm button{width:40px;height:40px;font-size:20px}
.stepper-sm span{min-width:38px;font-size:16px}
.sportcounts{display:flex;flex-direction:column;gap:8px}
.sportcount-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1.5px solid var(--line-2);background:var(--bg-soft);border-radius:11px;padding:8px 8px 8px 15px}
.sportcount-label{font-size:15px;font-weight:500}
.sportcount-row .stepper{background:var(--surface)}
.opts{display:flex;flex-direction:column;gap:9px}
.opt{display:flex;align-items:center;gap:11px;border:1.5px solid var(--line-2);background:var(--bg-soft);border-radius:11px;padding:13px 15px;cursor:pointer;font-size:15px;transition:all .15s ease}
.opt.on{border-color:var(--accent);background:var(--tint)}
.opt input{accent-color:var(--accent);width:18px;height:18px}
.form-error{color:var(--accent-deep);font-weight:500;margin:0 0 10px}
.privacy{text-align:center;color:var(--muted);font-size:13px;margin:14px 0 0}

/* THANKS */
.thanks{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:46px 26px;text-align:center}
.thanks-mark{width:64px;height:64px;border-radius:50%;background:var(--accent);color:var(--on-accent);font-size:32px;display:flex;align-items:center;justify-content:center;margin:0 auto 18px}
.thanks h3{font-family:var(--font-d);font-weight:800;font-size:26px;margin:0 0 8px}
.thanks p{color:var(--muted);margin:0 0 20px;font-size:16px}
.thanks-hotels{text-align:left;margin:8px 0 26px;padding-top:24px;border-top:1px solid var(--line)}
.thanks-hotels-title{font-family:var(--font-d);font-weight:700;font-size:20px;margin:0 0 4px;text-align:center}
.hotels .lead{text-align:center}

/* FOOTER */
.footer{background:var(--bg-soft);border-top:1px solid var(--line);color:var(--muted);padding:28px 22px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;font-size:14px}
.footer-info{display:flex;flex-direction:column;gap:4px}
.footer-contact a{color:var(--accent);text-decoration:none;font-weight:600}
.footer-contact a:hover{text-decoration:underline}
.admin-link{background:transparent;border:1px solid var(--line-2);color:var(--muted);padding:8px 16px;border-radius:999px;cursor:pointer;font-family:var(--font-b);font-size:13px}
.admin-link:hover{border-color:var(--ink);color:var(--ink)}

/* ADMIN */
.admin-gate{min-height:100vh;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;padding:22px}
.gate-box{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:34px;max-width:380px;width:100%}
.gate-box h2{font-family:var(--font-d);font-weight:800;margin:0 0 6px}
.gate-box p{color:var(--muted);margin:0 0 18px}
.gate-actions{display:flex;gap:10px;margin-top:18px}
.gate-actions .btn{flex:1}
.admin{max-width:1040px;margin:0 auto;padding:26px 22px 70px}
.admin-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}
.admin-top h2{font-family:var(--font-d);font-weight:800;font-size:30px;margin:0}
.admin-tabs{display:flex;margin-bottom:24px;border-bottom:1px solid var(--line)}
.admin-tabs button{background:none;border:none;padding:12px 4px;margin-right:22px;font-family:var(--font-d);font-weight:600;font-size:16px;color:var(--muted);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-1px}
.admin-tabs button.on{color:var(--ink);border-bottom-color:var(--accent)}
.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px}
.stat-grid-2{grid-template-columns:repeat(2,1fr)}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:22px;display:flex;flex-direction:column}
.stat-big{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.stat-val{font-family:var(--font-d);font-weight:800;font-size:42px;line-height:1}
.stat-label{font-weight:600;margin-top:6px}
.stat-sub{font-size:13px;opacity:.75;margin-top:2px}
.stat-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px}
.stat-col{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px}
.stat-col h4{font-family:var(--font-d);font-weight:700;margin:0 0 12px;font-size:16px}
.bar-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:14px}
.bar-row:last-child{border-bottom:none}
.bar-row strong{font-family:var(--font-d);color:var(--accent)}
.admin-actions{display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap}
.admin-filters{display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;align-items:center}
.admin-filters .inp{width:auto;flex:1 1 150px;min-width:140px;padding:11px 13px}
.admin-filters .sortdir{white-space:nowrap;flex:0 0 auto}
.empty{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:40px;text-align:center;color:var(--muted)}
.muted{color:var(--muted)}
.table-wrap{background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden;overflow-x:auto}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;padding:14px 12px;background:var(--bg-soft);font-weight:600;white-space:nowrap}
.tbl td{padding:14px 12px;border-top:1px solid var(--line);vertical-align:top}
.row-no{opacity:.55}
.tag{display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}
.tag-yes{background:var(--tint);color:var(--accent-deep)}
.tag-no{background:var(--bg-soft);color:var(--muted)}
.del{background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;padding:8px 12px;border-radius:8px;min-width:40px;min-height:40px}
.del:hover{background:var(--bg-soft);color:var(--accent-deep)}
.saved-note{color:var(--accent);font-weight:600;margin-left:12px}
.settings{max-width:560px}

@media (max-width:680px){
  .hero{padding:84px 18px 54px}
  .hero-title{font-size:38px}
  .hero-meta{font-size:17px}
  .container{padding:0 18px}
  .facts{grid-template-columns:1fr}
  .grid2{grid-template-columns:1fr}
  .stat-grid{grid-template-columns:1fr}
  .stat-cols{grid-template-columns:1fr}
  .tl-item{grid-template-columns:74px 1fr;gap:12px}
  .tbl thead{display:none}
  .tbl,.tbl tbody,.tbl tr,.tbl td{display:block;width:100%}
  .tbl tr{border-top:1px solid var(--line);padding:8px 0}
  .tbl td{border:none;padding:5px 12px;display:flex;justify-content:space-between;gap:14px}
  .tbl td::before{content:attr(data-l);font-weight:600;color:var(--muted)}
  .tbl td[data-l=""]::before{content:""}
}
@media (prefers-reduced-motion:reduce){
  .line-wave{animation:none!important}
}
`;
