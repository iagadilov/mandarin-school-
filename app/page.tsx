"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FIVE_FORMULAS,
  TEN_FORMULAS,
  LEVELS,
  TASK_LABELS,
  estimateSeconds,
  findLesson,
  findLevel,
  formatDuration,
  generateSession,
  type Example,
  type Language,
  type LawSel,
  type Settings,
  type TaskType,
} from "./lib/methodology";

const Icon = (children: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const IPlay = Icon(<><path d="M5 3l14 9-14 9V3Z" /></>);
const IBook = Icon(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>);
const IChart = Icon(<><path d="M3 3v18h18" /><path d="m7 16 4-4 3 3 5-7" /></>);
const IUser = Icon(<><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>);
const IGrid = Icon(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>);
const ICheck = Icon(<path d="m20 6-11 11-5-5" />);
const IArrow = Icon(<><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>);

type View = "trainer" | "method";
type Phase = "ready" | "countdown" | "showing" | "answer" | "result" | "summary";

type Attempt = {
  ts: string;
  taskType: TaskType;
  digits: number;
  rows: number;
  examples: number;
  speed: number;
  total: number;
  correct: number;
  accuracy: number;
};

const STORAGE_KEY = "mandarin-trainer-attempts-v4";

const initialSettings: Settings = {
  levelId: "stage-1",
  lessonId: "units",
  taskType: "movements",
  law5: "off",
  law10: "off",
  digits: 1,
  rows: 4,
  examples: 10,
  speed: 1,
  withFormula: false,
  language: "kk",
  speak: false,
};

const viewItems = [
  { id: "trainer" as View, label: "Тренажёр", icon: IPlay },
  { id: "method" as View, label: "Методика", icon: IBook },
];

const phrases = {
  ru: {
    ready: "Нажмите старт и складывайте числа по очереди.",
    correct: "Верно! Отличная скорость.",
    wrong: "Почти. Сверьте правильный ответ и попробуйте ещё раз.",
    start: "Старт тренировки",
    answer: "Введите итоговый ответ",
  },
  kk: {
    ready: "Бастау батырмасын басып, сандарды кезекпен қосыңыз.",
    correct: "Дұрыс! Жарайсың!",
    wrong: "Қате емес, тағы байқап көріңіз.",
    start: "Жаттығуды бастау",
    answer: "Жауапты енгізіңіз",
  },
};

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function MiniIcon({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-4 w-4 flex-shrink-0 text-current">{children}</span>;
}

function Badge({ tone, children }: { tone: "brand" | "green" | "amber" | "red"; children: React.ReactNode }) {
  const tones = {
    brand: "bg-brand-soft text-brand-dark",
    green: "bg-green-soft text-[#13784f]",
    amber: "bg-amber-soft text-[#91610b]",
    red: "bg-red-soft text-[#a92b20]",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${tones[tone]}`}>{children}</span>;
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-brand-soft bg-white shadow-sm">
        <img src="/mandarin-logo.png" alt="Mandarin Edu Center" className="h-11 w-11 object-contain" />
      </span>
      <span className="leading-none">
        <b className="block text-[18px] tracking-tight text-brand-dark">Mandarin</b>
        <small className="mt-1 block text-[9.5px] font-bold uppercase tracking-wide text-ink-faint">Edu Center trainer</small>
      </span>
    </div>
  );
}

function Metric({ label, value, tone = "brand" }: { label: string; value: string; tone?: "brand" | "green" | "ink" }) {
  const toneCls = tone === "green" ? "text-green" : tone === "ink" ? "text-ink" : "text-brand";
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="text-[11px] font-bold text-ink-faint">{label}</div>
      <div className={`mt-1 text-[26px] font-black tracking-tight ${toneCls}`}>{value}</div>
    </div>
  );
}

function lawSelLabel(sel: LawSel, kind: "five" | "ten"): string {
  if (sel === "any") return "Любой";
  if (sel === "off") return kind === "five" ? "Без законов на 5" : "Без законов на 10";
  const list = kind === "five" ? FIVE_FORMULAS : TEN_FORMULAS;
  const labels = sel.map((d) => list.find((x) => x.delta === d)?.label ?? String(d));
  return labels.length ? labels.join(", ") : "Любой";
}

// Селектор одного закона (на 5 или на 10) - МУЛЬТИВЫБОР, как в эталоне:
// Любой (все вместе) / несколько конкретных формул / Без.
function LawSelector({ kind, value, onChange }: { kind: "five" | "ten"; value: LawSel; onChange: (v: LawSel) => void }) {
  const list = kind === "five" ? FIVE_FORMULAS : TEN_FORMULAS;
  const title = kind === "five" ? "Законы на 5" : "Законы на 10";
  const offLabel = kind === "five" ? "Без законов на 5" : "Без законов на 10";
  const selected = Array.isArray(value) ? value : [];

  function toggleFormula(delta: number) {
    if (!Array.isArray(value)) {
      onChange([delta]); // из "Любой"/"Без" -> выбрать первую конкретную
      return;
    }
    const next = value.includes(delta) ? value.filter((d) => d !== delta) : [...value, delta];
    onChange(next.length ? next : "any"); // сняли все -> снова "Любой"
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-extrabold text-ink-soft">{title}</span>
        <button
          onClick={() => onChange("off")}
          className={`rounded-lg px-2 py-1 text-[10px] font-extrabold ${value === "off" ? "bg-red-soft text-[#a92b20]" : "border border-line bg-bg text-ink-faint"}`}
        >
          {offLabel}
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        <button
          onClick={() => onChange("any")}
          className={`rounded-lg border px-2 py-2 text-[12px] font-extrabold ${value === "any" ? "border-brand bg-brand text-white" : "border-line bg-bg text-ink-soft"}`}
        >
          Любой
        </button>
        {list.map((f) => {
          const on = selected.includes(f.delta);
          return (
            <button
              key={f.delta}
              onClick={() => toggleFormula(f.delta)}
              title={f.mechanic}
              className={`rounded-lg border px-1 py-2 text-[12px] font-extrabold leading-tight ${on ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-bg text-ink-soft"}`}
            >
              {f.label}
              <span className="block text-[8.5px] font-bold text-ink-faint">{f.mechanic}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10.5px] font-bold text-ink-faint">Можно выбрать несколько формул - выйдут вместе. «Любой» = все формулы.</p>
    </div>
  );
}

// --------------------------------------------------------------------------
// Панель настроек (повторяет структуру эталона t.mentalnaya-arifmetika.club)
// --------------------------------------------------------------------------

function SettingsPanel({ settings, setSettings }: { settings: Settings; setSettings: (s: Settings) => void }) {
  const level = findLevel(settings.levelId);
  const lesson = findLesson(level, settings.lessonId);
  const est = formatDuration(estimateSeconds(settings));
  const panelTitle =
    settings.taskType === "movements"
      ? "Расчёт: единицы без формул"
      : settings.taskType === "tens"
        ? "Расчёт: десятки"
        : settings.taskType === "double"
          ? "Расчёт: одинаковые двузначные"
          : "Расчёт: генерация по формулам";

  function selectLevel(id: string) {
    const lv = findLevel(id);
    const ls = lv.lessons[0];
    setSettings({ ...settings, levelId: id, lessonId: ls.id, ...ls.preset });
  }
  function selectLesson(id: string) {
    const ls = findLesson(level, id);
    setSettings({ ...settings, lessonId: id, ...ls.preset });
  }

  const tasks: TaskType[] = ["movements", "tens", "double", "triple", "laws"];

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">Настройки Mandarin</div>
          <h2 className="mt-2 text-[22px] font-black">{panelTitle}</h2>
        </div>
        <Badge tone="brand">1 этап</Badge>
      </div>

      <div className="mt-5 space-y-5">
        {/* Блоки первого этапа */}
        <div>
          <div className="text-[12px] font-extrabold text-ink-faint">Блок методики</div>
          <div className="mt-2 grid grid-cols-1 gap-2">
            {LEVELS.map((lv) => (
              <button
                key={lv.id}
                onClick={() => selectLevel(lv.id)}
                className={`rounded-xl border px-3 py-3 text-left text-[13px] font-extrabold ${settings.levelId === lv.id ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-bg text-ink-soft"}`}
              >
                {lv.name}
                {!lv.ready && <span className="mt-1 block text-[9px] font-bold uppercase text-ink-faint">каркас</span>}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {level.lessons.map((ls) => (
              <button
                key={ls.id}
                onClick={() => selectLesson(ls.id)}
                className={`rounded-xl border px-3 py-2 text-[12px] font-extrabold ${settings.lessonId === ls.id ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-bg text-ink-soft"}`}
              >
                {ls.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">{lesson.note}</p>
        </div>

        {/* Тип задания */}
        <div>
          <div className="text-[12px] font-extrabold text-ink-faint">Тип задания</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {tasks.map((tt) => (
              <button
                key={tt}
                onClick={() => setSettings({ ...settings, taskType: tt })}
                className={`rounded-xl border px-3 py-3 text-left text-[13px] font-extrabold ${settings.taskType === tt ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-bg text-ink-soft"}`}
              >
                {TASK_LABELS[tt]}
              </button>
            ))}
          </div>
        </div>

        {/* Десятки/двузначные: без формул или с формулами (требование Перизат) */}
        {(settings.taskType === "tens" || settings.taskType === "double") && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSettings({ ...settings, withFormula: false })}
              className={`rounded-xl border px-3 py-3 text-[13px] font-extrabold ${!settings.withFormula ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-bg text-ink-soft"}`}
            >
              Без формул
            </button>
            <button
              onClick={() => setSettings({ ...settings, withFormula: true })}
              className={`rounded-xl border px-3 py-3 text-[13px] font-extrabold ${settings.withFormula ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-bg text-ink-soft"}`}
            >
              С формулами
            </button>
          </div>
        )}

        {/* Законы: два независимых селектора (на 5 И на 10) - как в эталоне.
            Показываем для «Законы», а также для десятки/двузначные с формулами. */}
        {(settings.taskType === "laws" || ((settings.taskType === "tens" || settings.taskType === "double") && settings.withFormula)) && (
          <div className="space-y-4 rounded-2xl border border-line bg-bg p-4">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">
              {settings.taskType === "tens" ? "Законы в разряде десятков" : settings.taskType === "double" ? "Законы (двузначные)" : "Законы (Братья / Друзья / Товарищи)"}
            </div>
            <LawSelector kind="five" value={settings.law5} onChange={(v) => setSettings({ ...settings, law5: v })} />
            <LawSelector kind="ten" value={settings.law10} onChange={(v) => setSettings({ ...settings, law10: v })} />
            <p className="text-[11px] leading-relaxed text-ink-faint">Можно тренировать законы на 5 и на 10 одновременно (товарищи) или по отдельности. «Без законов на 5/10» выключает соответствующий тип.</p>
          </div>
        )}

        {/* Разрядность и количество чисел */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={settings.taskType === "laws" ? "" : "opacity-60"}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-extrabold text-ink-faint">Разрядность чисел</span>
              <b className="text-brand-dark">{settings.taskType === "triple" ? 3 : settings.taskType === "double" || settings.taskType === "tens" ? 2 : settings.digits}</b>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((d) => (
                <button key={d} disabled={settings.taskType !== "laws"} onClick={() => setSettings({ ...settings, digits: d })} className={`rounded-xl border px-3 py-3 text-[13px] font-extrabold disabled:cursor-not-allowed ${settings.digits === d ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-bg text-ink-soft"}`}>
                  {d}
                </button>
              ))}
            </div>
            {settings.taskType !== "laws" && <span className="mt-1 block text-[10.5px] font-bold text-ink-faint">фиксируется выбранным блоком</span>}
          </div>
          <label className="block">
            <span className="text-[12px] font-extrabold text-ink-faint">Количество чисел в примере: {settings.rows}</span>
            <input type="range" min={2} max={10} value={settings.rows} onChange={(e) => setSettings({ ...settings, rows: Number(e.target.value) })} className="mt-3 w-full accent-[var(--brand)]" />
            <span className="mt-1 block text-[10.5px] font-bold text-ink-faint">минимум 2, максимум 10</span>
          </label>
        </div>

        {/* Количество примеров */}
        <label className="block">
          <span className="text-[12px] font-extrabold text-ink-faint">Количество примеров: {settings.examples}</span>
          <input type="range" min={1} max={50} value={settings.examples} onChange={(e) => setSettings({ ...settings, examples: Number(e.target.value) })} className="mt-3 w-full accent-[var(--brand)]" />
          <span className="mt-1 block text-[10.5px] font-bold text-ink-faint">от 1 до 50</span>
        </label>

        {/* Пауза при показе чисел (скорость) */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-extrabold text-ink-faint">Пауза при показе чисел</span>
            <b className="text-brand-dark">{settings.speed.toFixed(1)} с</b>
          </div>
          <input type="range" min={0.1} max={5} step={0.1} value={settings.speed} onChange={(e) => setSettings({ ...settings, speed: Number(e.target.value) })} className="mt-3 w-full accent-[var(--brand)]" />
          <div className="mt-1 flex justify-between text-[10.5px] font-bold text-ink-faint">
            <span>быстро 0.1 с</span>
            <span>медленно 5 с</span>
          </div>
        </div>

        {/* Ориентировочное время (как в эталоне) */}
        <div className="rounded-xl border border-line bg-bg p-3 text-[12px] font-bold text-ink-soft">
          Ориентировочное время серии: <b className="text-ink">{est}</b>
        </div>

        {/* Язык / озвучка */}
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => setSettings({ ...settings, language: settings.language === "kk" ? "ru" : "kk" })} className="rounded-xl border border-line bg-bg px-4 py-3 text-[13px] font-extrabold text-ink">
            Язык: {settings.language === "kk" ? "Қазақша" : "Русский"}
          </button>
          <button onClick={() => setSettings({ ...settings, speak: !settings.speak })} className={`rounded-xl border px-4 py-3 text-[13px] font-extrabold ${settings.speak ? "border-green-soft bg-green-soft text-green" : "border-line bg-bg text-ink"}`}>
            Озвучка: {settings.speak ? "вкл" : "выкл"}
          </button>
        </div>
      </div>
    </section>
  );
}

// --------------------------------------------------------------------------
// Тренажёр
// --------------------------------------------------------------------------

function speak(text: string, lang: Language, enabled: boolean) {
  if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === "kk" ? "kk-KZ" : "ru-RU";
  utterance.rate = 0.92;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function readAttempts(): Attempt[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as Attempt[];
  } catch {
    return [];
  }
}

function saveAttempt(attempt: Attempt) {
  if (typeof window === "undefined") return;
  const next = [attempt, ...readAttempts()].slice(0, 30);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function Trainer({ settings, onSaved }: { settings: Settings; onSaved: () => void }) {
  const [seed, setSeed] = useState(1);
  const session = useMemo<Example[]>(() => generateSession(settings, seed), [settings, seed]);
  const [phase, setPhase] = useState<Phase>("ready");
  const [countdown, setCountdown] = useState(3);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [operandIndex, setOperandIndex] = useState(0);
  const [input, setInput] = useState("");
  const [correct, setCorrect] = useState(0);
  const [lastOk, setLastOk] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = session[exampleIndex];
  const activeOperand = current?.operands[operandIndex] ?? 0;
  const progress = ((exampleIndex + (phase === "answer" || phase === "result" ? 1 : operandIndex / Math.max(1, current?.operands.length ?? 1))) / session.length) * 100;

  useEffect(() => {
    setPhase("ready");
    setCountdown(3);
    setExampleIndex(0);
    setOperandIndex(0);
    setInput("");
    setCorrect(0);
    setLastOk(null);
  }, [settings]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("showing");
      return;
    }
    const timer = window.setTimeout(() => setCountdown((v) => v - 1), 650);
    return () => window.clearTimeout(timer);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "showing" || !current) return;
    speak(String(activeOperand), settings.language, settings.speak);
    const timer = window.setTimeout(() => {
      if (operandIndex >= current.operands.length - 1) {
        setPhase("answer");
        window.setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        setOperandIndex((v) => v + 1);
      }
    }, Math.max(100, settings.speed * 1000));
    return () => window.clearTimeout(timer);
  }, [phase, current, activeOperand, operandIndex, settings.speed, settings.language, settings.speak]);

  function start() {
    setSeed((s) => s + 1);
    setCountdown(3);
    setExampleIndex(0);
    setOperandIndex(0);
    setInput("");
    setCorrect(0);
    setLastOk(null);
    setPhase("countdown");
  }

  function check() {
    if (!current) return;
    const ok = Number(input) === current.answer;
    const nextCorrect = correct + (ok ? 1 : 0);
    setCorrect(nextCorrect);
    setLastOk(ok);
    setPhase("result");
    if (exampleIndex >= session.length - 1) {
      const attempt: Attempt = {
        ts: new Date().toISOString(),
        taskType: settings.taskType,
        digits: settings.digits,
        rows: settings.rows,
        examples: session.length,
        speed: settings.speed,
        total: session.length,
        correct: nextCorrect,
        accuracy: Math.round((nextCorrect / session.length) * 100),
      };
      saveAttempt(attempt);
      onSaved();
    }
  }

  function next() {
    if (exampleIndex >= session.length - 1) {
      setPhase("summary");
      return;
    }
    setExampleIndex((v) => v + 1);
    setOperandIndex(0);
    setInput("");
    setLastOk(null);
    setPhase("showing");
  }

  const t = phrases[settings.language];

  return (
    <section className="rounded-2xl border border-line bg-card p-4 sm:p-5">
      <div className="trainer-surface relative overflow-hidden rounded-2xl p-5 text-white">
        {lastOk && <Confetti />}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge tone="amber">{TASK_LABELS[settings.taskType]}</Badge>
          <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold">
            пример {Math.min(exampleIndex + 1, session.length)} / {session.length} - {settings.speed.toFixed(1)} с
          </span>
        </div>

        <div className="mt-5 flex min-h-[270px] flex-col items-center justify-center text-center sm:min-h-[360px]">
          {phase === "ready" && (
            <>
              <div className="flex h-28 w-28 items-center justify-center rounded-[32px] bg-white/95 p-3 shadow-xl">
                <img src="/mandarin-logo.png" alt="Mandarin Edu Center" className="h-full w-full object-contain" />
              </div>
              <div className="mt-5 text-[42px] font-black sm:text-[64px]">Mandarin</div>
              <p className="mt-3 max-w-xl text-[14px] font-bold leading-relaxed text-white/88">{t.ready}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold">1 этап</span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold">числа по одному</span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold">без предпросмотра</span>
              </div>
            </>
          )}
          {phase === "countdown" && <div className="text-[90px] font-black sm:text-[140px]">{countdown || "Go"}</div>}
          {phase === "showing" && (
            <div className="rounded-[34px] bg-white/96 px-12 py-10 text-[72px] font-black tracking-tight text-brand-dark shadow-xl sm:px-20 sm:py-14 sm:text-[128px]">
              {operandIndex === 0 ? activeOperand : signed(activeOperand)}
            </div>
          )}
          {phase === "answer" && (
            <div className="w-full max-w-md rounded-[28px] bg-white/95 p-5 text-ink shadow-xl">
              <div className="text-[12px] font-extrabold uppercase tracking-wide text-ink-faint">{t.answer}</div>
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && check()} inputMode="numeric" className="mt-4 w-full rounded-2xl border border-line bg-bg px-5 py-4 text-center text-[38px] font-black outline-none focus:border-brand" />
              <button onClick={check} className="brand-grad mt-4 w-full rounded-xl px-5 py-3 text-[13px] font-extrabold text-white">Проверить</button>
            </div>
          )}
          {phase === "result" && current && (
            <div className="w-full max-w-lg rounded-[28px] bg-white/95 p-5 text-ink shadow-xl">
              <div className={`text-[28px] font-black ${lastOk ? "text-green" : "text-red"}`}>{lastOk ? t.correct : t.wrong}</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Metric label="Ваш ответ" value={input || "-"} tone="ink" />
                <Metric label="Правильно" value={`${current.answer}`} tone={lastOk ? "green" : "brand"} />
              </div>
              {exampleIndex < session.length - 1 ? (
                <button onClick={next} className="brand-grad mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[13px] font-extrabold text-white">
                  Следующий пример <MiniIcon>{IArrow}</MiniIcon>
                </button>
              ) : (
                <button onClick={next} className="brand-grad mt-4 w-full rounded-xl px-5 py-3 text-[13px] font-extrabold text-white">Итог серии</button>
              )}
            </div>
          )}
          {phase === "summary" && (
            <div className="w-full max-w-lg rounded-[28px] bg-white/95 p-5 text-ink shadow-xl">
              <div className="text-[12px] font-extrabold uppercase tracking-wide text-ink-faint">Итог тренировки</div>
              <h2 className="mt-2 text-[30px] font-black text-brand-dark">{correct} из {session.length}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Примеров" value={`${session.length}`} tone="ink" />
                <Metric label="Верно" value={`${correct}`} tone="green" />
                <Metric label="Ошибки" value={`${session.length - correct}`} tone={session.length - correct ? "brand" : "ink"} />
                <Metric label="Процент" value={`${Math.round((correct / session.length) * 100)}%`} />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button onClick={start} className="brand-grad rounded-xl px-5 py-3 text-[13px] font-extrabold text-white">Пройти ещё раз</button>
                <button onClick={() => setPhase("ready")} className="rounded-xl border border-line bg-bg px-5 py-3 text-[13px] font-extrabold text-ink">Новая тренировка</button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <i className="block h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-extrabold text-white/80">
            <span>Пример {Math.min(exampleIndex + 1, session.length)} из {session.length}</span>
            <span>{phase === "showing" ? "число по центру" : phase === "answer" ? "ввод ответа" : phase === "summary" ? "итог" : "без предпросмотра"}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <button onClick={start} className="brand-grad rounded-xl px-5 py-3 text-[13px] font-extrabold text-white">{t.start}</button>
        <button onClick={() => setPhase("answer")} className="rounded-xl border border-line bg-bg px-5 py-3 text-[13px] font-extrabold text-ink">Пауза</button>
        <button onClick={start} className="rounded-xl border border-line bg-card px-5 py-3 text-[13px] font-extrabold text-ink">Сброс</button>
      </div>
    </section>
  );
}

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 18 }).map((_, index) => (
        <i key={index} className="confetti-piece" style={{ left: `${8 + index * 5}%`, animationDelay: `${(index % 6) * 80}ms`, background: index % 3 === 0 ? "#fff" : index % 3 === 1 ? "#ffe2c6" : "#f6a313" }} />
      ))}
    </div>
  );
}

// --------------------------------------------------------------------------
// Абакус (мини-игра)
// --------------------------------------------------------------------------

function AbacusGame() {
  const [beads, setBeads] = useState([1, 2, 3]);
  const [target, setTarget] = useState(123);
  const value = Number(beads.join(""));
  const ok = value === target;

  function nextTarget() {
    const next = [234, 405, 711, 555, 909][Math.floor(Math.random() * 5)];
    setTarget(next);
    setBeads(String(next).split("").map(() => 0));
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
      <section className="rounded-2xl border border-line bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge tone="brand">Мини-игра</Badge>
            <h2 className="mt-3 text-[26px] font-black">Знакомство с абакусом</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">Ребёнок выставляет число на простом интерактивном абакусе. Это можно оставить как игровой блок после основного тренажёра.</p>
          </div>
          <Badge tone={ok ? "green" : "amber"}>цель: {target}</Badge>
        </div>
        <div className="mt-6 flex justify-center gap-5 rounded-2xl border border-line bg-bg p-5">
          {beads.map((count, column) => (
            <div key={column} className="flex w-16 flex-col items-center">
              <button onClick={() => setBeads((current) => current.map((item, idx) => (idx === column ? (item + 1) % 10 : item)))} className="mb-3 h-10 w-12 rounded-full bg-brand text-[13px] font-black text-white">
                {count}
              </button>
              <span className="h-1 w-14 rounded-full bg-brand-dark" />
              <div className="mt-3 flex flex-col gap-1">
                {Array.from({ length: 9 }).map((_, row) => (
                  <button key={row} onClick={() => setBeads((current) => current.map((item, idx) => (idx === column ? row + 1 : item)))} className={`h-4 w-12 rounded-full ${row < count ? "bg-brand" : "bg-line"}`} aria-label={`Колонка ${column + 1}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={`mt-4 rounded-2xl border p-4 text-[13px] font-bold ${ok ? "border-green-soft bg-green-soft text-green" : "border-amber-soft bg-amber-soft text-[#91610b]"}`}>
          {ok ? "Дұрыс! Число выставлено верно." : `Сейчас на абакусе ${value}. Нужно выставить ${target}.`}
        </div>
      </section>
      <section className="space-y-4">
        <Metric label="Уровень" value="сотни" tone="ink" />
        <Metric label="Подсказка" value="3 оси" />
        <button onClick={nextTarget} className="brand-grad w-full rounded-xl px-5 py-3 text-[13px] font-extrabold text-white">Новое число</button>
      </section>
    </div>
  );
}

// --------------------------------------------------------------------------
// Статистика
// --------------------------------------------------------------------------

function StatsView({ attempts, refresh }: { attempts: Attempt[]; refresh: () => void }) {
  const total = attempts.reduce((sum, item) => sum + item.total, 0);
  const correct = attempts.reduce((sum, item) => sum + item.correct, 0);
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const best = attempts.reduce((max, item) => Math.max(max, item.accuracy), 0);

  function clear() {
    window.localStorage.removeItem(STORAGE_KEY);
    refresh();
  }

  const rows = attempts.length ? attempts : [{ ts: new Date().toISOString(), taskType: "laws" as TaskType, digits: 1, rows: 5, examples: 10, speed: 0.5, total: 10, correct: 8, accuracy: 80 }];

  return (
    <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <Metric label="Тренировок" value={`${attempts.length}`} tone="ink" />
        <Metric label="Точность" value={`${accuracy}%`} tone="green" />
        <Metric label="Лучший результат" value={`${best}%`} />
      </section>
      <section className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">LocalStorage</div>
            <h2 className="mt-2 text-[24px] font-black">История попыток ученика</h2>
          </div>
          <button onClick={clear} className="rounded-xl border border-line bg-bg px-4 py-3 text-[12px] font-extrabold text-ink-soft">Очистить</button>
        </div>
        <div className="mt-5 space-y-3">
          {rows.map((attempt, index) => (
            <div key={`${attempt.ts}-${index}`} className="rounded-2xl border border-line bg-bg p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <b className="text-[14px]">{TASK_LABELS[attempt.taskType]}</b>
                  <p className="mt-1 text-[12px] text-ink-soft">{new Date(attempt.ts).toLocaleString("ru-RU")} - разрядность {attempt.digits} - {attempt.rows} чисел - {attempt.speed}с</p>
                </div>
                <Badge tone={attempt.accuracy >= 80 ? "green" : "amber"}>{attempt.correct}/{attempt.total} - {attempt.accuracy}%</Badge>
              </div>
              <div className="mt-3 h-2 rounded-full bg-brand-soft">
                <i className="block h-full rounded-full bg-brand" style={{ width: `${attempt.accuracy}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// --------------------------------------------------------------------------
// Профиль
// --------------------------------------------------------------------------

function ProfileView() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
      <section className="rounded-2xl border border-line bg-card p-5">
        <Badge tone="brand">Локальный профиль без регистрации</Badge>
        <h2 className="mt-3 text-[28px] font-black">Айлин Ермек</h2>
        <p className="mt-2 text-[13px] text-ink-soft">8 лет, Mandarin, уровень: законы на 5 и 10.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Серия" value="12" tone="ink" />
          <Metric label="Скорость" value="0.5с" />
          <Metric label="Точность" value="88%" tone="green" />
        </div>
      </section>
      <section className="rounded-2xl border border-brand-soft bg-brand-tint p-5">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-brand-dark">Казахские подсказки</div>
        {["Дұрыс! Жарайсың!", "Қате емес, тағы байқап көр", "Жауапты енгізіңіз", "Келесі мысал"].map((item) => (
          <div key={item} className="mt-3 flex items-start gap-2 text-[13px] font-bold text-brand-dark">
            <MiniIcon>{ICheck}</MiniIcon>
            <span>{item}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

// --------------------------------------------------------------------------
// Методика Mandarin
// --------------------------------------------------------------------------

function FormulaTable({ title, note, formulas }: { title: string; note: string; formulas: typeof FIVE_FORMULAS }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <Badge tone="brand">{title}</Badge>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">{note}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {formulas.map((f) => (
          <div key={f.delta} className="rounded-xl border border-line bg-bg p-3 text-center">
            <div className="text-[18px] font-black text-brand-dark">{f.label}</div>
            <div className="mt-1 text-[11px] font-bold text-ink-faint">{f.mechanic}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MethodologyView({ settings }: { settings: Settings }) {
  const level = findLevel(settings.levelId);
  const lesson = findLesson(level, settings.lessonId);

  const lawsActive = settings.taskType === "laws" || ((settings.taskType === "tens" || settings.taskType === "double") && settings.withFormula);
  const breadcrumb: Array<[string, string]> = [
    ["Уровень", level.name],
    ["Урок", lesson.name],
    ["Тип задания", TASK_LABELS[settings.taskType]],
    ["Формулы", settings.taskType === "tens" || settings.taskType === "double" ? (settings.withFormula ? "с формулами" : "без формул") : settings.taskType === "movements" ? "без формул" : "с формулами"],
    ["Закон на 5", lawsActive ? lawSelLabel(settings.law5, "five") : "-"],
    ["Закон на 10", lawsActive ? lawSelLabel(settings.law10, "ten") : "-"],
    ["Разрядность", `${settings.digits}`],
    ["Чисел в примере", `${settings.rows}`],
    ["Количество примеров", `${settings.examples}`],
    ["Пауза при показе", `${settings.speed.toFixed(1)} с`],
    ["Ориентировочное время", formatDuration(estimateSeconds(settings))],
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-card p-5">
        <Badge tone="green">Методика Mandarin</Badge>
        <h2 className="mt-3 text-[24px] font-black">Что сейчас выбрано в тренажёре</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">В первом этапе каждый пример собирается не только математически, но и методически: следующий шаг должен быть допустимым движением на абакусе для выбранного блока.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {breadcrumb.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-bg p-4">
              <div className="text-[11px] font-bold text-ink-faint">{label}</div>
              <div className="mt-1 text-[15px] font-black text-ink">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <FormulaTable title="Законы на 5 (братья)" note="Переход через пятёрку внутри разряда. Метка - что складывает ребёнок, справа - как это делается на абакусе." formulas={FIVE_FORMULAS} />
        <FormulaTable title="Законы на 10 (друзья)" note="Переход через десяток с переносом в следующий разряд. Цифра и её механика на абакусе." formulas={TEN_FORMULAS} />
      </div>

      <section className="rounded-2xl border border-line bg-card p-5">
        <Badge tone="brand">Уровни и уроки</Badge>
        <h2 className="mt-3 text-[22px] font-black">Структура первого этапа</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">Сейчас фиксируется базовый онлайн-тренажёр сложения и вычитания: единицы 1-9, десятки 10-90, одинаковые двузначные 11-99, трёхзначные до 999 и формулы 5/10 по правилам методиста.</p>
        <div className="mt-5 space-y-3">
          {LEVELS.map((lv) => (
            <div key={lv.id} className="rounded-2xl border border-line bg-bg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b className="text-[14px]">{lv.name} <span className="text-[11px] font-bold text-ink-faint">- {lv.book}</span></b>
                <Badge tone={lv.ready ? "green" : "amber"}>{lv.ready ? "готово" : "каркас"}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {lv.lessons.map((ls) => (
                  <span key={ls.id} className="rounded-xl border border-line bg-card px-3 py-1.5 text-[11.5px] font-bold text-ink-soft">
                    {ls.name}: {ls.note}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <Badge tone="green">Скоуп 1 этапа - 250к</Badge>
        <h2 className="mt-3 text-[22px] font-black">Базовый онлайн-тренажёр по формулам, не вся платформа</h2>
        <div className="mt-4 space-y-3">
          {[
            ["Сейчас проверяем", "первый блок: единицы без формул. Прямые ходы 1-9 без обмена через 5/10, например 4+5-8+1; числа по одному, 2-10 рядов, до 50 примеров, пауза 5с-0.1с, проверка ответа, результат, эффект успеха."],
            ["После подтверждения", "переносим эту же методическую точность на десятки, одинаковые двузначные, трёхзначные до 999 и законы на 5/10."],
            ["Нужно от клиента", "по каждому следующему режиму нужны такие же правила: что можно, что нельзя, 10 правильных и 10 неправильных примеров. Тогда тренажёр будет идти по реальной программе."],
            ["Следующие этапы", "профили учеников, кабинет педагога, база учеников, домашки, прогресс, отчёты родителям, умножение/деление."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-line bg-bg p-4">
              <b className="text-[14px]">{title}</b>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// --------------------------------------------------------------------------
// Оболочка
// --------------------------------------------------------------------------

function Sidebar({ view, setView }: { view: View; setView: (view: View) => void }) {
  return (
    <aside className="hidden w-[250px] flex-shrink-0 border-r border-line bg-card px-4 py-5 lg:flex lg:flex-col">
      <Logo />
      <nav className="mt-8 space-y-1">
        {viewItems.map((item) => (
          <button key={item.id} onClick={() => setView(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-bold transition ${view === item.id ? "bg-brand-soft text-brand-dark" : "text-ink-soft hover:bg-bg"}`}>
            <MiniIcon>{item.icon}</MiniIcon>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="mt-auto rounded-xl border border-line bg-bg p-3">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">Важно</div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">Первый этап: базовый тренажёр Mandarin. Кабинеты, база учеников и отчёты - следующие этапы.</p>
      </div>
    </aside>
  );
}

function TrainerView({ settings, setSettings, refreshStats }: { settings: Settings; setSettings: (s: Settings) => void; refreshStats: () => void }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_.85fr]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-line bg-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="hidden h-24 w-24 flex-shrink-0 items-center justify-center rounded-[26px] border border-brand-soft bg-white p-2 shadow-sm sm:flex">
                <img src="/mandarin-logo.png" alt="Mandarin Edu Center" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <Badge tone="brand">Mandarin.edu.center</Badge>
                <h1 className="mt-3 text-[28px] font-black leading-tight sm:text-[38px]">Тренажёр ментальной арифметики</h1>
                <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-ink-soft">Первый этап под бренд Mandarin: числа показываются по одному, ученик вводит ответ, система проверяет результат. Блоки и формулы подключаются по правилам методиста.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 lg:w-[360px]">
              <Metric label="этап" value="1" tone="ink" />
              <Metric label="примеры" value="50" />
              <Metric label="пауза" value="0.1с" />
            </div>
          </div>
        </section>
        <Trainer settings={settings} onSaved={refreshStats} />
      </div>
      <div className="space-y-4">
        <SettingsPanel settings={settings} setSettings={setSettings} />
      </div>
    </div>
  );
}

export default function Page() {
  const [view, setView] = useState<View>("trainer");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  function refreshStats() {
    setAttempts(readAttempts());
  }

  useEffect(() => {
    refreshStats();
  }, []);

  const title = viewItems.find((item) => item.id === view)?.label ?? "Тренажёр";

  return (
    <main className="min-h-screen bg-bg text-ink">
      <div className="mx-auto flex min-h-screen max-w-[1440px] border-x border-line bg-bg">
        <Sidebar view={view} setView={(v) => { setView(v); setMobileNavOpen(false); }} />
        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-line bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center justify-between gap-3">
                <div className="lg:hidden"><Logo /></div>
                <div className="hidden lg:block">
                  <h1 className="text-[20px] font-black tracking-tight">{title}</h1>
                  <p className="mt-1 text-[12px] text-ink-soft">первый этап: тренажёр упражнений по методике Mandarin</p>
                </div>
                <button onClick={() => setMobileNavOpen((v) => !v)} className="rounded-xl border border-line p-2 text-ink-soft lg:hidden" aria-label="Меню">
                  <MiniIcon>{IGrid}</MiniIcon>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-bg p-1">
                {viewItems.map((item) => (
                  <button key={item.id} onClick={() => setView(item.id)} className={`rounded-lg px-3 py-2 text-[12px] font-extrabold transition ${view === item.id ? "brand-grad text-white shadow-sm" : "text-ink-soft"}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 lg:hidden">
              <h1 className="text-[18px] font-black tracking-tight">{title}</h1>
              <p className="mt-1 text-[12px] text-ink-soft">упражнения, скорость, казахские подсказки</p>
            </div>
            {mobileNavOpen && (
              <div className="mt-3 grid grid-cols-1 gap-2 rounded-2xl border border-line bg-bg p-2 lg:hidden">
                {viewItems.map((item) => (
                  <button key={item.id} onClick={() => { setView(item.id); setMobileNavOpen(false); }} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-bold ${view === item.id ? "bg-brand-soft text-brand-dark" : "text-ink-soft"}`}>
                    <MiniIcon>{item.icon}</MiniIcon>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </header>
          <div className="p-4 sm:p-6">
            {view === "trainer" && <TrainerView settings={settings} setSettings={setSettings} refreshStats={refreshStats} />}
            {view === "method" && <MethodologyView settings={settings} />}
          </div>
        </section>
      </div>
    </main>
  );
}
