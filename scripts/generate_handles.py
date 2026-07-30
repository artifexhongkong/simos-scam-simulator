#!/usr/bin/env python3
"""
Generate text selection handle PNG drawables for Android.
These replace the system default handles which have black border artifacts
when rendered in WebView.

Output: text_select_handle_left.png, text_select_handle_middle.png, text_select_handle_right.png
in the specified output directory.

Usage: python3 generate_handles.py <output_dir>
"""

import sys
import os
import math
from PIL import Image, ImageDraw


def create_teardrop_handle(width, height, fill_color, direction='middle'):
    """
    Create a teardrop-shaped text selection handle PNG with proper alpha channel.

    Args:
        width: Image width in pixels
        height: Image height in pixels
        fill_color: (R, G, B) tuple for the handle color
        direction: 'middle' (tip up), 'left' (tip up-right), 'right' (tip up-left)

    Returns:
        PIL Image in RGBA mode with transparent background
    """
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    mask = Image.new('L', (width, height), 0)
    mask_draw = ImageDraw.Draw(mask)

    # Circle (round part of teardrop) at bottom center
    circle_cx = width // 2
    circle_cy = int(height * 0.65)
    circle_r = int(width * 0.42)

    # Tip position based on direction
    if direction == 'middle':
        tip_x = width // 2
        tip_y = 0
    elif direction == 'left':
        tip_x = int(width * 0.72)
        tip_y = 0
    else:  # right
        tip_x = int(width * 0.28)
        tip_y = 0

    # Draw filled ellipse
    mask_draw.ellipse(
        [circle_cx - circle_r, circle_cy - circle_r,
         circle_cx + circle_r, circle_cy + circle_r],
        fill=255
    )

    # Draw triangle from tip to two tangent points on circle
    angle_to_tip = math.atan2(tip_y - circle_cy, tip_x - circle_cx)
    tangent_angle = math.radians(65)

    p1_angle = angle_to_tip - tangent_angle
    p2_angle = angle_to_tip + tangent_angle

    p1_x = circle_cx + circle_r * math.cos(p1_angle)
    p1_y = circle_cy + circle_r * math.sin(p1_angle)
    p2_x = circle_cx + circle_r * math.cos(p2_angle)
    p2_y = circle_cy + circle_r * math.sin(p2_angle)

    mask_draw.polygon(
        [(tip_x, tip_y), (p1_x, p1_y), (p2_x, p2_y)],
        fill=255
    )

    # Apply anti-aliasing by supersampling
    # Scale up, draw, scale down
    scale = 4
    big_mask = mask.resize((width * scale, height * scale), Image.LANCZOS)
    # Re-draw on the big mask for smoother edges
    big_mask = Image.new('L', (width * scale, height * scale), 0)
    big_draw = ImageDraw.Draw(big_mask)

    big_cx = circle_cx * scale
    big_cy = circle_cy * scale
    big_r = circle_r * scale
    big_tip_x = tip_x * scale
    big_tip_y = tip_y * scale

    big_draw.ellipse(
        [big_cx - big_r, big_cy - big_r, big_cx + big_r, big_cy + big_r],
        fill=255
    )

    big_p1_x = big_cx + big_r * math.cos(p1_angle)
    big_p1_y = big_cy + big_r * math.sin(p1_angle)
    big_p2_x = big_cx + big_r * math.cos(p2_angle)
    big_p2_y = big_cy + big_r * math.sin(p2_angle)

    big_draw.polygon(
        [(big_tip_x, big_tip_y), (big_p1_x, big_p1_y), (big_p2_x, big_p2_y)],
        fill=255
    )

    # Scale down with anti-aliasing
    mask = big_mask.resize((width, height), Image.LANCZOS)

    # Apply fill color using the mask
    # Use a solid color image (not RGBA with alpha) to avoid black bleed at edges
    fill_img = Image.new('RGB', (width, height), fill_color)
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    img.paste(fill_img, (0, 0), mask)
    # Set alpha from mask
    alpha = mask.point(lambda a: a)
    img.putalpha(alpha)

    return img


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate_handles.py <output_dir>")
        sys.exit(1)

    output_dir = sys.argv[1]
    os.makedirs(output_dir, exist_ok=True)

    # iOS blue color
    fill_color = (0, 122, 255)  # #007AFF

    # Generate handles at multiple densities for crisp rendering
    # mdpi (1x), hdpi (1.5x), xhdpi (2x), xxhdpi (3x)
    densities = {
        'mdpi': 1,
        'hdpi': 1.5,
        'xhdpi': 2,
        'xxhdpi': 3,
    }

    # Base sizes (in dp)
    base_sizes = {
        'middle': (22, 30),
        'left': (28, 30),
        'right': (28, 30),
    }

    for density, scale in densities.items():
        density_dir = os.path.join(output_dir, f'drawable-{density}')
        os.makedirs(density_dir, exist_ok=True)

        for direction, (w, h) in base_sizes.items():
            pw = int(w * scale)
            ph = int(h * scale)
            img = create_teardrop_handle(pw, ph, fill_color, direction)
            filename = f'text_select_handle_{direction}.png'
            filepath = os.path.join(density_dir, filename)
            img.save(filepath, 'PNG')
            print(f"Generated: {filepath} ({pw}x{ph})")

    # Also create a fallback in drawable-nodpi
    nodpi_dir = os.path.join(output_dir, 'drawable-nodpi')
    os.makedirs(nodpi_dir, exist_ok=True)
    for direction, (w, h) in base_sizes.items():
        img = create_teardrop_handle(w, h, fill_color, direction)
        filename = f'text_select_handle_{direction}.png'
        filepath = os.path.join(nodpi_dir, filename)
        img.save(filepath, 'PNG')
        print(f"Generated: {filepath} ({w}x{h})")

    print("\nAll handle drawables generated successfully!")


if __name__ == '__main__':
    main()
