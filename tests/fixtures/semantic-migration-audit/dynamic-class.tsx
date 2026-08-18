declare const importedPalette: { value: string };

const classes = { surface: "bg-[var(--ui-raised)]" };

export function DynamicClass({ runtime }: { runtime: () => string }) {
  return (
    <div
      className={`bg-[var(--ui-canvas)] ${runtime()} text-[var(--ui-text)] ${importedPalette.value} ${classes["surface"]}`}
    />
  );
}
