#!/usr/bin/env python3
"""
Remove background from an image and save as PNG.
Usage: python remove-bg.py <input_path> <output_path>
"""

import sys
import os

# Add the venv to path
venv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.venv', 'lib', 'python3.12', 'site-packages')
sys.path.insert(0, venv_path)

from rembg import remove

def main():
    if len(sys.argv) != 3:
        print("Usage: python remove-bg.py <input_path> <output_path>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(input_path):
        print(f"Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    with open(input_path, 'rb') as f:
        input_data = f.read()

    output_data = remove(input_data)

    with open(output_path, 'wb') as f:
        f.write(output_data)

    print(output_path)

if __name__ == '__main__':
    main()
