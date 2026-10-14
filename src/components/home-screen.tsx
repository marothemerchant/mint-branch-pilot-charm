import { useMemo, useState } from "react";
import {
  ArrowDownAZ,
  BookOpen,
  Clapperboard,
  Clock3,
  FileUp,
  LayoutGrid,
  List,
  Menu,
  MoreHorizontal,
  Pin,
  Search,
} from "lucide-react";
import type { Filter, Project } from "@/lib/types";
import { editedLabel, kindLabel, progressOf } from "@/lib/model";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Filmstrip } from "@/components/panel-art";
import { IconButton, LineButton, PrimaryButton, ProgressMarks, Sheet, StepList } from "@/components/chrome";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "gag", label: "Cartoon gags" },
  { id: "explainer", label: "Explainers" },
  { id: "draft", label: "Drafts" },
];

export function HomeScreen() {
  const projects = useStudio((s) => s.projects);
  const filter = useStudio((s) => s.filter);
  const query = useStudio((s) => s.query);
  const layout = useStudio((s) => s.layout);
  const sort = useStudio((s) => s.sort);
  const sheet = useStudio((s) => s.sheet);
  const moreStep = useStudio((s) => s.moreStep);
  const setFilter = useStudio((s) => s.setFilter);
  const setQuery = useStudio((s) => s.setQuery);
  const setLayout = useStudio((s) => s.setLayout);
  const toggleSort = useStudio((s) => s.toggleSort);
  const openSheet = useStudio((s) => s.openSheet);
  const closeSheet = useStudio((s) => s.closeSheet);
  const createAndOpen = useStudio((s) => s.createAndOpen);
  const importAndOpen = useStudio((s) => s.importAndOpen);
  const openProject = useStudio((s) => s.openProject);
  const duplicate = useStudio((s) => s.duplicate);
  const togglePin = useStudio((s) => s.togglePin);
  const remove = useStudio((s) => s.remove);
  const rename = useStudio((s) => s.rename);
  const setMoreStep = useStudio((s) => s.setMoreStep);
  const [importText, setImportText] = useState("");
  const [renameValue, setRenameValue] = useState("");

  const counts = useMemo(() => {
    return {
      all: projects.length,
      gag: projects.filter((project) => project.kind === "gag").length,
      explainer: projects.filter((project) => project.kind === "explainer").length,
      draft: projects.filter((project) => project.kind === "draft").length,
    };
  }, [projects]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((project) => (filter === "all" ? true : project.kind === filter))
      .filter((project) => !q || project.title.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (sort === "alpha") return a.title.localeCompare(b.title);
        return b.updatedAt - a.updatedAt;
      });
  }, [projects, filter, query, sort]);

  const sheetProject = projects.find((project) => project.id === sheet?.projectId) ?? null;

  function continueProject(project: Project) {
    const prog = progressOf(project);
    if (prog.key === "script") openProject(project.id, "script");
    else if (prog.key === "storyboard") openProject(project.id, "storyboard");
    else if (prog.key === "motion") openProject(project.id, "storyboard", "motion");
    else if (prog.key === "timeline") openProject(project.id, "timeline");
    else openProject(project.id, "timeline", "preview");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-1 px-2 pt-3">
        <IconButton label="Menu" onClick={() => openSheet({ name: "menu" })}>
          <Menu className="size-5" />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-center font-serif text-2xl">StoryForge</h1>
        <button
          type="button"
          aria-label="Studio"
          onClick={() => openSheet({ name: "account" })}
          className="tap grid size-11 place-items-center rounded-full border-2 border-ink font-serif text-lg"
        >
          S
        </button>
      </header>

      <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-2">
        {FILTERS.map((item) => {
          const on = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "tap h-11 shrink-0 rounded-full border-2 border-ink px-3 text-sm font-semibold",
                on ? "bg-ink text-paper" : "bg-card",
              )}
            >
              {item.label} {counts[item.id]}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 px-4">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border-2 border-ink bg-card px-3">
          <Search className="size-4 shrink-0" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects"
            className="w-full bg-transparent text-base outline-none"
            aria-label="Search projects"
          />
        </label>
        <IconButton label={layout === "grid" ? "Show as list" : "Show as grid"} onClick={() => setLayout(layout === "grid" ? "list" : "grid")}>
          {layout === "grid" ? <List className="size-5" /> : <LayoutGrid className="size-5" />}
        </IconButton>
        <IconButton label={sort === "recent" ? "Sort A to Z" : "Sort by recent"} onClick={toggleSort}>
          {sort === "recent" ? <Clock3 className="size-5" /> : <ArrowDownAZ className="size-5" />}
        </IconButton>
      </div>

      <p className="px-4 pt-4 pb-2 text-xs font-bold tracking-wide text-navy uppercase">Make something new</p>
      <div className="grid grid-cols-3 gap-2 px-4">
        <button type="button" onClick={() => createAndOpen("gag")} className="tap flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 border-ink bg-card px-1 text-xs font-semibold">
          <Clapperboard className="size-5" />
          Cartoon gag
        </button>
        <button type="button" onClick={() => createAndOpen("explainer")} className="tap flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 border-ink bg-card px-1 text-xs font-semibold">
          <BookOpen className="size-5" />
          Explainer
        </button>
        <button type="button" onClick={() => { setImportText(""); openSheet({ name: "import" }); }} className="tap flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 border-ink bg-card px-1 text-xs font-semibold">
          <FileUp className="size-5" />
          Import script
        </button>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-8", layout === "grid" ? "grid grid-cols-2 content-start gap-3" : "flex flex-col gap-3")}>
        {visible.length === 0 && (
          <p className="col-span-2 rounded-xl border-2 border-dashed border-ink px-4 py-8 text-center text-sm">No projects match.</p>
        )}
        {visible.map((project) => (
          <article key={project.id} className="flex flex-col rounded-xl border-2 border-ink bg-card p-2.5">
            <button type="button" onClick={() => openSheet({ name: "project", projectId: project.id })} className="tap w-full text-left">
              <Filmstrip project={project} />
              <div className="mt-2 flex items-start justify-between gap-2">
                <h2 className="font-serif text-lg leading-snug">{project.title}</h2>
              </div>
              <p className="mt-1 text-xs font-bold text-navy">
                {kindLabel(project.kind)} · {editedLabel(project.updatedAt)}
              </p>
              <div className="mt-2">
                <ProgressMarks project={project} />
              </div>
            </button>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                aria-pressed={project.pinned}
                onClick={() => togglePin(project.id)}
                className={cn("tap flex h-11 flex-1 items-center justify-center gap-1 rounded-lg border-2 border-ink text-sm font-semibold", project.pinned && "bg-wash")}
              >
                <Pin className="size-4" />
                {project.pinned ? "Pinned" : "Pin"}
              </button>
              <button
                type="button"
                aria-label={`More actions for ${project.title}`}
                onClick={() => {
                  setRenameValue(project.title);
                  openSheet({ name: "more", projectId: project.id });
                }}
                className="tap grid h-11 w-11 place-items-center rounded-lg border-2 border-ink"
              >
                <MoreHorizontal className="size-5" />
              </button>
            </div>
          </article>
        ))}
      </div>

      {sheet?.name === "menu" && (
        <Sheet title="Studio" onClose={closeSheet}>
          <p className="mb-4 text-sm leading-relaxed">
            A script becomes scenes, panels, and a timed cut. The hold before the caption is the joke.
          </p>
          <div className="grid gap-2">
            <LineButton onClick={() => createAndOpen("gag")}>New cartoon gag</LineButton>
            <LineButton onClick={() => createAndOpen("explainer")}>New explainer</LineButton>
            <LineButton onClick={() => { setImportText(""); openSheet({ name: "import" }); }}>Import script</LineButton>
          </div>
        </Sheet>
      )}

      {sheet?.name === "account" && (
        <Sheet title="Studio" onClose={closeSheet}>
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-14 place-items-center rounded-full border-2 border-ink font-serif text-2xl">S</div>
            <div>
              <p className="font-semibold">Your studio</p>
              <p className="text-sm text-navy">{projects.length} projects on this device</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed">
            Projects stay in this browser. Nothing here is an account, and nothing is uploaded until you export a cut.
          </p>
        </Sheet>
      )}

      {sheet?.name === "import" && (
        <Sheet title="Import script" onClose={closeSheet}>
          <p className="mb-3 text-sm">One line or paragraph per scene. A quoted line becomes the caption.</p>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={8}
            placeholder={"Two people at a cooler.\nAlex sighs.\n“Still waiting.”"}
            className="mb-3 w-full rounded-xl border-2 border-ink bg-card p-3 text-base outline-none"
          />
          <PrimaryButton
            disabled={!importText.trim()}
            onClick={() => importAndOpen(importText.trim())}
          >
            Create project
          </PrimaryButton>
        </Sheet>
      )}

      {sheet?.name === "project" && sheetProject && (
        <Sheet title={sheetProject.title} onClose={closeSheet}>
          <p className="mb-3 text-sm font-bold text-navy">
            {kindLabel(sheetProject.kind)} · {sheetProject.scenes.length} scenes · {editedLabel(sheetProject.updatedAt)}
          </p>
          <StepList project={sheetProject} />
          <div className="mt-4 grid gap-2">
            <PrimaryButton onClick={() => continueProject(sheetProject)}>Continue</PrimaryButton>
            <div className="grid grid-cols-2 gap-2">
              <LineButton onClick={() => duplicate(sheetProject.id)}>Duplicate</LineButton>
              <LineButton onClick={() => togglePin(sheetProject.id)}>{sheetProject.pinned ? "Unpin" : "Pin"}</LineButton>
            </div>
          </div>
        </Sheet>
      )}

      {sheet?.name === "more" && sheetProject && (
        <Sheet title={sheetProject.title} onClose={closeSheet}>
          {moreStep === "menu" && (
            <div className="grid gap-2">
              <LineButton onClick={() => { setRenameValue(sheetProject.title); setMoreStep("rename"); }}>Rename</LineButton>
              <LineButton onClick={() => duplicate(sheetProject.id)}>Duplicate</LineButton>
              <LineButton onClick={() => togglePin(sheetProject.id)}>{sheetProject.pinned ? "Unpin" : "Pin"}</LineButton>
              <LineButton onClick={() => setMoreStep("delete")}>Delete</LineButton>
            </div>
          )}
          {moreStep === "rename" && (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                rename(sheetProject.id, renameValue);
                closeSheet();
              }}
            >
              <label className="grid gap-1 text-sm font-semibold">
                Title
                <input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  className="h-12 rounded-xl border-2 border-ink bg-card px-3 text-base font-normal outline-none"
                />
              </label>
              <PrimaryButton type="submit">Save title</PrimaryButton>
            </form>
          )}
          {moreStep === "delete" && (
            <div className="grid gap-3">
              <p className="text-sm">Delete “{sheetProject.title}”? This only removes it from this device.</p>
              <PrimaryButton onClick={() => remove(sheetProject.id)}>Delete project</PrimaryButton>
              <LineButton onClick={() => setMoreStep("menu")}>Keep it</LineButton>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
