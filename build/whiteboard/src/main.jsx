import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

const SAVE_DEBOUNCE_MS = 1000;

// Relative URL so it works behind Home Assistant's ingress path prefix.
const SCENE_URL = "api/scene";

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
  const [initialData] = useState(() => loadScene());
  const apiRef = useRef(null);
  const saveTimer = useRef(null);
  const lastSaved = useRef(null);

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
        excalidrawAPI={(api) => (apiRef.current = api)}
        initialData={initialData}
        onChange={onChange}
      />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
