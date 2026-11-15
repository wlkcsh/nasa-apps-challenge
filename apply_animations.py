import json
import subprocess
import os

DECKCRAFT_CLI = "/Users/mac/Artcraft/deckcraft-main/target/release/deckcraft-cli"

def run_deckcraft(cmds, in_file, out_file):
    cmd_args = [DECKCRAFT_CLI, "run", "--in", in_file]
    for c_id, params in cmds:
        cmd_args.extend(["--cmd", f"{c_id}={json.dumps(params)}"])
    cmd_args.extend(["--save", out_file])
    res = subprocess.run(cmd_args, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error running deckcraft on {in_file}: {res.stderr}")
        return False
    print(f"Successfully generated {out_file}")
    return True

# 1. Deck A: Agriverto.pptx (Emerald Keynote Deck)
cmds_a = [
    # Global transition: 700ms smooth cross-fade across all slides
    ("transition.set", {"kind": "fade", "duration": 700}),
    ("transition.applyAll", {}),

    # Slide 1 (index 0): Title & Brief
    ("slide.go", {"index": 0}),
    ("animation.clear", {"index": 0}),
    ("animation.add", {"ids": [6], "effect": "fade", "start": "afterPrevious", "duration": 400, "delay": 200}),
    ("animation.add", {"ids": [7, 8], "effect": "fade", "start": "afterPrevious", "duration": 400, "delay": 150}),

    # Slide 2 (index 1): The Problem
    ("slide.go", {"index": 1}),
    ("animation.clear", {"index": 1}),
    ("animation.add", {"ids": [3], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [4, 5, 6], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [7], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [8, 9, 10], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [11], "effect": "fade", "start": "onClick", "duration": 400}),

    # Slide 3 (index 2): What It Does
    ("slide.go", {"index": 2}),
    ("animation.clear", {"index": 2}),
    ("animation.add", {"ids": [4], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [5], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [6], "effect": "fade", "start": "onClick", "duration": 400}),

    # Slide 4 (index 3): The NASA Data
    ("slide.go", {"index": 3}),
    ("animation.clear", {"index": 3}),
    ("animation.add", {"ids": [4], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [5, 6], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [7], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [8, 9], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [10], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [11, 12], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [13], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [14, 15], "effect": "fade", "start": "withPrevious", "duration": 400}),

    # Slide 5 (index 4): The Evidence
    ("slide.go", {"index": 4}),
    ("animation.clear", {"index": 4}),
    ("animation.add", {"ids": [4], "effect": "fade", "start": "onClick", "duration": 450}),

    # Slide 6 (index 5): The Answer
    ("slide.go", {"index": 5}),
    ("animation.clear", {"index": 5}),
    ("animation.add", {"ids": [4], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [5, 6], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [7], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [8, 9], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [10], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [11, 12], "effect": "fade", "start": "withPrevious", "duration": 400}),

    # Slide 7 (index 6): What It Does Not Know
    ("slide.go", {"index": 6}),
    ("animation.clear", {"index": 6}),
    ("animation.add", {"ids": [3], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [4, 5, 6, 7, 8, 9, 10, 11], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [12], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [13, 14], "effect": "fade", "start": "withPrevious", "duration": 400}),
]

# 2. Deck B: Agriverto — NASA Space Apps Demo.pptx (Editorial Demo Deck)
cmds_b = [
    # Global transition: 700ms smooth cross-fade across all slides
    ("transition.set", {"kind": "fade", "duration": 700}),
    ("transition.applyAll", {}),

    # Slide 1 (index 0): Title & Challenge Brief
    ("slide.go", {"index": 0}),
    ("animation.clear", {"index": 0}),
    ("animation.add", {"ids": [7], "effect": "fade", "start": "afterPrevious", "duration": 400, "delay": 200}),
    ("animation.add", {"ids": [8], "effect": "fade", "start": "afterPrevious", "duration": 400, "delay": 150}),

    # Slide 2 (index 1): The Problem
    ("slide.go", {"index": 1}),
    ("animation.clear", {"index": 1}),
    ("animation.add", {"ids": [8], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [9, 10, 11], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [12], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [13, 14, 15], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [7], "effect": "fade", "start": "onClick", "duration": 400}),

    # Slide 3 (index 2): What It Does
    ("slide.go", {"index": 2}),
    ("animation.clear", {"index": 2}),
    ("animation.add", {"ids": [2], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [8, 11], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [12], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [13], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [14], "effect": "fade", "start": "onClick", "duration": 400}),

    # Slide 4 (index 3): The NASA Data
    ("slide.go", {"index": 3}),
    ("animation.clear", {"index": 3}),
    ("animation.add", {"ids": [3], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [11], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [4], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [12], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [5], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [13], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [6], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [14, 2, 7, 10], "effect": "fade", "start": "withPrevious", "duration": 400}),

    # Slide 5 (index 4): The Evidence
    ("slide.go", {"index": 4}),
    ("animation.clear", {"index": 4}),
    ("animation.add", {"ids": [2], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [5, 8], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [9], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [10], "effect": "fade", "start": "withPrevious", "duration": 400}),

    # Slide 6 (index 5): The Answer
    ("slide.go", {"index": 5}),
    ("animation.clear", {"index": 5}),
    ("animation.add", {"ids": [5], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [14, 15], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [6], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [16, 17], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [18], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [19, 3, 9, 13, 2, 12], "effect": "fade", "start": "withPrevious", "duration": 400}),

    # Slide 7 (index 6): What It Does Not Know
    ("slide.go", {"index": 6}),
    ("animation.clear", {"index": 6}),
    ("animation.add", {"ids": [2], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [8, 9, 10], "effect": "fade", "start": "withPrevious", "duration": 400}),
    ("animation.add", {"ids": [5], "effect": "fade", "start": "onClick", "duration": 400}),
    ("animation.add", {"ids": [11, 12], "effect": "fade", "start": "withPrevious", "duration": 400}),
]

if __name__ == "__main__":
    run_deckcraft(cmds_a, "Agriverto.pptx", "Agriverto_Animated.pptx")
    run_deckcraft(cmds_b, "Agriverto — NASA Space Apps Demo.pptx", "Agriverto_Demo_Animated.pptx")
