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
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setReady(true);
    };
    const timer = window.setTimeout(finish, 400);
    const pending = useStudio.persist.rehydrate();
    void Promise.resolve(pending).finally(finish);
    return () => window.clearTimeout(timer);
  }, []);
  if (!ready) return <Boot />;
  return (
    <main className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col overflow-hidden">
        {screen === "home" ? <HomeScreen /> : <ProjectScreen />}
      </div>
    </main>
  );
}
