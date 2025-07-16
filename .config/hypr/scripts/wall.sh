#!/usr/bin/env bash

WALLPAPER_DIR="/media/winD/Wallpaper/"
MONITOR="eDP-1"
WALL_LIST="$HOME/.cache/wallpapers.list"
LAST_USED="$HOME/.cache/last_wallpaper.txt"

# Generate wallpaper list if it doesn't exist
if [ ! -f "$WALL_LIST" ]; then
    find "$WALLPAPER_DIR" -type f -iregex ".*\.\(jpg\|jpeg\|png\)" | sort > "$WALL_LIST"
fi

# Read wallpapers into an array
mapfile -t WALLPAPERS < "$WALL_LIST"

# Find index of last used wallpaper
LAST_INDEX=0
if [ -f "$LAST_USED" ]; then
    LAST_WALL=$(cat "$LAST_USED")
    for i in "${!WALLPAPERS[@]}"; do
        [[ "${WALLPAPERS[$i]}" == "$LAST_WALL" ]] && LAST_INDEX=$i && break
    done
fi

# Calculate next wallpaper index (wrap around)
NEXT_INDEX=$(( (LAST_INDEX + 1) % ${#WALLPAPERS[@]} ))
WALLPAPER="${WALLPAPERS[$NEXT_INDEX]}"

# Store the selected wallpaper
echo "$WALLPAPER" > "$LAST_USED"

# Validate the file
if ! identify "$WALLPAPER" &>/dev/null; then
    echo "Invalid image: $WALLPAPER"
    exit 1
fi

# Generate pywal colors
wal -i "$WALLPAPER"

# Restart hyprpaper cleanly
killall -q hyprpaper
sleep 0.7
hyprpaper &

# Wait until IPC is available (max 3s)
for i in {1..30}; do
    if hyprctl hyprpaper preload "$WALLPAPER" &>/dev/null; then
        break
    fi
    sleep 0.1
done

# Apply wallpaper via IPC
hyprctl hyprpaper preload "$WALLPAPER"
hyprctl hyprpaper wallpaper "$MONITOR,$WALLPAPER"

# Relaunch themed overlays (optional)
pkill cava && /home/AMBHI/.config/hypr/scripts/cava.sh
