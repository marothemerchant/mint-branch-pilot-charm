import { useEffect, useState } from "react";
import type { Character, Project, Scene, Shot, Template } from "@/lib/types";
import { captionOf } from "@/lib/model";
import { cn } from "@/lib/cn";

type Mode = "poster" | "live" | "play";

function useClock(on: boolean) {
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!on) return;
    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      setTime((now - start) / 1000);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [on]);
  return time;
}

function useStill() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setStill(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return still;
}

function strokeWidth(line: Project["style"]["line"]) {
  if (line === "bold") return 2.6;
  if (line === "loose") return 1.8;
  return 1.35;
}

export function PanelArt({
  project,
  scene,
  mode = "poster",
  time = 0,
  caption = true,
  className,
  svgRef,
}: {
  project: Project;
  scene: Scene;
  mode?: Mode;
  time?: number;
  caption?: boolean;
  className?: string;
  svgRef?: { current: SVGSVGElement | null };
}) {
  const still = useStill();
  const live = mode === "live" && !still;
  const clock = useClock(live);
  const t = mode === "play" ? time : live ? clock % Math.max(scene.duration, 1.2) : 0;
  const moving = mode !== "poster" && !still;
  const amp = scene.boil / 100;
  const frames: [number, number][] = [
    [0, 0],
    [0.9, -0.4],
    [-0.65, 0.55],
  ];
  const boilOn = moving && scene.motions.includes("boil");
  const frame = boilOn ? (frames[Math.floor(t * 8) % 3] ?? [0, 0]) : (frames[scene.seed % 3] ?? [0, 0]);
  const ox = (frame[0] ?? 0) * amp * 1.5;
  const oy = (frame[1] ?? 0) * amp * 1.5;
  const blink = moving && scene.motions.includes("blink") ? (Math.sin(t * 1.7) > 0.93 ? 0.12 : 1) : 1;
  const gesture = moving && scene.motions.includes("gesture") ? Math.sin(t * 2.5) * 12 : (scene.seed % 5) - 2;
  const push = moving && scene.motions.includes("push") ? 1 + (t / Math.max(scene.duration, 1)) * 0.07 : 1;
  const drift = moving && scene.motions.includes("parallax") ? Math.sin(t * 0.7) * 10 : 0;
  const line = captionOf(scene);
  const revealed = !caption || !line || !moving || !scene.motions.includes("caption") || t >= scene.pauseBeforeCaption;
  const paper =
    project.style.paper === "white" ? "var(--color-card)" : project.style.paper === "newsprint" ? "var(--color-rule)" : "var(--color-paper)";
  const sw = strokeWidth(project.style.line);

  return (
    <div className={cn("overflow-hidden bg-card text-ink", className)}>
      <svg
        ref={svgRef}
        viewBox="0 0 360 200"
        role="img"
        aria-label={scene.text}
        className="block h-auto w-full"
        style={{ color: "var(--color-ink)" }}
      >
        <rect width="360" height="200" fill={paper} />
        <g transform={`translate(${drift} 0)`}>
          {project.style.wash === "watercolor" && (
            <ellipse cx={118 + (scene.seed % 7) * 4} cy="92" rx="92" ry="48" fill="var(--color-wash)" opacity="0.95" />
          )}
          {project.style.wash === "flat" && <rect x="28" y="36" width="168" height="96" fill="var(--color-wash)" />}
          <Backdrop template={scene.template} />
        </g>
        <g transform={`translate(${ox + drift * 0.25} ${oy}) scale(${push})`} style={{ transformOrigin: "180px 170px" }}>
          <ellipse cx="180" cy="178" rx="108" ry="7" fill="var(--color-rule)" stroke="none" />
          <Prop template={scene.template} shot={scene.shot} sw={sw} />
          {placed(scene.shot, project.characters.length).map((spot, index) => {
            const person = project.characters[index];
            if (!person) return null;
            const order = scene.shot === "close" ? project.characters.length - 1 - index : index;
            const who = project.characters[order];
            const where = placed(scene.shot, project.characters.length)[order];
            if (!who || !where) return null;
            return (
              <Figure
                key={who.id}
                person={who}
                x={where.x}
                y={where.y}
                scale={where.s}
                sw={sw}
                blink={blink}
                gesture={gesture + index * 3}
                loose={project.style.line === "loose"}
                seed={scene.seed + index}
              />
            );
          })}
        </g>
      </svg>
      {caption && (
        <div className="border-t border-rule px-3 py-2" style={{ background: paper }}>
          <p
            className={cn(
              "min-h-6 text-center font-serif text-sm italic leading-snug transition-opacity duration-200",
              revealed ? "opacity-100" : "opacity-0",
            )}
          >
            {line || " "}
          </p>
          {moving && scene.isPunchline && !revealed && (
            <p className="text-center text-xs font-bold text-navy">Holding for the punchline</p>
          )}
        </div>
      )}
    </div>
  );
}

function placed(shot: Shot, count: number) {
  if (count <= 1) {
    return [{ x: shot === "close" ? 188 : 150, y: 176, s: shot === "close" ? 1.2 : 1 }];
  }
  if (shot === "close") {
    return [
      { x: 214, y: 178, s: 1.18 },
      { x: 78, y: 184, s: 0.74 },
    ];
  }
  if (shot === "prop") {
    return [
      { x: 78, y: 180, s: 0.82 },
      { x: 282, y: 180, s: 0.82 },
    ];
  }
  const s = shot === "wide" ? 0.9 : 1.02;
  return [
    { x: 112, y: 178, s },
    { x: 248, y: 178, s },
  ];
}

function Backdrop({ template }: { template: Template }) {
  if (template === "street") {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M18 168 H342" />
        <path d="M250 168 V78" />
        <circle cx="250" cy="70" r="10" fill="var(--color-card)" />
      </g>
    );
  }
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="26" y="28" width="52" height="40" fill="var(--color-card)" />
      <path d="M26 48 H78 M52 28 V68" />
      <path d="M18 168 H342" />
    </g>
  );
}

function Prop({ template, shot, sw }: { template: Template; shot: Shot; sw: number }) {
  const big = shot === "prop" ? 1.2 : shot === "close" ? 0.7 : 1;
  if (template === "desk") {
    return (
      <g fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round">
        <path d="M36 150 H324" />
        <path d="M64 150 V176 M296 150 V176" />
        <rect x="168" y="132" width="36" height="18" rx="2" fill="var(--color-card)" />
      </g>
    );
  }
  return (
    <g transform={`translate(180 176) scale(${big})`} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {template === "cooler" && <Cooler />}
      {template === "podium" && <path d="M-26 -6 L-14 -78 H14 L26 -6 Z" fill="var(--color-card)" />}
      {template === "street" && (
        <g>
          <rect x="-16" y="-70" width="32" height="58" rx="3" fill="var(--color-card)" />
          <path d="M-8 -58 H8 M0 -48 V-20" />
        </g>
      )}
    </g>
  );
}

function Cooler() {
  return (
    <g>
      <rect x="-22" y="-92" width="44" height="78" rx="4" fill="var(--color-card)" />
      <rect x="-14" y="-82" width="28" height="30" fill="var(--color-wash)" stroke="none" />
      <rect x="-14" y="-82" width="28" height="30" />
      <path d="M-8 -46 H8" />
      <path d="M0 -46 Q12 -30 0 -12" />
      <path d="M-28 -8 H28 V0 H-28 Z" fill="var(--color-card)" />
    </g>
  );
}

function Figure({
  person,
  x,
  y,
  scale,
  sw,
  blink,
  gesture,
  loose,
  seed,
}: {
  person: Character;
  x: number;
  y: number;
  scale: number;
  sw: number;
  blink: number;
  gesture: number;
  loose: boolean;
  seed: number;
}) {
  const lean = ((seed % 5) - 2) * 1.4;
  return (
    <g transform={`translate(${x} ${y}) rotate(${lean}) scale(${scale})`}>
      {loose && (
        <g transform="translate(0.8 -0.6)" opacity="0.45">
          <FigureInk person={person} sw={sw} blink={blink} gesture={gesture} seed={seed} />
        </g>
      )}
      <FigureInk person={person} sw={sw} blink={blink} gesture={gesture} seed={seed} />
    </g>
  );
}

function FigureInk({
  person,
  sw,
  blink,
  gesture,
  seed,
}: {
  person: Character;
  sw: number;
  blink: number;
  gesture: number;
  seed: number;
}) {
  return (
    <g stroke="currentColor" fill="none" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M-10 -8 L-14 0 M8 -8 L13 0" />
      <path d="M-18 0 H-6 M8 0 H20" />
      <path d="M-18 -74 Q-22 -40 -14 -10 H14 Q22 -40 18 -74 Q0 -64 -18 -74" fill="var(--color-card)" />
      <path d={`M-14 -64 Q${-30 - gesture * 0.2} ${-48 + gesture * 0.15} ${-16} ${-24 + gesture * 0.2}`} />
      <path d={`M14 -62 Q${30 + gesture * 0.15} ${-34 + gesture * 0.4} ${20} ${-8 + gesture * 0.35}`} />
      {person.accessory === "mug" && (
        <g transform={`translate(${20} ${-8 + gesture * 0.35})`}>
          <path d="M-5 -10 H5 V0 H-5 Z" fill="var(--color-card)" />
          <path d="M5 -8 H8 Q10 -5 5 -2" />
        </g>
      )}
      {person.accessory === "tie" && <path d="M0 -70 L5 -50 L0 -46 L-5 -50 Z" fill="currentColor" />}
      <ellipse cx="0" cy="-96" rx="18" ry="20" fill="var(--color-card)" />
      <path d="M-18 -96 Q-25 -92 -18 -86" />
      <path d="M18 -96 Q25 -92 18 -86" />
      <ellipse cx="-6" cy="-98" rx="2.1" ry={2.1 * blink} fill="currentColor" stroke="none" />
      <ellipse cx="6" cy="-98" rx="2.1" ry={2.1 * blink} fill="currentColor" stroke="none" />
      {person.accessory === "glasses" && (
        <g>
          <circle cx="-6" cy="-98" r="5.2" />
          <circle cx="6" cy="-98" r="5.2" />
          <path d="M-1 -98 H1" />
        </g>
      )}
      <path d="M1 -94 Q4 -88 1 -86" />
      <path d={seed % 2 ? "M-5 -78 Q0 -74 6 -79" : "M-5 -80 Q0 -74 6 -80"} />
      {person.hair === "short" && <path d="M-16 -106 Q0 -122 16 -104" />}
      {person.hair === "bun" && <circle cx="10" cy="-114" r="7" fill="var(--color-card)" />}
      {person.hair === "curly" && <path d="M-14 -106 Q-6 -124 2 -108 Q10 -124 16 -104" />}
      {person.hair === "none" && <path d="M-4 -112 Q0 -116 5 -111" />}
    </g>
  );
}

export function Filmstrip({ project, className }: { project: Project; className?: string }) {
  const scenes = project.scenes.filter((scene) => !scene.skipped).slice(0, 3);
  if (!scenes.length) {
    return (
      <div className={cn("grid h-24 place-items-center rounded-lg border border-dashed border-ink/40 bg-paper text-xs font-semibold text-navy", className)}>
        No scenes yet
      </div>
    );
  }
  return (
    <div className={cn("grid gap-1", scenes.length > 1 ? "grid-cols-3" : "grid-cols-1", className)}>
      {scenes.map((scene) => (
        <div key={scene.id} className="overflow-hidden rounded-md border border-ink">
          <PanelArt project={project} scene={scene} caption={false} />
        </div>
      ))}
    </div>
  );
}
