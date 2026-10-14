import { useLayoutEffect, useState } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { HomeScreen } from "@/components/home-screen";
import { ProjectScreen } from "@/components/project-screen";
import { useStudio } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Page,
});

function Page() {
  return (
    <ClientOnly fallback={<Boot />}>
      <Studio />
    </ClientOnly>
  );
}

function Boot() {
  return (
    <div className="grid h-dvh place-items-center bg-paper text-ink">
      <p className="font-serif text-3xl">StoryForge</p>
    </div>
  );
}

function Studio() {
  const screen = useStudio((state) => state.screen);
  useLayoutEffect(() => {
    void Promise.resolve(useStudio.persist.rehydrate());
  }, []);
  return (
    <main className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto flex h-dvh w-full max-w-5xl flex-col overflow-hidden">
        {screen === "home" ? <HomeScreen /> : <ProjectScreen />}
      </div>
    </main>
  );
}
