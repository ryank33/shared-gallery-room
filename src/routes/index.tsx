import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GalleryApp } from "@/components/gallery/GalleryApp";

export const Route = createFileRoute("/")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    room:
      typeof search.room === "string"
        ? search.room.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)
        : undefined,
    name: typeof search.name === "string" ? search.name.slice(0, 24) : undefined,
  }),
  component: HomePage,
});

function HomePage() {
  const search = Route.useSearch();
  const [mounted, setMounted] = useState(false);
  const [nameInput, setNameInput] = useState(search.name ?? "");
  const [roomInput, setRoomInput] = useState(search.room ?? "");
  const [placeholders, setPlaceholders] = useState({ room: "gal-room", name: "Guest" });
  const [session, setSession] = useState<{ room: string; name: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    const roomPlaceholder = `gal-${Math.random().toString(36).slice(2, 8)}`;
    const namePlaceholder = `Guest-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    setPlaceholders({ room: roomPlaceholder, name: namePlaceholder });
    if (search.room) {
      setSession({
        room: search.room,
        name: (search.name || namePlaceholder).slice(0, 24),
      });
    }
  }, [search.room, search.name]);

  if (!mounted) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg text-sm text-fg-muted">
        Opening the gallery…
      </main>
    );
  }

  if (session) {
    return <GalleryApp roomId={session.room} displayName={session.name} />;
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, #2a241c 0%, transparent 50%), radial-gradient(ellipse at 90% 100%, #1c1a22 0%, transparent 46%)",
        }}
      />
      <div
        className="relative w-full max-w-md border border-border bg-bg-elevated p-6 shadow-panel sm:p-8"
        style={{ borderRadius: "calc(var(--radius-md) + 16px)" }}
      >
        <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-fg-subtle">
          Shared space
        </p>
        <h1 className="font-display mt-2 text-4xl font-medium tracking-tight text-fg">
          Gallery Room
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          A quiet hall with paintings, a film wall, and a live whiteboard. Friends appear as avatars
          and can draw and chat in the same room.
        </p>

        <label className="mt-7 block text-xs font-medium text-fg-muted">
          Display name
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder={placeholders.name}
            maxLength={24}
            className="mt-1.5 h-11 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none ring-fg/20 placeholder:text-fg-subtle focus:ring-2"
          />
        </label>

        <label className="mt-4 block text-xs font-medium text-fg-muted">
          Room code
          <input
            value={roomInput}
            onChange={(e) =>
              setRoomInput(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32))
            }
            placeholder={placeholders.room}
            maxLength={32}
            className="mt-1.5 h-11 w-full rounded-md border border-border bg-bg px-3 font-mono text-sm text-fg outline-none ring-fg/20 placeholder:text-fg-subtle focus:ring-2"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            const room = (roomInput || placeholders.room).slice(0, 32);
            const name = (nameInput.trim() || placeholders.name).slice(0, 24);
            const url = new URL(window.location.href);
            url.searchParams.set("room", room);
            url.searchParams.set("name", name);
            window.history.replaceState({}, "", url.toString());
            setSession({ room, name });
          }}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          Enter gallery
        </button>

        <p className="mt-4 text-center text-[11px] text-fg-subtle">
          Share the URL so friends land in the same room.
        </p>
      </div>
    </main>
  );
}
