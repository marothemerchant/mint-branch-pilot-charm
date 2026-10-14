import type { ReactNode } from "react";
import { Activity, ChevronLeft, Clock3, Mic, Palette, Play, Users } from "lucide-react";
import { useStudio, useActiveProject } from "@/lib/store";
import type { Tab } from "@/lib/types";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/chrome";
import { ScriptView } from "@/components/script-view";
import { StoryboardView } from "@/components/storyboard-view";
import { TimelineView } from "@/components/timeline-view";
import { EditorSheets } from "@/components/editor-sheets";
import { PreviewStage } from "@/components/preview-stage";
import { Sheet } from "@/components/chrome";

const TABS: { id: Tab; label: string }[] = [
  { id: "script", label: "Script" },
  { id: "storyboard", label: "Storyboard" },
  { id: "timeline", label: "Timeline" },
];

export function ProjectScreen() {
  const project = useActiveProject();
  const tab = useStudio((s) => s.tab);
  const setTab = useStudio((s) => s.setTab);
  const goHome = useStudio((s) => s.goHome);
  const sheet = useStudio((s) => s.sheet);
  const openSheet = useStudio((s) => s.openSheet);
  const closeSheet = useStudio((s) => s.closeSheet);
  const selected = useStudio((s) => s.selectedSceneId);
  const splitScene = useStudio((s) => s.splitScene);
  const duplicateScene = useStudio((s) => s.duplicateScene);
  const updateScene = useStudio((s) => s.updateScene);
  const markExported = useStudio((s) => s.markExported);
  const markTimeline = useStudio((s) => s.markTimeline);

  if (!project) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <p className="font-serif text-2xl">That project is gone.</p>
          <button type="button" onClick={goHome} className="mt-3 h-11 font-semibold text-navy">
            Back to projects
          </button>
        </div>
      </div>
    );
  }

  const sceneId = selected ?? project.scenes[0]?.id;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-1 px-2 pt-3">
        <IconButton label="Back to projects" onClick={goHome}>
          <ChevronLeft className="size-6" />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-center font-serif text-xl">{project.title}</h1>
        <IconButton label="Cast" onClick={() => openSheet({ name: "characters", projectId: project.id })}>
          <Users className="size-5" />
        </IconButton>
        <IconButton label="Play preview" onClick={() => openSheet({ name: "preview", projectId: project.id })}>
          <Play className="size-5" />
        </IconButton>
      </header>
      <div className="mx-4 mt-1 mb-3 flex overflow-hidden rounded-xl border-2 border-ink">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn("tap h-11 flex-1 text-sm font-semibold", tab === item.id ? "bg-ink text-paper" : "bg-paper")}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "script" && <ScriptView project={project} />}
      {tab === "storyboard" && <StoryboardView project={project} />}
      {tab === "timeline" && <TimelineView project={project} />}

      {tab === "storyboard" && (
        <div className="grid grid-cols-4 border-t border-rule px-2 pt-1 pb-3">
          <Tool label="Style" onClick={() => openSheet({ name: "style", projectId: project.id })}>
            <Palette className="size-5" />
          </Tool>
          <Tool label="Motion" onClick={() => openSheet({ name: "motion", projectId: project.id })}>
            <Activity className="size-5" />
          </Tool>
          <Tool label="Voice" onClick={() => openSheet({ name: "voice", projectId: project.id })}>
            <Mic className="size-5" />
          </Tool>
          <Tool label="Timing" onClick={() => openSheet({ name: "timing", projectId: project.id })}>
            <Clock3 className="size-5" />
          </Tool>
        </div>
      )}

      {tab === "timeline" && (
        <div className="grid grid-cols-4 gap-1 border-t border-rule px-2 pt-2 pb-3">
          <Tool
            label="Split"
            onClick={() => {
              if (sceneId) {
                splitScene(project.id, sceneId);
                markTimeline(project.id);
              }
            }}
          >
            Split
          </Tool>
          <Tool
            label="Duplicate"
            onClick={() => {
              if (sceneId) duplicateScene(project.id, sceneId);
            }}
          >
            Copy
          </Tool>
          <Tool
            label="Skip"
            onClick={() => {
              const scene = project.scenes.find((item) => item.id === sceneId);
              if (scene) {
                updateScene(project.id, scene.id, { skipped: !scene.skipped });
                markTimeline(project.id);
              }
            }}
          >
            Skip
          </Tool>
          <button
            type="button"
            onClick={() => openSheet({ name: "preview", projectId: project.id })}
            className="tap h-12 rounded-xl bg-navy text-sm font-bold text-on-navy"
          >
            Export
          </button>
        </div>
      )}

      <EditorSheets project={project} />
      {sheet?.name === "preview" && (
        <Sheet title="Preview" onClose={closeSheet}>
          <PreviewStage project={project} autoplay onExported={() => markExported(project.id)} />
        </Sheet>
      )}
    </div>
  );
}

function Tool({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  const textOnly = label === "Split" || label === "Duplicate" || label === "Skip";
  return (
    <button type="button" onClick={onClick} className="tap flex h-12 flex-col items-center justify-center gap-0.5 text-xs font-semibold">
      {children}
      {!textOnly && <span>{label}</span>}
    </button>
  );
}
