import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { STAGES, type Project } from "@/lib/types";
import { progressOf } from "@/lib/model";
import { cn } from "@/lib/cn";

export function IconButton({
  label,
  onClick,
  children,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn("tap grid size-11 shrink-0 place-items-center rounded-full", pressed && "bg-wash text-navy")}
    >
      {children}
    </button>
  );
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Dismiss" onClick={onClose} />
      <div className="sf-rise relative z-10 max-h-[86%] overflow-y-auto rounded-t-2xl border-2 border-ink bg-paper px-4 pt-3 pb-8 shadow-none">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate font-serif text-2xl">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ProgressMarks({ project }: { project: Project }) {
  const prog = progressOf(project);
  return (
    <div aria-label={`Progress ${prog.done} of 5. Next: ${prog.next}`}>
      <div className="flex gap-1">
        {STAGES.map((stage, index) => (
          <div key={stage} className={cn("h-1.5 flex-1 rounded-full", index < prog.done ? "bg-navy" : "bg-rule")} />
        ))}
      </div>
      <p className="mt-1.5 text-xs font-bold text-navy">Next: {prog.next}</p>
    </div>
  );
}

export function StepList({ project }: { project: Project }) {
  const prog = progressOf(project);
  return (
    <ol className="space-y-2">
      {STAGES.map((label, index) => {
        const done = index < prog.done;
        const current = index === prog.done || (prog.done === 5 && index === 4);
        return (
          <li
            key={label}
            className={cn(
              "flex h-12 items-center gap-3 rounded-xl border-2 px-3",
              current ? "border-navy bg-wash" : "border-ink bg-card",
            )}
          >
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full text-xs font-bold",
                done ? "bg-navy text-on-navy" : "border border-ink",
              )}
            >
              {done ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className="font-semibold">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="tap h-12 w-full rounded-xl bg-navy text-base font-bold text-on-navy disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function LineButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="tap h-12 rounded-xl border-2 border-ink bg-card px-3 text-sm font-semibold">
      {children}
    </button>
  );
}
