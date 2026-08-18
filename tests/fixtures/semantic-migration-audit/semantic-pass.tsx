const cardClasses = "bg-[var(--ui-raised)] text-[var(--ui-text)]";

export function SemanticPass({ selected }: { selected: boolean }) {
  const branchClasses = selected
    ? cardClasses
    : `border-[var(--ui-border)] ${cardClasses}`;
  const focusClasses = selected && "ring-[var(--ui-focus)]";

  return (
    <section
      className={`bg-[var(--ui-canvas)] ${branchClasses} ${focusClasses}`}
      style={{ color: "var(--ui-text)", borderColor: "transparent" }}
    >
      <span className="opacity-60">Decorative status dot</span>
    </section>
  );
}
