import { createServerFn } from "@tanstack/react-start";
import type { ChatMode, Project, StudioEdit } from "@/lib/types";

type Brief = {
  message: string;
  mode: ChatMode;
  project: Pick<Project, "title" | "kind" | "style" | "characters" | "scenes">;
};

const MODES: ChatMode[] = ["scriptwriter", "gag", "editor"];

function briefOf(input: unknown): Brief {
  if (!input || typeof input !== "object") throw new Error("Missing request");
  const data = input as Partial<Brief>;
  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (!message) throw new Error("Write a message first");
  if (message.length > 4000) throw new Error("That message is too long");
  const mode = MODES.includes(data.mode as ChatMode) ? (data.mode as ChatMode) : "scriptwriter";
  const project = data.project;
  if (!project || typeof project !== "object") throw new Error("Missing project");
  return {
    message,
    mode,
    project: {
      title: String(project.title ?? "Untitled").slice(0, 80),
      kind: project.kind === "explainer" || project.kind === "draft" ? project.kind : "gag",
      style: project.style,
      characters: Array.isArray(project.characters) ? project.characters.slice(0, 3) : [],
      scenes: Array.isArray(project.scenes) ? project.scenes.slice(0, 8) : [],
    },
  };
}

export const directScript = createServerFn({ method: "POST" })
  .validator((input: unknown) => briefOf(input))
  .handler(async ({ data }): Promise<{ ok: true; edit: StudioEdit } | { ok: false; error: string }> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "The studio model isn’t available right now." };

    const modeNote =
      data.mode === "gag"
        ? "You are the gag doctor. Keep the setup. Sharpen only the joke. Always fill captionB with a second caption."
        : data.mode === "editor"
          ? "You are the editor. Change pacing, duration, pauseBeforeCaption, shot, motions, voice, and skipped. Do not throw away the joke unless asked."
          : "You are the scriptwriter. Break the idea into 2–6 original scenes. One of them is the punchline.";

    const slim = {
      title: data.project.title,
      kind: data.project.kind,
      style: data.project.style,
      characters: data.project.characters.map((character) => character.name),
      scenes: data.project.scenes.map((scene) => ({
        text: scene.text,
        punchline: scene.punchline,
        isPunchline: scene.isPunchline,
        duration: scene.duration,
        pauseBeforeCaption: scene.pauseBeforeCaption,
        shot: scene.shot,
        motions: scene.motions,
        voice: scene.voice,
        skipped: scene.skipped,
        template: scene.template,
      })),
    };

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(22_000),
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0.6,
          max_tokens: 1400,
          messages: [
            {
              role: "system",
              content: [
                "You edit StoryForge, a studio for original single-panel gag cartoons.",
                modeNote,
                "Write original jokes only. Never imitate or quote a living cartoonist, and never reproduce a copyrighted caption.",
                "Keep named characters consistent. Office templates are cooler, desk, podium, or street.",
                "Return only JSON with this shape:",
                '{"reply":"one or two sentences","title":string|null,"style":{"line":"fine"|"bold"|"loose","wash":"none"|"watercolor"|"flat","paper":"cream"|"white"|"newsprint"}|null,"characters":[{"name":string,"hair":"short"|"bun"|"curly"|"none","accessory":"glasses"|"tie"|"mug"|"none"}]|null,"scenes":[{"text":string,"punchline":string,"captionB":string,"isPunchline":boolean,"duration":number,"pauseBeforeCaption":number,"shot":"wide"|"close"|"two"|"prop","motions":("boil"|"blink"|"gesture"|"push"|"caption"|"parallax")[],"voice":"none"|"narration"|"character","voiceText":string,"skipped":boolean,"template":"cooler"|"desk"|"podium"|"street"}]|null}',
                "Use null for title, style, characters, or scenes when that part should stay as it is.",
                "Punchline scenes need pauseBeforeCaption around 0.8–1.6. Durations are seconds between 0.8 and 8.",
                "reply is plain text, no markdown.",
              ].join("\n"),
            },
            {
              role: "user",
              content: `Project:\n${JSON.stringify(slim)}\n\nRequest: ${data.message}`,
            },
          ],
        }),
      });
      if (!res.ok) return { ok: false, error: `The studio model returned ${res.status}.` };
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content ?? "";
      const edit = parseEdit(text);
      if (!edit) return { ok: false, error: "The studio model didn’t return a cut I could apply." };
      return { ok: true, edit };
    } catch {
      return { ok: false, error: "The studio model didn’t answer in time." };
    }
  });

function parseEdit(text: string): StudioEdit | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as Partial<StudioEdit>;
    const reply = typeof raw.reply === "string" && raw.reply.trim() ? raw.reply.trim() : "Updated the cut.";
    return {
      reply: reply.slice(0, 500),
      title: typeof raw.title === "string" ? raw.title.slice(0, 80) : null,
      style: raw.style && typeof raw.style === "object" ? raw.style : null,
      characters: Array.isArray(raw.characters) ? raw.characters : null,
      scenes: Array.isArray(raw.scenes) ? raw.scenes : null,
    };
  } catch {
    return null;
  }
}
