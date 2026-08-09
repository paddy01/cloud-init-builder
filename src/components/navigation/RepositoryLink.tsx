export const REPOSITORY_URL = "https://github.com/paddy01/cloud-init-builder";
export const REPOSITORY_LINK_NAME = "Open Cloud-Init Builder repository on GitHub";

export function RepositoryLink() {
  return (
    <a
      href={REPOSITORY_URL}
      aria-label={REPOSITORY_LINK_NAME}
      className="static inline-flex min-h-10 shrink-0 items-center gap-2 rounded border border-[var(--ui-border)] bg-[var(--ui-raised)] px-2 py-1.5 text-sm font-medium text-[var(--ui-action-strong)] hover:bg-[var(--ui-inset)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-focus-offset-raised)] xl:absolute xl:right-4 xl:top-2 xl:max-w-28 xl:rounded-none xl:rounded-bl-lg xl:px-3"
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0"
        fill="currentColor"
      >
        <path d="M12 2a10 10 0 0 0-3.162 19.486c.5.092.682-.217.682-.482 0-.237-.009-.866-.014-1.7-2.782.604-3.369-1.34-3.369-1.34-.455-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.607.069-.607 1.004.07 1.532 1.031 1.532 1.031.892 1.529 2.341 1.087 2.91.831.09-.646.35-1.087.636-1.337-2.22-.253-4.555-1.11-4.555-4.942 0-1.092.39-1.985 1.03-2.685-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.026A9.56 9.56 0 0 1 12 6.756a9.6 9.6 0 0 1 2.504.337c1.91-1.295 2.748-1.026 2.748-1.026.546 1.378.203 2.397.1 2.65.64.7 1.028 1.593 1.028 2.685 0 3.842-2.339 4.686-4.566 4.934.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.748 0 .267.18.579.688.481A10.002 10.002 0 0 0 12 2Z" />
      </svg>
      <span>GitHub</span>
    </a>
  );
}
