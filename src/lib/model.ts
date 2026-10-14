import type {
  Accessory,
  Character,
  ChatMode,
  Hair,
  Kind,
  LineWeight,
  Motion,
  PaperTone,
  Project,
  Scene,
  SceneDraft,
  Shot,
  StudioEdit,
  StyleLock,
  Template,
  Voice,
  Wash,
} from "@/lib/types";

const HAIR: readonly Hair[] = ["short", "bun", "curly", "none"];
const ACCESSORY: readonly Accessory[] = ["glasses", "tie", "mug", "none"];
const SHOTS: readonly Shot[] = ["wide", "close", "two", "prop"];
const MOTION: readonly Motion[] = ["boil", "blink", "gesture", "push", "caption", "parallax"];
const VOICES: readonly Voice[] = ["none", "narration", "character"];
const TEMPLATES: readonly Template[] = ["cooler", "desk", "podium", "street"];
const LINES: readonly LineWeight[] = ["fine", "bold", "loose"];
const WASHES: readonly Wash[] = ["none", "watercolor", "flat"];
const PAPERS: readonly PaperTone[] = ["cream", "white", "newsprint"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

let seq = 1;

export function uid(prefix = "id") {
  seq += 1;
  return `${prefix}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function oneOf<T extends string>(value: unknown, list: readonly T[], fallback: T): T {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function captionOf(scene: Scene) {
  if (scene.captionVariant === "b" && scene.captionB.trim()) return scene.captionB.trim();
  return scene.punchline.trim();
}

export function suggestPause(scene: { punchline: string; isPunchline: boolean }) {
  if (!scene.isPunchline && !scene.punchline.trim()) return 0.2;
  const words = scene.punchline.trim().split(/\s+/).filter(Boolean).length;
  return round1(clamp(0.7 + words * 0.08, 0.6, 1.8));
}

export function activeScenes(project: Project) {
  return project.scenes.filter((scene) => !scene.skipped);
}

export function totalDuration(scenes: Scene[]) {
  return round1(scenes.reduce((sum, scene) => sum + scene.duration, 0));
}

export function editedLabel(ts: number, now = Date.now()) {
  const delta = now - ts;
  if (delta >= 0 && delta < 60_000) return "Just now";
  const a = new Date(ts);
  const b = new Date(now);
  if (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  ) {
    return "Today";
  }
  return `${MONTHS[a.getUTCMonth()]} ${a.getUTCDate()}`;
}

export function agoLabel(ts: number, now = Date.now()) {
  const s = Math.round((now - ts) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h}h ago`;
  return editedLabel(ts, now);
}

export function kindLabel(kind: Kind) {
  if (kind === "gag") return "Cartoon gag";
  if (kind === "explainer") return "Explainer";
  return "Draft";
}

export function progressOf(project: Project): {
  done: number;
  next: string;
  key: "script" | "storyboard" | "motion" | "timeline" | "export" | "share";
} {
  const hasScript = project.scenes.some((scene) => scene.text.trim() || scene.punchline.trim());
  const flags = [
    hasScript,
    project.storyboardReady,
    project.motionApplied,
    project.timelineTouched,
    project.exported,
  ];
  const labels = ["Write the script", "Generate the storyboard", "Set the motion", "Time the cut", "Export"] as const;
  const keys = ["script", "storyboard", "motion", "timeline", "export"] as const;
  const idx = flags.findIndex((flag) => !flag);
  if (idx === -1) return { done: 5, next: "Share it", key: "share" };
  return { done: idx, next: labels[idx] ?? "Export", key: keys[idx] ?? "export" };
}

export function voiceLabel(scene: Scene, project: Project) {
  if (scene.voice === "narration") return "Narration";
  if (scene.voice === "character") return project.characters[0]?.name ?? "Character";
  return "";
}

export function defaultStyle(): StyleLock {
  return { line: "fine", wash: "watercolor", paper: "cream" };
}

export function defaultCast(kind: Kind): Character[] {
  if (kind === "explainer") {
    return [
      { id: uid("c"), name: "Guide", hair: "short", accessory: "tie" },
      { id: uid("c"), name: "Reader", hair: "curly", accessory: "glasses" },
    ];
  }
  return [
    { id: uid("c"), name: "Alex", hair: "short", accessory: "glasses" },
    { id: uid("c"), name: "Sam", hair: "bun", accessory: "mug" },
  ];
}

export function makeScene(partial: Partial<Scene> & Pick<Scene, "text">): Scene {
  const punchline = partial.punchline ?? "";
  const isPunchline = partial.isPunchline ?? Boolean(punchline);
  return {
    id: partial.id ?? uid("sc"),
    text: partial.text,
    punchline,
    captionB: partial.captionB ?? "",
    captionVariant: partial.captionVariant ?? "a",
    isPunchline,
    duration: round1(clamp(partial.duration ?? (isPunchline ? 4 : 2.6), 0.8, 12)),
    pauseBeforeCaption: round1(clamp(partial.pauseBeforeCaption ?? (isPunchline ? 1.1 : 0.2), 0, 3)),
    shot: partial.shot ?? "two",
    motions: partial.motions ?? (isPunchline ? ["boil", "caption"] : ["boil"]),
    boil: clamp(partial.boil ?? 42, 0, 100),
    voice: partial.voice ?? "none",
    voiceText: partial.voiceText ?? "",
    skipped: partial.skipped ?? false,
    template: partial.template ?? "cooler",
    seed: partial.seed ?? 3,
  };
}

export function snapshotOf(project: Project) {
  return {
    title: project.title,
    style: { ...project.style },
    scenes: project.scenes.map((scene) => ({ ...scene, motions: [...scene.motions] })),
    characters: project.characters.map((character) => ({ ...character })),
  };
}

function normalizeScene(raw: Partial<Scene> | undefined, fallbackText = "A quiet beat."): Scene {
  const punchline = typeof raw?.punchline === "string" ? raw.punchline : "";
  return makeScene({
    id: typeof raw?.id === "string" ? raw.id : undefined,
    text: typeof raw?.text === "string" && raw.text.trim() ? raw.text : fallbackText,
    punchline,
    captionB: typeof raw?.captionB === "string" ? raw.captionB : "",
    captionVariant: raw?.captionVariant === "b" ? "b" : "a",
    isPunchline: Boolean(raw?.isPunchline || punchline),
    duration: typeof raw?.duration === "number" ? raw.duration : undefined,
    pauseBeforeCaption: typeof raw?.pauseBeforeCaption === "number" ? raw.pauseBeforeCaption : undefined,
    shot: oneOf(raw?.shot, SHOTS, "two"),
    motions: Array.isArray(raw?.motions) ? raw.motions.filter((item): item is Motion => MOTION.includes(item as Motion)) : ["boil"],
    boil: typeof raw?.boil === "number" ? raw.boil : 42,
    voice: oneOf(raw?.voice, VOICES, "none"),
    voiceText: typeof raw?.voiceText === "string" ? raw.voiceText : "",
    skipped: Boolean(raw?.skipped),
    template: oneOf(raw?.template, TEMPLATES, "cooler"),
    seed: typeof raw?.seed === "number" ? raw.seed : 3,
  });
}

export function normalizeProject(raw: Project): Project {
  const kind = raw.kind === "explainer" || raw.kind === "draft" || raw.kind === "gag" ? raw.kind : "gag";
  return {
    id: raw.id || uid("p"),
    title: raw.title?.trim() || "Untitled",
    kind,
    pinned: Boolean(raw.pinned),
    updatedAt: raw.updatedAt || Date.UTC(2026, 9, 14, 1, 0, 0),
    createdAt: raw.createdAt || Date.UTC(2026, 9, 14, 1, 0, 0),
    style: {
      line: oneOf(raw.style?.line, LINES, "fine"),
      wash: oneOf(raw.style?.wash, WASHES, "watercolor"),
      paper: oneOf(raw.style?.paper, PAPERS, "cream"),
    },
    characters:
      Array.isArray(raw.characters) && raw.characters.length
        ? raw.characters.slice(0, 3).map((character) => ({
            id: character.id || uid("c"),
            name: character.name?.trim() || "Alex",
            hair: oneOf(character.hair, HAIR, "short"),
            accessory: oneOf(character.accessory, ACCESSORY, "none"),
          }))
        : defaultCast(kind),
    scenes: Array.isArray(raw.scenes) ? raw.scenes.map((scene) => normalizeScene(scene)) : [],
    chat: Array.isArray(raw.chat) ? raw.chat : [],
    chatMode: raw.chatMode === "gag" || raw.chatMode === "editor" || raw.chatMode === "scriptwriter" ? raw.chatMode : "scriptwriter",
    storyboardReady: Boolean(raw.storyboardReady),
    motionApplied: Boolean(raw.motionApplied),
    timelineTouched: Boolean(raw.timelineTouched),
    exported: Boolean(raw.exported),
  };
}

function titleFrom(topic: string) {
  const cleaned = topic.replace(/[“”"'.]+/g, "").trim();
  const words = cleaned.split(/\s+/).slice(0, 4);
  if (!words[0]) return "Untitled gag";
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function topicOf(message: string) {
  const about = message.match(/about\s+(.+)/i);
  if (about?.[1]) return about[1].replace(/[.?!].*$/, "").replace(/\bin\s+\d+\s+scenes?\b/i, "").trim();
  const explain = message.match(/explain(?:er)?\s+(.+)/i);
  if (explain?.[1]) return explain[1].replace(/[.?!].*$/, "").trim();
  return message.replace(/write|draft|punch(?:\s*up)?|a\s+\d+[-\s]?scene\s+gag|please/gi, "").trim() || "an ordinary Tuesday";
}

function readStyle(lower: string): Partial<StyleLock> | null {
  const style: Partial<StyleLock> = {};
  if (/\bbold\b/.test(lower)) style.line = "bold";
  if (/\bloose\b|\bsketch\b/.test(lower)) style.line = "loose";
  if (/\bfine\b|\bthin\b/.test(lower)) style.line = "fine";
  if (/watercolor|\bwash\b/.test(lower)) style.wash = "watercolor";
  if (/\bflat\b/.test(lower)) style.wash = "flat";
  if (/no wash|without wash/.test(lower)) style.wash = "none";
  if (/cream/.test(lower)) style.paper = "cream";
  if (/newsprint/.test(lower)) style.paper = "newsprint";
  if (/white paper/.test(lower)) style.paper = "white";
  return Object.keys(style).length ? style : null;
}

function motionsFrom(lower: string, base: Motion[]): Motion[] {
  const set = new Set(base);
  if (/\bboil\b/.test(lower)) set.add("boil");
  if (/\bblink\b/.test(lower)) set.add("blink");
  if (/gesture/.test(lower)) set.add("gesture");
  if (/push/.test(lower)) set.add("push");
  if (/caption|reveal/.test(lower)) set.add("caption");
  if (/parallax|pan\b/.test(lower)) set.add("parallax");
  return [...set];
}

export function draftToScene(draft: SceneDraft, previous: Scene | undefined, index: number): Scene {
  return makeScene({
    id: previous?.id,
    text: draft.text,
    punchline: draft.punchline,
    captionB: draft.captionB,
    captionVariant: previous?.captionVariant ?? "a",
    isPunchline: draft.isPunchline,
    duration: draft.duration,
    pauseBeforeCaption: draft.pauseBeforeCaption,
    shot: draft.shot,
    motions: draft.motions.length ? draft.motions : previous?.motions,
    boil: previous?.boil ?? 42,
    voice: draft.voice,
    voiceText: draft.voiceText,
    skipped: draft.skipped,
    template: draft.template || previous?.template,
    seed: previous?.seed ?? index + 2,
  });
}

export function scenesFromScript(text: string, template: Template): Scene[] {
  const chunks = text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*\d+[\).\]]\s*/, "").trim())
    .filter(Boolean);
  const pieces = chunks.length > 1 ? chunks : text.split(/(?<=[.?!])\s+/).map((line) => line.trim()).filter(Boolean);
  const limited = pieces.slice(0, 8);
  return limited.map((line, index) => {
    const quoted = line.match(/[“"]([^”"]+)[”"]/);
    const isLast = index === limited.length - 1;
    const punch = Boolean(quoted) || (isLast && limited.length > 2);
    return makeScene({
      text: quoted ? line.replace(/[“"][^”"]+[”"]/, "").trim() || "They wait for the line to land." : line,
      punchline: quoted?.[1] ? `“${quoted[1]}”` : punch ? line : "",
      isPunchline: punch,
      shot: index === 0 ? "wide" : punch ? "two" : index % 2 ? "close" : "two",
      template,
      duration: punch ? 4 : 2.6,
      pauseBeforeCaption: punch ? 1.2 : 0.2,
      seed: index + 4,
      motions: punch ? ["boil", "caption", "blink"] : ["boil", index === 0 ? "parallax" : "gesture"],
    });
  });
}

function beats(topic: string, count: number, kind: Kind, template: Template): Scene[] {
  const subject = topic.replace(/^an?\s+/i, "");
  const cap = subject.charAt(0).toUpperCase() + subject.slice(1);
  const names = kind === "explainer" ? ["Guide", "Reader"] : ["Alex", "Sam"];
  const gag: { text: string; punchline: string; shot: Shot; punch: boolean }[] = [
    { text: `${names[0]} and ${names[1]} take in ${subject}. From here, it still looks ordinary.`, punchline: "", shot: "wide", punch: false },
    { text: `${names[0]} notices the part of ${subject} nobody put on the agenda.`, punchline: "", shot: "close", punch: false },
    { text: `${names[1]} offers the usual fix. Both of them already know the ending.`, punchline: "", shot: "two", punch: false },
    { text: "Nobody moves. The picture is doing the talking.", punchline: `“${cap} can wait. We were going to anyway.”`, shot: "two", punch: true },
    { text: `Hold on what ${subject} left in the room.`, punchline: "", shot: "prop", punch: false },
    { text: "A last look. The joke does not explain itself.", punchline: "", shot: "wide", punch: false },
    { text: "They leave the frame. The problem stays.", punchline: "", shot: "prop", punch: false },
    { text: "Fade out before anyone says what they mean.", punchline: "", shot: "close", punch: false },
  ];
  const explainer: { text: string; punchline: string; shot: Shot; punch: boolean }[] = [
    { text: `Start with a picture of ${subject}, before the explanation.`, punchline: "", shot: "wide", punch: false },
    { text: `The one fact about ${subject} that the rest hangs on.`, punchline: "", shot: "close", punch: false },
    { text: `The part people skip. With ${subject}, that part is the trick.`, punchline: "", shot: "two", punch: false },
    { text: "Give the picture a beat of quiet, then the line.", punchline: `“That’s ${subject}. The rest is timing.”`, shot: "two", punch: true },
    { text: "Show the same picture again, now that the line has landed.", punchline: "", shot: "prop", punch: false },
    { text: "End on the object, not a summary.", punchline: "", shot: "wide", punch: false },
  ];
  const bank = (kind === "explainer" ? explainer : gag).slice(0, clamp(count, 2, 8));
  const punchAt = Math.min(bank.length - 1, 3);
  return bank.map((beat, index) => {
    const punch = index === punchAt || beat.punch;
    return makeScene({
      text: beat.text,
      punchline: punch ? beat.punchline || `“${cap} was the plan.”` : "",
      captionB: punch ? `“We solved ${subject}. ${cap} has not heard.”` : "",
      isPunchline: punch,
      shot: beat.shot,
      template,
      duration: punch ? 4.2 : index === 0 ? 3 : 2.5,
      pauseBeforeCaption: punch ? 1.2 : 0.15,
      voice: punch ? "character" : index === 1 ? "narration" : "none",
      voiceText: punch ? beat.punchline : index === 1 ? beat.text : "",
      motions: punch ? ["boil", "caption", "blink"] : index === 0 ? ["boil", "parallax"] : ["boil", "gesture"],
      seed: index + 5,
    });
  });
}

export function localRevise(project: Project, message: string, mode: ChatMode): StudioEdit | null {
  const lower = message.toLowerCase();
  const style = readStyle(lower);
  const countMatch = lower.match(/(\d+)\s*[- ]?scenes?/);
  const seconds = lower.match(/(\d+(?:\.\d+)?)\s*(?:seconds|secs)\b/);
  const wantsScript =
    Boolean(countMatch) ||
    /\b(write|draft|gag|script|explain)\b/.test(lower) ||
    (mode === "scriptwriter" && message.trim().length > 12 && project.scenes.length === 0);
  const wantsPunch = mode === "gag" || /\bpunch|funnier|sharpen|joke\b/.test(lower);
  const wantsEditor = mode === "editor" || Boolean(seconds) || /\bskip\b|\bpause\b|\bhold\b/.test(lower);
  if (!wantsScript && !wantsPunch && !style && !wantsEditor) return null;

  let scenes = project.scenes.map((scene) => ({ ...scene, motions: [...scene.motions] }));
  let title: string | null = null;
  const topic = topicOf(message);
  const notes: string[] = [];

  if (wantsScript) {
    const count = countMatch ? clamp(Number.parseInt(countMatch[1] ?? "4", 10), 2, 8) : 4;
    const template = project.scenes[0]?.template ?? (project.kind === "explainer" ? "desk" : "cooler");
    scenes = beats(topic, count, /\bexplain/.test(lower) ? "explainer" : project.kind === "draft" ? "gag" : project.kind, template);
    title = titleFrom(topic);
    notes.push(`Drafted ${scenes.length} scenes`);
  }

  if (wantsPunch && !wantsScript) {
    if (!scenes.length) return null;
    let hit = false;
    scenes = scenes.map((scene, index) => {
      const target = scene.isPunchline || index === scenes.length - 1;
      if (!target) return scene;
      hit = true;
      const line = scene.punchline || `“${titleFrom(topic)} was the plan.”`;
      return {
        ...scene,
        isPunchline: true,
        punchline: line,
        captionB: `“We solved it. It solved us back.”`,
        pauseBeforeCaption: suggestPause({ punchline: line, isPunchline: true }),
        motions: motionsFrom("caption blink boil", scene.motions),
        voice: scene.voice === "none" ? "character" : scene.voice,
        voiceText: scene.voiceText || line,
      };
    });
    if (hit) notes.push("Punched up the caption and held a beat before it");
  }

  if (seconds && scenes.length) {
    const target = clamp(Number.parseFloat(seconds[1] ?? "12"), 4, 90);
    const sum = scenes.reduce((total, scene) => total + (scene.skipped ? 0 : scene.duration), 0) || 1;
    const scale = target / sum;
    scenes = scenes.map((scene) => ({ ...scene, duration: round1(clamp(scene.duration * scale, 0.8, 12)) }));
    notes.push(`Timed the cut to about ${round1(scenes.reduce((t, s) => t + (s.skipped ? 0 : s.duration), 0))}s`);
  }

  if (wantsEditor) {
    scenes = scenes.map((scene) => ({ ...scene, motions: motionsFrom(lower, scene.motions) }));
    if (/\bskip\b/.test(lower) && scenes.length > 2) {
      scenes = scenes.map((scene, index) => (index === 1 ? { ...scene, skipped: true } : scene));
      notes.push("Skipped a scene instead of deleting it");
    }
  }

  if (style) {
    const bits = [
      style.line ? `${style.line} lines` : "",
      style.wash ? `${style.wash} wash` : "",
      style.paper ? `${style.paper} paper` : "",
    ].filter(Boolean);
    notes.push(bits.join(", "));
  }

  if (!notes.length && !title) return null;
  const changedScenes = wantsScript || wantsPunch || Boolean(seconds) || wantsEditor ? scenes.map(sceneToDraft) : null;
  return {
    reply: notes.length
      ? `${notes.join(". ")}. The scenes are on a card below — undo if this isn’t the cut.`
      : "Nothing in the cut needed to change.",
    title,
    style,
    characters: null,
    scenes: changedScenes,
  };
}

function sceneToDraft(scene: Scene): SceneDraft {
  return {
    text: scene.text,
    punchline: scene.punchline,
    captionB: scene.captionB,
    isPunchline: scene.isPunchline,
    duration: scene.duration,
    pauseBeforeCaption: scene.pauseBeforeCaption,
    shot: scene.shot,
    motions: scene.motions,
    voice: scene.voice,
    voiceText: scene.voiceText,
    skipped: scene.skipped,
    template: scene.template,
  };
}

export function summarizeChange(before: Project, edit: StudioEdit) {
  const bits: string[] = [];
  if (edit.title && edit.title !== before.title) bits.push(`Renamed to “${edit.title}”`);
  if (edit.scenes) {
    bits.push(edit.scenes.length === before.scenes.length ? "Updated the scenes" : `${edit.scenes.length} scenes`);
  }
  if (edit.characters) bits.push("Updated the cast");
  if (edit.style?.line) bits.push(`${edit.style.line} lines`);
  if (edit.style?.wash) bits.push(`${edit.style.wash} wash`);
  if (edit.style?.paper) bits.push(`${edit.style.paper} paper`);
  return bits.join(" · ") || "Updated the project";
}

export function applyEditToProject(project: Project, edit: StudioEdit): Project {
  const characters = edit.characters?.length
    ? edit.characters.slice(0, 3).map((character, index) => ({
        id: project.characters[index]?.id ?? uid("c"),
        name: character.name.trim() || project.characters[index]?.name || "Alex",
        hair: oneOf(character.hair, HAIR, project.characters[index]?.hair ?? "short"),
        accessory: oneOf(character.accessory, ACCESSORY, project.characters[index]?.accessory ?? "none"),
      }))
    : project.characters;
  const scenes = edit.scenes
    ? edit.scenes.slice(0, 8).map((draft, index) =>
        draftToScene(
          {
            ...draft,
            text: draft.text?.trim() || "A quiet beat.",
            punchline: draft.punchline ?? "",
            captionB: draft.captionB ?? "",
            shot: oneOf(draft.shot, SHOTS, "two"),
            motions: (draft.motions ?? []).filter((item): item is Motion => MOTION.includes(item)),
            voice: oneOf(draft.voice, VOICES, "none"),
            template: oneOf(draft.template, TEMPLATES, project.scenes[0]?.template ?? "cooler"),
            duration: round1(clamp(Number(draft.duration) || 2.6, 0.8, 12)),
            pauseBeforeCaption: round1(clamp(Number(draft.pauseBeforeCaption) || 0.2, 0, 3)),
            isPunchline: Boolean(draft.isPunchline || draft.punchline),
            voiceText: draft.voiceText ?? "",
            skipped: Boolean(draft.skipped),
          },
          project.scenes[index],
          index,
        ),
      )
    : project.scenes;
  return {
    ...project,
    title: edit.title?.trim() || project.title,
    style: { ...project.style, ...cleanStyle(edit.style) },
    characters,
    scenes,
    updatedAt: Date.now(),
  };
}

function cleanStyle(style: Partial<StyleLock> | null): Partial<StyleLock> {
  if (!style) return {};
  const next: Partial<StyleLock> = {};
  if (style.line && LINES.includes(style.line)) next.line = style.line;
  if (style.wash && WASHES.includes(style.wash)) next.wash = style.wash;
  if (style.paper && PAPERS.includes(style.paper)) next.paper = style.paper;
  return next;
}

export function produceCut(project: Project): Project {
  const scenes = project.scenes.map((scene, index, all) => {
    const motions = new Set<Motion>(scene.motions.length ? scene.motions : ["boil"]);
    motions.add("boil");
    if (scene.isPunchline) {
      motions.add("caption");
      motions.add("blink");
    } else if (index === all.length - 1) motions.add("push");
    else if (scene.shot === "wide" || index === 0) motions.add("parallax");
    else motions.add("gesture");
    const pause = scene.isPunchline ? suggestPause(scene) : Math.min(scene.pauseBeforeCaption, 0.25);
    return { ...scene, motions: [...motions], pauseBeforeCaption: pause, boil: scene.boil || 46 };
  });
  return {
    ...project,
    scenes,
    storyboardReady: true,
    motionApplied: true,
    timelineTouched: true,
    updatedAt: Date.now(),
  };
}

export function emptyProject(kind: Kind, title: string): Project {
  const now = Date.now();
  const prompt =
    kind === "explainer"
      ? "Tell me what to explain. Try “Explain how a punchline pause works, in 4 scenes.”"
      : kind === "draft"
        ? "Paste a script, or tell me the gag and I’ll break it into scenes."
        : "Tell me the gag. Try “Write a 4-scene gag about Monday meetings.”";
  return {
    id: uid("p"),
    title,
    kind,
    pinned: false,
    updatedAt: now,
    createdAt: now,
    style: defaultStyle(),
    characters: defaultCast(kind),
    scenes: [],
    chat: [
      {
        id: uid("m"),
        role: "assistant",
        text: prompt,
        at: now,
      },
    ],
    chatMode: "scriptwriter",
    storyboardReady: false,
    motionApplied: false,
    timelineTouched: false,
    exported: false,
  };
}

function cast(a: Character, b: Character): Character[] {
  return [a, b];
}

export function seedProjects(): Project[] {
  const alex: Character = { id: "c-alex", name: "Alex", hair: "short", accessory: "glasses" };
  const sam: Character = { id: "c-sam", name: "Sam", hair: "bun", accessory: "mug" };
  const guide: Character = { id: "c-guide", name: "Guide", hair: "none", accessory: "tie" };
  const reader: Character = { id: "c-reader", name: "Reader", hair: "curly", accessory: "glasses" };
  const today = Date.UTC(2026, 9, 14, 1, 30, 0);
  const beforeTitle = "Water Cooler";
  const coolerScenes: Scene[] = [
    makeScene({
      id: "sc-w1",
      text: "Alex and Sam lean on the office water cooler. The jug is nearly empty.",
      shot: "wide",
      duration: 3,
      template: "cooler",
      motions: ["boil", "parallax"],
      seed: 2,
      voice: "narration",
      voiceText: "Monday, at the cooler.",
    }),
    makeScene({
      id: "sc-w2",
      text: "Alex sips from a paper cup and stares at the clock.",
      shot: "close",
      duration: 2.5,
      template: "cooler",
      motions: ["boil", "gesture", "blink"],
      seed: 5,
      voice: "narration",
      voiceText: "Alex sips, and sighs.",
    }),
    makeScene({
      id: "sc-w3",
      text: "Sam doesn’t look up. The cooler answers first.",
      punchline: "“Still waiting on that synergy.”",
      captionB: "“Good. Now nobody has to go first.”",
      isPunchline: true,
      shot: "two",
      duration: 4.2,
      pauseBeforeCaption: 1.2,
      template: "cooler",
      motions: ["boil", "caption", "blink"],
      seed: 8,
      voice: "character",
      voiceText: "Still waiting on that synergy.",
    }),
    makeScene({
      id: "sc-w4",
      text: "They stare at the empty jug. It gurgles. Fade out.",
      shot: "prop",
      duration: 2.2,
      template: "cooler",
      motions: ["boil", "push"],
      seed: 11,
    }),
  ];
  const coolerBefore = snapshotOf({
    id: "p-cooler",
    title: beforeTitle,
    kind: "gag",
    pinned: true,
    updatedAt: today,
    createdAt: Date.UTC(2026, 9, 10, 12, 0, 0),
    style: { line: "fine", wash: "none", paper: "white" },
    characters: cast(alex, sam),
    scenes: coolerScenes.map((scene, index) => (index === 2 ? { ...scene, punchline: "“Synergy.”", pauseBeforeCaption: 0.2 } : scene)),
    chat: [],
    chatMode: "scriptwriter",
    storyboardReady: true,
    motionApplied: true,
    timelineTouched: true,
    exported: false,
  });

  const cooler: Project = {
    id: "p-cooler",
    title: "Water Cooler Jokes",
    kind: "gag",
    pinned: true,
    updatedAt: today,
    createdAt: Date.UTC(2026, 9, 10, 12, 0, 0),
    style: { line: "fine", wash: "watercolor", paper: "cream" },
    characters: cast(alex, sam),
    scenes: coolerScenes,
    chatMode: "scriptwriter",
    storyboardReady: true,
    motionApplied: true,
    timelineTouched: true,
    exported: false,
    chat: [
      {
        id: "m-w1",
        role: "user",
        text: "Write a 4-scene gag about the office water cooler. Hold the punchline.",
        at: today - 120_000,
      },
      {
        id: "m-w2",
        role: "assistant",
        text: "Four scenes, both of them in every panel, and a hold before the caption. Undo if you want the flatter version back.",
        at: today - 60_000,
        edit: {
          summary: "Renamed to “Water Cooler Jokes” · 4 scenes · watercolor wash · cream paper",
          before: coolerBefore,
          undone: false,
        },
      },
    ],
  };

  const monday: Project = {
    id: "p-monday",
    title: "Monday Meeting",
    kind: "gag",
    pinned: false,
    updatedAt: Date.UTC(2026, 9, 9, 16, 0, 0),
    createdAt: Date.UTC(2026, 9, 8, 16, 0, 0),
    style: { line: "bold", wash: "flat", paper: "white" },
    characters: [
      { id: "c-m1", name: "Alex", hair: "short", accessory: "tie" },
      { id: "c-m2", name: "Sam", hair: "curly", accessory: "mug" },
    ],
    storyboardReady: true,
    motionApplied: false,
    timelineTouched: false,
    exported: false,
    chatMode: "gag",
    chat: [
      {
        id: "m-mo",
        role: "assistant",
        text: "The meeting gag is blocked. Punch up the caption, or generate the storyboard.",
        at: Date.UTC(2026, 9, 9, 16, 0, 0),
      },
    ],
    scenes: [
      makeScene({ id: "sc-m1", text: "A conference table. One laptop, and more chairs than people.", shot: "wide", template: "desk", duration: 2.8, seed: 4, motions: ["boil"] }),
      makeScene({ id: "sc-m2", text: "Sam points at a slide that only says the agenda.", shot: "two", template: "desk", duration: 2.4, seed: 6, motions: ["boil"] }),
      makeScene({
        id: "sc-m3",
        text: "Alex looks at the empty chairs.",
        punchline: "“Any questions?”",
        captionB: "“We’ll take that as a yes.”",
        isPunchline: true,
        shot: "close",
        template: "desk",
        duration: 3.6,
        pauseBeforeCaption: 0.4,
        seed: 9,
      }),
      makeScene({ id: "sc-m4", text: "The laptop sleeps on its own.", shot: "prop", template: "desk", duration: 2, seed: 12 }),
    ],
  };

  const retirement: Project = {
    id: "p-retire",
    title: "Retirement Toast",
    kind: "gag",
    pinned: false,
    updatedAt: Date.UTC(2026, 9, 2, 18, 0, 0),
    createdAt: Date.UTC(2026, 9, 2, 15, 0, 0),
    style: { line: "loose", wash: "watercolor", paper: "newsprint" },
    characters: [
      { id: "c-r1", name: "Alex", hair: "none", accessory: "tie" },
      { id: "c-r2", name: "Sam", hair: "bun", accessory: "none" },
    ],
    storyboardReady: false,
    motionApplied: false,
    timelineTouched: false,
    exported: false,
    chatMode: "editor",
    chat: [
      {
        id: "m-r",
        role: "assistant",
        text: "A podium toast, still just the script. Generate a storyboard when the lines feel right.",
        at: Date.UTC(2026, 9, 2, 18, 0, 0),
      },
    ],
    scenes: [
      makeScene({ id: "sc-r1", text: "A podium, a small box, and a room that dressed up.", shot: "wide", template: "podium", duration: 3, seed: 3 }),
      makeScene({ id: "sc-r2", text: "Alex holds the box like it might still be work.", shot: "close", template: "podium", duration: 2.6, seed: 7 }),
      makeScene({
        id: "sc-r3",
        text: "Sam reads from a card.",
        punchline: "“For thirty years, the deadlines missed you.”",
        isPunchline: true,
        shot: "two",
        template: "podium",
        duration: 4,
        pauseBeforeCaption: 1.4,
        seed: 10,
        motions: ["boil", "caption"],
      }),
    ],
  };

  const explainer: Project = {
    id: "p-timing",
    title: "How a Pause Works",
    kind: "explainer",
    pinned: false,
    updatedAt: Date.UTC(2026, 9, 12, 11, 0, 0),
    createdAt: Date.UTC(2026, 9, 12, 9, 0, 0),
    style: { line: "fine", wash: "watercolor", paper: "cream" },
    characters: cast(guide, reader),
    storyboardReady: true,
    motionApplied: true,
    timelineTouched: false,
    exported: false,
    chatMode: "editor",
    chat: [
      {
        id: "m-e",
        role: "assistant",
        text: "Four beats on why the caption waits. The timeline hasn’t been trimmed yet.",
        at: Date.UTC(2026, 9, 12, 11, 0, 0),
      },
    ],
    scenes: [
      makeScene({ id: "sc-e1", text: "Guide sets a single drawing on the desk. Reader watches.", shot: "wide", template: "desk", duration: 2.8, seed: 2, motions: ["boil", "parallax"], voice: "narration", voiceText: "First, the picture." }),
      makeScene({ id: "sc-e2", text: "Nothing new enters the frame. That is the hold.", shot: "two", template: "desk", duration: 2.4, seed: 4, motions: ["boil", "blink"] }),
      makeScene({
        id: "sc-e3",
        text: "The caption arrives only after the hold.",
        punchline: "“The pause is the setup you don’t write.”",
        isPunchline: true,
        shot: "close",
        template: "desk",
        duration: 4,
        pauseBeforeCaption: 1.3,
        seed: 8,
        motions: ["boil", "caption"],
        voice: "character",
        voiceText: "The pause is the setup you don’t write.",
      }),
      makeScene({ id: "sc-e4", text: "Same drawing. The meaning has moved.", shot: "prop", template: "desk", duration: 2.2, seed: 13, motions: ["boil", "push"] }),
    ],
  };

  const draft: Project = {
    id: "p-draft",
    title: "Untitled draft",
    kind: "draft",
    pinned: false,
    updatedAt: Date.UTC(2026, 9, 11, 20, 0, 0),
    createdAt: Date.UTC(2026, 9, 11, 20, 0, 0),
    style: defaultStyle(),
    characters: cast(
      { id: "c-d1", name: "Alex", hair: "short", accessory: "glasses" },
      { id: "c-d2", name: "Sam", hair: "bun", accessory: "mug" },
    ),
    scenes: [],
    chat: [
      {
        id: "m-d",
        role: "assistant",
        text: "This draft is empty. Tell me the gag, or import a script.",
        at: Date.UTC(2026, 9, 11, 20, 0, 0),
      },
    ],
    chatMode: "scriptwriter",
    storyboardReady: false,
    motionApplied: false,
    timelineTouched: false,
    exported: false,
  };

  return [cooler, monday, retirement, explainer, draft];
}
