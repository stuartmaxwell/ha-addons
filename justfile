# Set the default recipe to list all available commands
default:
    @just --list

# Whiteboard install
whiteboard-install:
    cd build/whiteboard && pnpm install

# Whiteboard build
whiteboard-build:
    cd build/whiteboard && pnpm build
