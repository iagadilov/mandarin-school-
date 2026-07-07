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
  type Settings,
  type TaskType,
} from "./lib/methodology";

const Icon = (children: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const IPlay = Icon(<path d="M5 3l14 9-14 9V3Z" />);
const IBook = Icon(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>);
const IGrid = Icon(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>);
const IArrow = Icon(<><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>);

type View = "trainer" | "method";
type Phase = "ready" | "countdown" | "showing" | "paused" | "answer" | "result" | "summary";

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

const taskOrder: TaskType[] = ["movements", "tens", "double", "triple", "formula5", "formula10"];
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const formatOperand = (value: number, index: number) => (index === 0 ? String(value) : signed(value));

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

function Metric({ label, value, tone = "brand" }: { label: string; value: string; tone?: "brand" | "green" | "ink" | "red" }) {
  const toneCls = tone === "green" ? "text-green" : tone === "ink" ? "text-ink" : tone === "red" ? "text-red" : "text-brand";
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="text-[11px] font-bold text-ink-faint">{label}</div>
      <div className={`mt-1 text-[26px] font-black tracking-tight ${toneCls}`}>{value}</div>
    </div>
  );
}

function settingsForTask(settings: Settings, taskType: TaskType): Settings {
  const level = findLevel(settings.levelId);
  const lesson = level.lessons.find((item) => item.preset.taskType === taskType);
  return {
    ...settings,
    ...(lesson?.preset ?? {}),
    lessonId: lesson?.id ?? settings.lessonId,
    taskType,
  };
}

function SettingsPanel({ settings, setSettings }: { settings: Settings; setSettings: (s: Settings) => void }) {
  const level = findLevel(settings.levelId);
  const lesson = findLesson(level, settings.lessonId);
  const est = formatDuration(estimateSeconds(settings));

  return (
    <section className="rounded-2xl border border-line bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">Настройки</div>
          <h2 className="mt-2 text-[20px] font-black leading-tight sm:text-[22px]">Параметры тренировки</h2>
        </div>
        <Badge tone="brand">1 этап</Badge>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <div className="text-[12px] font-extrabold text-ink-faint">Блок</div>
          <div className="mt-2 grid gap-2 min-[520px]:grid-cols-2 2xl:grid-cols-1 min-[1720px]:grid-cols-2">
            {taskOrder.map((taskType) => (
              <button
                key={taskType}
                onClick={() => setSettings(settingsForTask(settings, taskType))}
                className={`rounded-xl border px-3 py-3 text-left text-[13px] font-extrabold ${settings.taskType === taskType ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-bg text-ink-soft"}`}
              >
                {TASK_LABELS[taskType]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">{lesson.note}</p>
        </div>

        <label className="block">
          <span className="text-[12px] font-extrabold text-ink-faint">Количество чисел в примере: {settings.rows}</span>
          <input type="range" min={2} max={10} value={settings.rows} onChange={(e) => setSettings({ ...settings, rows: Number(e.target.value) })} className="mt-3 w-full accent-[var(--brand)]" />
          <span className="mt-1 block text-[10.5px] font-bold text-ink-faint">от 2 до 10</span>
        </label>

        <label className="block">
          <span className="text-[12px] font-extrabold text-ink-faint">Количество примеров: {settings.examples}</span>
          <input type="range" min={1} max={50} value={settings.examples} onChange={(e) => setSettings({ ...settings, examples: Number(e.target.value) })} className="mt-3 w-full accent-[var(--brand)]" />
          <span className="mt-1 block text-[10.5px] font-bold text-ink-faint">от 1 до 50</span>
        </label>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-extrabold text-ink-faint">Скорость показа</span>
            <b className="text-brand-dark">{settings.speed.toFixed(1)} с</b>
          </div>
          <input type="range" min={0.1} max={5} step={0.1} value={settings.speed} onChange={(e) => setSettings({ ...settings, speed: Number(e.target.value) })} className="mt-3 w-full accent-[var(--brand)]" />
          <div className="mt-1 flex justify-between text-[10.5px] font-bold text-ink-faint">
            <span>0.1 с</span>
            <span>5 с</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-bg p-3 text-[12px] font-bold text-ink-soft">
          Ориентировочное время серии: <b className="text-ink">{est}</b>
        </div>
      </div>
    </section>
  );
}

function Trainer({ settings }: { settings: Settings }) {
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
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 650);
    return () => window.clearTimeout(timer);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "showing" || !current) return;
    const timer = window.setTimeout(() => {
      if (operandIndex >= current.operands.length - 1) {
        setPhase("answer");
        window.setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        setOperandIndex((value) => value + 1);
      }
    }, Math.max(100, settings.speed * 1000));
    return () => window.clearTimeout(timer);
  }, [phase, current, operandIndex, settings.speed]);

  function start() {
    setSeed((value) => value + 1);
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
    const value = input.trim() === "" ? Number.NaN : Number(input);
    const ok = Number.isFinite(value) && value === current.answer;
    setCorrect((value) => value + (ok ? 1 : 0));
    setLastOk(ok);
    setPhase("result");
  }

  function next() {
    if (exampleIndex >= session.length - 1) {
      setPhase("summary");
      return;
    }
    setExampleIndex((value) => value + 1);
    setOperandIndex(0);
    setInput("");
    setLastOk(null);
    setPhase("showing");
  }

  function newTraining() {
    setPhase("ready");
    setCountdown(3);
    setExampleIndex(0);
    setOperandIndex(0);
    setInput("");
    setCorrect(0);
    setLastOk(null);
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-2 sm:p-4">
      <div className="trainer-surface relative overflow-hidden rounded-2xl p-4 text-white sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge tone="amber">{TASK_LABELS[settings.taskType]}</Badge>
          <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold">
            Пример {Math.min(exampleIndex + 1, session.length)} из {session.length}
          </span>
        </div>

        <div className="mt-5 flex min-h-[420px] flex-col items-center justify-center text-center sm:min-h-[520px] 2xl:min-h-[470px]">
          {phase === "ready" && (
            <>
              <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/95 p-3 shadow-xl sm:h-28 sm:w-28 sm:rounded-[32px]">
                <img src="/mandarin-logo.png" alt="Mandarin Edu Center" className="h-full w-full object-contain" />
              </div>
              <div className="mt-5 text-[36px] font-black sm:text-[58px]">Mandarin</div>
              <p className="mt-2 text-[18px] font-black text-white/90">Онлайн-тренажёр</p>
              <button onClick={start} className="mt-6 rounded-2xl bg-white px-8 py-4 text-[15px] font-black text-brand-dark shadow-xl">Начать тренировку</button>
            </>
          )}
          {phase === "countdown" && <div className="text-[90px] font-black sm:text-[140px]">{countdown || "Start"}</div>}
          {phase === "showing" && (
            <div className="rounded-[30px] bg-white/96 px-10 py-9 text-[72px] font-black tracking-tight text-brand-dark shadow-xl sm:rounded-[34px] sm:px-20 sm:py-14 sm:text-[128px]">
              {operandIndex === 0 ? activeOperand : signed(activeOperand)}
            </div>
          )}
          {phase === "paused" && (
            <div className="w-full max-w-md rounded-[28px] bg-white/95 p-5 text-ink shadow-xl">
              <div className="text-[30px] font-black text-brand-dark">Пауза</div>
              <button onClick={() => setPhase("showing")} className="brand-grad mt-5 w-full rounded-xl px-5 py-3 text-[13px] font-extrabold text-white">Продолжить</button>
            </div>
          )}
          {phase === "answer" && (
            <div className="w-full max-w-md rounded-[28px] bg-white/95 p-5 text-ink shadow-xl">
              <div className="text-[12px] font-extrabold uppercase tracking-wide text-ink-faint">Введите ответ</div>
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && check()} inputMode="numeric" className="mt-4 w-full rounded-2xl border border-line bg-bg px-5 py-4 text-center text-[38px] font-black outline-none focus:border-brand" />
              <button onClick={check} className="brand-grad mt-4 w-full rounded-xl px-5 py-3 text-[13px] font-extrabold text-white">Проверить</button>
            </div>
          )}
          {phase === "result" && current && (
            <div className="w-full max-w-lg rounded-[28px] bg-white/95 p-5 text-ink shadow-xl">
              <div className={`text-[32px] font-black ${lastOk ? "text-green" : "text-red"}`}>{lastOk ? "Верно" : "Неверно"}</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Metric label="Ваш ответ" value={input || "-"} tone="ink" />
                <Metric label="Правильный ответ" value={`${current.answer}`} tone={lastOk ? "green" : "brand"} />
              </div>
              <div className="mt-3 rounded-2xl border border-line bg-bg p-3 text-left">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">Пример</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {current.operands.map((operand, index) => (
                    <span key={`${operand}-${index}`} className="rounded-xl border border-line bg-card px-3 py-1.5 text-[14px] font-black text-brand-dark">
                      {formatOperand(operand, index)}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={next} className="brand-grad mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[13px] font-extrabold text-white">
                {exampleIndex < session.length - 1 ? "Следующий пример" : "Итог серии"} <MiniIcon>{IArrow}</MiniIcon>
              </button>
            </div>
          )}
          {phase === "summary" && (
            <div className="w-full max-w-lg rounded-[28px] bg-white/95 p-5 text-ink shadow-xl">
              <div className="text-[12px] font-extrabold uppercase tracking-wide text-ink-faint">Итог тренировки</div>
              <h2 className="mt-2 text-[30px] font-black text-brand-dark">{correct} из {session.length}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Примеров" value={`${session.length}`} tone="ink" />
                <Metric label="Верно" value={`${correct}`} tone="green" />
                <Metric label="Ошибки" value={`${session.length - correct}`} tone={session.length - correct ? "red" : "ink"} />
                <Metric label="Процент" value={`${Math.round((correct / session.length) * 100)}%`} />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button onClick={start} className="brand-grad rounded-xl px-5 py-3 text-[13px] font-extrabold text-white">Пройти ещё раз</button>
                <button onClick={newTraining} className="rounded-xl border border-line bg-bg px-5 py-3 text-[13px] font-extrabold text-ink">Новая тренировка</button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <i className="block h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-extrabold text-white/80">
            <span>{settings.speed.toFixed(1)} с</span>
            <span>{phase === "showing" ? "число по центру" : phase === "answer" ? "ввод ответа" : phase === "summary" ? "итог" : "без предпросмотра"}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <button onClick={start} className="brand-grad rounded-xl px-5 py-3 text-[13px] font-extrabold text-white">Начать</button>
        <button onClick={() => phase === "showing" && setPhase("paused")} disabled={phase !== "showing"} className="rounded-xl border border-line bg-bg px-5 py-3 text-[13px] font-extrabold text-ink disabled:cursor-not-allowed disabled:opacity-45">Пауза</button>
        <button onClick={newTraining} className="rounded-xl border border-line bg-card px-5 py-3 text-[13px] font-extrabold text-ink">Назад</button>
      </div>
    </section>
  );
}

function FormulaTable({ title, note, formulas }: { title: string; note: string; formulas: typeof FIVE_FORMULAS }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <Badge tone="brand">{title}</Badge>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">{note}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {formulas.map((formula) => (
          <div key={formula.delta} className="rounded-xl border border-line bg-bg p-3 text-center">
            <div className="text-[18px] font-black text-brand-dark">{formula.label}</div>
            <div className="mt-1 text-[11px] font-bold text-ink-faint">{formula.mechanic}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MethodologyView({ settings }: { settings: Settings }) {
  const level = findLevel(settings.levelId);
  const lesson = findLesson(level, settings.lessonId);
  const formulaText = settings.taskType === "formula5" ? "формулы на 5" : settings.taskType === "formula10" ? "формулы на 10" : "без формул";
  const breadcrumb: Array<[string, string]> = [
    ["Этап", level.name],
    ["Блок", lesson.name],
    ["Тип задания", TASK_LABELS[settings.taskType]],
    ["Методика", formulaText],
    ["Чисел в примере", `${settings.rows}`],
    ["Количество примеров", `${settings.examples}`],
    ["Скорость", `${settings.speed.toFixed(1)} с`],
    ["Ориентировочное время", formatDuration(estimateSeconds(settings))],
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-card p-5">
        <Badge tone="green">Методика Mandarin</Badge>
        <h2 className="mt-3 text-[24px] font-black">Что сейчас выбрано в тренажёре</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">Каждый пример проверяется математически и методически: следующий шаг должен быть допустимым ходом для выбранного блока.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {breadcrumb.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-bg p-4">
              <div className="text-[11px] font-bold text-ink-faint">{label}</div>
              <div className="mt-1 text-[15px] font-black text-ink">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <FormulaTable title="Формулы на 5" note="Переход через пятёрку внутри разряда. Метка - что видит ученик; механика - ход на абакусе." formulas={FIVE_FORMULAS} />
        <FormulaTable title="Формулы на 10" note="Переход через десяток с переносом в следующий разряд. Конкретные правила уточняются по примерам методиста." formulas={TEN_FORMULAS} />
      </div>

      <section className="rounded-2xl border border-line bg-card p-5">
        <Badge tone="brand">Скоуп 1 этапа</Badge>
        <h2 className="mt-3 text-[22px] font-black">Базовый онлайн-тренажёр</h2>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {[
            ["Входит", "числа по одному, ввод ответа, автоматическая проверка, 2-10 рядов, 1-50 примеров, скорость 5.0-0.1с, блоки 1-9 / 10-90 / 11-99 / до 999 / формулы на 5 / формулы на 10."],
            ["Не входит", "кабинеты учеников и педагогов, база учеников, расписание, отчёты, домашние задания, оплаты, интеграции, мобильное приложение, умножение и деление."],
            ["Методический принцип", "для блоков без формул генератор берёт только прямые ходы. Для формул отдельные блоки собираются по разрешённым правилам на 5 или на 10."],
            ["Передача", "после сдачи передаётся исходный код и доступы к результату; база данных в первом этапе не используется."],
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

function Sidebar({ view, setView }: { view: View; setView: (view: View) => void }) {
  return (
    <aside className="hidden w-[250px] flex-shrink-0 border-r border-line bg-card px-4 py-5 min-[1760px]:flex min-[1760px]:flex-col">
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
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">1 этап</div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">Только базовый тренажёр сложения и вычитания по методике Mandarin.</p>
      </div>
    </aside>
  );
}

function TrainerView({ settings, setSettings }: { settings: Settings; setSettings: (s: Settings) => void }) {
  return (
    <div className="grid gap-4 min-[1760px]:grid-cols-[minmax(0,1fr)_430px]">
      <div className="space-y-4">
        <Trainer settings={settings} />
      </div>
      <div>
        <SettingsPanel settings={settings} setSettings={setSettings} />
      </div>
    </div>
  );
}

export default function Page() {
  const [view, setView] = useState<View>("trainer");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const title = viewItems.find((item) => item.id === view)?.label ?? "Тренажёр";

  return (
    <main className="min-h-screen bg-bg text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] border-x border-line bg-bg">
        <Sidebar view={view} setView={(value) => { setView(value); setMobileNavOpen(false); }} />
        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-line bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center justify-between gap-3">
                <div className="min-[1760px]:hidden"><Logo /></div>
                <div className="hidden min-[1760px]:block">
                  <h1 className="text-[20px] font-black tracking-tight">{title}</h1>
                  <p className="mt-1 text-[12px] text-ink-soft">первый этап Mandarin</p>
                </div>
                <button onClick={() => setMobileNavOpen((value) => !value)} className="rounded-xl border border-line p-2 text-ink-soft min-[1760px]:hidden" aria-label="Меню">
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
            <div className="mt-3 min-[1760px]:hidden">
              <h1 className="text-[18px] font-black tracking-tight">{title}</h1>
              <p className="mt-1 text-[12px] text-ink-soft">числа по одному, без предпросмотра</p>
            </div>
            {mobileNavOpen && (
              <div className="mt-3 grid grid-cols-1 gap-2 rounded-2xl border border-line bg-bg p-2 min-[1760px]:hidden">
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
            {view === "trainer" && <TrainerView settings={settings} setSettings={setSettings} />}
            {view === "method" && <MethodologyView settings={settings} />}
          </div>
        </section>
      </div>
    </main>
  );
}
