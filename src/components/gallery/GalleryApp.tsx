import { Copy, Maximize2, MessageSquare, Send, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useP2PRoom } from "@/lib/multiplayer";
import { sfxChat, sfxJoin, unlockAudio } from "@/lib/gallery-audio";
import { cn } from "@/lib/utils";
import { SceneCanvas, type GalleryXRStore } from "./SceneCanvas";
import type { BoardStroke } from "./Whiteboard";
import type { PoseSnapshot } from "./PlayerControls";
import {
  AVATAR_PALETTE,
  PEN_COLORS,
  type ChatLine,
  type NetMessage,
  type PenColorId,
  type RemoteAvatar,
} from "./types";

function hashColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function headingFromYaw(yaw: number) {
  const deg = ((yaw * 180) / Math.PI + 360) % 360;
  // yaw 0 looks -Z (north art), yaw 180 looks +Z (board)
  if (deg > 315 || deg <= 45) return "North · paintings";
  if (deg > 45 && deg <= 135) return "West · Canyon Archive";
  if (deg > 135 && deg <= 225) return "South · whiteboard";
  return "East · film wall";
}

interface GalleryAppProps {
  roomId: string;
  displayName: string;
}

export function GalleryApp({ roomId, displayName }: GalleryAppProps) {
  const p2p = useP2PRoom({ room: roomId, name: displayName });
  const myColor = useMemo(() => hashColor(p2p.selfId), [p2p.selfId]);

  const [penId, setPenId] = useState<PenColorId>("black");
  const [avatars, setAvatars] = useState<Record<string, RemoteAvatar>>({});
  const [peerTotal, setPeerTotal] = useState(0);
  const [peerConnected, setPeerConnected] = useState(0);
  const [clearToken, setClearToken] = useState(0);
  const [copied, setCopied] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [inVr, setInVr] = useState(false);
  const [vrHint, setVrHint] = useState<string | null>(null);
  const [mobileAxes, setMobileAxes] = useState({ x: 0, y: 0 });
  const [isCoarse, setIsCoarse] = useState(false);
  const [tipVisible, setTipVisible] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [heading, setHeading] = useState("South · whiteboard");
  const xrStoreRef = useRef<GalleryXRStore | null>(null);
  const chatEnd = useRef<HTMLDivElement | null>(null);

  const poseRef = useRef<PoseSnapshot>({ x: 0, y: 1.65, z: 0.5, yaw: Math.PI });
  const remoteStrokeRef = useRef<BoardStroke | null>(null);
  const strokeLogRef = useRef<BoardStroke[]>([]);
  const lastPoseSend = useRef(0);
  const lastHeading = useRef(0);

  const pen = PEN_COLORS.find((p) => p.id === penId) ?? PEN_COLORS[0];
  const erase = penId === "eraser";

  useEffect(() => {
    setIsCoarse(window.matchMedia("(pointer: coarse)").matches);
    if (navigator.xr) {
      void navigator.xr.isSessionSupported("immersive-vr").then((ok) => setVrSupported(!!ok));
    }
    const t = window.setTimeout(() => setTipVisible(false), 9000);
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyT") return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      setChatOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setPeerTotal(p2p.peers.length);
    setPeerConnected(p2p.peers.filter((p) => p.connectionState === "connected").length);
  }, [p2p.peers]);

  const seenPeer = useRef(new Set<string>());
  useEffect(() => {
    for (const p of p2p.peers) {
      if (!seenPeer.current.has(p.id) && p.connectionState === "connected") {
        seenPeer.current.add(p.id);
        sfxJoin();
        setChat((prev) => [
          ...prev.slice(-40),
          {
            id: `join-${p.id}`,
            from: "sys",
            name: "Room",
            text: `${p.name || "Someone"} walked in`,
            at: Date.now(),
          },
        ]);
      }
    }
  }, [p2p.peers]);

  useEffect(() => {
    return p2p.onMessage((from, data) => {
      const msg = data as NetMessage;
      if (!msg || typeof msg !== "object" || !("t" in msg)) return;

      if (msg.t === "pose") {
        setAvatars((prev) => ({
          ...prev,
          [from]: {
            id: from,
            name: msg.name || from,
            color: msg.color || hashColor(from),
            x: msg.x,
            y: msg.y,
            z: msg.z,
            yaw: msg.yaw,
            updatedAt: performance.now(),
          },
        }));
      } else if (msg.t === "stroke") {
        const existing = strokeLogRef.current.find((s) => s.id === msg.id);
        if (existing) {
          existing.points.push(...msg.points);
        } else {
          strokeLogRef.current.push({
            id: msg.id,
            color: msg.color,
            width: msg.width,
            erase: msg.erase,
            points: msg.points.slice(),
          });
        }
        remoteStrokeRef.current = {
          id: msg.id,
          color: msg.color,
          width: msg.width,
          erase: msg.erase,
          points: msg.points,
        };
      } else if (msg.t === "clear") {
        strokeLogRef.current = [];
        setClearToken((n) => n + 1);
      } else if (msg.t === "sync") {
        strokeLogRef.current = msg.strokes.map((s) => ({ ...s, points: s.points.slice() }));
        setClearToken((n) => n + 1);
      } else if (msg.t === "chat") {
        setChat((prev) => [
          ...prev.slice(-40),
          { id: msg.id, from, name: msg.name, text: msg.text, at: Date.now() },
        ]);
        sfxChat();
        setChatOpen(true);
      }
    });
  }, [p2p.onMessage]);

  useEffect(() => {
    const alive = new Set(p2p.peers.map((p) => p.id));
    setAvatars((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (!alive.has(id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [p2p.peers]);

  const prevPeerIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const now = new Set(p2p.peers.map((p) => p.id));
    for (const id of now) {
      if (!prevPeerIds.current.has(id)) {
        const incumbents = [p2p.selfId, ...prevPeerIds.current].sort();
        if (incumbents[0] === p2p.selfId && strokeLogRef.current.length > 0) {
          const payload: NetMessage = {
            t: "sync",
            strokes: strokeLogRef.current.map((s) => ({
              id: s.id,
              color: s.color,
              width: s.width,
              erase: s.erase,
              points: s.points,
            })),
          };
          p2p.send(payload, id);
        }
      }
    }
    prevPeerIds.current = now;
  }, [p2p.peers, p2p.selfId, p2p.send]);

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      if (now - lastPoseSend.current >= 50) {
        lastPoseSend.current = now;
        const p = poseRef.current;
        const msg: NetMessage = {
          t: "pose",
          x: p.x,
          y: p.y,
          z: p.z,
          yaw: p.yaw,
          name: displayName,
          color: myColor,
        };
        p2p.broadcast(msg);
      }
      if (now - lastHeading.current > 250) {
        lastHeading.current = now;
        setHeading(headingFromYaw(poseRef.current.yaw));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [displayName, myColor, p2p.broadcast]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, chatOpen]);

  const onPose = useCallback((pose: PoseSnapshot) => {
    poseRef.current = pose;
  }, []);

  const onLocalStroke = useCallback(
    (msg: Extract<NetMessage, { t: "stroke" }>) => {
      p2p.send(msg);
    },
    [p2p.send],
  );

  const onStore = useCallback((store: GalleryXRStore) => {
    xrStoreRef.current = store;
  }, []);

  const onXrSession = useCallback((active: boolean) => {
    setInVr(active);
    if (active) setVrHint(null);
  }, []);

  const enterVr = async () => {
    unlockAudio();
    if (!vrSupported) {
      setVrHint(
        "Open this same page in Meta Quest Browser, Apple Vision, or Chrome with a headset. This preview window cannot start VR.",
      );
      return;
    }
    try {
      if (inVr) {
        await xrStoreRef.current?.getState().session?.end();
      } else {
        await xrStoreRef.current?.enterVR();
      }
    } catch (err) {
      setVrHint(err instanceof Error ? err.message : "Could not start a VR session.");
    }
  };

  const clearBoard = () => {
    strokeLogRef.current = [];
    setClearToken((n) => n + 1);
    p2p.send({ t: "clear" } satisfies NetMessage);
  };

  const shareLink = () => {
    unlockAudio();
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId);
    url.searchParams.set("name", displayName);
    void navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  const sendChat = () => {
    const text = chatDraft.trim().slice(0, 160);
    if (!text) return;
    const id = `c-${Math.random().toString(36).slice(2, 10)}`;
    const line: ChatLine = { id, from: p2p.selfId, name: displayName, text, at: Date.now() };
    setChat((prev) => [...prev.slice(-40), line]);
    p2p.send({ t: "chat", id, name: displayName, text } satisfies NetMessage);
    setChatDraft("");
    sfxChat();
  };

  const statusLabel = !p2p.joined
    ? "Connecting…"
    : peerTotal === 0
      ? "Waiting for others"
      : peerConnected > 0
        ? `${peerConnected} with you`
        : `${peerTotal} joining…`;

  const roster = Object.values(avatars);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg" onPointerDown={unlockAudio}>
      <SceneCanvas
        entered
        onPose={onPose}
        onXrSession={onXrSession}
        mobileAxes={mobileAxes}
        penHex={pen.hex}
        erase={erase}
        brush={erase ? 28 : 6}
        onLocalStroke={onLocalStroke}
        remoteStrokeRef={remoteStrokeRef}
        clearToken={clearToken}
        strokeLogRef={strokeLogRef}
        avatars={avatars}
        onStore={onStore}
      />

      <div data-ui className="pointer-events-none absolute inset-0 z-20">
        <div className="pointer-events-auto absolute left-3 top-3 flex max-w-[min(100%-1.5rem,20rem)] flex-col gap-2 sm:left-4 sm:top-4">
          <div className="rounded-xl border border-border bg-bg-elevated/95 px-3 py-2.5 shadow-panel backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
              <Users className="size-3.5 shrink-0" />
              <span className="font-medium text-fg">{displayName}</span>
              <span className="text-fg-subtle">·</span>
              <span className="font-mono text-[11px]">{roomId}</span>
            </div>
            <p className="mt-1 text-[11px] text-fg-subtle">
              {statusLabel}
              <span className="mx-1.5 text-border-strong">·</span>
              {heading}
            </p>
            {roster.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-border pt-2">
                {roster.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-[11px] text-fg-muted">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: a.color }}
                    />
                    {a.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {tipVisible && (
            <div className="rounded-xl border border-border bg-bg-elevated/95 px-3 py-2 text-[11px] leading-relaxed text-fg-muted shadow-panel backdrop-blur-sm">
              You are facing the <span className="text-fg">whiteboard</span>. Click it to draw.
              {isCoarse
                ? " Stick to move, drag to look. On a headset, tap Enter VR."
                : " WASD walk · right-drag look · T chat · Enter VR on a headset."}
              <button
                type="button"
                className="ml-2 text-fg underline-offset-2 hover:underline"
                onClick={() => setTipVisible(false)}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        <div className="pointer-events-auto absolute right-3 top-3 flex gap-2 sm:right-4 sm:top-4">
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-bg-elevated/95 px-3 text-xs font-medium text-fg-muted shadow-panel backdrop-blur-sm hover:text-fg"
          >
            <MessageSquare className="size-3.5" />
            Chat
            {chat.length > 0 && (
              <span className="rounded-full bg-bg-subtle px-1.5 font-mono text-[10px] text-fg">
                {chat.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={shareLink}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-bg-elevated/95 px-3 text-xs font-medium text-fg-muted shadow-panel backdrop-blur-sm hover:text-fg"
          >
            <Copy className="size-3.5" />
            {copied ? "Copied" : "Invite"}
          </button>
          <button
            type="button"
            onClick={() => void enterVr()}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-xs font-medium shadow-panel backdrop-blur-sm",
              vrSupported
                ? "border-border bg-bg-elevated/95 text-fg-muted hover:text-fg"
                : "border-border bg-bg-elevated/95 text-fg-subtle",
            )}
            title={vrSupported ? "Enter immersive VR" : "Needs a WebXR headset browser"}
          >
            <Maximize2 className="size-3.5" />
            {inVr ? "Exit VR" : "Enter VR"}
          </button>
        </div>
        {vrHint && (
          <div className="pointer-events-auto absolute right-3 top-16 max-w-[min(100%-1.5rem,20rem)] rounded-xl border border-border bg-bg-elevated/95 px-3 py-2 text-[11px] leading-relaxed text-fg-muted shadow-panel sm:right-4">
            {vrHint}
            <button
              type="button"
              className="ml-2 text-fg underline-offset-2 hover:underline"
              onClick={() => setVrHint(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {chatOpen && (
          <div className="pointer-events-auto absolute right-3 top-16 flex w-[min(100%-1.5rem,20rem)] flex-col overflow-hidden rounded-xl border border-border bg-bg-elevated/95 shadow-panel backdrop-blur-sm sm:right-4">
            <div className="max-h-48 space-y-1.5 overflow-y-auto px-3 py-2 text-xs">
              {chat.length === 0 && (
                <p className="py-4 text-center text-fg-subtle">No messages yet. Say hello.</p>
              )}
              {chat.map((line) => (
                <p key={line.id} className="leading-snug text-fg-muted">
                  <span className="font-medium text-fg">{line.name}</span>{" "}
                  {line.text}
                </p>
              ))}
              <div ref={chatEnd} />
            </div>
            <form
              className="flex items-center gap-1.5 border-t border-border p-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendChat();
              }}
            >
              <input
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                maxLength={160}
                placeholder="Message the room"
                className="h-9 min-w-0 flex-1 rounded-md border border-border bg-bg px-2.5 text-xs text-fg outline-none ring-fg/20 placeholder:text-fg-subtle focus:ring-2"
              />
              <button
                type="submit"
                className="inline-flex size-9 items-center justify-center rounded-md bg-accent text-accent-fg"
                aria-label="Send"
              >
                <Send className="size-3.5" />
              </button>
            </form>
          </div>
        )}

        <div className="pointer-events-auto absolute bottom-3 left-1/2 flex w-[min(100%-1rem,28rem)] -translate-x-1/2 flex-col gap-2 sm:bottom-5">
          <div
            className="border border-border bg-bg-elevated/95 p-3 shadow-panel backdrop-blur-sm"
            style={{ borderRadius: "calc(var(--radius-sm) + 12px)" }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
                Whiteboard pens
              </p>
              <button
                type="button"
                onClick={clearBoard}
                className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-fg-muted hover:text-fg"
              >
                Clear board
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {PEN_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => setPenId(c.id)}
                  className={cn(
                    "size-10 rounded-full border-2 transition-transform active:scale-95 sm:size-9",
                    penId === c.id ? "scale-105 border-fg" : "border-border-strong",
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-fg-subtle">
              {isCoarse
                ? "Paint the board in front of you. Stick to walk, drag to look."
                : "Click the board to paint. WASD walk · right-drag look · T chat."}
            </p>
          </div>
        </div>

        {isCoarse && <MobileStick onChange={setMobileAxes} />}
      </div>
    </div>
  );
}

function MobileStick({ onChange }: { onChange: (a: { x: number; y: number }) => void }) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const active = useRef(false);

  return (
    <div
      className="pointer-events-auto absolute bottom-28 left-4 size-28 touch-none rounded-full border border-border bg-bg-elevated/50 sm:bottom-32"
      onPointerDown={(e) => {
        active.current = true;
        origin.current = { x: e.clientX, y: e.clientY };
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!active.current || !origin.current) return;
        const dx = (e.clientX - origin.current.x) / 48;
        const dy = (e.clientY - origin.current.y) / 48;
        const m = Math.hypot(dx, dy) || 1;
        const s = Math.min(1, m);
        onChange({ x: (dx / m) * s, y: (dy / m) * s });
      }}
      onPointerUp={() => {
        active.current = false;
        origin.current = null;
        onChange({ x: 0, y: 0 });
      }}
      onPointerCancel={() => {
        active.current = false;
        origin.current = null;
        onChange({ x: 0, y: 0 });
      }}
    >
      <div className="absolute inset-0 m-auto size-10 rounded-full border border-border-strong bg-fg/20" />
    </div>
  );
}
