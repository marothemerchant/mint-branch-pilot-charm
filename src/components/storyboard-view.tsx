import { RefreshCw } from "lucide-react";
import type { Project } from "@/lib/types";
import { captionOf } from "@/lib/model";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/cn";
import { PanelArt } from "@/components/panel-art";

export function StoryboardView({ project }: { project: Project }) {
  const selected = useStudio((s) => s.selectedSceneId);
  const select = useStudio((s) => s.selectScene);
  const reRoll = useStudio((s) => s.reRoll);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold text-navy">
          Cast stays in frame · {project.characters.map((person) => person.name).join(" · ")}
        </p>
      </div>
      {project.scenes.length === 0 && (
        <p className="rounded-xl border-2 border-dashed border-ink px-4 py-10 text-center text-sm">
          Generate a storyboard after the script has scenes.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {project.scenes.map((scene, index) => {
          const on = selected === scene.id;
          return (
            <article key={scene.id} className={cn("rounded-xl border-2 bg-card p-2", on ? "border-navy" : "border-ink", scene.skipped && "opacity-50")}>
              <button type="button" onClick={() => select(scene.id)} className="tap block w-full text-left">
                <PanelArt project={project} scene={scene} mode={on ? "live" : "poster"} caption={false} className="rounded-md" />
                <p className="mt-2 font-serif text-sm italic leading-snug">{captionOf(scene) || scene.text}</p>
                <p className="mt-1 text-xs font-bold text-navy">
                  Scene {index + 1}
                  {scene.isPunchline ? " · Punchline" : ""} · {scene.duration.toFixed(1)}s
                </p>
              </button>
              <button
                type="button"
                onClick={() => reRoll(project.id, scene.id)}
                className="tap mt-1 flex h-11 w-full items-center justify-center gap-1 rounded-lg border-2 border-ink text-sm font-semibold"
              >
                <RefreshCw className="size-4" />
                Re-roll
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
