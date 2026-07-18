import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  FileImage,
  FolderOpen,
  GraduationCap,
  KeyRound,
  Link,
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

type Role = "student" | "parent" | "teacher" | "admin";
type Subject = "数学" | "英語";
type Result = "correct" | "partial" | "incorrect";
type FileStatus = "pending" | "analyzing" | "analyzed" | "error";

type Student = {
  id: string;
  code: string;
  name: string;
  grade: string;
  school: string;
  guardian: string;
  teacher: string;
};

type AccessAccount = {
  id: string;
  email: string;
  code: string;
  role: Role;
  displayName: string;
  studentIds: string[];
};

type TestQuestion = {
  no: string;
  unit: string;
  topic: string;
  result: Result;
  score: number;
  maxScore: number;
  mistakeType: string;
  comment: string;
  confidence: number;
};

type TestAnalysis = {
  id: string;
  studentId: string;
  subject: Subject;
  name: string;
  date: string;
  score: number;
  maxScore: number;
  strengths: string[];
  weaknesses: string[];
  nextActions: string[];
  teacherMemo: string;
  questions: TestQuestion[];
};

type DriveFile = {
  id: string;
  studentId: string;
  testId: string;
  name: string;
  status: FileStatus;
  updatedAt: string;
};

type MagicToken = {
  id: string;
  accountId: string;
  expiresAt: number;
  usedAt?: number;
};

type Session = {
  accountId: string;
  signedInAt: number;
  expiresAt: number;
};

type LoginNotice = {
  kind: "neutral" | "success" | "warning";
  text: string;
};

const TOKEN_STORE_KEY = "gsc-test-analysis-magic-tokens-v1";
const SESSION_KEY = "gsc-test-analysis-session-v1";
const TOKEN_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const students: Student[] = [
  {
    id: "student-hinata",
    code: "STU-7KQ3-92A",
    name: "佐藤 ひなた",
    grade: "中2",
    school: "栃木中央中",
    guardian: "佐藤 保護者",
    teacher: "石川先生"
  },
  {
    id: "student-ren",
    code: "STU-4MRA-16T",
    name: "高橋 れん",
    grade: "中3",
    school: "宇都宮東中",
    guardian: "高橋 保護者",
    teacher: "石川先生"
  }
];

const accounts: AccessAccount[] = [
  {
    id: "acct-parent-hinata",
    email: "parent.hinata@example.com",
    code: "STU-7KQ3-92A",
    role: "parent",
    displayName: "佐藤 保護者",
    studentIds: ["student-hinata"]
  },
  {
    id: "acct-student-hinata",
    email: "student.hinata@example.com",
    code: "STU-7KQ3-92A",
    role: "student",
    displayName: "佐藤 ひなた",
    studentIds: ["student-hinata"]
  },
  {
    id: "acct-teacher",
    email: "teacher@gsc-juku.example.com",
    code: "TCH-2026-GSC",
    role: "teacher",
    displayName: "石川先生",
    studentIds: ["student-hinata", "student-ren"]
  },
  {
    id: "acct-admin",
    email: "admin@gsc-juku.example.com",
    code: "ADM-2026-GSC",
    role: "admin",
    displayName: "GSC管理者",
    studentIds: students.map((student) => student.id)
  }
];

const testAnalyses: TestAnalysis[] = [
  {
    id: "test-hinata-math",
    studentId: "student-hinata",
    subject: "数学",
    name: "1学期期末テスト",
    date: "2026-07-10",
    score: 68,
    maxScore: 100,
    strengths: ["図形の基本問題は安定", "正負の数と基礎計算は得点源", "途中式を書く問題は改善傾向"],
    weaknesses: ["二次方程式の移項と符号", "一次関数のグラフ読み取り", "文章題で式にする前の整理"],
    nextActions: [
      "二次方程式の基本計算を10問ずつ反復",
      "一次関数は傾きと切片を図で確認",
      "文章題は分かっている数を先に丸で囲む"
    ],
    teacherMemo:
      "数学は二次方程式の符号と移項で失点が出ています。図形の基礎は安定しているため、次回は計算手順を声に出して確認しながら、基本計算を短時間で反復するのが良さそうです。",
    questions: [
      {
        no: "大問1 (2)",
        unit: "正負の数",
        topic: "四則計算",
        result: "correct",
        score: 4,
        maxScore: 4,
        mistakeType: "なし",
        comment: "符号の処理まで正確にできている。",
        confidence: 0.96
      },
      {
        no: "大問2 (3)",
        unit: "二次方程式",
        topic: "因数分解を使った解法",
        result: "incorrect",
        score: 0,
        maxScore: 5,
        mistakeType: "符号ミス",
        comment: "移項後の符号が逆になっている可能性が高い。",
        confidence: 0.82
      },
      {
        no: "大問3 (1)",
        unit: "一次関数",
        topic: "傾きと切片",
        result: "partial",
        score: 3,
        maxScore: 6,
        mistakeType: "グラフ読み取り",
        comment: "傾きは読めているが、切片の確認で失点。",
        confidence: 0.74
      },
      {
        no: "大問5 (2)",
        unit: "図形",
        topic: "合同条件",
        result: "correct",
        score: 6,
        maxScore: 6,
        mistakeType: "なし",
        comment: "根拠を順序立てて書けている。",
        confidence: 0.91
      }
    ]
  },
  {
    id: "test-hinata-english",
    studentId: "student-hinata",
    subject: "英語",
    name: "1学期期末テスト",
    date: "2026-07-10",
    score: 74,
    maxScore: 100,
    strengths: ["単語の意味理解は良好", "リスニングの選択問題は安定", "短文和訳は大きな崩れなし"],
    weaknesses: ["時制の選択", "三単現のs", "疑問文の語順"],
    nextActions: ["現在形と過去形を例文で比較", "三単現の主語だけを抜き出す練習", "疑問文は語順カードで反復"],
    teacherMemo:
      "英語は語彙より文法ルールの使い分けが課題です。時制と三単現を分けて練習すると、短文問題の取りこぼしが減りそうです。",
    questions: [
      {
        no: "問2 (4)",
        unit: "文法",
        topic: "三単現",
        result: "incorrect",
        score: 0,
        maxScore: 3,
        mistakeType: "三単現",
        comment: "主語が三人称単数の時に動詞へsを付け忘れている。",
        confidence: 0.88
      },
      {
        no: "問3 (2)",
        unit: "時制",
        topic: "過去形",
        result: "partial",
        score: 2,
        maxScore: 4,
        mistakeType: "時制",
        comment: "文脈は読めているが、動詞の形が現在形のまま。",
        confidence: 0.79
      },
      {
        no: "問5",
        unit: "長文読解",
        topic: "内容一致",
        result: "correct",
        score: 10,
        maxScore: 10,
        mistakeType: "なし",
        comment: "本文から根拠を見つけて選べている。",
        confidence: 0.92
      }
    ]
  },
  {
    id: "test-ren-math",
    studentId: "student-ren",
    subject: "数学",
    name: "実力確認テスト",
    date: "2026-07-12",
    score: 81,
    maxScore: 100,
    strengths: ["二次方程式の基本計算は安定", "関数の式作りが得意", "小問集合の処理が速い"],
    weaknesses: ["証明問題の根拠表現", "応用文章題の条件整理"],
    nextActions: ["証明で使う条件名を先に書く", "文章題は表を作ってから式にする", "得意な関数は応用問題へ進める"],
    teacherMemo:
      "数学は基礎計算が強く、応用へ進める準備があります。証明の言葉の選び方で減点があるため、根拠の書き方を型で練習すると伸びそうです。",
    questions: [
      {
        no: "大問1",
        unit: "小問集合",
        topic: "基本計算",
        result: "correct",
        score: 20,
        maxScore: 20,
        mistakeType: "なし",
        comment: "基本処理が安定している。",
        confidence: 0.95
      },
      {
        no: "大問4",
        unit: "図形",
        topic: "証明",
        result: "partial",
        score: 6,
        maxScore: 10,
        mistakeType: "根拠不足",
        comment: "結論は合っているが、合同条件の記述が不足。",
        confidence: 0.76
      }
    ]
  }
];

const initialDriveFiles: DriveFile[] = [
  {
    id: "file-1",
    studentId: "student-hinata",
    testId: "test-hinata-math",
    name: "数学_1学期期末_答案1.jpg",
    status: "analyzed",
    updatedAt: "2026-07-18 11:40"
  },
  {
    id: "file-2",
    studentId: "student-hinata",
    testId: "test-hinata-english",
    name: "英語_1学期期末_答案1.jpg",
    status: "pending",
    updatedAt: "2026-07-18 11:42"
  },
  {
    id: "file-3",
    studentId: "student-ren",
    testId: "test-ren-math",
    name: "数学_実力確認_答案.pdf",
    status: "analyzed",
    updatedAt: "2026-07-18 11:39"
  }
];

const roleLabel: Record<Role, string> = {
  student: "生徒",
  parent: "保護者",
  teacher: "先生",
  admin: "管理者"
};

const statusLabel: Record<FileStatus, string> = {
  pending: "未解析",
  analyzing: "解析中",
  analyzed: "解析済み",
  error: "確認必要"
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function createTokenId() {
  const values = new Uint32Array(4);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(8, "0")).join("");
}

function getMagicLink(tokenId: string) {
  return `${window.location.origin}${window.location.pathname}#loginToken=${tokenId}`;
}

function findAccount(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = normalizeCode(code);
  return accounts.find(
    (account) => normalizeEmail(account.email) === normalizedEmail && normalizeCode(account.code) === normalizedCode
  );
}

function readTokens() {
  return readJson<MagicToken[]>(TOKEN_STORE_KEY, []);
}

function saveTokens(tokens: MagicToken[]) {
  const now = Date.now();
  writeJson(
    TOKEN_STORE_KEY,
    tokens.filter((token) => !token.usedAt && token.expiresAt > now - TOKEN_TTL_MS)
  );
}

function readSession() {
  const session = readJson<Session | null>(SESSION_KEY, null);
  if (!session || session.expiresAt < Date.now()) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return session;
}

function canAccessStudent(account: AccessAccount, studentId: string) {
  if (account.role === "admin") return true;
  return account.studentIds.includes(studentId);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function resultLabel(result: Result) {
  if (result === "correct") return "正解";
  if (result === "partial") return "部分点";
  return "不正解";
}

function getUnitStats(test: TestAnalysis) {
  const stats = new Map<string, { score: number; maxScore: number }>();
  test.questions.forEach((question) => {
    const current = stats.get(question.unit) ?? { score: 0, maxScore: 0 };
    current.score += question.score;
    current.maxScore += question.maxScore;
    stats.set(question.unit, current);
  });
  return Array.from(stats.entries()).map(([unit, stat]) => ({
    unit,
    score: stat.score,
    maxScore: stat.maxScore,
    rate: Math.round((stat.score / Math.max(1, stat.maxScore)) * 100)
  }));
}

function App() {
  const consumedHash = useRef(false);
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [email, setEmail] = useState("parent.hinata@example.com");
  const [code, setCode] = useState("STU-7KQ3-92A");
  const [notice, setNotice] = useState<LoginNotice>({
    kind: "neutral",
    text: "登録済みのメールアドレスとIDでログインURLを発行します。"
  });
  const [latestToken, setLatestToken] = useState<MagicToken | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("student-hinata");
  const [selectedTestId, setSelectedTestId] = useState("test-hinata-math");
  const [driveFiles, setDriveFiles] = useState(initialDriveFiles);
  const [lastSyncAt, setLastSyncAt] = useState("2026-07-18 11:42");
  const [accessProbe, setAccessProbe] = useState<"idle" | "denied" | "allowed">("idle");

  function consumeToken(tokenId: string) {
    const tokens = readTokens();
    const token = tokens.find((item) => item.id === tokenId);
    if (!token) {
      setNotice({ kind: "warning", text: "このログインURLは無効です。もう一度発行してください。" });
      return;
    }
    if (token.usedAt) {
      setNotice({ kind: "warning", text: "このログインURLはすでに使用済みです。" });
      return;
    }
    if (token.expiresAt < Date.now()) {
      setNotice({ kind: "warning", text: "ログインURLの有効期限が切れています。" });
      return;
    }

    const nextTokens = tokens.map((item) => (item.id === token.id ? { ...item, usedAt: Date.now() } : item));
    saveTokens(nextTokens);

    const nextSession: Session = {
      accountId: token.accountId,
      signedInAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS
    };
    writeJson(SESSION_KEY, nextSession);
    setSession(nextSession);
    setLatestToken(null);
    setNotice({ kind: "success", text: "ログインしました。" });
    window.history.replaceState(null, "", window.location.pathname);
  }

  useEffect(() => {
    if (consumedHash.current) return;
    const tokenId = new URLSearchParams(window.location.hash.slice(1)).get("loginToken");
    if (!tokenId) return;
    consumedHash.current = true;
    consumeToken(tokenId);
  }, []);

  const account = useMemo(() => accounts.find((item) => item.id === session?.accountId), [session]);

  const visibleStudents = useMemo(() => {
    if (!account) return [];
    return students.filter((student) => canAccessStudent(account, student.id));
  }, [account]);

  useEffect(() => {
    if (!account || visibleStudents.length === 0) return;
    if (!visibleStudents.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(visibleStudents[0].id);
    }
  }, [account, selectedStudentId, visibleStudents]);

  const selectedStudent = visibleStudents.find((student) => student.id === selectedStudentId) ?? visibleStudents[0];

  const availableTests = useMemo(() => {
    if (!selectedStudent) return [];
    return testAnalyses.filter((test) => test.studentId === selectedStudent.id);
  }, [selectedStudent]);

  useEffect(() => {
    if (availableTests.length === 0) return;
    if (!availableTests.some((test) => test.id === selectedTestId)) {
      setSelectedTestId(availableTests[0].id);
    }
  }, [availableTests, selectedTestId]);

  const selectedTest = availableTests.find((test) => test.id === selectedTestId) ?? availableTests[0];
  const selectedFiles = selectedStudent
    ? driveFiles.filter((file) => file.studentId === selectedStudent.id)
    : [];
  const pendingCount = selectedFiles.filter((file) => file.status === "pending" || file.status === "error").length;
  const unitStats = selectedTest ? getUnitStats(selectedTest) : [];

  function handleMagicLinkRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const matchedAccount = findAccount(email, code);
    setNotice({
      kind: "neutral",
      text: "入力内容が登録情報と一致する場合、ログインURLをメールに送信しました。"
    });

    if (!matchedAccount) {
      setLatestToken(null);
      return;
    }

    const token: MagicToken = {
      id: createTokenId(),
      accountId: matchedAccount.id,
      expiresAt: Date.now() + TOKEN_TTL_MS
    };
    const tokens = readTokens().filter((item) => !item.usedAt && item.expiresAt > Date.now());
    saveTokens([...tokens, token]);
    setLatestToken(token);
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setAccessProbe("idle");
    setNotice({
      kind: "neutral",
      text: "登録済みのメールアドレスとIDでログインURLを発行します。"
    });
  }

  function fillDemo(accountId: string) {
    const demoAccount = accounts.find((item) => item.id === accountId);
    if (!demoAccount) return;
    setEmail(demoAccount.email);
    setCode(demoAccount.code);
    setNotice({ kind: "neutral", text: `${roleLabel[demoAccount.role]}アカウントの入力をセットしました。` });
  }

  function copyLatestLink() {
    if (!latestToken) return;
    void navigator.clipboard?.writeText(getMagicLink(latestToken.id));
    setNotice({ kind: "success", text: "ログインURLをコピーしました。" });
  }

  function syncDrive() {
    const now = new Intl.DateTimeFormat("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date());
    setLastSyncAt(now);
    setDriveFiles((files) =>
      files.map((file) => (file.status === "error" ? { ...file, status: "pending", updatedAt: now } : file))
    );
  }

  function runAnalysis() {
    setDriveFiles((files) =>
      files.map((file) => (file.studentId === selectedStudent?.id && file.status === "pending" ? { ...file, status: "analyzing" } : file))
    );
    window.setTimeout(() => {
      setDriveFiles((files) =>
        files.map((file) =>
          file.studentId === selectedStudent?.id && file.status === "analyzing"
            ? { ...file, status: "analyzed", updatedAt: "解析完了" }
            : file
        )
      );
    }, 700);
  }

  function probeOtherStudentAccess() {
    if (!account) return;
    const otherStudent = students.find((student) => !canAccessStudent(account, student.id));
    setAccessProbe(otherStudent ? "denied" : "allowed");
  }

  if (!session || !account) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <div className="brand-row">
            <div className="brand-mark">
              <GraduationCap size={24} />
            </div>
            <div>
              <p className="eyebrow">GSC Learning Lab</p>
              <h1>定期テスト現状分析</h1>
            </div>
          </div>

          <form className="login-card" onSubmit={handleMagicLinkRequest}>
            <div className="section-heading">
              <KeyRound size={20} />
              <h2>ログインURL発行</h2>
            </div>
            <label>
              メールアドレス
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
            </label>
            <label>
              生徒ID / 先生ID
              <input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" />
            </label>
            <button className="primary-button" type="submit">
              <Mail size={18} />
              ログインURLを送信
            </button>
            <p className={`notice ${notice.kind}`}>{notice.text}</p>
          </form>

          {latestToken ? (
            <section className="mail-preview">
              <div className="section-heading">
                <Link size={20} />
                <h2>デモ受信箱</h2>
              </div>
              <p className="mail-url">{getMagicLink(latestToken.id)}</p>
              <div className="button-row">
                <button className="primary-button" type="button" onClick={() => consumeToken(latestToken.id)}>
                  <ExternalLink size={18} />
                  URLを開く
                </button>
                <button className="ghost-button" type="button" onClick={copyLatestLink}>
                  <Copy size={18} />
                  コピー
                </button>
              </div>
              <p className="microcopy">有効期限15分・1回使用で無効化されます。</p>
            </section>
          ) : null}
        </section>

        <aside className="auth-side">
          <section className="side-card">
            <div className="section-heading">
              <ShieldCheck size={20} />
              <h2>事前登録アカウント</h2>
            </div>
            <div className="demo-account-list">
              {accounts.map((item) => (
                <button key={item.id} className="demo-account" type="button" onClick={() => fillDemo(item.id)}>
                  <span>{roleLabel[item.role]}</span>
                  <strong>{item.email}</strong>
                  <small>{item.code}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="side-card security-card">
            <div className="section-heading">
              <Lock size={20} />
              <h2>保護ルール</h2>
            </div>
            <ul className="check-list">
              <li>メールとIDの組み合わせを事前登録と照合</li>
              <li>ログインURLは短時間・使い捨て</li>
              <li>表示データはアカウントの許可範囲で絞り込み</li>
              <li>実運用ではAPI側で毎回アクセス権を検証</li>
            </ul>
          </section>
        </aside>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-row">
          <div className="brand-mark">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="eyebrow">GSC Learning Lab</p>
            <h1>定期テスト現状分析</h1>
          </div>
        </div>
        <div className="session-pill">
          <UserRound size={17} />
          <span>{account.displayName}</span>
          <strong>{roleLabel[account.role]}</strong>
          <button type="button" onClick={handleLogout} aria-label="ログアウト">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="metric-grid">
          <div className="metric-card">
            <span>閲覧可能</span>
            <strong>{visibleStudents.length}名</strong>
            <small>アカウント権限内</small>
          </div>
          <div className="metric-card">
            <span>未解析</span>
            <strong>{pendingCount}件</strong>
            <small>選択中の生徒</small>
          </div>
          <div className="metric-card">
            <span>最終同期</span>
            <strong>{lastSyncAt}</strong>
            <small>Google Drive想定</small>
          </div>
          <div className="metric-card">
            <span>セッション</span>
            <strong>8時間</strong>
            <small>再ログインで更新</small>
          </div>
        </section>

        <div className="workspace-grid">
          <aside className="left-column">
            <section className="panel">
              <div className="section-heading">
                <UsersRound size={20} />
                <h2>生徒</h2>
              </div>
              <div className="student-list">
                {visibleStudents.map((student) => (
                  <button
                    key={student.id}
                    className={student.id === selectedStudent?.id ? "student-item active" : "student-item"}
                    type="button"
                    onClick={() => setSelectedStudentId(student.id)}
                  >
                    <strong>{student.name}</strong>
                    <span>
                      {student.grade} / {student.school}
                    </span>
                    <small>{student.code}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="section-heading">
                <FolderOpen size={20} />
                <h2>Drive同期</h2>
              </div>
              <div className="drive-actions">
                <button className="ghost-button" type="button" onClick={syncDrive}>
                  <RefreshCw size={18} />
                  同期
                </button>
                <button className="primary-button" type="button" onClick={runAnalysis} disabled={pendingCount === 0}>
                  <Wand2 size={18} />
                  解析
                </button>
              </div>
              <div className="file-list">
                {selectedFiles.map((file) => (
                  <div key={file.id} className="file-item">
                    <FileImage size={18} />
                    <div>
                      <strong>{file.name}</strong>
                      <span>{file.updatedAt}</span>
                    </div>
                    <em className={`file-status ${file.status}`}>{statusLabel[file.status]}</em>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel access-panel">
              <div className="section-heading">
                <ShieldCheck size={20} />
                <h2>権限監査</h2>
              </div>
              <button className="ghost-button full" type="button" onClick={probeOtherStudentAccess}>
                <Lock size={18} />
                他生徒IDの参照テスト
              </button>
              {accessProbe === "denied" ? (
                <p className="access-result denied">
                  <XCircle size={18} />
                  API想定: 403 Forbidden
                </p>
              ) : null}
              {accessProbe === "allowed" ? (
                <p className="access-result allowed">
                  <CheckCircle2 size={18} />
                  管理権限のため許可
                </p>
              ) : null}
            </section>
          </aside>

          <section className="main-column">
            {selectedStudent && selectedTest ? (
              <>
                <section className="student-summary">
                  <div>
                    <p className="eyebrow">Selected student</p>
                    <h2>{selectedStudent.name}</h2>
                    <p>
                      {selectedStudent.grade} / {selectedStudent.school} / 担当 {selectedStudent.teacher}
                    </p>
                  </div>
                  <div className="test-switcher">
                    {availableTests.map((test) => (
                      <button
                        key={test.id}
                        className={test.id === selectedTest.id ? "active" : ""}
                        type="button"
                        onClick={() => setSelectedTestId(test.id)}
                      >
                        {test.subject}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="analysis-grid">
                  <div className="score-card">
                    <div className="section-heading">
                      <BarChart3 size={20} />
                      <h2>{selectedTest.name}</h2>
                    </div>
                    <div className="score-line">
                      <strong>{selectedTest.score}</strong>
                      <span>/ {selectedTest.maxScore}点</span>
                    </div>
                    <p>{formatDate(selectedTest.date)} / {selectedTest.subject}</p>
                  </div>

                  <div className="focus-card weakness">
                    <span>優先復習</span>
                    <strong>{selectedTest.weaknesses[0]}</strong>
                    <small>{selectedTest.nextActions[0]}</small>
                  </div>

                  <div className="focus-card strength">
                    <span>伸ばせる強み</span>
                    <strong>{selectedTest.strengths[0]}</strong>
                    <small>得点源として維持</small>
                  </div>
                </section>

                <section className="panel">
                  <div className="section-heading">
                    <BookOpenCheck size={20} />
                    <h2>単元別</h2>
                  </div>
                  <div className="unit-list">
                    {unitStats.map((unit) => (
                      <div key={unit.unit} className="unit-row">
                        <div>
                          <strong>{unit.unit}</strong>
                          <span>
                            {unit.score}/{unit.maxScore}点
                          </span>
                        </div>
                        <div className="unit-bar" aria-label={`${unit.unit} ${unit.rate}%`}>
                          <span style={{ width: `${unit.rate}%` }} />
                        </div>
                        <em>{unit.rate}%</em>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="three-column">
                  <div className="panel compact">
                    <div className="section-heading">
                      <CheckCircle2 size={20} />
                      <h2>強み</h2>
                    </div>
                    <ul className="plain-list">
                      {selectedTest.strengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="panel compact">
                    <div className="section-heading">
                      <AlertTriangle size={20} />
                      <h2>弱み</h2>
                    </div>
                    <ul className="plain-list">
                      {selectedTest.weaknesses.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="panel compact">
                    <div className="section-heading">
                      <ClipboardList size={20} />
                      <h2>次回学習</h2>
                    </div>
                    <ol className="action-list">
                      {selectedTest.nextActions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  </div>
                </section>

                <section className="panel">
                  <div className="section-heading">
                    <ClipboardList size={20} />
                    <h2>問題別チェック</h2>
                  </div>
                  <div className="question-table">
                    {selectedTest.questions.map((question) => (
                      <div key={`${selectedTest.id}-${question.no}`} className="question-row">
                        <strong>{question.no}</strong>
                        <span>{question.unit}</span>
                        <span>{question.topic}</span>
                        <em className={`result-badge ${question.result}`}>{resultLabel(question.result)}</em>
                        <span>
                          {question.score}/{question.maxScore}
                        </span>
                        <p>{question.comment}</p>
                        <small>AI確信度 {Math.round(question.confidence * 100)}%</small>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="teacher-memo">
                  <div className="section-heading">
                    <UserRound size={20} />
                    <h2>先生メモ</h2>
                  </div>
                  <p>{selectedTest.teacherMemo}</p>
                </section>
              </>
            ) : (
              <section className="panel empty-state">
                <p>閲覧できる生徒データがありません。</p>
              </section>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
