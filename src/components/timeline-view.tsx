import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import type { Project, Scene } from "@/lib/types";
import { captionOf, voiceLabel } from "@/lib/model";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/cn";
import { PanelArt } from "@/components/panel-art";

const PPS = 64;
const GAP = 6;
const STUB = 64;

type Box = { scene: Scene; index: number; x: number; w: number; start: number };

function layout(scenes: Scene[]) {
  let x = 0;
  let start = 0;
  const boxes: Box[] = scenes.map((scene, index) => {
    const w = scene.skipped ? STUB : scene.duration * PPS;
    const box = { scene, index, x, w, start };
    x += w + GAP;
    if (!scene.skipped) start += scene.duration;
    return box;
  });
  return { boxes, total: start, width: Math.max(x, 280) };
}

function xAtTime(boxes: Box[], time: number) {
  let cursor = 0;
  for (const box of boxes) {
    if (box.scene.skipped) {
      cursor = box.x + box.w + GAP;
      continue;
    }
    if (time <= box.start + box.scene.duration) {
      const ratio = box.scene.duration === 0 ? 0 : (time - box.start) / box.scene.duration;
      return box.x + Math.min(Math.max(ratio, 0), 1) * box.w;
    }
    cursor = box.x + box.w + GAP;
  }
  return cursor;
}

function timeAtX(boxes: Box[], x: number) {
  for (const box of boxes) {
    if (x <= box.x + box.w) {
      if (box.scene.skipped) return box.start;
      const ratio = box.w === 0 ? 0 : (x - box.x) / box.w;
      return box.start + Math.min(Math.max(ratio, 0), 1) * box.scene.duration;
    }
  }
  return boxes.reduce((max, box) => (box.scene.skipped ? max : box.start + box.scene.duration), 0);
}

export function TimelineView({ project }: { project: Project }) {
  const select = useStudio((s) => s.selectScene);
  const selectedId = useStudio((s) => s.selectedSceneId);
  const updateScene = useStudio((s) => s.updateScene);
  const reorder = useStudio((s) => s.reorder);
  const markTimeline = useStudio((s) => s.markTimeline);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);
  const { boxes, total, width } = useMemo(() => layout(project.scenes), [project.scenes]);
  const located = boxes.find((box) => !box.scene.skipped && time >= box.start && time < box.start + box.scene.duration) ?? boxes.find((box) => !box.scene.skipped);
  const playhead = xAtTime(boxes, time);

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
          return total;
        }
        return next;
      });
      if (ended) setPlaying(false);
      else frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, total]);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const pad = 48;
    if (playhead < node.scrollLeft + pad || playhead > node.scrollLeft + node.clientWidth - pad) {
      node.scrollLeft = Math.max(0, playhead - node.clientWidth * 0.4);
    }
  }, [playhead, playing]);

  function seekFrom(clientX: number, current: HTMLElement) {
    const rect = current.getBoundingClientRect();
    const x = clientX - rect.left + (scroller.current?.scrollLeft ?? 0);
    setTime(timeAtX(boxes, x));
    markTimeline(project.id);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-4 overflow-hidden rounded-xl border-2 border-ink bg-card">
        {located ? (
          <PanelArt project={project} scene={located.scene} mode={playing ? "play" : "poster"} time={time - located.start} />
        ) : (
          <div className="grid h-36 place-items-center text-sm">No scenes to play.</div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3 px-4">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => {
            if (time >= total) setTime(0);
            setPlaying((on) => !on);
            markTimeline(project.id);
          }}
          className="tap grid size-11 place-items-center rounded-full bg-navy text-on-navy"
        >
          {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>
        <p className="text-sm font-bold text-navy">
          {time.toFixed(1)}s / {total.toFixed(1)}s
        </p>
      </div>
      <p className="px-4 pt-3 text-xs font-bold text-navy">Time</p>
      <div ref={scroller} className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-3">
        <div style={{ width }} className="relative">
          <button
            type="button"
            aria-label="Seek"
            className="relative mb-2 block h-8 w-full text-left"
            onClick={(event) => seekFrom(event.clientX, event.currentTarget)}
          >
            {Array.from({ length: Math.floor(total) + 1 }, (_, second) => (
              <span key={second} className="absolute top-0 text-xs font-semibold" style={{ left: xAtTime(boxes, second) }}>
                {second}s
                <span className="mt-0.5 block h-2 w-px bg-ink" />
              </span>
            ))}
          </button>
          <Track label="Scenes">
            {boxes.map((box) => (
              <SceneBlock
                key={box.scene.id}
                box={box}
                selected={selectedId === box.scene.id}
                dragOver={dragOver === box.index}
                onSelect={() => {
                  select(box.scene.id);
                  setTime(box.start);
                }}
                onTrim={(edge, next) => {
                  updateScene(project.id, box.scene.id, { duration: next });
                  markTimeline(project.id);
                  if (edge === "right") setTime(Math.min(time, box.start + next));
                }}
                onReorder={(to) => {
                  if (to !== box.index) reorder(project.id, box.index, to);
                  setDragOver(null);
                }}
                onDragOver={setDragOver}
                count={project.scenes.length}
              />
            ))}
          </Track>
          <Track label="Captions">
            {boxes.map((box) => {
              const line = captionOf(box.scene);
              if (!line || box.scene.skipped) return null;
              const inset = box.scene.pauseBeforeCaption * PPS;
              return (
                <div
                  key={box.scene.id}
                  className="absolute flex h-8 items-center rounded-md border-2 border-dashed border-navy bg-paper px-1 text-xs font-bold text-navy"
                  style={{ left: box.x + Math.min(inset, Math.max(box.w - 28, 0)), width: Math.max(box.w - inset, 28) }}
                >
                  <span className="truncate">{box.scene.isPunchline ? "Punchline" : "Caption"}</span>
                </div>
              );
            })}
          </Track>
          <Track label="Voice">
            {boxes.map((box) => {
              const label = voiceLabel(box.scene, project);
              if (!label || box.scene.skipped) return null;
              return (
                <div
                  key={box.scene.id}
                  className="absolute flex h-8 items-center rounded-md border-2 border-ink bg-wash px-1 text-xs font-bold"
                  style={{ left: box.x, width: box.w }}
                >
                  <span className="truncate">{label}</span>
                </div>
              );
            })}
          </Track>
          <div className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-navy" style={{ left: playhead }} />
        </div>
      </div>
    </div>
  );
}

function Track({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-2">
      <p className="mb-1 text-xs font-bold text-navy">{label}</p>
      <div className="relative h-12">{children}</div>
    </div>
  );
}

function SceneBlock({
  box,
  selected,
  dragOver,
  onSelect,
  onTrim,
  onReorder,
  onDragOver,
  count,
}: {
  box: Box;
  selected: boolean;
  dragOver: boolean;
  onSelect: () => void;
  onTrim: (edge: "left" | "right", duration: number) => void;
  onReorder: (index: number) => void;
  onDragOver: (index: number | null) => void;
  count: number;
}) {
  const drag = useRef<{ x: number; moved: boolean; index: number; last: number } | null>(null);

  return (
    <div
      className={cn(
        "absolute top-0 flex h-12 items-stretch overflow-hidden rounded-md border-2 bg-card text-xs font-bold",
        selected ? "border-navy bg-wash" : "border-ink",
        box.scene.skipped && "border-dashed opacity-60",
        dragOver && "ring-2 ring-navy",
      )}
      style={{ left: box.x, width: box.w }}
    >
      {!box.scene.skipped && (
        <button
          type="button"
          aria-label={`Trim start of scene ${box.index + 1}`}
          data-handle="left"
          className="w-3 shrink-0 cursor-ew-resize bg-ink/10"
          onPointerDown={(event) => startTrim(event, "left", box, onTrim)}
        />
      )}
      <button
        type="button"
        className="min-w-0 flex-1 truncate px-1 text-left"
        onPointerDown={(event) => {
          const target = event.target as HTMLElement;
          if (target.dataset.handle) return;
          drag.current = { x: event.clientX, moved: false, index: box.index, last: event.clientX };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const state = drag.current;
          if (!state) return;
          state.last = event.clientX;
          if (Math.abs(event.clientX - state.x) > 8) state.moved = true;
          if (!state.moved) return;
          const delta = Math.round((event.clientX - state.x) / (PPS * 1.2));
          const next = Math.min(count - 1, Math.max(0, state.index + delta));
          onDragOver(next);
        }}
        onPointerUp={() => {
          const state = drag.current;
          drag.current = null;
          if (state?.moved) {
            const delta = Math.round((state.last - state.x) / (PPS * 1.2));
            const next = Math.min(count - 1, Math.max(0, state.index + delta));
            if (next !== state.index) onReorder(next);
          } else onSelect();
          onDragOver(null);
        }}
      >
        {box.scene.skipped ? `Skip ${box.index + 1}` : box.index + 1}
      </button>
      {!box.scene.skipped && (
        <button
          type="button"
          aria-label={`Trim end of scene ${box.index + 1}`}
          data-handle="right"
          className="w-3 shrink-0 cursor-ew-resize bg-ink/10"
          onPointerDown={(event) => startTrim(event, "right", box, onTrim)}
        />
      )}
    </div>
  );
}

function startTrim(
  event: ReactPointerEvent<HTMLButtonElement>,
  edge: "left" | "right",
  box: Box,
  onTrim: (edge: "left" | "right", duration: number) => void,
) {
  event.stopPropagation();
  const startX = event.clientX;
  const start = box.scene.duration;
  event.currentTarget.setPointerCapture(event.pointerId);
  const move = (ev: PointerEvent) => {
    const dx = (ev.clientX - startX) / PPS;
    const next = edge === "right" ? start + dx : start - dx;
    onTrim(edge, Math.round(Math.min(12, Math.max(0.8, next)) * 10) / 10);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}
