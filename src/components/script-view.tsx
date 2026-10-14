import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, FileText, Mic, Pencil, Plus, RotateCcw, Sparkles, Square } from "lucide-react";
import { directScript } from "@/lib/direct-script";
import { agoLabel, localRevise, totalDuration } from "@/lib/model";
import { useStudio } from "@/lib/store";
import type { ChatMode, Project } from "@/lib/types";
import { cn } from "@/lib/cn";

const MODES: { id: ChatMode; label: string }[] = [
  { id: "scriptwriter", label: "Scriptwriter" },
  { id: "gag", label: "Gag doctor" },
  { id: "editor", label: "Editor" },
];

const STATUSES = ["Drafting…", "Blocking scenes…", "Timing the gag…", "Cutting…"];

type Rec = {
  start: () => void;
  stop: () => void;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
};

export function ScriptView({ project }: { project: Project }) {
  const pane = useStudio((s) => s.scriptPane);
  const setPane = useStudio((s) => s.setScriptPane);
  const pushUser = useStudio((s) => s.pushUser);
  const rewindTo = useStudio((s) => s.rewindTo);
  const dropAfter = useStudio((s) => s.dropAfter);
  const undoEdit = useStudio((s) => s.undoEdit);
  const commitEdit = useStudio((s) => s.commitEdit);
  const setChatMode = useStudio((s) => s.setChatMode);
  const updateScene = useStudio((s) => s.updateScene);
  const addScene = useStudio((s) => s.addScene);
  const generateStoryboard = useStudio((s) => s.generateStoryboard);
  const makeVideo = useStudio((s) => s.makeVideo);
  const ask = useServerFn(directScript);

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(STATUSES[0]);
  const [menu, setMenu] = useState(false);
  const [hint, setHint] = useState("");
  const [copied, setCopied] = useState("");
  const [canDictate, setCanDictate] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);
  const rec = useRef<Rec | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    setCanDictate(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [project.chat.length, busy, pane]);

  useEffect(() => {
    if (!busy) return;
    let i = 0;
    const timer = window.setInterval(() => {
      i = (i + 1) % STATUSES.length;
      setStatus(STATUSES[i] ?? "Drafting…");
    }, 900);
    return () => window.clearInterval(timer);
  }, [busy]);

  async function send(text: string, keepUser = false) {
    const message = text.trim();
    if (!message || busy) return;
    setDraft("");
    setMenu(false);
    setHint("");
    if (!keepUser) pushUser(project.id, message);
    setBusy(true);
    setStatus(STATUSES[0]);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const result = await ask({
        data: {
          message,
          mode: project.chatMode,
          project: {
            title: project.title,
            kind: project.kind,
            style: project.style,
            characters: project.characters,
            scenes: project.scenes,
          },
        },
      });
      if (controller.signal.aborted) {
        commitEdit(project.id, { reply: "Stopped.", title: null, style: null, characters: null, scenes: null });
        return;
      }
      if (result.ok) {
        commitEdit(project.id, result.edit);
        return;
      }
      const local = localRevise(project, message, project.chatMode);
      if (local) {
        commitEdit(project.id, {
          ...local,
          reply: `${local.reply} (Done on this device — the studio model didn’t answer.)`,
        });
      } else {
        commitEdit(project.id, { reply: result.error, title: null, style: null, characters: null, scenes: null });
      }
    } catch {
      if (controller.signal.aborted) return;
      const local = localRevise(project, message, project.chatMode);
      commitEdit(
        project.id,
        local ?? { reply: "I couldn’t reach the studio model, and that note didn’t change the cut.", title: null, style: null, characters: null, scenes: null },
      );
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  function stop() {
    abort.current?.abort();
    setBusy(false);
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(""), 1200);
    } catch {
      setHint("Copy isn’t available in this browser.");
    }
  }

  function dictate() {
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    if (rec.current) {
      rec.current.stop();
      rec.current = null;
      return;
    }
    const next = new Ctor();
    next.lang = "en-US";
    next.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript ?? "";
      if (text) setDraft((value) => (value ? `${value} ${text}` : text));
    };
    next.onend = () => {
      rec.current = null;
    };
    rec.current = next;
    next.start();
  }

  const laterEdit = (index: number) => project.chat.slice(index + 1).some((message) => message.edit && !message.edit.undone);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pb-2">
        <p className="text-xs font-bold text-navy">{pane === "chat" ? "Script chat" : "Scene editor"}</p>
        <button
          type="button"
          onClick={() => setPane(pane === "chat" ? "scenes" : "chat")}
          className="tap inline-flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold"
          aria-label={pane === "chat" ? "Open scene editor" : "Open script chat"}
        >
          <FileText className="size-4" />
          {pane === "chat" ? "Scenes" : "Chat"}
        </button>
      </div>

      {pane === "scenes" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          {project.scenes.length === 0 && <p className="py-8 text-center text-sm">No scenes yet. Ask the scriptwriter, or add one.</p>}
          {project.scenes.map((scene, index) => (
            <div key={scene.id} className={cn("flex gap-3 border-b border-rule py-3", scene.isPunchline && "-mx-4 bg-wash px-4")}>
              <div className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink text-xs font-bold">{index + 1}</div>
              <div className="min-w-0 flex-1">
                <textarea
                  value={scene.text}
                  rows={2}
                  aria-label={`Scene ${index + 1} action`}
                  onChange={(event) => updateScene(project.id, scene.id, { text: event.target.value })}
                  className="w-full resize-none bg-transparent font-serif text-lg leading-snug outline-none"
                />
                <label className="mt-1 block text-xs font-bold text-navy">
                  Caption
                  <input
                    value={scene.captionVariant === "b" ? scene.captionB : scene.punchline}
                    onChange={(event) =>
                      updateScene(
                        project.id,
                        scene.id,
                        scene.captionVariant === "b"
                          ? { captionB: event.target.value, isPunchline: true }
                          : { punchline: event.target.value, isPunchline: true },
                      )
                    }
                    className="mt-1 h-11 w-full rounded-lg border-2 border-ink bg-card px-2 font-serif text-base font-normal text-ink italic outline-none"
                  />
                </label>
                <p className="mt-2 text-xs font-bold text-navy">
                  {scene.shot} · {scene.duration.toFixed(1)}s
                  {scene.isPunchline ? ` · hold ${scene.pauseBeforeCaption.toFixed(1)}s` : ""}
                  {scene.skipped ? " · skipped" : ""}
                </p>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => addScene(project.id)} className="tap mt-3 h-11 text-sm font-semibold text-navy">
            Add a scene
          </button>
          {project.scenes.length > 0 && (
            <p className="text-xs font-semibold text-navy">Cut length {totalDuration(project.scenes.filter((scene) => !scene.skipped)).toFixed(1)}s</p>
          )}
        </div>
      ) : (
        <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-3">
          {project.chat.map((message, index) =>
            message.role === "user" ? (
              <div key={message.id} className="ml-8">
                <div className="rounded-2xl rounded-br-md border-2 border-ink bg-card px-3 py-2 text-sm leading-relaxed">{message.text}</div>
                <div className="mt-1 flex items-center justify-end gap-1 text-xs text-navy">
                  <span>{agoLabel(message.at)}</span>
                  <button type="button" aria-label="Edit message" className="grid size-9 place-items-center" onClick={() => setDraft(rewindTo(project.id, message.id))}>
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" aria-label="Copy message" className="grid size-9 place-items-center" onClick={() => void copy(message.id, message.text)}>
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div key={message.id}>
                <p className="text-sm leading-relaxed">{message.text}</p>
                {message.edit && (
                  <div className="mt-2 rounded-xl border-2 border-ink bg-card p-3">
                    <p className="text-sm font-semibold">{message.edit.summary}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={message.edit.undone || laterEdit(index)}
                        onClick={() => undoEdit(project.id, message.id)}
                        className="tap h-11 rounded-lg border-2 border-ink px-3 text-sm font-semibold disabled:opacity-40"
                      >
                        {message.edit.undone ? "Undone" : "Undo"}
                      </button>
                      <button type="button" onClick={() => setPane("scenes")} className="tap h-11 rounded-lg bg-wash px-3 text-sm font-semibold text-navy">
                        View scenes
                      </button>
                    </div>
                    {laterEdit(index) && !message.edit.undone && (
                      <p className="mt-2 text-xs text-navy">Undo the newer edit first.</p>
                    )}
                  </div>
                )}
                <div className="mt-1 flex gap-1">
                  <button type="button" aria-label="Copy reply" className="grid size-9 place-items-center" onClick={() => void copy(message.id, message.text)}>
                    <Copy className="size-4" />
                  </button>
                  {index > 0 && project.chat[index - 1]?.role === "user" && (
                    <button
                      type="button"
                      aria-label="Try again"
                      className="grid size-9 place-items-center"
                      onClick={() => {
                        const previous = project.chat[index - 1];
                        if (!previous) return;
                        dropAfter(project.id, previous.id);
                        void send(previous.text, true);
                      }}
                    >
                      <RotateCcw className="size-4" />
                    </button>
                  )}
                  {copied === message.id && <span className="self-center text-xs font-semibold text-navy">Copied</span>}
                </div>
              </div>
            ),
          )}
          {busy && (
            <div className="flex items-center gap-2 text-sm font-semibold text-navy">
              <Sparkles className="sf-spin size-4" />
              {status}
            </div>
          )}
          {project.scenes.length === 0 && !busy && (
            <div className="flex flex-wrap gap-2">
              {["Write a 4-scene gag about Monday meetings", "Explain how a punchline pause works, in 4 scenes"].map((prompt) => (
                <button key={prompt} type="button" onClick={() => void send(prompt)} className="tap rounded-full border-2 border-ink px-3 py-2 text-left text-xs font-semibold">
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {hint && <p className="px-4 pb-1 text-xs font-semibold text-navy">{hint}</p>}

      <div className="grid grid-cols-2 gap-2 px-4 pb-2">
        <button
          type="button"
          onClick={() => {
            if (!generateStoryboard(project.id)) setHint("Add a scene or ask for a script first.");
          }}
          className="tap h-11 rounded-xl border-2 border-ink text-sm font-semibold"
        >
          Generate storyboard
        </button>
        <button
          type="button"
          onClick={() => {
            if (!makeVideo(project.id)) setHint("Write the script first, then make the video.");
          }}
          className="tap h-11 rounded-xl bg-navy text-sm font-bold text-on-navy"
        >
          Make video
        </button>
      </div>

      <div className="relative border-t border-rule px-3 pt-2 pb-3">
        {menu && (
          <div className="absolute right-3 bottom-full left-3 z-10 mb-2 grid gap-1 rounded-xl border-2 border-ink bg-card p-1">
            <button
              type="button"
              className="h-11 rounded-lg px-3 text-left text-sm font-semibold"
              onClick={() => {
                const script = project.scenes
                  .map((scene, index) => `${index + 1}. ${scene.text}${scene.punchline ? ` “${scene.punchline.replace(/[“”]/g, "")}”` : ""}`)
                  .join("\n");
                setDraft(script || draft);
                setMenu(false);
                if (!script) setHint("There’s no script to insert yet.");
              }}
            >
              Insert my current script
            </button>
            <button
              type="button"
              className="h-11 rounded-lg px-3 text-left text-sm font-semibold"
              onClick={() => {
                void navigator.clipboard.readText().then(
                  (text) => setDraft((value) => (value ? `${value}\n${text}` : text)),
                  () => setHint("Clipboard isn’t available."),
                );
                setMenu(false);
              }}
            >
              Paste from clipboard
            </button>
            <button
              type="button"
              className="h-11 rounded-lg px-3 text-left text-sm font-semibold"
              onClick={() => {
                setMenu(false);
                void send("Punch up the punchline. Keep the setup, sharpen the caption, and write a second caption.");
              }}
            >
              Punch up the punchline
            </button>
          </div>
        )}
        <div className="flex items-end gap-1">
          <button type="button" aria-label="Insert" onClick={() => setMenu((open) => !open)} className="tap grid size-11 place-items-center rounded-full border-2 border-ink">
            <Plus className="size-5" />
          </button>
          <textarea
            value={draft}
            rows={1}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a message…"
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border-2 border-ink bg-card px-3 py-2.5 text-base outline-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
            }}
          />
          {canDictate && (
            <button type="button" aria-label="Dictate" onClick={dictate} className="tap grid size-11 place-items-center">
              <Mic className="size-5" />
            </button>
          )}
          {busy ? (
            <button type="button" aria-label="Stop" onClick={stop} className="tap grid size-11 place-items-center rounded-full bg-ink text-paper">
              <Square className="size-4 fill-current" />
            </button>
          ) : (
            <button type="button" aria-label="Send" disabled={!draft.trim()} onClick={() => void send(draft)} className="tap h-11 rounded-full bg-navy px-3 text-sm font-bold text-on-navy disabled:opacity-40">
              Send
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-navy">AI can make mistakes.</p>
          <label className="sr-only" htmlFor="mode">
            Mode
          </label>
          <select
            id="mode"
            value={project.chatMode}
            onChange={(event) => setChatMode(project.id, event.target.value as ChatMode)}
            className="h-11 rounded-lg border-2 border-ink bg-card px-2 text-sm font-semibold"
          >
            {MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
