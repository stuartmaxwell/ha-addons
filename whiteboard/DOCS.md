# Whiteboard

## How it works

The add-on serves a bundled copy of [Excalidraw](https://excalidraw.com)
through Home Assistant ingress, so it appears in the sidebar and uses
your normal Home Assistant authentication — no extra ports are opened.

The drawing is autosaved to the add-on's persistent storage about a
second after you stop drawing, and reloaded whenever the page opens.
Every device shows the same board.

## Notes and limitations

- **Last write wins.** If two people edit at the same time from
  different devices, whoever saves last overwrites the other's changes.
  Live multi-cursor collaboration is not supported.
- **Refresh to see others' changes.** The board is loaded when the page
  opens; it does not live-update while open.
- The scene is stored in `/data/scene.json` inside the add-on and
  survives restarts and updates. Uninstalling the add-on deletes it.

## Configuration

This add-on has no configuration options.
