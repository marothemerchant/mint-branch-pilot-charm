import type { Hair, Accessory, Motion, PaperTone, Project, Shot, Template, Voice, Wash, LineWeight } from "@/lib/types";
import { MOTIONS } from "@/lib/types";
import { suggestPause } from "@/lib/model";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/cn";
import { PanelArt } from "@/components/panel-art";
import { LineButton, PrimaryButton, Sheet } from "@/components/chrome";

const LINES: { id: LineWeight; label: string }[] = [
  { id: "fine", label: "Fine" },
  { id: "bold", label: "Bold" },
  { id: "loose", label: "Loose" },
];
const WASHES: { id: Wash; label: string }[] = [
  { id: "none", label: "None" },
  { id: "watercolor", label: "Watercolor" },
  { id: "flat", label: "Flat" },
];
const PAPERS: { id: PaperTone; label: string }[] = [
  { id: "cream", label: "Cream" },
  { id: "white", label: "White" },
  { id: "newsprint", label: "Newsprint" },
];
const TEMPLATES: { id: Template; label: string }[] = [
  { id: "cooler", label: "Water cooler" },
  { id: "desk", label: "Desk" },
  { id: "podium", label: "Podium" },
  { id: "street", label: "Street" },
];
const SHOTS: { id: Shot; label: string }[] = [
  { id: "wide", label: "Wide" },
  { id: "close", label: "Close" },
  { id: "two", label: "Two-shot" },
  { id: "prop", label: "Prop" },
];
const HAIR: Hair[] = ["short", "bun", "curly", "none"];
const GEAR: Accessory[] = ["glasses", "tie", "mug", "none"];

export function EditorSheets({ project }: { project: Project }) {
  const sheet = useStudio((s) => s.sheet);
  const close = useStudio((s) => s.closeSheet);
  const selectedId = useStudio((s) => s.selectedSceneId) ?? project.scenes[0]?.id;
  const scene = project.scenes.find((item) => item.id === selectedId) ?? project.scenes[0];
  const setStyle = useStudio((s) => s.setStyle);
  const setTemplate = useStudio((s) => s.setTemplate);
  const updateScene = useStudio((s) => s.updateScene);
  const applyMotionAll = useStudio((s) => s.applyMotionAll);
  const resetMotion = useStudio((s) => s.resetMotion);
  const updateCharacter = useStudio((s) => s.updateCharacter);
  if (!sheet || !["style", "motion", "voice", "timing", "characters"].includes(sheet.name)) return null;
  if (!scene && sheet.name !== "characters") return null;

  if (sheet.name === "characters") {
    return (
      <Sheet title="Cast" onClose={close}>
        <p className="mb-3 text-sm">Same people, every panel. Change a look here and the storyboard follows.</p>
        <div className="grid gap-4">
          {project.characters.map((person) => (
            <div key={person.id} className="rounded-xl border-2 border-ink bg-card p-3">
              <label className="grid gap-1 text-sm font-semibold">
                Name
                <input
                  value={person.name}
                  onChange={(event) => updateCharacter(project.id, person.id, { name: event.target.value })}
                  className="h-11 rounded-lg border-2 border-ink bg-paper px-2 font-normal"
                />
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Select
                  label="Hair"
                  value={person.hair}
                  options={HAIR.map((id) => ({ id, label: id }))}
                  onChange={(hair) => updateCharacter(project.id, person.id, { hair: hair as Hair })}
                />
                <Select
                  label="Detail"
                  value={person.accessory}
                  options={GEAR.map((id) => ({ id, label: id }))}
                  onChange={(accessory) => updateCharacter(project.id, person.id, { accessory: accessory as Accessory })}
                />
              </div>
            </div>
          ))}
        </div>
      </Sheet>
    );
  }

  if (!scene) return null;

  if (sheet.name === "style") {
    return (
      <Sheet title="Style lock" onClose={close}>
        <p className="mb-3 text-sm">Line, wash, and paper stay locked across the cut so the cast doesn’t change clothes mid-joke.</p>
        <Choice label="Line" value={project.style.line} options={LINES} onChange={(line) => setStyle(project.id, { line })} />
        <Choice label="Wash" value={project.style.wash} options={WASHES} onChange={(wash) => setStyle(project.id, { wash })} />
        <Choice label="Paper" value={project.style.paper} options={PAPERS} onChange={(paper) => setStyle(project.id, { paper })} />
        <Choice
          label="This scene’s set"
          value={scene.template}
          options={TEMPLATES}
          onChange={(template) => setTemplate(project.id, scene.id, template, false)}
        />
        <div className="mt-3">
          <LineButton onClick={() => setTemplate(project.id, scene.id, scene.template, true)}>Use this set on all scenes</LineButton>
        </div>
      </Sheet>
    );
  }

  if (sheet.name === "motion") {
    return (
      <Sheet title={`Scene ${project.scenes.indexOf(scene) + 1} · Motion`} onClose={close}>
        <div className="mb-3 overflow-hidden rounded-xl border-2 border-ink">
          <PanelArt project={project} scene={scene} mode="live" />
        </div>
        <p className="mb-2 text-xs font-bold text-navy">Presets</p>
        <div className="grid grid-cols-2 gap-2">
          {MOTIONS.map((motion) => {
            const on = scene.motions.includes(motion.id);
            return (
              <button
                key={motion.id}
                type="button"
                onClick={() => {
                  const motions: Motion[] = on ? scene.motions.filter((item) => item !== motion.id) : [...scene.motions, motion.id];
                  updateScene(project.id, scene.id, { motions });
                }}
                className={cn("tap h-14 rounded-lg border-2 px-2 text-left text-sm font-bold", on ? "border-navy bg-wash" : "border-ink bg-card")}
              >
                {motion.label}
              </button>
            );
          })}
        </div>
        <label className="mt-3 block text-sm font-semibold" htmlFor="boil">
          Line boil intensity
          <input
            id="boil"
            type="range"
            min={0}
            max={100}
            value={scene.boil}
            onChange={(event) => updateScene(project.id, scene.id, { boil: Number(event.target.value) })}
            className="mt-1 h-11 w-full accent-navy"
          />
        </label>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <LineButton onClick={() => resetMotion(project.id, scene.id)}>Reset</LineButton>
          <PrimaryButton
            onClick={() => {
              useStudio.getState().setStyle(project.id, {});
              close();
            }}
          >
            Done
          </PrimaryButton>
          <LineButton
            onClick={() => {
              applyMotionAll(project.id, scene.id);
            }}
          >
            All scenes
          </LineButton>
        </div>
      </Sheet>
    );
  }

  if (sheet.name === "voice") {
    return (
      <Sheet title="Voice" onClose={close}>
        <Choice
          label="Who speaks"
          value={scene.voice}
          options={[
            { id: "none" as Voice, label: "Silent" },
            { id: "narration" as Voice, label: "Narration" },
            { id: "character" as Voice, label: project.characters[0]?.name ?? "Character" },
          ]}
          onChange={(voice) => updateScene(project.id, scene.id, { voice })}
        />
        <label className="mt-3 block text-sm font-semibold">
          Line
          <textarea
            value={scene.voiceText}
            onChange={(event) => updateScene(project.id, scene.id, { voiceText: event.target.value })}
            rows={3}
            className="mt-1 w-full rounded-xl border-2 border-ink bg-card p-3 font-normal"
          />
        </label>
        <div className="mt-3">
          <PrimaryButton
            onClick={() => {
              const text = scene.voiceText || scene.punchline || scene.text;
              window.speechSynthesis?.cancel();
              window.speechSynthesis?.speak(new SpeechSynthesisUtterance(text));
            }}
          >
            Preview voice
          </PrimaryButton>
        </div>
        <p className="mt-2 text-xs text-navy">Preview uses this device’s voice. The exported video keeps the picture and captions.</p>
      </Sheet>
    );
  }

  const suggested = suggestPause(scene);
  return (
    <Sheet title="Timing" onClose={close}>
      <p className="mb-3 text-sm">The hold before the caption is the joke. Let the drawing sit, then reveal the line.</p>
      <label className="block text-sm font-semibold" htmlFor="dur">
        Scene length {scene.duration.toFixed(1)}s
        <input
          id="dur"
          type="range"
          min={0.8}
          max={8}
          step={0.1}
          value={scene.duration}
          onChange={(event) => updateScene(project.id, scene.id, { duration: Number(event.target.value) })}
          className="mt-1 h-11 w-full accent-navy"
        />
      </label>
      <label className="mt-2 block text-sm font-semibold" htmlFor="pause">
        Hold before caption {scene.pauseBeforeCaption.toFixed(1)}s
        <input
          id="pause"
          type="range"
          min={0}
          max={2.4}
          step={0.1}
          value={scene.pauseBeforeCaption}
          onChange={(event) => updateScene(project.id, scene.id, { pauseBeforeCaption: Number(event.target.value) })}
          className="mt-1 h-11 w-full accent-navy"
        />
      </label>
      <div className="mt-2">
        <LineButton onClick={() => updateScene(project.id, scene.id, { pauseBeforeCaption: suggested, isPunchline: true })}>
          Use suggested hold ({suggested.toFixed(1)}s)
        </LineButton>
      </div>
      <Choice
        label="Shot"
        value={scene.shot}
        options={SHOTS}
        onChange={(shot) => updateScene(project.id, scene.id, { shot })}
      />
      <p className="mt-3 text-xs font-bold text-navy">Caption variants</p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {(["a", "b"] as const).map((variant) => (
          <button
            key={variant}
            type="button"
            onClick={() => updateScene(project.id, scene.id, { captionVariant: variant })}
            className={cn(
              "tap h-11 rounded-lg border-2 text-sm font-bold",
              scene.captionVariant === variant ? "border-navy bg-wash" : "border-ink bg-card",
            )}
          >
            Caption {variant.toUpperCase()}
          </button>
        ))}
      </div>
      <label className="mt-2 block text-sm font-semibold">
        {scene.captionVariant === "a" ? "Caption A" : "Caption B"}
        <textarea
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
          rows={2}
          className="mt-1 w-full rounded-xl border-2 border-ink bg-card p-3 font-serif font-normal italic"
        />
      </label>
    </Sheet>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="mt-3">
      <p className="mb-1 text-xs font-bold text-navy">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "tap h-11 rounded-lg border-2 px-3 text-sm font-semibold",
              value === option.id ? "border-navy bg-wash" : "border-ink bg-card",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-lg border-2 border-ink bg-paper px-2 font-normal">
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
