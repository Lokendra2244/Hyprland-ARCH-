#!/bin/bash

# Extract COLOR1 from pywal
COLOR1=$(sed -n '2p' "$HOME/.cache/wal/colors")

# Validate it's a hex color (7 chars including #)
if [[ ! "$COLOR1" =~ ^#[0-9a-fA-F]{6}$ ]]; then
    COLOR1="#ff69b4"  # fallback to pink
fi

# Update cava config with proper quoted color
sed -i "s/foreground = .*/foreground = '$COLOR1'/" "$HOME/.config/cava/config"

# Launch cava with pywal-themed kitty
kitty --class kitty --title cava \
      --config "$HOME/.cache/wal/colors-kitty.conf" \
      -o "font_size=6" \
      -e cava &
