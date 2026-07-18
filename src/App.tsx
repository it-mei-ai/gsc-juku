import { ChangeEvent, CSSProperties, FormEvent, useState } from "react";
import {
  Activity,
  BarChart3,
  Briefcase,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  Dumbbell,
  Eye,
  FileImage,
  Filter,
  Flag,
  Heart,
  HeartPulse,
  ImageUp,
  Lightbulb,
  LineChart,
  MessageSquareText,
  Moon,
  Plus,
  Rocket,
  Save,
  Scale,
  Sparkles,
  Star,
  Sun,
  Target,
  Trash2,
  Trophy,
  type LucideIcon
} from "lucide-react";

type Mode = "business" | "diet";
type Priority = "must" | "should" | "stop";

type Theme = {
  id: number;
  title: string;
  subtitle: string;
  color: string;
  soft: string;
  icon: LucideIcon;
  image: string;
  points: string[];
  fields: string[];
};

type Task = {
  id: string;
  mode: Mode;
  text: string;
  priority: Priority;
  done: boolean;
};

type Metric = {
  id: string;
  mode: Mode;
  label: string;
  current: number;
  target: number;
  unit: string;
};

type ThemeNote = {
  fields: Record<string, string>;
  learning: string;
  declaration: string;
  support: string;
};

type DietGoal = {
  image: string;
  startDate: string;
  startWeight: number;
  targetWeight: number;
  heightCm: number;
  months: number;
  purpose: string;
  habits: string;
};

type DietDraft = {
  image: string;
  fileName: string;
  date: string;
  month: number;
  weight: number;
  memo: string;
};

type DietCheckIn = DietDraft & {
  id: string;
  advice: string[];
};

type AppState = {
  mode: Mode;
  selectedTheme: number;
  cycleStart: string;
  tasks: Task[];
  metrics: Metric[];
  notes: Record<string, ThemeNote>;
  dietGoal: DietGoal;
  dietDraft: DietDraft;
  dietCheckIns: DietCheckIn[];
};

const STORAGE_KEY = "gsc-habit-loop-app-v2";
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

const themes: Theme[] = [
  {
    id: 1,
    title: "目標設定",
    subtitle: "どこを目指すのか？",
    color: "#e31b5f",
    soft: "#fff0f6",
    icon: Flag,
    image: "/gsc-assets/theme-1.png",
    points: ["未来が行動の原動力になる", "目標が明確だと迷わず進める", "小さな目標の積み重ねが成果になる"],
    fields: ["長期目標", "中期目標", "短期目標"]
  },
  {
    id: 2,
    title: "現状把握",
    subtitle: "今どこにいるのか？",
    color: "#087a2e",
    soft: "#effaf0",
    icon: Eye,
    image: "/gsc-assets/theme-2.png",
    points: ["現状を知ることが第一歩", "課題が見えると改善の方向が定まる", "ギャップを認識すると行動が変わる"],
    fields: ["今の状況", "課題・足りないこと", "目標とのギャップ"]
  },
  {
    id: 3,
    title: "強み分析",
    subtitle: "自分の強みを知り、活かし方を考える",
    color: "#105fba",
    soft: "#edf5ff",
    icon: Star,
    image: "/gsc-assets/theme-3.png",
    points: ["強みを活かすと成果が出やすい", "自信につながり行動が加速する", "周りからの信頼も得られる"],
    fields: ["得意なこと", "好きなこと", "人からよく言われること", "強みの活かし方"]
  },
  {
    id: 4,
    title: "価値・ニーズ分析",
    subtitle: "誰のどんな課題を、どう解決するか",
    color: "#f26a00",
    soft: "#fff4ea",
    icon: Heart,
    image: "/gsc-assets/theme-4.png",
    points: ["誰かの役に立つことで価値が生まれる", "ニーズを知ると喜ばれるサービスになる", "価値提供が信頼と成果をつくる"],
    fields: ["誰を幸せにしたいか", "どんな課題を解決したいか", "どんな価値を提供するか", "相手に届けたい未来"]
  },
  {
    id: 5,
    title: "行動分析",
    subtitle: "行動は目標につながっているか？",
    color: "#0f61b7",
    soft: "#eef6ff",
    icon: LineChart,
    image: "/gsc-assets/theme-5.png",
    points: ["行動を振り返ることで成果につながる", "良かった行動と改善行動が分かる", "目標達成への行動を最適化できる"],
    fields: ["目標", "実際に取り組んだ行動", "成果につながった行動", "成果につながらなかった行動・原因", "改善ポイント"]
  },
  {
    id: 6,
    title: "選択と集中",
    subtitle: "やること・やらないことを決める",
    color: "#6d28a8",
    soft: "#f7efff",
    icon: Filter,
    image: "/gsc-assets/theme-6.png",
    points: ["すべてをやると成果が分散する", "集中すると成果が加速する", "強みにエネルギーを注げる"],
    fields: ["今週やること", "できればやること", "やらないこと", "やめること"]
  },
  {
    id: 7,
    title: "数値目標設定",
    subtitle: "KGI・KPI・行動KPIを決める",
    color: "#7c3aed",
    soft: "#f5f0ff",
    icon: BarChart3,
    image: "/gsc-assets/theme-7.png",
    points: ["目標が明確になり行動精度が上がる", "進捗を数値で把握できる", "達成基準が明確になる"],
    fields: ["KGI", "KPI", "行動KPI"]
  },
  {
    id: 8,
    title: "アクションプラン",
    subtitle: "具体的な行動に落とし込む",
    color: "#f05a00",
    soft: "#fff3e8",
    icon: Rocket,
    image: "/gsc-assets/theme-8.png",
    points: ["道筋が明確になる", "やるべき行動が具体化する", "小さな一歩が大きな成果につながる"],
    fields: ["中心の目標", "重要項目", "具体行動", "今週の優先順位"]
  }
];

const priorityText: Record<Priority, string> = {
  must: "必ずやる",
  should: "できればやる",
  stop: "やらない"
};

function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [taskText, setTaskText] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("must");
  const [copyLabel, setCopyLabel] = useState("コピー");

  const selectedTheme = themes.find((theme) => theme.id === state.selectedTheme) ?? themes[0];
  const activeTasks = state.tasks.filter((task) => task.mode === state.mode);
  const activeMetrics = state.metrics.filter((metric) => metric.mode === state.mode);
  const note = state.notes[String(selectedTheme.id)] ?? emptyNote();
  const businessProgress = activeTasks.length ? Math.round((activeTasks.filter((task) => task.done).length / activeTasks.length) * 100) : 0;
  const dietStats = getDietStats(state);
  const prompt = buildCoachPrompt(state, selectedTheme, note, activeTasks, activeMetrics);
  const schedule = buildMonthlySchedule(state.cycleStart);
  const themeStyle = {
    "--theme": state.mode === "business" ? selectedTheme.color : "#0f766e",
    "--theme-soft": state.mode === "business" ? selectedTheme.soft : "#ecfdf5"
  } as CSSProperties;

  function update(partial: Partial<AppState>) {
    setState((current) => {
      const next = { ...current, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function updateNote(updater: (note: ThemeNote) => ThemeNote) {
    update({
      notes: {
        ...state.notes,
        [String(selectedTheme.id)]: updater(note)
      }
    });
  }

  function addTask(event: FormEvent) {
    event.preventDefault();
    if (!taskText.trim()) return;
    update({
      tasks: [
        {
          id: id("task"),
          mode: state.mode,
          text: taskText.trim(),
          priority: taskPriority,
          done: false
        },
        ...state.tasks
      ]
    });
    setTaskText("");
  }

  function updateTask(taskId: string, partial: Partial<Task>) {
    update({
      tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, ...partial } : task))
    });
  }

  function removeTask(taskId: string) {
    update({ tasks: state.tasks.filter((task) => task.id !== taskId) });
  }

  function updateMetric(metricId: string, partial: Partial<Metric>) {
    update({
      metrics: state.metrics.map((metric) => (metric.id === metricId ? { ...metric, ...partial } : metric))
    });
  }

  function addMetric() {
    update({
      metrics: [...state.metrics, { id: id("metric"), mode: state.mode, label: state.mode === "diet" ? "運動" : "商談", current: 0, target: 10, unit: "回" }]
    });
  }

  async function setDietGoalImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    update({ dietGoal: { ...state.dietGoal, image: await imageToDataUrl(file) } });
  }

  async function setDietDraftImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    update({ dietDraft: { ...state.dietDraft, image: await imageToDataUrl(file), fileName: file.name, date: today() } });
  }

  function saveDietCheckIn() {
    if (!state.dietDraft.image) return;
    const advice = buildDietAdvice(state);
    update({
      dietCheckIns: [{ ...state.dietDraft, id: id("diet"), advice }, ...state.dietCheckIns].slice(0, 24),
      dietDraft: { ...state.dietDraft, image: "", fileName: "", memo: "" }
    });
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopyLabel("コピー済み");
    window.setTimeout(() => setCopyLabel("コピー"), 1400);
  }

  return (
    <div className="app-shell" style={themeStyle}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Sun size={25} /></span>
          <div>
            <p className="eyebrow">GSC Habit Loop</p>
            <h1>GSC 頑張らない習慣化</h1>
          </div>
        </div>
        <div className="mode-switch">
          <button className={state.mode === "business" ? "active" : ""} onClick={() => update({ mode: "business" })}>
            <Briefcase size={18} /> ビジネス
          </button>
          <button className={state.mode === "diet" ? "active" : ""} onClick={() => update({ mode: "diet" })}>
            <HeartPulse size={18} /> ダイエット
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero">
          <div className="hero-copy">
            <p className="program-pill"><Sparkles size={16} /> 見える化 × 振り返り × 行動習慣</p>
            <h2>毎日使って、成果につながる行動を増やす。</h2>
            <p>{state.mode === "business" ? "ビジネス拡大のために、週2回×4週の8テーマで行動を整えます。" : "3ヶ月目標と月1枚の体重管理表で、無理なく続く健康習慣を作ります。"}</p>
          </div>
          {state.mode === "business" ? (
            <figure className="hero-image">
              <img src="/gsc-assets/gsc-utage.png" alt="GSC朝活の8テーマと月間スケジュール" />
            </figure>
          ) : (
            <div className="diet-flow">
              <FlowStep no="1" title="3ヶ月目標" text={`${state.dietGoal.startWeight}kg から ${state.dietGoal.targetWeight}kgへ`} />
              <FlowStep no="2" title="月1枚の管理表" text={`${state.dietDraft.month}ヶ月目を記録`} />
              <FlowStep no="3" title="週2回アップロード" text={`今週 ${dietStats.uploadsThisWeek}/2 回`} />
              <FlowStep no="4" title="アドバイス" text="写真・体重・メモから次の一手へ" />
            </div>
          )}
        </section>

        <section className="summary-grid">
          <MetricTile icon={state.mode === "business" ? CheckCircle2 : Target} label={state.mode === "business" ? "今日の精度" : "3ヶ月目標"} value={state.mode === "business" ? `${businessProgress}%` : `${state.dietGoal.targetWeight}kg`} />
          <MetricTile icon={state.mode === "business" ? BarChart3 : Scale} label={state.mode === "business" ? "KPI平均" : "減量進捗"} value={state.mode === "business" ? `${metricAverage(activeMetrics)}%` : `${dietStats.progress}%`} />
          <MetricTile icon={state.mode === "business" ? Trophy : ImageUp} label={state.mode === "business" ? "月間テーマ" : "今週アップ"} value={state.mode === "business" ? `${selectedTheme.id}/8` : `${dietStats.uploadsThisWeek}/2`} />
          <MetricTile icon={state.mode === "business" ? Briefcase : Dumbbell} label={state.mode === "business" ? "現在の軸" : "現在体重"} value={state.mode === "business" ? "ビジネス" : `${dietStats.currentWeight.toFixed(1)}kg`} />
        </section>

        {state.mode === "business" ? (
          <BusinessView
            schedule={schedule}
            selectedTheme={selectedTheme}
            note={note}
            onThemeSelect={(themeId) => update({ selectedTheme: themeId })}
            onCycleStart={(cycleStart) => update({ cycleStart })}
            onNoteChange={updateNote}
          />
        ) : (
          <DietView
            state={state}
            stats={dietStats}
            onGoalImage={setDietGoalImage}
            onDraftImage={setDietDraftImage}
            onGoalChange={(dietGoal) => update({ dietGoal })}
            onDraftChange={(dietDraft) => update({ dietDraft })}
            onSave={saveDietCheckIn}
            onDelete={(checkInId) => update({ dietCheckIns: state.dietCheckIns.filter((checkIn) => checkIn.id !== checkInId) })}
          />
        )}

        <section className="bottom-grid">
          <ActionPanel
            tasks={activeTasks}
            metrics={activeMetrics}
            taskText={taskText}
            taskPriority={taskPriority}
            onTaskText={setTaskText}
            onTaskPriority={setTaskPriority}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onRemoveTask={removeTask}
            onAddMetric={addMetric}
            onUpdateMetric={updateMetric}
          />
          <section className="panel coach-panel">
            <div className="section-title"><MessageSquareText size={18} /><h3>AIコーチ用メモ</h3></div>
            <textarea value={prompt} readOnly rows={12} />
            <button className="secondary-button" onClick={copyPrompt}><Copy size={17} />{copyLabel}</button>
          </section>
        </section>
      </main>
    </div>
  );
}

function BusinessView({ schedule, selectedTheme, note, onThemeSelect, onCycleStart, onNoteChange }: {
  schedule: Array<{ date: string; themeId: number }>;
  selectedTheme: Theme;
  note: ThemeNote;
  onThemeSelect: (themeId: number) => void;
  onCycleStart: (date: string) => void;
  onNoteChange: (updater: (note: ThemeNote) => ThemeNote) => void;
}) {
  const Icon = selectedTheme.icon;
  return (
    <section className="business-layout">
      <aside className="panel cycle-panel">
        <div className="section-title"><CalendarDays size={18} /><h3>週2回×4週の8テーマ</h3></div>
        <label className="field">
          <span>1回目の開始日</span>
          <input type="date" onChange={(event) => onCycleStart(event.target.value)} />
        </label>
        <div className="theme-list">
          {themes.map((theme) => {
            const ThemeIcon = theme.icon;
            return (
              <button key={theme.id} className={theme.id === selectedTheme.id ? "theme-row active" : "theme-row"} onClick={() => onThemeSelect(theme.id)}>
                <strong>{theme.id}</strong><ThemeIcon size={18} /><span>{theme.title}</span>
              </button>
            );
          })}
        </div>
        <div className="schedule-list">
          {schedule.map((item) => (
            <button key={`${item.date}-${item.themeId}`} onClick={() => onThemeSelect(item.themeId)}>
              <span>{formatDate(item.date)}</span><strong>{item.themeId}. {themes[item.themeId - 1].title}</strong>
            </button>
          ))}
        </div>
      </aside>

      <section className="panel worksheet-panel">
        <div className="theme-header">
          <div>
            <span>テーマ {selectedTheme.id}</span>
            <h2>{selectedTheme.title}</h2>
            <p>{selectedTheme.subtitle}</p>
          </div>
          <Icon size={46} />
        </div>
        <div className="point-grid">
          {selectedTheme.points.map((point) => <div key={point}><Lightbulb size={17} />{point}</div>)}
        </div>
        <div className="worksheet-grid">
          <div>
            {selectedTheme.fields.map((field) => (
              <label className="field" key={field}>
                <span>{field}</span>
                <textarea value={note.fields[field] ?? ""} onChange={(event) => onNoteChange((current) => ({ ...current, fields: { ...current.fields, [field]: event.target.value } }))} rows={2} />
              </label>
            ))}
          </div>
          <figure><img src={selectedTheme.image} alt={`${selectedTheme.title}ワークシート`} /></figure>
        </div>
        <div className="reflection-grid">
          <label className="field"><span>今週の気づき・学び</span><textarea value={note.learning} onChange={(event) => onNoteChange((current) => ({ ...current, learning: event.target.value }))} rows={3} /></label>
          <label className="field"><span>今週の行動宣言</span><textarea value={note.declaration} onChange={(event) => onNoteChange((current) => ({ ...current, declaration: event.target.value }))} rows={3} /></label>
          <label className="field"><span>今週の応援宣言</span><textarea value={note.support} onChange={(event) => onNoteChange((current) => ({ ...current, support: event.target.value }))} rows={3} /></label>
        </div>
      </section>
    </section>
  );
}

function DietView({ state, stats, onGoalImage, onDraftImage, onGoalChange, onDraftChange, onSave, onDelete }: {
  state: AppState;
  stats: ReturnType<typeof getDietStats>;
  onGoalImage: (event: ChangeEvent<HTMLInputElement>) => void;
  onDraftImage: (event: ChangeEvent<HTMLInputElement>) => void;
  onGoalChange: (goal: DietGoal) => void;
  onDraftChange: (draft: DietDraft) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}) {
  const advice = state.dietDraft.image ? buildDietAdvice(state) : state.dietCheckIns[0]?.advice ?? ["体重管理表の写真をアップロードすると、進捗とメモに合わせたアドバイスを表示します。"];
  return (
    <section className="diet-panel panel">
      <div className="diet-heading">
        <div><p className="eyebrow">Diet Sheet Flow</p><h2>3ヶ月目標シートと体重管理表</h2></div>
        <span><CalendarCheck2 size={17} /> 月1枚の管理表 / 週2回アップロード</span>
      </div>
      <div className="diet-grid">
        <section className="diet-card">
          <div className="section-title"><FileImage size={18} /><h3>3ヶ月目標設定シート</h3></div>
          <label className="upload-box"><input type="file" accept="image/*" onChange={onGoalImage} /><ImageUp size={22} />目標シートをアップロード</label>
          {state.dietGoal.image && <img className="sheet-image" src={state.dietGoal.image} alt="目標設定シート" />}
          <div className="form-grid">
            <NumberField label="身長 cm" value={state.dietGoal.heightCm} onChange={(value) => onGoalChange({ ...state.dietGoal, heightCm: value })} />
            <NumberField label="開始体重 kg" value={state.dietGoal.startWeight} onChange={(value) => onGoalChange({ ...state.dietGoal, startWeight: value })} />
            <NumberField label="目標体重 kg" value={state.dietGoal.targetWeight} onChange={(value) => onGoalChange({ ...state.dietGoal, targetWeight: value })} />
            <NumberField label="期間 ヶ月" value={state.dietGoal.months} onChange={(value) => onGoalChange({ ...state.dietGoal, months: value })} />
          </div>
          <label className="field"><span>目的</span><textarea value={state.dietGoal.purpose} onChange={(event) => onGoalChange({ ...state.dietGoal, purpose: event.target.value })} rows={2} /></label>
          <label className="field"><span>続ける習慣</span><textarea value={state.dietGoal.habits} onChange={(event) => onGoalChange({ ...state.dietGoal, habits: event.target.value })} rows={3} /></label>
        </section>

        <section className="diet-card">
          <div className="section-title"><Scale size={18} /><h3>体重管理表アップロード</h3></div>
          <label className="upload-box"><input type="file" accept="image/*" onChange={onDraftImage} /><ImageUp size={22} />管理表の写真をアップロード</label>
          {state.dietDraft.image && <img className="sheet-image" src={state.dietDraft.image} alt="体重管理表" />}
          <div className="form-grid">
            <label className="field"><span>記録日</span><input type="date" value={state.dietDraft.date} onChange={(event) => onDraftChange({ ...state.dietDraft, date: event.target.value })} /></label>
            <NumberField label="何ヶ月目" value={state.dietDraft.month} onChange={(value) => onDraftChange({ ...state.dietDraft, month: value })} />
            <NumberField label="現在体重 kg" value={state.dietDraft.weight} onChange={(value) => onDraftChange({ ...state.dietDraft, weight: value })} />
          </div>
          <label className="field"><span>写真から読めたこと・本人メモ</span><textarea value={state.dietDraft.memo} onChange={(event) => onDraftChange({ ...state.dietDraft, memo: event.target.value })} rows={4} /></label>
          <button className="primary-button full" disabled={!state.dietDraft.image} onClick={onSave}><Save size={17} />アップロード記録を保存</button>
        </section>

        <section className="diet-card">
          <div className="section-title"><MessageSquareText size={18} /><h3>アドバイス</h3></div>
          <div className="diet-stats">
            <span>減量 {stats.lost.toFixed(1)}kg</span><span>残り {stats.remaining.toFixed(1)}kg</span><span>BMI {bmi(stats.currentWeight, state.dietGoal.heightCm).toFixed(1)}</span><span>今週 {stats.uploadsThisWeek}/2</span>
          </div>
          <ul className="advice-list">{advice.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>

      <div className="history">
        <div className="section-title"><ClipboardList size={18} /><h3>体重管理表の履歴</h3></div>
        {state.dietCheckIns.length === 0 ? <p className="muted">まだアップロード記録がありません。</p> : (
          <div className="history-grid">
            {state.dietCheckIns.slice(0, 6).map((checkIn) => (
              <article key={checkIn.id}>
                <img src={checkIn.image} alt={`${checkIn.date}の体重管理表`} />
                <div><strong>{checkIn.weight.toFixed(1)}kg</strong><span>{formatDate(checkIn.date)} / {checkIn.month}ヶ月目</span><p>{checkIn.advice[0]}</p></div>
                <button onClick={() => onDelete(checkIn.id)}><Trash2 size={15} /></button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ActionPanel(props: {
  tasks: Task[];
  metrics: Metric[];
  taskText: string;
  taskPriority: Priority;
  onTaskText: (value: string) => void;
  onTaskPriority: (value: Priority) => void;
  onAddTask: (event: FormEvent) => void;
  onUpdateTask: (id: string, partial: Partial<Task>) => void;
  onRemoveTask: (id: string) => void;
  onAddMetric: () => void;
  onUpdateMetric: (id: string, partial: Partial<Metric>) => void;
}) {
  return (
    <section className="panel action-panel">
      <div className="section-title"><Target size={18} /><h3>今日の行動</h3></div>
      <form className="task-form" onSubmit={props.onAddTask}>
        <input value={props.taskText} onChange={(event) => props.onTaskText(event.target.value)} placeholder="今日の行動を追加" />
        <select value={props.taskPriority} onChange={(event) => props.onTaskPriority(event.target.value as Priority)}>
          {Object.entries(priorityText).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <button className="primary-button"><Plus size={17} />追加</button>
      </form>
      <div className="task-list">
        {props.tasks.map((task) => (
          <div className={task.done ? "task-row done" : "task-row"} key={task.id}>
            <label><input type="checkbox" checked={task.done} onChange={(event) => props.onUpdateTask(task.id, { done: event.target.checked })} />{task.text}</label>
            <select value={task.priority} onChange={(event) => props.onUpdateTask(task.id, { priority: event.target.value as Priority })}>
              {Object.entries(priorityText).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <button onClick={() => props.onRemoveTask(task.id)}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
      <div className="section-title metric-title"><Activity size={18} /><h3>KPI</h3></div>
      <div className="metric-list">
        {props.metrics.map((metric) => (
          <div key={metric.id} className="metric-row">
            <input value={metric.label} onChange={(event) => props.onUpdateMetric(metric.id, { label: event.target.value })} />
            <input type="number" value={metric.current} onChange={(event) => props.onUpdateMetric(metric.id, { current: numberValue(event.target.value) })} />
            <input type="number" value={metric.target} onChange={(event) => props.onUpdateMetric(metric.id, { target: numberValue(event.target.value) })} />
            <input value={metric.unit} onChange={(event) => props.onUpdateMetric(metric.id, { unit: event.target.value })} />
            <div><span style={{ width: `${metricProgress(metric)}%` }} /></div>
          </div>
        ))}
      </div>
      <button className="secondary-button full" onClick={props.onAddMetric}><Plus size={17} />指標を追加</button>
    </section>
  );
}

function MetricTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <article className="metric-tile"><Icon size={22} /><div><span>{label}</span><strong>{value}</strong></div></article>;
}

function FlowStep({ no, title, text }: { no: string; title: string; text: string }) {
  return <article><span>{no}</span><strong>{title}</strong><p>{text}</p></article>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="field"><span>{label}</span><input type="number" value={value} onChange={(event) => onChange(numberValue(event.target.value))} /></label>;
}

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...initialState(), ...JSON.parse(saved) };
  } catch {
    return initialState();
  }
  return initialState();
}

function initialState(): AppState {
  const date = today();
  return {
    mode: "business",
    selectedTheme: 1,
    cycleStart: date,
    notes: {},
    tasks: [
      { id: id("task"), mode: "business", text: "今日の最重要タスクを1つ完了する", priority: "must", done: false },
      { id: id("task"), mode: "business", text: "見込み客へ1件フォローする", priority: "should", done: false },
      { id: id("task"), mode: "business", text: "目的のない情報収集をしない", priority: "stop", done: false },
      { id: id("task"), mode: "diet", text: "体重と食事を記録する", priority: "must", done: false },
      { id: id("task"), mode: "diet", text: "10分歩く", priority: "should", done: false },
      { id: id("task"), mode: "diet", text: "夜の間食をしない", priority: "stop", done: false }
    ],
    metrics: [
      { id: id("metric"), mode: "business", label: "売上", current: 420000, target: 1000000, unit: "円" },
      { id: id("metric"), mode: "business", label: "商談", current: 7, target: 20, unit: "件" },
      { id: id("metric"), mode: "diet", label: "減量", current: 0.8, target: 3, unit: "kg" },
      { id: id("metric"), mode: "diet", label: "運動", current: 5, target: 12, unit: "回" }
    ],
    dietGoal: {
      image: "",
      startDate: date,
      startWeight: 70,
      targetWeight: 62,
      heightCm: 168,
      months: 3,
      purpose: "3ヶ月後に納得できる体型をつくる",
      habits: "1日5分以上歩く\n腹八分を守る\n深い呼吸を1日5分\nよく噛んで食べる"
    },
    dietDraft: { image: "", fileName: "", date, month: 1, weight: 70, memo: "" },
    dietCheckIns: []
  };
}

function emptyNote(): ThemeNote {
  return { fields: {}, learning: "", declaration: "", support: "" };
}

function buildMonthlySchedule(start: string) {
  const schedule: Array<{ date: string; themeId: number }> = [];
  let cursor = new Date(`${start}T00:00:00`);
  for (let guard = 0; guard < 60 && schedule.length < 8; guard += 1) {
    const day = cursor.getDay();
    if (day === 2 || day === 5) schedule.push({ date: toIso(cursor), themeId: schedule.length + 1 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return schedule;
}

function getDietStats(state: AppState) {
  const currentWeight = state.dietCheckIns[0]?.weight || state.dietDraft.weight || state.dietGoal.startWeight;
  const targetLoss = Math.max(state.dietGoal.startWeight - state.dietGoal.targetWeight, 0);
  const lost = Math.max(state.dietGoal.startWeight - currentWeight, 0);
  const remaining = Math.max(currentWeight - state.dietGoal.targetWeight, 0);
  const weekAgo = Date.now() - 6 * 86_400_000;
  const uploadsThisWeek = state.dietCheckIns.filter((checkIn) => new Date(`${checkIn.date}T00:00:00`).getTime() >= weekAgo).length;
  return { currentWeight, lost, remaining, uploadsThisWeek, progress: targetLoss ? Math.min(100, Math.round((lost / targetLoss) * 100)) : 0 };
}

function buildDietAdvice(state: AppState) {
  const stats = getDietStats(state);
  const advice: string[] = [];
  if (!state.dietGoal.image) advice.push("まず3ヶ月目標設定シートを登録すると、目的に沿ったアドバイスにできます。");
  if (stats.progress >= 40) advice.push("目標に向けて良いペースです。今週は増やすより、今できている行動を崩さないことを優先しましょう。");
  else advice.push("次回までに、食事記録か歩く時間のどちらか1つだけ確実に増やしましょう。");
  if (stats.uploadsThisWeek >= 2) advice.push("週2回のアップロードペースを守れています。写真を撮る行為そのものが良いブレーキになります。");
  else advice.push("今週はあと1回、体重管理表を撮ってアップロードしましょう。朝活か夜活のタイミングに固定すると続きやすいです。");
  if (state.dietDraft.memo.includes("飲") || state.dietDraft.memo.includes("外食")) advice.push("飲み会や外食がある週は、翌日を調整日にして水分・歩数・夕食量を整えましょう。");
  advice.push("体調不良や強い空腹が続く場合は無理に減らさず、専門家に相談しながら進めてください。");
  return advice;
}

function buildCoachPrompt(state: AppState, theme: Theme, note: ThemeNote, tasks: Task[], metrics: Metric[]) {
  const taskLines = tasks.map((task) => `- [${task.done ? "完了" : "未完了"}] ${priorityText[task.priority]}: ${task.text}`).join("\n");
  if (state.mode === "diet") {
    const stats = getDietStats(state);
    return [
      "GSC習慣化アプリのダイエット記録です。",
      `開始体重: ${state.dietGoal.startWeight}kg`,
      `目標体重: ${state.dietGoal.targetWeight}kg`,
      `現在体重: ${stats.currentWeight.toFixed(1)}kg`,
      `減量進捗: ${stats.progress}%`,
      `今週アップロード: ${stats.uploadsThisWeek}/2回`,
      `目的: ${state.dietGoal.purpose}`,
      `メモ: ${state.dietDraft.memo || state.dietCheckIns[0]?.memo || "未記入"}`,
      "",
      "今日の行動:",
      taskLines || "- 未登録",
      "",
      "依頼: 無理のない次回までの食事・運動・記録アドバイスを3つ提案してください。"
    ].join("\n");
  }
  return [
    "GSC習慣化アプリのビジネス記録です。",
    `テーマ: ${theme.id}. ${theme.title}`,
    ...theme.fields.map((field) => `- ${field}: ${note.fields[field] || "未記入"}`),
    `気づき: ${note.learning || "未記入"}`,
    `行動宣言: ${note.declaration || "未記入"}`,
    "",
    "今日の行動:",
    taskLines || "- 未登録",
    "",
    "KPI:",
    metrics.map((metric) => `- ${metric.label}: ${metric.current}${metric.unit}/${metric.target}${metric.unit}`).join("\n") || "- 未登録",
    "",
    "依頼: 明日の最重要タスク1つ、やらないこと1つ、改善アドバイスを短く提案してください。"
  ].join("\n");
}

function metricAverage(metrics: Metric[]) {
  if (!metrics.length) return 0;
  return Math.round(metrics.reduce((sum, metric) => sum + metricProgress(metric), 0) / metrics.length);
}

function metricProgress(metric: Metric) {
  return metric.target ? Math.min(100, Math.round((metric.current / metric.target) * 100)) : 0;
}

function bmi(weight: number, heightCm: number) {
  const meter = heightCm / 100;
  return meter ? weight / (meter * meter) : 0;
}

async function imageToDataUrl(file: File) {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = raw;
  });
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1200 / image.width);
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.75);
}

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" }).format(new Date(`${iso}T00:00:00`));
}

export default App;
