#!/bin/bash

output="$HOME/.cache/class_name_map"

> "$output"

find /usr/share/applications ~/.local/share/applications -name "*.desktop" 2>/dev/null | while read -r file; do
    exec_line=$(grep -m1 '^Exec=' "$file" | cut -d= -f2- | awk '{print $1}' | xargs basename)
    class_guess=$(basename "$file" .desktop)
    name=$(grep -m1 '^Name=' "$file" | cut -d= -f2-)

    if [ -n "$exec_line" ] && [ -n "$name" ]; then
        echo "$exec_line|$name" >> "$output"
        echo "$class_guess|$name" >> "$output"
    fi
done
