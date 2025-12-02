import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox, Mail, Calendar, AlarmClock, Clock, Filter, Send, Archive as ArchiveIcon, 
  ChevronRight, ChevronLeft, Reply, ReplyAll, Timer, Search, Command, 
  Bot, CheckCircle, Circle, MoreHorizontal, Star, Bell, Tags, Trash2,
  User, Users, ExternalLink, FileText, Paperclip, ArrowUpRight, Undo2,
  Download, PauseCircle, Play, X, Check, Pause, Zap, Sparkles, ListChecks
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// ------------------------------------------------------------
// Twist‑Inspired Agentic Email Client — Live Prototype (Mocked)
// Three‑pane shell + Sweep Mode + keyboard shortcuts + command palette
// ------------------------------------------------------------

// ----------------------- Mock Data --------------------------
const MOCK_ACCOUNTS = [
  { id: "acc1", name: "Work", email: "you@company.com", provider: "Gmail" },
  { id: "acc2", name: "Advisory", email: "you@board.org", provider: "Outlook" },
  { id: "acc3", name: "Personal", email: "you@gmail.com", provider: "Gmail" },
];

const now = new Date();

function minutesAgo(mins: number) { return new Date(now.getTime() - mins * 60000).toISOString(); }

export type Message = {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  received_at: string; // ISO
  attachments?: { name: string; sizeKB: number }[];
  outbound?: boolean;
};

export type Thread = {
  id: string;
  title: string;
  accountId: string;
  participants: string[];
  summary: string;
  state: "New" | "Triaged" | "Replied" | "Deferred" | "Delegated" | "Archived" | "Waiting";
  priority: "Urgent" | "Today" | "Bundle" | "Low";
  due_at?: string;
  last_activity_at: string;
  labels?: string[];
  intents?: ("invoice" | "scheduling" | "approval" | "fyi")[];
  score: number;
  messages: Message[];
};

const MOCK_THREADS: Thread[] = [
  {
    id: "t1",
    title: "Invoice #9481 for Q3 services",
    accountId: "acc1",
    participants: ["ap@vendor.io", "you@company.com"],
    summary: "Vendor sent invoice for £4,250 due Fri. Agent suggests: forward to finance + acknowledge receipt.",
    state: "New",
    priority: "Today",
    due_at: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    last_activity_at: minutesAgo(12),
    labels: ["Finance", "Receipts"],
    intents: ["invoice", "approval"],
    score: 0.84,
    messages: [
      {
        id: "m1",
        from: "ap@vendor.io",
        to: ["you@company.com"],
        subject: "Invoice #9481",
        body: "Hi — attaching invoice 9481 for Q3 services. Kindly confirm and route for payment by Friday.",
        received_at: minutesAgo(12),
        attachments: [{ name: "invoice-9481.pdf", sizeKB: 312 }],
      },
    ],
  },
  {
    id: "t2",
    title: "Board dinner scheduling (Oct)",
    accountId: "acc2",
    participants: ["pa@board.org", "you@board.org"],
    summary: "PA proposes three slots. Agent suggests: reply with two preferred + dietary note.",
    state: "New",
    priority: "Today",
    last_activity_at: minutesAgo(35),
    labels: ["Scheduling"],
    intents: ["scheduling"],
    score: 0.77,
    messages: [
      {
        id: "m2",
        from: "pa@board.org",
        to: ["you@board.org"],
        subject: "Board dinner",
        body: "Could you do Tue 8th, Wed 9th, or Fri 11th at 7pm? Any dietary needs?",
        received_at: minutesAgo(35),
      },
    ],
  },
  {
    id: "t3",
    title: "GitHub PR #421 merged — release notes",
    accountId: "acc1",
    participants: ["noreply@github.com", "you@company.com"],
    summary: "PR merged to main. Agent suggests: draft release notes and notify stakeholders.",
    state: "New",
    priority: "Low",
    last_activity_at: minutesAgo(90),
    labels: ["DevOps", "Notifications"],
    intents: ["fyi"],
    score: 0.35,
    messages: [
      {
        id: "m3",
        from: "noreply@github.com",
        to: ["you@company.com"],
        subject: "PR #421 merged",
        body: "Your pull request #421 was merged into main. View diff and CI checks in GitHub.",
        received_at: minutesAgo(90),
      },
    ],
  },
  {
    id: "t4",
    title: "Newsletters (7 new)",
    accountId: "acc3",
    participants: ["news@substack.com"],
    summary: "Roll‑up of 7 newsletters. Agent suggests: add to weekly digest, keep 2 as star.",
    state: "New",
    priority: "Bundle",
    last_activity_at: minutesAgo(8),
    labels: ["Newsletters"],
    intents: ["fyi"],
    score: 0.12,
    messages: [
      {
        id: "m4",
        from: "news@substack.com",
        to: ["you@gmail.com"],
        subject: "This week in AI Ops…",
        body: "Lots happened this week — here are the top insights…",
        received_at: minutesAgo(8),
      },
    ],
  },
];

// Utility: format time ago
function timeAgo(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.round(delta / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return `${days}d`;
}

// Progress ring component
function ProgressRing({ value }: { value: number }) {
  const radius = 44;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  return (
    <svg height={radius * 2} width={radius * 2} className="shrink-0">
      <circle
        strokeWidth={stroke}
        strokeOpacity={0.15}
        fill="transparent"
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        className="stroke-foreground"
      />
      <motion.circle
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="transparent"
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: value / 100 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        style={{ strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset }}
        className="stroke-primary"
      />
      <text x="50%" y="50%" textAnchor="middle" dy=".3em" className="fill-foreground text-sm font-medium">
        {value}%
      </text>
    </svg>
  );
}

// Command Palette (very simple)
function CommandPalette({ open, onClose, onCommand }: { open: boolean; onClose: () => void; onCommand: (cmd: string) => void }) {
  const [q, setQ] = useState("");
  const commands = [
    { k: "Sweep Mode", id: "sweep" },
    { k: "Go: Today", id: "goto_today" },
    { k: "Go: Urgent", id: "goto_urgent" },
    { k: "Action: Archive", id: "archive" },
    { k: "Action: Reply (AI)", id: "reply_ai" },
    { k: "Action: Snooze", id: "snooze" },
    { k: "Action: Delegate", id: "delegate" },
    { k: "Toggle: Bundles", id: "toggle_bundles" },
  ];
  const filtered = commands.filter(c => c.k.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => { if (!open) setQ(""); }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 bg-background/70 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            className="mx-auto mt-24 w-full max-w-xl rounded-2xl border bg-card p-3 shadow-xl"
          >
            <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
              <Search className="h-4 w-4 opacity-60" />
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Type a command… (e.g., ‘sweep’, ‘archive’)"
                className="flex-1 bg-transparent outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                  if (e.key === "Enter" && filtered[0]) { onCommand(filtered[0].id); onClose(); }
                }}
              />
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">Esc</kbd>
            </div>
            <div className="mt-2 max-h-80 overflow-auto">
              {filtered.map(c => (
                <button key={c.id} onClick={() => { onCommand(c.id); onClose(); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-muted/60">
                  <span>{c.k}</span>
                  <ChevronRight className="h-4 w-4 opacity-60" />
                </button>
              ))}
              {filtered.length === 0 && <div className="px-3 py-5 text-sm opacity-60">No commands</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Thread List Item
function ThreadRow({ t, selected, onClick }: { t: Thread; selected: boolean; onClick: () => void }) {
  const account = MOCK_ACCOUNTS.find(a => a.id === t.accountId)!;
  return (
    <button onClick={onClick} className={`group w-full border-b px-3 py-3 text-left transition hover:bg-muted/40 ${selected ? "bg-muted/70" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={t.priority === "Urgent" ? "destructive" : t.priority === "Today" ? "default" : "secondary"}>{t.priority}</Badge>
          <span className="line-clamp-1 font-medium">{t.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{account.name}</Badge>
          <span className="text-xs opacity-60">{timeAgo(t.last_activity_at)}</span>
        </div>
      </div>
      <div className="mt-1 line-clamp-1 text-sm opacity-70">{t.summary}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {t.labels?.map(l => (
          <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>
        ))}
        {t.intents?.includes("invoice") && <Badge className="text-[10px]" variant="secondary">Invoice</Badge>}
        {t.intents?.includes("scheduling") && <Badge className="text-[10px]" variant="secondary">Scheduling</Badge>}
      </div>
    </button>
  );
}

// Message Bubble
function MessageBubble({ m }: { m: Message }) {
  const outbound = !!m.outbound;
  return (
    <div className={`rounded-xl border p-3 ${outbound ? "bg-primary/10" : "bg-background"}`}>
      <div className="flex items-center justify-between text-xs opacity-70">
        <span className="flex items-center gap-2"><User className="h-3.5 w-3.5"/>{m.from}</span>
        <span>{timeAgo(m.received_at)}</span>
      </div>
      <div className="mt-1 whitespace-pre-wrap text-sm">{m.body}</div>
      {m.attachments && (
        <div className="mt-2 flex flex-wrap gap-2">
          {m.attachments.map(att => (
            <div key={att.name} className="inline-flex items-center gap-2 rounded-lg border px-2 py-1 text-xs">
              <Paperclip className="h-3.5 w-3.5" />{att.name}
              <Download className="h-3.5 w-3.5 opacity-60" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Agent Panel
function AgentPanel({ thread, onSuggest }: { thread: Thread; onSuggest: (text: string) => void }) {
  const suggestions = useMemo(() => {
    const s: string[] = [];
    if (thread.intents?.includes("invoice")) {
      s.push("Thanks — forwarding this to finance now. Payment scheduled by Friday.");
    }
    if (thread.intents?.includes("scheduling")) {
      s.push("I can do Wed 9th or Fri 11th 7pm. No dietary requirements, thanks!");
    }
    if (s.length === 0) s.push("Thanks for the update — noted.");
    return s;
  }, [thread]);

  return (
    <div className="rounded-2xl border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4"/>Agent summary</div>
      <div className="mt-1 text-sm opacity-80">{thread.summary}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((s, i) => (
          <Button key={i} size="sm" variant="secondary" onClick={() => onSuggest(s)}>
            <Reply className="mr-1 h-4 w-4"/>Use suggestion {i+1}
          </Button>
        ))}
      </div>
    </div>
  );
}

// Compose Drawer (inline simplified)
function Compose({ draft, setDraft, onSend }: { draft: string; setDraft: (s: string) => void; onSend: () => void }) {
  return (
    <div className="rounded-2xl border p-3">
      <div className="mb-2 text-sm font-medium">Reply</div>
      <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Your reply…" className="min-h-[120px]"/>
      <div className="mt-2 flex items-center gap-2">
        <Button onClick={onSend}><Send className="mr-1 h-4 w-4"/>Send</Button>
        <Button variant="secondary">Tone: Concise</Button>
      </div>
    </div>
  );
}

// Sweep Mode Overlay
function SweepMode({ open, progress, onClose, onAction, thread }: { open: boolean; progress: number; onClose: () => void; onAction: (a: string) => void; thread?: Thread | null }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 bg-background/85 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="mx-auto mt-16 w-full max-w-4xl rounded-3xl border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ProgressRing value={progress} />
                <div>
                  <div className="text-lg font-semibold">Daily Sweep</div>
                  <div className="text-sm opacity-70">Clear today’s queue to reach Inbox Zero</div>
                </div>
              </div>
              <Button variant="ghost" onClick={onClose}><X className="h-5 w-5"/></Button>
            </div>
            {thread ? (
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2 space-y-3">
                  <div className="text-base font-medium">{thread.title}</div>
                  <div className="text-sm opacity-80">{thread.summary}</div>
                  <div className="space-y-2">
                    {thread.messages.map(m => <MessageBubble key={m.id} m={m} />)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Button onClick={() => onAction("reply")} className="w-full"><Reply className="mr-1 h-4 w-4"/>Reply</Button>
                  <Button onClick={() => onAction("archive")} variant="secondary" className="w-full"><ArchiveIcon className="mr-1 h-4 w-4"/>Archive</Button>
                  <Button onClick={() => onAction("snooze")} variant="outline" className="w-full"><Timer className="mr-1 h-4 w-4"/>Snooze</Button>
                  <Button onClick={() => onAction("delegate")} variant="outline" className="w-full"><Users className="mr-1 h-4 w-4"/>Delegate</Button>
                </div>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border p-6 text-center text-sm opacity-70">No threads queued.</div>
            )}
            <div className="mt-6 text-xs opacity-70">Shortcuts: A Archive · R Reply · S Snooze · D Delegate · T Task · Esc Close</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ----------------------- Main App ---------------------------
export default function App() {
  const [threads, setThreads] = useState<Thread[]>(MOCK_THREADS);
  const [selectedId, setSelectedId] = useState<string>(threads[0]?.id || "");
  const [showBundles, setShowBundles] = useState(true);
  const [sweepOpen, setSweepOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const selected = useMemo(() => threads.find(t => t.id === selectedId) || null, [threads, selectedId]);
  const nonBundles = threads.filter(t => t.priority !== "Bundle");
  const sweepQueue = nonBundles.filter(t => t.state === "New" || t.state === "Triaged");
  const progress = Math.round(((nonBundles.length - sweepQueue.length) / Math.max(1, nonBundles.length)) * 100);

  function selectNext(offset: number) {
    const arr = (showBundles ? threads : threads.filter(t => t.priority !== "Bundle"));
    const idx = Math.max(0, arr.findIndex(t => t.id === selectedId));
    const next = arr[(idx + offset + arr.length) % arr.length];
    if (next) setSelectedId(next.id);
  }

  function applyAction(tid: string, action: "archive" | "reply" | "snooze" | "delegate" | "task") {
    setThreads(prev => prev.map(t => {
      if (t.id !== tid) return t;
      if (action === "archive") return { ...t, state: "Archived" };
      if (action === "reply") return { ...t, state: "Replied" };
      if (action === "snooze") return { ...t, state: "Deferred", due_at: new Date(Date.now() + 24*3600*1000).toISOString() };
      if (action === "delegate") return { ...t, state: "Delegated" };
      if (action === "task") return { ...t, state: "Triaged", labels: [...(t.labels||[]), "Task"] };
      return t;
    }));
  }

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCommandOpen(true); return; }
      if (commandOpen) return; // don’t steal keys while palette open
      if (e.key === "Escape") { setSweepOpen(false); return; }
      if (!selected) return;
      const map: Record<string, () => void> = {
        "a": () => applyAction(selected.id, "archive"),
        "r": () => applyAction(selected.id, "reply"),
        "s": () => applyAction(selected.id, "snooze"),
        "d": () => applyAction(selected.id, "delegate"),
        "t": () => applyAction(selected.id, "task"),
        ArrowDown: () => selectNext(1),
        ArrowUp: () => selectNext(-1),
      };
      const fn = map[e.key as keyof typeof map];
      if (fn) { e.preventDefault(); fn(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, commandOpen, threads, showBundles]);

  function openSweep() { setSweepOpen(true); setSelectedId(sweepQueue[0]?.id || selectedId); }

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      {/* Left Sidebar */}
      <aside className="flex w-64 flex-col gap-4 border-r p-3">
        <div className="flex items-center gap-2 px-1 text-lg font-semibold"><Bot className="h-5 w-5"/>CalmInbox</div>
        <div>
          <div className="px-1 text-xs uppercase opacity-60">Accounts</div>
          <div className="mt-2 space-y-1">
            {MOCK_ACCOUNTS.map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-muted/60">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4"/>
                  <div>
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs opacity-60">{a.email}</div>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">{a.provider}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="px-1 text-xs uppercase opacity-60">Smart Views</div>
          <div className="mt-2 grid gap-1">
            <Button variant="secondary" className="justify-start" onClick={openSweep}>
              <ListChecks className="mr-2 h-4 w-4"/>Today (Sweep)
            </Button>
            <Button variant="ghost" className="justify-start"><Bell className="mr-2 h-4 w-4"/>Urgent</Button>
            <Button variant="ghost" className="justify-start"><Clock className="mr-2 h-4 w-4"/>Waiting</Button>
            <Button variant="ghost" className="justify-start" onClick={() => setShowBundles(v => !v)}>
              <Filter className="mr-2 h-4 w-4"/>{showBundles ? "Hide" : "Show"} Bundles
            </Button>
          </div>
        </div>

        <div className="mt-auto rounded-2xl border p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Progress</div>
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">⌘K</kbd>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <ProgressRing value={progress} />
            <div className="text-sm opacity-80">{nonBundles.length - sweepQueue.length} / {nonBundles.length} cleared</div>
          </div>
          <Button className="mt-3 w-full" onClick={openSweep}><Zap className="mr-2 h-4 w-4"/>Start Sweep</Button>
        </div>
      </aside>

      {/* Middle Pane: Thread List */}
      <section className="flex min-w-80 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b p-2">
          <div className="relative flex-1">
            <Input placeholder="Search threads…" className="pl-8"/>
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60"/>
          </div>
          <Button variant="outline" size="icon"><Command className="h-4 w-4"/></Button>
        </div>
        <div className="flex-1 overflow-auto">
          {(showBundles ? threads : threads.filter(t => t.priority !== "Bundle")).map(t => (
            <ThreadRow key={t.id} t={t} selected={t.id === selectedId} onClick={() => setSelectedId(t.id)} />
          ))}
        </div>
      </section>

      {/* Right Pane: Thread Detail */}
      <section className="hidden w-[42rem] flex-col border-l p-4 xl:flex">
        {!selected ? (
          <div className="m-auto text-sm opacity-70">Select a thread…</div>
        ) : (
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold leading-snug">{selected.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{MOCK_ACCOUNTS.find(a=>a.id===selected.accountId)?.name}</Badge>
                  {selected.labels?.map(l => <Badge key={l} variant="secondary">{l}</Badge>)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => applyAction(selected.id, "reply")}><Reply className="mr-1 h-4 w-4"/>Reply</Button>
                <Button size="sm" variant="secondary" onClick={() => applyAction(selected.id, "archive")}><ArchiveIcon className="mr-1 h-4 w-4"/>Archive</Button>
                <Button size="sm" variant="outline" onClick={() => applyAction(selected.id, "snooze")}><Timer className="mr-1 h-4 w-4"/>Snooze</Button>
                <Button size="sm" variant="outline" onClick={() => applyAction(selected.id, "delegate")}><Users className="mr-1 h-4 w-4"/>Delegate</Button>
              </div>
            </div>

            <AgentPanel thread={selected} onSuggest={(s)=> setDraft(s)} />

            <div className="space-y-2">
              {selected.messages.map(m => <MessageBubble key={m.id} m={m} />)}
            </div>

            <Compose draft={draft} setDraft={setDraft} onSend={() => { applyAction(selected.id, "reply"); setDraft(""); }} />
            <div className="text-xs opacity-70">Shortcuts: A Archive · R Reply · S Snooze · D Delegate · T Task · ↑/↓ Navigate · ⌘K Commands</div>
          </div>
        )}
      </section>

      <SweepMode
        open={sweepOpen}
        progress={progress}
        onClose={() => setSweepOpen(false)}
        onAction={(a) => { if (!selected) return; applyAction(selected.id, a as any); selectNext(1); }}
        thread={selected}
      />

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onCommand={(id) => {
          if (id === "sweep") openSweep();
          if (!selected) return;
          if (id === "archive") applyAction(selected.id, "archive");
          if (id === "reply_ai") applyAction(selected.id, "reply");
          if (id === "snooze") applyAction(selected.id, "snooze");
          if (id === "delegate") applyAction(selected.id, "delegate");
          if (id === "toggle_bundles") setShowBundles(v => !v);
        }}
      />
    </div>
  );
}
