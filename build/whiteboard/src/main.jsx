// Entry point for the whiteboard frontend: a single-page Excalidraw canvas
// that persists its scene through the add-on's backend instead of Excalidraw's
// usual browser-local storage. Bundled by build.mjs into whiteboard/www and
// served by the Home Assistant add-on; index.html mounts this at #root.
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

// Wait for edits to settle before saving, so a burst of drawing actions
// (drag, resize, multi-select move, etc.) results in one save, not many.
const SAVE_DEBOUNCE_MS = 1000;

// Relative URL so it works behind Home Assistant's ingress path prefix.
const SCENE_URL = "api/scene";

// Fetches the previously saved scene from the backend. Returns null (an
// empty canvas) on any failure, including a first run with nothing saved
// yet, so App never has to special-case "no scene".
async function loadScene() {
  try {
    const res = await fetch(SCENE_URL, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function App() {
  // Lazy initializer so loadScene() only fires once, on mount.
  const [initialData] = useState(() => loadScene());
  // Excalidraw's imperative API (getSceneElements/getAppState/etc.), captured
  // via the excalidrawAPI callback prop below. Kept in a ref, not state,
  // since it never changes and shouldn't trigger a re-render.
  const apiRef = useRef(null);
  // Handle of the pending debounced save, so onChange can cancel/reschedule it.
  const saveTimer = useRef(null);
  // Last JSON string successfully persisted, used to skip redundant saves
  // (e.g. an onChange that fires without any actual content change).
  const lastSaved = useRef(null);

  // Snapshots the live canvas into Excalidraw's portable JSON format.
  // Returns null if the Excalidraw API isn't mounted yet.
  const serializeCurrent = useCallback(() => {
    const api = apiRef.current;
    if (!api) return null;
    return serializeAsJSON(
      api.getSceneElements(),
      api.getAppState(),
      api.getFiles(),
      "local"
    );
  }, []);

  // POSTs the current scene to the backend if it differs from what was last
  // saved. On failure, lastSaved is left untouched so the next onChange
  // (or the visibility-change flush below) will retry with the same payload.
  const save = useCallback(async () => {
    const json = serializeCurrent();
    if (json === null || json === lastSaved.current) return;
    try {
      await fetch(SCENE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
      });
      lastSaved.current = json;
    } catch {
      // Keep lastSaved unchanged so the next onChange retries.
    }
  }, [serializeCurrent]);

  // Excalidraw's onChange fires on every edit. Debounce it into a single
  // save() call after the user stops editing for SAVE_DEBOUNCE_MS.
  const onChange = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, SAVE_DEBOUNCE_MS);
  }, [save]);

  // Flush unsaved changes when the tab is hidden/closed; sendBeacon
  // survives page teardown where fetch may not.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState !== "hidden") return;
      const json = serializeCurrent();
      if (json === null || json === lastSaved.current) return;
      navigator.sendBeacon(
        SCENE_URL,
        new Blob([json], { type: "application/json" })
      );
      lastSaved.current = json;
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [serializeCurrent]);

  return (
    <div style={{ height: "100%" }}>
      <Excalidraw
        // Captures Excalidraw's imperative API into apiRef once it mounts.
        excalidrawAPI={(api) => (apiRef.current = api)}
        initialData={initialData}
        onChange={onChange}
      />
    </div>
  );
}

// Standard React 19 root mount; #root is defined in index.html.
createRoot(document.getElementById("root")).render(<App />);
