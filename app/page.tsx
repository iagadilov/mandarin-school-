"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
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

const IArrow = Icon(<><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>);

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

const taskOrder: TaskType[] = [
  "movements",
  "tens",
  "double",
  "doubleMixed",
  "triple",
  "tripleSame",
  "formula5",
  "formula10",
  "doubleSameFormula5",
  "doubleMixedFormula5",
  "doubleMixedFormula10",
  "tripleSameFormula5",
];
const rowPresets = [2, 3, 4, 5, 6, 10];
const examplePresets = [1, 10, 20, 30, 50];
const speedPresets = [3, 2, 1, 0.5, 0.1];
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

function PresetButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-xl border px-3 text-[12px] font-black transition ${
        active ? "border-brand bg-brand text-white shadow-sm" : "border-line bg-bg text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

function SettingsPanel({ settings, setSettings }: { settings: Settings; setSettings: (s: Settings) => void }) {
  const level = findLevel(settings.levelId);
  const lesson = findLesson(level, settings.lessonId);
  const est = formatDuration(estimateSeconds(settings));
  const applySettings = (next: Settings) => {
    setSettings(next);
  };

  return (
    <section className="rounded-2xl border border-line bg-card p-4 transition sm:p-5">
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
          <div className="mt-2 grid gap-2 min-[520px]:grid-cols-2 xl:grid-cols-1 min-[1720px]:grid-cols-2">
            {taskOrder.map((taskType) => (
              <button
                key={taskType}
                onClick={() => applySettings(settingsForTask(settings, taskType))}
                className={`rounded-xl border px-3 py-3 text-left text-[12px] font-extrabold leading-snug ${settings.taskType === taskType ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-bg text-ink-soft"}`}
              >
                {TASK_LABELS[taskType]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">{lesson.note}</p>
        </div>

        <label className="block">
          <span className="text-[12px] font-extrabold text-ink-faint">Количество чисел в примере: {settings.rows}</span>
          <div className="mt-2 grid grid-cols-3 gap-2 min-[520px]:grid-cols-6 xl:grid-cols-3 2xl:grid-cols-6">
            {rowPresets.map((value) => (
              <PresetButton key={value} active={settings.rows === value} onClick={() => applySettings({ ...settings, rows: value })}>
                {value}
              </PresetButton>
            ))}
          </div>
          <input type="range" min={2} max={10} value={settings.rows} onChange={(e) => applySettings({ ...settings, rows: Number(e.target.value) })} className="mt-3 w-full accent-[var(--brand)]" />
          <span className="mt-1 block text-[10.5px] font-bold text-ink-faint">от 2 до 10</span>
        </label>

        <label className="block">
          <span className="text-[12px] font-extrabold text-ink-faint">Количество примеров: {settings.examples}</span>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {examplePresets.map((value) => (
              <PresetButton key={value} active={settings.examples === value} onClick={() => applySettings({ ...settings, examples: value })}>
                {value}
              </PresetButton>
            ))}
          </div>
          <input type="range" min={1} max={50} value={settings.examples} onChange={(e) => applySettings({ ...settings, examples: Number(e.target.value) })} className="mt-3 w-full accent-[var(--brand)]" />
          <span className="mt-1 block text-[10.5px] font-bold text-ink-faint">от 1 до 50</span>
        </label>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-extrabold text-ink-faint">Скорость показа</span>
            <b className="text-brand-dark">{settings.speed.toFixed(1)} с</b>
          </div>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {speedPresets.map((value) => (
              <PresetButton key={value} active={settings.speed === value} onClick={() => applySettings({ ...settings, speed: value })}>
                {value.toFixed(value < 1 ? 1 : 0)}с
              </PresetButton>
            ))}
          </div>
          <input type="range" min={0.1} max={5} step={0.1} value={settings.speed} onChange={(e) => applySettings({ ...settings, speed: Number(e.target.value) })} className="mt-3 w-full accent-[var(--brand)]" />
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
  const hasAnswer = input.trim().length > 0;

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
    if (!input.trim()) return;
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
            {phase === "summary" ? "Серия завершена" : `Пример ${Math.min(exampleIndex + 1, session.length)} из ${session.length}`}
          </span>
        </div>

        <div className="mt-5 flex min-h-[360px] flex-col items-center justify-center text-center sm:min-h-[420px] xl:min-h-[460px] 2xl:min-h-[500px]">
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
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && check()} inputMode="numeric" placeholder="0" className="mt-4 w-full rounded-2xl border-2 border-brand-soft bg-bg px-5 py-4 text-center text-[38px] font-black outline-none placeholder:text-ink-faint focus:border-brand" />
              <button disabled={!hasAnswer} onClick={check} className="brand-grad mt-4 w-full rounded-xl px-5 py-3 text-[13px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45">Проверить</button>
              {!hasAnswer && <div className="mt-2 text-[11px] font-bold text-ink-faint">Введите ответ, чтобы проверить пример.</div>}
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
                <div className="mt-2 flex flex-nowrap gap-2 overflow-x-auto pb-1">
                  {current.operands.map((operand, index) => (
                    <span key={`${operand}-${index}`} className="shrink-0 rounded-xl border border-line bg-card px-3 py-1.5 text-[14px] font-black text-brand-dark">
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
            <span>{phase === "showing" ? "число по центру" : phase === "answer" ? "ввод ответа" : phase === "result" ? "пример раскрыт" : phase === "summary" ? "итог" : "без предпросмотра"}</span>
          </div>
        </div>
      </div>

      {phase === "showing" && (
        <div className="mt-4">
          <button onClick={() => setPhase("paused")} className="w-full rounded-xl border border-line bg-bg px-5 py-3 text-[13px] font-extrabold text-ink">Пауза</button>
        </div>
      )}
    </section>
  );
}

function TrainerView({ settings, setSettings }: { settings: Settings; setSettings: (s: Settings) => void }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <Trainer settings={settings} />
      </div>
      <div className="xl:sticky xl:top-[92px] xl:self-start">
        <SettingsPanel settings={settings} setSettings={setSettings} />
      </div>
    </div>
  );
}

export default function Page() {
  const [settings, setSettings] = useState<Settings>(initialSettings);

  return (
    <main className="min-h-screen bg-bg text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] border-x border-line bg-bg">
        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-line bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Logo />
              <div className="text-left sm:text-right">
                <h1 className="text-[18px] font-black tracking-tight">Тренажёр</h1>
                <p className="mt-1 text-[12px] text-ink-soft">числа по одному, без предпросмотра</p>
              </div>
            </div>
          </header>
          <div className="p-4 sm:p-6">
            <TrainerView settings={settings} setSettings={setSettings} />
          </div>
        </section>
      </div>
    </main>
  );
}
