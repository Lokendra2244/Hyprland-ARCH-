#!/bin/bash

# Source pywal's tty color script (sets ANSI colors in terminal)
source "$HOME/.cache/wal/colors-tty.sh"

# Launch tty-clock in a kitty window using pywal colors
kitty --class kitty --title tty-clock \
      --config "$HOME/.cache/wal/colors-kitty.conf" \
      -o "font_size=5" \
      -e tty-clock -s -c -C 1 -n &
