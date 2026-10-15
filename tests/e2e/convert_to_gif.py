import glob
import os
import subprocess

from PIL import Image

FFMPEG = r"C:\Users\batra\AppData\Local\ms-playwright\ffmpeg-1013\ffmpeg-win64.exe"

def make_gif_from_webm(webm_path, gif_path, fps=8, max_width=640):
    temp_dir = os.path.join(os.path.dirname(gif_path), "temp_frames")
    os.makedirs(temp_dir, exist_ok=True)

    # Clean old frames
    for f in glob.glob(os.path.join(temp_dir, "*.png")):
        try:
            os.remove(f)
        except OSError:
            pass

    # Extract PNG frames using Playwright's bundled FFmpeg
    frame_pattern = os.path.join(temp_dir, "frame_%04d.png")
    cmd = [
        FFMPEG, "-y", "-i", webm_path,
        "-r", str(fps),
        "-vf", f"scale={max_width}:-2",
        frame_pattern
    ]
    subprocess.run(cmd, check=True)

    frame_files = sorted(glob.glob(os.path.join(temp_dir, "*.png")))
    if not frame_files:
        print(f"No frames extracted for {webm_path}")
        return

    # Cap to reasonable length (e.g. 50 frames ~ 5 seconds) to ensure < 5MB
    if len(frame_files) > 60:
        step = len(frame_files) / 60
        frame_files = [frame_files[int(i * step)] for i in range(60)]

    images = [Image.open(f).convert("P", palette=Image.ADAPTIVE) for f in frame_files]
    if images:
        images[0].save(
            gif_path,
            save_all=True,
            append_images=images[1:],
            duration=int(1000 / fps),
            loop=0,
            optimize=True
        )
        size_mb = os.path.getsize(gif_path) / (1024 * 1024)
        print(f"[OK] Generated GIF: {os.path.basename(gif_path)} ({size_mb:.2f} MB, {len(images)} frames)")

    # Clean up frames
    for f in glob.glob(os.path.join(temp_dir, "*.png")):
        try:
            os.remove(f)
        except OSError:
            pass
    try:
        os.rmdir(temp_dir)
    except OSError:
        pass

if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 3:
        make_gif_from_webm(sys.argv[1], sys.argv[2])
