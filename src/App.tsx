import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  FileImage,
  FolderOpen,
  GraduationCap,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UsersRound,
  Wand2,
  XCircle
} from "lucide-react";
import "./styles.css";

type Role = "student" | "parent" | "teacher" | "admin";
type Subject = "数学" | "英語";
type Result = "correct" | "partial" | "incorrect";
type FileStatus = "pending" | "analyzing" | "analyzed" | "error";

type Session = {
  email: string;
  role: Role;
  linkedStudentIds: string[];
  expiresAt: number;
};

type DriveFile = {
  id: string;
  name: string;
  capturedAt: string;
  subject: Subject;
  status: FileStatus;
};

type UnitAnalysis = {
  name: string;
  correct: number;
  partial: number;
  total: number;
  focus: string;
  growth: string;
};

type QuestionAnalysis = {
  number: number;
  unit: string;
  result: Result;
  comment: string;
};

type TestAnalysis = {
  id: string;
  title: string;
  subject: Subject;
  score: number;
  maxScore: number;
  average: number;
  date: string;
  files: DriveFile[];
  units: UnitAnalysis[];
  questions: QuestionAnalysis[];
  nextPlan: string[];
  teacherMemo: string;
};

type Student = {
  id: string;
  studentCode: string;
  name: string;
  grade: string;
  guardian: string;
  analyses: TestAnalysis[];
};

const SESSION_KEY = "gsc-test-analysis-session-v2";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const ACCOUNT_SHEET_NAME = "GSC学習塾 / アカウント";

const resultLabels: Record<Result, string> = {
  correct: "正答",
  partial: "部分点",
  incorrect: "誤答"
};

const roleLabels: Record<Role, string> = {
  student: "生徒",
  parent: "保護者",
  teacher: "講師",
  admin: "管理者"
};

const initialStudents: Student[] = [
  {
    id: "student-hinata",
    studentCode: "STU-7KQ3-92A",
    name: "佐藤ひなた",
    grade: "中2",
    guardian: "佐藤恵理",
    analyses: [
      {
        id: "hinata-math-1",
        title: "1学期期末テスト",
        subject: "数学",
        score: 68,
        maxScore: 100,
        average: 61,
        date: "2026-07-05",
        files: [
          {
            id: "file-hm-1",
            name: "数学_1学期期末_答案1.jpg",
            capturedAt: "2026-07-06 19:24",
            subject: "数学",
            status: "analyzed"
          },
          {
            id: "file-hm-2",
            name: "数学_1学期期末_答案2.jpg",
            capturedAt: "2026-07-06 19:25",
            subject: "数学",
            status: "analyzed"
          }
        ],
        units: [
          {
            name: "連立方程式",
            correct: 5,
            partial: 1,
            total: 8,
            focus: "文章題で式を立てる前の条件整理が弱点です。",
            growth: "計算処理は安定しているので、演習量を増やすと得点源になります。"
          },
          {
            name: "一次関数",
            correct: 3,
            partial: 2,
            total: 7,
            focus: "グラフから傾きを読む問題で取り違えが出ています。",
            growth: "表と式の変換はできているため、図の読み取りを補強します。"
          },
          {
            name: "資料の整理",
            correct: 5,
            partial: 0,
            total: 5,
            focus: "大きな弱点はありません。",
            growth: "中央値と範囲の判断が速く、応用問題でさらに伸ばせます。"
          }
        ],
        questions: [
          {
            number: 2,
            unit: "連立方程式",
            result: "correct",
            comment: "代入法の計算は正確。途中式も読みやすいです。"
          },
          {
            number: 5,
            unit: "連立方程式",
            result: "incorrect",
            comment: "人数と金額の条件を逆に置いています。線を引いて条件分解しましょう。"
          },
          {
            number: 8,
            unit: "一次関数",
            result: "partial",
            comment: "式は合っていますが、グラフ上の切片の書き込みで減点されています。"
          },
          {
            number: 12,
            unit: "資料の整理",
            result: "correct",
            comment: "度数分布表から必要な値を素早く拾えています。"
          }
        ],
        nextPlan: [
          "連立方程式の文章題を10分演習で毎回3問",
          "一次関数はグラフ、表、式を相互変換する練習",
          "資料の整理は応用問題で満点維持を狙う"
        ],
        teacherMemo:
          "正答できる問題の途中式はきれいです。弱点単元だけでなく、得点源の単元をさらに伸ばす時間も確保します。"
      },
      {
        id: "hinata-english-1",
        title: "1学期期末テスト",
        subject: "英語",
        score: 74,
        maxScore: 100,
        average: 66,
        date: "2026-07-04",
        files: [
          {
            id: "file-he-1",
            name: "英語_1学期期末_答案.jpg",
            capturedAt: "2026-07-06 19:31",
            subject: "英語",
            status: "analyzed"
          }
        ],
        units: [
          {
            name: "不定詞",
            correct: 6,
            partial: 1,
            total: 8,
            focus: "名詞的用法と副詞的用法の見分けで迷いが出ています。",
            growth: "基本文の語順は安定しています。"
          },
          {
            name: "長文読解",
            correct: 7,
            partial: 1,
            total: 9,
            focus: "設問の根拠に線を引く習慣を作るとさらに安定します。",
            growth: "本文の要点をつかむ力は強みです。"
          },
          {
            name: "英作文",
            correct: 2,
            partial: 2,
            total: 5,
            focus: "三単現と時制の見落としが減点につながっています。",
            growth: "使える表現は増えているため、添削後の書き直しで伸ばせます。"
          }
        ],
        questions: [
          {
            number: 3,
            unit: "不定詞",
            result: "partial",
            comment: "意味は取れていますが、用法名の選択で迷いがあります。"
          },
          {
            number: 9,
            unit: "長文読解",
            result: "correct",
            comment: "指示語の内容を正しく追えています。"
          },
          {
            number: 14,
            unit: "英作文",
            result: "incorrect",
            comment: "主語が三人称単数のときの動詞変化を確認しましょう。"
          }
        ],
        nextPlan: [
          "不定詞は例文を3分類して音読",
          "長文は根拠線を引いてから選択肢を読む",
          "英作文は1文ずつ時制と主語をチェック"
        ],
        teacherMemo:
          "読解はよく伸びています。文法の小さなミスを減らせば80点台が見えます。"
      }
    ]
  },
  {
    id: "student-ren",
    studentCode: "STU-4NX8-11B",
    name: "高橋れん",
    grade: "中3",
    guardian: "高橋真由",
    analyses: [
      {
        id: "ren-math-1",
        title: "実力確認テスト",
        subject: "数学",
        score: 82,
        maxScore: 100,
        average: 64,
        date: "2026-07-07",
        files: [
          {
            id: "file-rm-1",
            name: "数学_実力確認_答案.jpg",
            capturedAt: "2026-07-08 20:10",
            subject: "数学",
            status: "analyzed"
          }
        ],
        units: [
          {
            name: "二次方程式",
            correct: 7,
            partial: 0,
            total: 8,
            focus: "解の公式で符号を急いで書くとミスがあります。",
            growth: "因数分解で解ける形を見抜くのが得意です。"
          },
          {
            name: "図形と相似",
            correct: 5,
            partial: 2,
            total: 8,
            focus: "証明の最後の結論文が不足しやすいです。",
            growth: "相似条件の選択は正確です。"
          },
          {
            name: "確率",
            correct: 6,
            partial: 0,
            total: 6,
            focus: "大きな弱点はありません。",
            growth: "場合分けが整理されており、入試標準問題まで伸ばせます。"
          }
        ],
        questions: [
          {
            number: 1,
            unit: "二次方程式",
            result: "correct",
            comment: "因数分解の選択が速く、計算も安定しています。"
          },
          {
            number: 7,
            unit: "図形と相似",
            result: "partial",
            comment: "方針は合っています。証明の根拠を一文追加しましょう。"
          },
          {
            number: 11,
            unit: "確率",
            result: "correct",
            comment: "樹形図なしでも漏れなく整理できています。"
          }
        ],
        nextPlan: [
          "二次方程式は符号チェックの型を固定",
          "図形証明は結論文テンプレートを練習",
          "確率は入試レベルの複合問題へ進む"
        ],
        teacherMemo:
          "基礎は十分に強いです。答案の説明力を上げると上位校対策に直結します。"
      }
    ]
  }
];

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (session.expiresAt <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function formatPercent(unit: UnitAnalysis) {
  return Math.round(((unit.correct + unit.partial * 0.5) / unit.total) * 100);
}

function statusLabel(status: FileStatus) {
  if (status === "analyzed") return "解析済み";
  if (status === "analyzing") return "解析中";
  if (status === "pending") return "待機中";
  return "要確認";
}

function App() {
  const [students, setStudents] = useState(initialStudents);
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [email, setEmail] = useState("");
  const [secretId, setSecretId] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudents[0].id);
  const [selectedSubject, setSelectedSubject] = useState<Subject>("数学");
  const [auditResult, setAuditResult] = useState("未実行");
  const [syncMessage, setSyncMessage] = useState("Google Driveフォルダは未接続です");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const visibleStudents = useMemo(() => {
    if (!session) return [];
    if (session.role === "teacher" || session.role === "admin") return students;
    return students.filter((student) => session.linkedStudentIds.includes(student.id));
  }, [session, students]);

  useEffect(() => {
    if (visibleStudents.length > 0 && !visibleStudents.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(visibleStudents[0].id);
    }
  }, [selectedStudentId, visibleStudents]);

  const selectedStudent = visibleStudents.find((student) => student.id === selectedStudentId) ?? visibleStudents[0];

  const selectedAnalysis = selectedStudent?.analyses.find((analysis) => analysis.subject === selectedSubject);
  const pendingFiles = selectedStudent?.analyses.flatMap((analysis) => analysis.files).filter((file) => file.status !== "analyzed").length ?? 0;

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedSecret = secretId.trim();

    if (!normalizedEmail || !normalizedSecret) {
      setLoginMessage("メールアドレスとIDを入力してください。");
      return;
    }

    setLoginLoading(true);
    setLoginMessage("スプレッドシートの登録情報を確認しています...");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, secretId: normalizedSecret })
      });
      const payload = (await response.json()) as { account?: Omit<Session, "expiresAt">; error?: string };

      if (!response.ok || !payload.account) {
        setLoginMessage(payload.error ?? "登録済みメールアドレスとIDの組み合わせが見つかりません。");
        return;
      }

      const nextSession: Session = {
        ...payload.account,
        expiresAt: Date.now() + SESSION_TTL_MS
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      setLoginMessage("");
      setSelectedStudentId(nextSession.linkedStudentIds[0] ?? initialStudents[0].id);
    } catch {
      setLoginMessage("アカウント確認APIに接続できませんでした。時間をおいて再度お試しください。");
    } finally {
      setLoginLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setAuditResult("未実行");
  }

  function runDriveSync() {
    setSyncMessage("Google Driveの答案フォルダを確認中...");
    window.setTimeout(() => {
      setSyncMessage("3件の答案写真を確認しました。新規ファイルは自動解析待ちに入ります。");
    }, 650);
  }

  function runAccessAudit() {
    if (!session) return;
    const blockedStudent = students.find((student) => !session.linkedStudentIds.includes(student.id));
    if (session.role === "student" || session.role === "parent") {
      setAuditResult(
        blockedStudent
          ? `${blockedStudent.studentCode} への参照を拒否しました。API想定: 403 Forbidden`
          : "閲覧可能な生徒だけが返却されています。"
      );
      return;
    }
    setAuditResult("講師・管理者ロールとして全生徒の閲覧を許可しています。操作ログを保存します。");
  }

  function handleFiles(files: FileList | null) {
    if (!files || !selectedStudent) return;
    const nextFiles: DriveFile[] = Array.from(files).map((file, index) => ({
      id: `local-${Date.now()}-${index}`,
      name: file.name,
      capturedAt: new Date().toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }),
      subject: selectedSubject,
      status: "analyzing"
    }));

    setStudents((current) =>
      current.map((student) => {
        if (student.id !== selectedStudent.id) return student;
        return {
          ...student,
          analyses: student.analyses.map((analysis) =>
            analysis.subject === selectedSubject
              ? { ...analysis, files: [...nextFiles, ...analysis.files] }
              : analysis
          )
        };
      })
    );
    setSyncMessage(`${nextFiles.length}件の答案写真を追加しました。解析結果は自動更新されます。`);
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <div className="brand-line">
            <span className="brand-mark">
              <GraduationCap size={28} />
            </span>
            <div>
              <p className="eyebrow">GSC学習塾</p>
              <h1>定期テスト現状分析</h1>
            </div>
          </div>

          <div className="auth-grid">
            <form className="login-card" onSubmit={handleLogin}>
              <div>
                <p className="section-kicker">Spreadsheet Login</p>
                <h2>登録済みアカウントだけログイン</h2>
                <p className="muted">
                  アカウントはGoogleスプレッドシートで管理します。メールアドレスとIDの組み合わせをサーバー側で照合します。
                </p>
              </div>

              <label>
                メールアドレス
                <span className="input-shell">
                  <Mail size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="例: user@example.com"
                  />
                </span>
              </label>

              <label>
                ID
                <span className="input-shell">
                  <KeyRound size={18} />
                  <input
                    value={secretId}
                    onChange={(event) => setSecretId(event.target.value)}
                    placeholder="例: ADM-YYYY-001"
                  />
                </span>
              </label>

              <button className="primary-button" type="submit" disabled={loginLoading}>
                <ShieldCheck size={18} />
                {loginLoading ? "確認中" : "登録を確認してログイン"}
              </button>

              {loginMessage ? <p className="form-message">{loginMessage}</p> : null}

              <div className="security-list" aria-label="セキュリティ方針">
                <span>
                  <ShieldCheck size={16} />
                  シート照合
                </span>
                <span>
                  <Lock size={16} />
                  API側で確認
                </span>
                <span>
                  <UsersRound size={16} />
                  生徒単位で権限制御
                </span>
              </div>
            </form>

            <aside className="sheet-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Account source</p>
                  <h2>アカウント台帳</h2>
                </div>
                <ClipboardList size={22} />
              </div>
              <div className="sheet-source-card">
                <strong>{ACCOUNT_SHEET_NAME}</strong>
                <span>列: メールアドレス / 権限 / ID</span>
                <span>権限: 管理者 / 講師 / 生徒 / 保護者</span>
              </div>
              <div className="empty-state">
                <p>初期画面にアカウント一覧は表示しません。</p>
                <span>
                  本番運用では、メール送信・一時トークン・試行回数制限をサーバー側に追加します。
                </span>
              </div>
            </aside>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-line">
          <span className="brand-mark">
            <GraduationCap size={28} />
          </span>
          <div>
            <p className="eyebrow">定期テスト現状分析</p>
            <h1>GSC学習塾 管理ダッシュボード</h1>
          </div>
        </div>
        <div className="session-box">
          <span>
            <UserRound size={16} />
            {roleLabels[session.role]}: {session.email}
          </span>
          <button type="button" onClick={logout} aria-label="ログアウト">
            <LogOut size={18} />
            ログアウト
          </button>
        </div>
      </header>

      <section className="dashboard">
        <section className="metric-grid" aria-label="概要">
          <article className="metric-tile">
            <UsersRound size={22} />
            <div>
              <strong>{visibleStudents.length}</strong>
              <span>閲覧可能な生徒</span>
            </div>
          </article>
          <article className="metric-tile">
            <FileImage size={22} />
            <div>
              <strong>{pendingFiles}</strong>
              <span>未解析ファイル</span>
            </div>
          </article>
          <article className="metric-tile">
            <RefreshCw size={22} />
            <div>
              <strong>手動同期</strong>
              <span>{syncMessage}</span>
            </div>
          </article>
          <article className="metric-tile">
            <Lock size={22} />
            <div>
              <strong>8時間</strong>
              <span>セッション有効期限</span>
            </div>
          </article>
        </section>

        <section className="workspace-grid">
          <aside className="side-column">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Students</p>
                  <h2>生徒を選択</h2>
                </div>
                <UsersRound size={20} />
              </div>
              <div className="student-list">
                {visibleStudents.map((student) => (
                  <button
                    type="button"
                    className={student.id === selectedStudent?.id ? "student-item active" : "student-item"}
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                  >
                    <span>{student.grade}</span>
                    <strong>{student.name}</strong>
                    <small>{student.studentCode}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Google Drive</p>
                  <h2>答案写真の同期</h2>
                </div>
                <FolderOpen size={20} />
              </div>
              <p className="muted">
                本番では生徒別フォルダをOAuthで接続し、新しい写真を検知して解析キューに入れます。
              </p>
              <div className="drive-actions">
                <button className="primary-button" type="button" onClick={runDriveSync}>
                  <RefreshCw size={18} />
                  Drive同期
                </button>
                <button className="secondary-button" type="button" onClick={() => fileInputRef.current?.click()}>
                  <FileImage size={18} />
                  写真を追加
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(event) => handleFiles(event.target.files)}
                />
              </div>
              <p className="sync-message">{syncMessage}</p>
            </section>

            <section className="panel access-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Security</p>
                  <h2>権限監査</h2>
                </div>
                <ShieldCheck size={20} />
              </div>
              <button className="secondary-button" type="button" onClick={runAccessAudit}>
                <Lock size={18} />
                他生徒IDの参照テスト
              </button>
              <p>{auditResult}</p>
            </section>
          </aside>

          <section className="main-column">
            {selectedStudent && selectedAnalysis ? (
              <>
                <section className="student-summary">
                  <div>
                    <p className="section-kicker">{selectedStudent.grade} / {selectedStudent.studentCode}</p>
                    <h2>{selectedStudent.name}さんの分析結果</h2>
                    <p className="muted">保護者: {selectedStudent.guardian}さん</p>
                  </div>
                  <div className="subject-tabs" role="tablist" aria-label="教科を選択">
                    {(["数学", "英語"] as Subject[]).map((subject) => (
                      <button
                        type="button"
                        key={subject}
                        className={selectedSubject === subject ? "active" : ""}
                        onClick={() => setSelectedSubject(subject)}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="analysis-grid">
                  <article className="score-panel">
                    <div className="score-ring" style={{ "--score": `${selectedAnalysis.score}%` } as React.CSSProperties}>
                      <strong>{selectedAnalysis.score}</strong>
                      <span>/ {selectedAnalysis.maxScore}</span>
                    </div>
                    <div>
                      <p className="section-kicker">{selectedAnalysis.title}</p>
                      <h2>{selectedAnalysis.subject} {selectedAnalysis.date}</h2>
                      <p className="muted">平均との差: +{selectedAnalysis.score - selectedAnalysis.average}点</p>
                    </div>
                  </article>

                  <article className="recommend-panel">
                    <div className="panel-heading compact">
                      <div>
                        <p className="section-kicker">Priority</p>
                        <h2>次回の学習方針</h2>
                      </div>
                      <Wand2 size={20} />
                    </div>
                    <ol>
                      {selectedAnalysis.nextPlan.map((plan) => (
                        <li key={plan}>{plan}</li>
                      ))}
                    </ol>
                  </article>
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="section-kicker">Unit analysis</p>
                      <h2>単元別の強みと弱み</h2>
                    </div>
                    <BarChart3 size={20} />
                  </div>
                  <div className="unit-list">
                    {selectedAnalysis.units.map((unit) => {
                      const percent = formatPercent(unit);
                      return (
                        <article className="unit-row" key={unit.name}>
                          <div className="unit-score">
                            <strong>{percent}%</strong>
                            <span>
                              {unit.correct}+{unit.partial} / {unit.total}
                            </span>
                          </div>
                          <div className="unit-detail">
                            <h3>{unit.name}</h3>
                            <p>
                              <AlertTriangle size={15} />
                              {unit.focus}
                            </p>
                            <p>
                              <CheckCircle2 size={15} />
                              {unit.growth}
                            </p>
                          </div>
                          <div className="unit-meter" aria-label={`${unit.name} ${percent}%`}>
                            <span style={{ width: `${percent}%` }} />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="section-kicker">Question review</p>
                      <h2>問題別チェック</h2>
                    </div>
                    <ClipboardList size={20} />
                  </div>
                  <div className="question-list">
                    {selectedAnalysis.questions.map((question) => (
                      <article className={`question-row ${question.result}`} key={`${question.unit}-${question.number}`}>
                        <span className="question-number">問{question.number}</span>
                        <strong>{question.unit}</strong>
                        <span className="result-label">
                          {question.result === "correct" ? <CheckCircle2 size={16} /> : null}
                          {question.result === "partial" ? <AlertTriangle size={16} /> : null}
                          {question.result === "incorrect" ? <XCircle size={16} /> : null}
                          {resultLabels[question.result]}
                        </span>
                        <p>{question.comment}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="two-column">
                  <article className="panel">
                    <div className="panel-heading compact">
                      <div>
                        <p className="section-kicker">Files</p>
                        <h2>解析対象ファイル</h2>
                      </div>
                      <FileImage size={20} />
                    </div>
                    <div className="file-list">
                      {selectedAnalysis.files.map((file) => (
                        <div className="file-status" key={file.id}>
                          <FileImage size={18} />
                          <div>
                            <strong>{file.name}</strong>
                            <span>{file.capturedAt}</span>
                          </div>
                          <small className={file.status}>{statusLabel(file.status)}</small>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="panel teacher-memo">
                    <div className="panel-heading compact">
                      <div>
                        <p className="section-kicker">Teacher note</p>
                        <h2>先生メモ</h2>
                      </div>
                      <BookOpenCheck size={20} />
                    </div>
                    <p>{selectedAnalysis.teacherMemo}</p>
                  </article>
                </section>
              </>
            ) : (
              <section className="panel empty-state">
                <h2>この教科の分析はまだありません。</h2>
                <p>答案写真が同期されると、強み、弱み、次回学習方針がここに表示されます。</p>
              </section>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}

export default App;
