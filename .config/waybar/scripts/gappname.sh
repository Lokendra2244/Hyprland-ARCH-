#!/bin/bash

map="$HOME/.cache/class_name_map"

# Get Hyprland active window info
RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
SOCKET=$(find "$RUNTIME_DIR/hypr" -name ".socket2.sock" 2>/dev/null | head -n1)

[ -z "$SOCKET" ] && exit 1

stdbuf -oL socat - UNIX-CONNECT:"$SOCKET" | \
grep --line-buffered "activewindow>>" | \
while read -r _; do
    class=$(hyprctl activewindow -j | jq -r '.class')
    title=$(hyprctl activewindow -j | jq -r '.title')

    case "$class" in
        "kitty"|"alacritty"|"foot"|"wezterm")
            cmd=$(echo "$title" | awk '{print $1}')
            case "$cmd" in
                "yazi") icon="";;
                "btm")  icon="";;
                "nvim") icon="";;
                "htop") icon="";;
                *)      icon="";;
            esac
            echo "$icon $cmd"
            ;;
        *)
            name=$(grep -i "^$class|" "$map" | head -n1 | cut -d'|' -f2)
            [ -z "$name" ] && name="$class"
            echo "$name"
            ;;
    esac
done
