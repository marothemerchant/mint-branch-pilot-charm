import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Pause, Play } from "lucide-react";
import type { Project } from "@/lib/types";
import { activeScenes, captionOf, totalDuration } from "@/lib/model";
import { PanelArt } from "@/components/panel-art";
import { PrimaryButton } from "@/components/chrome";

function locate(project: Project, time: number) {
  const scenes = activeScenes(project);
  let cursor = 0;
  for (const scene of scenes) {
    if (time < cursor + scene.duration) return { scene, local: time - cursor };
    cursor += scene.duration;
  }
  const last = scenes[scenes.length - 1];
  if (!last) return null;
  return { scene: last, local: last.duration };
}

export function PreviewStage({
  project,
  autoplay = false,
  onExported,
}: {
  project: Project;
  autoplay?: boolean;
  onExported: () => void;
}) {
  const scenes = activeScenes(project);
  const total = totalDuration(scenes);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [note, setNote] = useState("");
  const [exporting, setExporting] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const spot = locate(project, Math.min(time, Math.max(total - 0.01, 0)));
  const spoken = useRef("");

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      let ended = false;
      setTime((current) => {
        const next = current + dt;
        if (next >= total) {
          ended = true;
          return 0;
        }
        return next;
      });
      if (ended) setPlaying(false);
      else frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, total]);

  const sceneId = spot?.scene.id ?? "";
  const voice = spot?.scene.voice ?? "none";
  const speakText = spot ? spot.scene.voiceText || captionOf(spot.scene) || spot.scene.text : "";

  useEffect(() => {
    if (!playing || exporting || !sceneId) return;
    if (spoken.current === sceneId) return;
    spoken.current = sceneId;
    if (voice === "none" || !speakText) return;
    window.speechSynthesis?.cancel();
    window.speechSynthesis?.speak(new SpeechSynthesisUtterance(speakText));
  }, [sceneId, voice, playing, exporting, speakText]);

  async function exportVideo() {
    if (!svgRef.current || exporting || !scenes.length) return;
    setExporting(true);
    setPlaying(false);
    window.speechSynthesis?.cancel();
    setNote("Recording the cut…");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "";
      if (!mime) throw new Error("no recorder");
      const stream = canvas.captureStream(12);
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      rec.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      const stopped = new Promise<void>((resolve) => {
        rec.onstop = () => resolve();
      });
      rec.start();
      const step = 1 / 12;
      for (let t = 0; t <= total; t += step) {
        flushSync(() => setTime(Math.min(t, total)));
        await frame();
        await frame();
        const svg = svgRef.current;
        if (!svg) continue;
        const image = await raster(svg);
        ctx.fillStyle = readVar("--color-paper", "#f6f3ec");
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 40, 24, 640, 356);
        const here = locate(project, Math.min(t, total));
        const line = here ? captionOf(here.scene) : "";
        const show = here ? !here.scene.motions.includes("caption") || here.local >= here.scene.pauseBeforeCaption : false;
        if (line && show) {
          ctx.fillStyle = readVar("--color-ink", "#1b1b1b");
          ctx.font = "italic 28px Georgia, serif";
          ctx.textAlign = "center";
          wrap(ctx, line, canvas.width / 2, 420, 620, 32);
        }
      }
      rec.stop();
      await stopped;
      const blob = new Blob(chunks, { type: "video/webm" });
      download(blob, `${slug(project.title)}.webm`);
      onExported();
      setNote("Video saved. Captions are in the picture. Narration stays in the preview.");
    } catch {
      setNote("This browser couldn’t record a video. Download the project file instead.");
    } finally {
      setExporting(false);
    }
  }

  function downloadProject() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    download(blob, `${slug(project.title)}.json`);
    setNote("Project file saved on this device.");
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border-2 border-ink bg-card">
        {spot ? (
          <PanelArt
            project={project}
            scene={spot.scene}
            mode={playing || exporting ? "play" : "poster"}
            time={spot.local}
            svgRef={svgRef}
          />
        ) : (
          <p className="p-8 text-center text-sm">Nothing to play yet.</p>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          aria-label={playing ? "Pause preview" : "Play preview"}
          onClick={() => setPlaying((on) => !on)}
          className="tap grid size-11 place-items-center rounded-full bg-navy text-on-navy"
        >
          {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>
        <p className="text-sm font-bold text-navy">
          {time.toFixed(1)}s / {total.toFixed(1)}s
        </p>
      </div>
      <div className="mt-3 grid gap-2">
        <PrimaryButton disabled={exporting || !scenes.length} onClick={() => void exportVideo()}>
          {exporting ? "Recording…" : "Export video"}
        </PrimaryButton>
        <button type="button" onClick={downloadProject} className="tap h-12 rounded-xl border-2 border-ink text-sm font-semibold">
          Download project file
        </button>
      </div>
      {note && <p className="mt-2 text-sm text-navy">{note}</p>}
    </div>
  );
}

function frame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function readVar(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function raster(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "360");
  clone.setAttribute("height", "200");
  const ink = readVar("--color-ink", "#1b1b1b");
  const map: Record<string, string> = {
    "--color-paper": readVar("--color-paper", "#f6f3ec"),
    "--color-card": readVar("--color-card", "#ffffff"),
    "--color-wash": readVar("--color-wash", "#e4ecf4"),
    "--color-rule": readVar("--color-rule", "#d9d3c4"),
    "--color-ink": ink,
    "--color-navy": readVar("--color-navy", "#24496e"),
  };
  const paint = (value: string | null) => {
    if (!value) return value;
    if (value === "currentColor") return ink;
    let next = value;
    for (const [key, color] of Object.entries(map)) {
      next = next.replaceAll(`var(${key})`, color);
    }
    return next;
  };
  clone.querySelectorAll("*").forEach((node) => {
    if (!(node instanceof SVGElement)) return;
    const fill = paint(node.getAttribute("fill"));
    const stroke = paint(node.getAttribute("stroke"));
    if (fill) node.setAttribute("fill", fill);
    if (stroke) node.setAttribute("stroke", stroke);
  });
  clone.style.color = ink;
  const xml = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("frame"));
    image.src = url;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, line: number) {
  const words = text.split(/\s+/);
  let row = "";
  let yy = y;
  for (const word of words) {
    const trial = row ? `${row} ${word}` : word;
    if (ctx.measureText(trial).width > max && row) {
      ctx.fillText(row, x, yy);
      row = word;
      yy += line;
    } else row = trial;
  }
  if (row) ctx.fillText(row, x, yy);
}

function slug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "storyforge";
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
