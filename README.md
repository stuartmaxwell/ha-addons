# Stuart's Home Assistant Add-ons

Add-on repository for Home Assistant. To install, add this repository in
**Settings → Add-ons → Add-on Store → ⋮ → Repositories** using this
repo's GitHub URL, then install the add-on from the store.

## Add-ons

### [Whiteboard](./whiteboard)

A shared [Excalidraw](https://excalidraw.com) whiteboard that lives in
your Home Assistant sidebar. One board for the whole household: every
device sees and edits the same drawing, persisted on the server.

## Development

The Excalidraw frontend is bundled ahead of time and the output is
committed into `whiteboard/www/`, so the Supervisor's Docker build needs
no Node toolchain. To rebuild the frontend after changing it:

```sh
cd frontend
pnpm install
pnpm build
```

Then bump `version` in `whiteboard/config.yaml` so installed instances
pick up the update.
