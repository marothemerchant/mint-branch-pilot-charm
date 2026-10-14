export type Kind = "gag" | "explainer" | "draft";
export type LineWeight = "fine" | "bold" | "loose";
export type Wash = "none" | "watercolor" | "flat";
export type PaperTone = "cream" | "white" | "newsprint";
export type Template = "cooler" | "desk" | "podium" | "street";
export type Shot = "wide" | "close" | "two" | "prop";
export type Motion = "boil" | "blink" | "gesture" | "push" | "caption" | "parallax";
export type Voice = "none" | "narration" | "character";
export type Hair = "short" | "bun" | "curly" | "none";
export type Accessory = "glasses" | "tie" | "mug" | "none";
export type ChatMode = "scriptwriter" | "gag" | "editor";
export type Tab = "script" | "storyboard" | "timeline";
export type ScriptPane = "chat" | "scenes";
export type Filter = "all" | "gag" | "explainer" | "draft";
export type LayoutMode = "grid" | "list";
export type SortMode = "recent" | "alpha";

export type SheetName =
  | "account"
  | "menu"
  | "import"
  | "project"
  | "style"
  | "motion"
  | "voice"
  | "timing"
  | "preview"
  | "characters"
  | "more";

export type Character = {
  id: string;
  name: string;
  hair: Hair;
  accessory: Accessory;
};

export type StyleLock = {
  line: LineWeight;
  wash: Wash;
  paper: PaperTone;
};

export type Scene = {
  id: string;
  text: string;
  punchline: string;
  captionB: string;
  captionVariant: "a" | "b";
  isPunchline: boolean;
  duration: number;
  pauseBeforeCaption: number;
  shot: Shot;
  motions: Motion[];
  boil: number;
  voice: Voice;
  voiceText: string;
  skipped: boolean;
  template: Template;
  seed: number;
};

export type EditSnapshot = {
  title: string;
  style: StyleLock;
  scenes: Scene[];
  characters: Character[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  edit?: {
    summary: string;
    before: EditSnapshot;
    undone: boolean;
  };
};

export type Project = {
  id: string;
  title: string;
  kind: Kind;
  pinned: boolean;
  updatedAt: number;
  createdAt: number;
  style: StyleLock;
  characters: Character[];
  scenes: Scene[];
  chat: ChatMessage[];
  chatMode: ChatMode;
  storyboardReady: boolean;
  motionApplied: boolean;
  timelineTouched: boolean;
  exported: boolean;
};

export type SceneDraft = {
  text: string;
  punchline: string;
  captionB: string;
  isPunchline: boolean;
  duration: number;
  pauseBeforeCaption: number;
  shot: Shot;
  motions: Motion[];
  voice: Voice;
  voiceText: string;
  skipped: boolean;
  template: Template;
};

export type StudioEdit = {
  reply: string;
  title: string | null;
  style: Partial<StyleLock> | null;
  characters: { name: string; hair: Hair; accessory: Accessory }[] | null;
  scenes: SceneDraft[] | null;
};

export const STAGES = ["Script", "Storyboard", "Motion", "Timeline", "Export"] as const;

export const MOTIONS: { id: Motion; label: string }[] = [
  { id: "boil", label: "Line boil" },
  { id: "blink", label: "Blink" },
  { id: "gesture", label: "Gesture loop" },
  { id: "push", label: "Slow push-in" },
  { id: "caption", label: "Caption reveal" },
  { id: "parallax", label: "Parallax" },
];
