import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMode, Filter, Kind, LayoutMode, Project, Scene, ScriptPane, SheetName, SortMode, StudioEdit, Tab, Template } from "@/lib/types";
import {
  applyEditToProject,
  emptyProject,
  makeScene,
  normalizeProject,
  produceCut,
  scenesFromScript,
  seedProjects,
  snapshotOf,
  summarizeChange,
  uid,
} from "@/lib/model";

export type SheetState = { name: SheetName; projectId?: string } | null;

type Studio = {
  projects: Project[];
  activeId: string | null;
  screen: "home" | "project";
  tab: Tab;
  scriptPane: ScriptPane;
  filter: Filter;
  query: string;
  layout: LayoutMode;
  sort: SortMode;
  sheet: SheetState;
  selectedSceneId: string | null;
  moreStep: "menu" | "rename" | "delete";
  setFilter: (filter: Filter) => void;
  setQuery: (query: string) => void;
  setLayout: (layout: LayoutMode) => void;
  toggleSort: () => void;
  openSheet: (sheet: SheetState) => void;
  closeSheet: () => void;
  setMoreStep: (step: Studio["moreStep"]) => void;
  goHome: () => void;
  openProject: (id: string, tab?: Tab, sheet?: SheetName) => void;
  setTab: (tab: Tab) => void;
  setScriptPane: (pane: ScriptPane) => void;
  selectScene: (id: string) => void;
  createAndOpen: (kind: Kind) => void;
  importAndOpen: (text: string) => void;
  duplicate: (id: string) => void;
  togglePin: (id: string) => void;
  remove: (id: string) => void;
  rename: (id: string, title: string) => void;
  updateScene: (projectId: string, sceneId: string, partial: Partial<Scene>) => void;
  reorder: (projectId: string, from: number, to: number) => void;
  addScene: (projectId: string) => void;
  splitScene: (projectId: string, sceneId: string) => void;
  duplicateScene: (projectId: string, sceneId: string) => void;
  reRoll: (projectId: string, sceneId: string) => void;
  setStyle: (projectId: string, partial: Partial<Project["style"]>) => void;
  setTemplate: (projectId: string, sceneId: string, template: Template, all: boolean) => void;
  applyMotionAll: (projectId: string, sceneId: string) => void;
  resetMotion: (projectId: string, sceneId: string) => void;
  updateCharacter: (projectId: string, characterId: string, partial: Partial<Project["characters"][number]>) => void;
  setChatMode: (projectId: string, mode: ChatMode) => void;
  pushUser: (projectId: string, text: string) => void;
  rewindTo: (projectId: string, messageId: string) => string;
  dropAfter: (projectId: string, messageId: string) => void;
  undoEdit: (projectId: string, messageId: string) => void;
  commitEdit: (projectId: string, edit: StudioEdit) => void;
  generateStoryboard: (projectId: string) => boolean;
  makeVideo: (projectId: string) => boolean;
  markTimeline: (projectId: string) => void;
  markExported: (projectId: string) => void;
};

function touch(project: Project, next: Partial<Project>): Project {
  return { ...project, ...next, updatedAt: Date.now() };
}

function mapProject(projects: Project[], id: string, fn: (project: Project) => Project) {
  return projects.map((project) => (project.id === id ? fn(project) : project));
}

export const useStudio = create<Studio>()(
  persist(
    (set, get) => ({
      projects: seedProjects(),
      activeId: null,
      screen: "home",
      tab: "script",
      scriptPane: "chat",
      filter: "all",
      query: "",
      layout: "grid",
      sort: "recent",
      sheet: null,
      selectedSceneId: null,
      moreStep: "menu",
      setFilter: (filter) => set({ filter }),
      setQuery: (query) => set({ query }),
      setLayout: (layout) => set({ layout }),
      toggleSort: () => set({ sort: get().sort === "recent" ? "alpha" : "recent" }),
      openSheet: (sheet) => set({ sheet, moreStep: "menu" }),
      closeSheet: () => set({ sheet: null, moreStep: "menu" }),
      setMoreStep: (moreStep) => set({ moreStep }),
      goHome: () => set({ screen: "home", sheet: null, activeId: null }),
      openProject: (id, tab, sheet) => {
        const project = get().projects.find((item) => item.id === id);
        set({
          activeId: id,
          screen: "project",
          tab: tab ?? "script",
          sheet: sheet ? { name: sheet, projectId: id } : null,
          selectedSceneId: project?.scenes[0]?.id ?? null,
        });
      },
      setTab: (tab) => set({ tab, sheet: null }),
      setScriptPane: (scriptPane) => set({ scriptPane }),
      selectScene: (selectedSceneId) => set({ selectedSceneId }),
      createAndOpen: (kind) => {
        const title = kind === "explainer" ? "Untitled explainer" : kind === "draft" ? "Imported script" : "Untitled gag";
        const project = emptyProject(kind === "draft" ? "gag" : kind, title);
        if (kind === "draft") project.kind = "draft";
        set({ projects: [project, ...get().projects] });
        get().openProject(project.id, "script");
        set({ scriptPane: "chat" });
      },
      importAndOpen: (text) => {
        const project = emptyProject("gag", "Imported script");
        const template = "cooler" as const;
        project.scenes = scenesFromScript(text, template);
        project.storyboardReady = false;
        project.chat = [
          ...project.chat,
          { id: uid("m"), role: "user", text: "Imported a script.", at: Date.now() },
          {
            id: uid("m"),
            role: "assistant",
            text: project.scenes.length
              ? `Split that into ${project.scenes.length} scenes. Generate a storyboard when the lines feel right.`
              : "I couldn’t find any lines in that paste.",
            at: Date.now(),
          },
        ];
        set({ projects: [project, ...get().projects], sheet: null });
        get().openProject(project.id, "script");
        set({ scriptPane: "scenes" });
      },
      duplicate: (id) => {
        const project = get().projects.find((item) => item.id === id);
        if (!project) return;
        const copy = normalizeProject({
          ...structuredClone(project),
          id: uid("p"),
          title: `Copy of ${project.title}`,
          pinned: false,
          updatedAt: Date.now(),
          createdAt: Date.now(),
          exported: false,
        });
        copy.scenes = copy.scenes.map((scene) => ({ ...scene, id: uid("sc") }));
        copy.characters = copy.characters.map((character) => ({ ...character, id: uid("c") }));
        set({ projects: [copy, ...get().projects], sheet: null });
      },
      togglePin: (id) => set({ projects: mapProject(get().projects, id, (project) => touch(project, { pinned: !project.pinned })) }),
      remove: (id) =>
        set({
          projects: get().projects.filter((project) => project.id !== id),
          sheet: null,
          screen: get().activeId === id ? "home" : get().screen,
          activeId: get().activeId === id ? null : get().activeId,
        }),
      rename: (id, title) =>
        set({
          projects: mapProject(get().projects, id, (project) => touch(project, { title: title.trim() || project.title })),
        }),
      updateScene: (projectId, sceneId, partial) =>
        set({
          projects: mapProject(get().projects, projectId, (project) =>
            touch(project, {
              scenes: project.scenes.map((scene) => (scene.id === sceneId ? { ...scene, ...partial } : scene)),
            }),
          ),
        }),
      reorder: (projectId, from, to) =>
        set({
          projects: mapProject(get().projects, projectId, (project) => {
            const scenes = [...project.scenes];
            const [item] = scenes.splice(from, 1);
            if (!item) return project;
            scenes.splice(to, 0, item);
            return touch(project, { scenes, timelineTouched: true });
          }),
        }),
      addScene: (projectId) =>
        set({
          projects: mapProject(get().projects, projectId, (project) => {
            const scene = makeScene({
              text: "A new beat.",
              template: project.scenes[0]?.template ?? "cooler",
              shot: "two",
              seed: project.scenes.length + 3,
            });
            return touch(project, { scenes: [...project.scenes, scene] });
          }),
        }),
      splitScene: (projectId, sceneId) =>
        set({
          projects: mapProject(get().projects, projectId, (project) => {
            const index = project.scenes.findIndex((scene) => scene.id === sceneId);
            const scene = project.scenes[index];
            if (!scene) return project;
            const half = Math.max(0.8, Math.round((scene.duration / 2) * 10) / 10);
            const next = makeScene({
              ...scene,
              id: uid("sc"),
              text: "Hold on that.",
              duration: half,
              punchline: scene.isPunchline ? scene.punchline : "",
              isPunchline: scene.isPunchline,
              seed: scene.seed + 1,
            });
            const scenes = [...project.scenes];
            scenes.splice(index, 1, { ...scene, duration: half, isPunchline: false, punchline: scene.isPunchline ? "" : scene.punchline }, next);
            return touch(project, { scenes, timelineTouched: true });
          }),
        }),
      duplicateScene: (projectId, sceneId) =>
        set({
          projects: mapProject(get().projects, projectId, (project) => {
            const index = project.scenes.findIndex((scene) => scene.id === sceneId);
            const scene = project.scenes[index];
            if (!scene) return project;
            const scenes = [...project.scenes];
            scenes.splice(index + 1, 0, { ...scene, id: uid("sc"), seed: scene.seed + 2 });
            return touch(project, { scenes });
          }),
        }),
      reRoll: (projectId, sceneId) =>
        set({
          projects: mapProject(get().projects, projectId, (project) =>
            touch(project, {
              scenes: project.scenes.map((scene) =>
                scene.id === sceneId ? { ...scene, seed: scene.seed + 1 + Math.floor(Math.random() * 4) } : scene,
              ),
            }),
          ),
        }),
      setStyle: (projectId, partial) =>
        set({
          projects: mapProject(get().projects, projectId, (project) =>
            touch(project, { style: { ...project.style, ...partial } }),
          ),
        }),
      setTemplate: (projectId, sceneId, template, all) =>
        set({
          projects: mapProject(get().projects, projectId, (project) =>
            touch(project, {
              scenes: project.scenes.map((scene) => (all || scene.id === sceneId ? { ...scene, template } : scene)),
            }),
          ),
        }),
      applyMotionAll: (projectId, sceneId) =>
        set({
          projects: mapProject(get().projects, projectId, (project) => {
            const source = project.scenes.find((scene) => scene.id === sceneId);
            if (!source) return project;
            return touch(project, {
              motionApplied: true,
              scenes: project.scenes.map((scene) => ({ ...scene, motions: [...source.motions], boil: source.boil })),
            });
          }),
        }),
      resetMotion: (projectId, sceneId) =>
        set({
          projects: mapProject(get().projects, projectId, (project) =>
            touch(project, {
              scenes: project.scenes.map((scene) =>
                scene.id === sceneId ? { ...scene, motions: scene.isPunchline ? ["boil", "caption"] : ["boil"], boil: 40 } : scene,
              ),
            }),
          ),
        }),
      updateCharacter: (projectId, characterId, partial) =>
        set({
          projects: mapProject(get().projects, projectId, (project) =>
            touch(project, {
              characters: project.characters.map((character) =>
                character.id === characterId ? { ...character, ...partial } : character,
              ),
            }),
          ),
        }),
      setChatMode: (projectId, mode) =>
        set({ projects: mapProject(get().projects, projectId, (project) => ({ ...project, chatMode: mode })) }),
      pushUser: (projectId, text) =>
        set({
          projects: mapProject(get().projects, projectId, (project) =>
            touch(project, {
              chat: [...project.chat, { id: uid("m"), role: "user", text, at: Date.now() }],
            }),
          ),
        }),
      rewindTo: (projectId, messageId) => {
        const project = get().projects.find((item) => item.id === projectId);
        const message = project?.chat.find((item) => item.id === messageId);
        if (!project || !message || message.role !== "user") return "";
        const index = project.chat.findIndex((item) => item.id === messageId);
        set({
          projects: mapProject(get().projects, projectId, (item) => touch(item, { chat: item.chat.slice(0, index) })),
        });
        return message.text;
      },
      dropAfter: (projectId, messageId) =>
        set({
          projects: mapProject(get().projects, projectId, (project) => {
            const index = project.chat.findIndex((item) => item.id === messageId);
            if (index < 0) return project;
            return touch(project, { chat: project.chat.slice(0, index + 1) });
          }),
        }),
      undoEdit: (projectId, messageId) =>
        set({
          projects: mapProject(get().projects, projectId, (project) => {
            const message = project.chat.find((item) => item.id === messageId);
            if (!message?.edit || message.edit.undone) return project;
            const before = message.edit.before;
            return touch(project, {
              title: before.title,
              style: before.style,
              scenes: before.scenes,
              characters: before.characters,
              chat: project.chat.map((item) =>
                item.id === messageId && item.edit ? { ...item, edit: { ...item.edit, undone: true } } : item,
              ),
            });
          }),
        }),
      commitEdit: (projectId, edit) =>
        set({
          projects: mapProject(get().projects, projectId, (project) => {
            const before = snapshotOf(project);
            const next = applyEditToProject(project, edit);
            const changed = JSON.stringify(snapshotOf(next)) !== JSON.stringify(before);
            return {
              ...next,
              chat: [
                ...project.chat,
                {
                  id: uid("m"),
                  role: "assistant" as const,
                  text: edit.reply,
                  at: Date.now(),
                  edit: changed ? { summary: summarizeChange(project, edit), before, undone: false } : undefined,
                },
              ],
            };
          }),
        }),
      generateStoryboard: (projectId) => {
        const project = get().projects.find((item) => item.id === projectId);
        if (!project?.scenes.length) return false;
        set({
          projects: mapProject(get().projects, projectId, (item) =>
            touch(item, {
              storyboardReady: true,
              scenes: item.scenes.map((scene) => ({
                ...scene,
                motions: scene.motions.length ? scene.motions : scene.isPunchline ? ["boil", "caption"] : ["boil"],
              })),
            }),
          ),
        });
        get().openProject(projectId, "storyboard");
        return true;
      },
      makeVideo: (projectId) => {
        const project = get().projects.find((item) => item.id === projectId);
        if (!project?.scenes.length) return false;
        const cut = produceCut(project);
        set({ projects: mapProject(get().projects, projectId, () => cut) });
        get().openProject(projectId, "timeline", "preview");
        return true;
      },
      markTimeline: (projectId) =>
        set({
          projects: mapProject(get().projects, projectId, (project) =>
            project.timelineTouched ? project : touch(project, { timelineTouched: true }),
          ),
        }),
      markExported: (projectId) =>
        set({
          projects: mapProject(get().projects, projectId, (project) => touch(project, { exported: true })),
        }),
    }),
    {
      name: "storyforge-v1",
      skipHydration: true,
      partialize: (state) => ({ projects: state.projects }),
      onRehydrateStorage: () => (state) => {
        if (!state?.projects) return;
        useStudio.setState({ projects: state.projects.map((project) => normalizeProject(project)) });
      },
    },
  ),
);

export function useActiveProject() {
  return useStudio((state) => state.projects.find((project) => project.id === state.activeId) ?? null);
}
