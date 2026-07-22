from __future__ import annotations

import os
from pathlib import Path
import shutil
import subprocess
import sys

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_BUILD = (
    PROJECT_ROOT
    / "game"
    / "web-prototype"
    / "dist"
)
LAUNCHER = Path(__file__).resolve().parent / "merge_yizai_launcher.py"
BUILD_ROOT = PROJECT_ROOT / "exports" / "desktop-local-app-build"
ICON_PATH = BUILD_ROOT / "merge_yizai.ico"
DIST_PATH = BUILD_ROOT / "dist"
WORK_PATH = BUILD_ROOT / "work"
SPEC_PATH = BUILD_ROOT / "spec"
DESKTOP_EXE_NAME = "合成亿仔_本地版.exe"


def desktop_dir() -> Path:
    user_profile = os.environ.get("USERPROFILE")
    if not user_profile:
        raise RuntimeError("Cannot find USERPROFILE for Desktop output.")
    return Path(user_profile) / "Desktop"


def make_icon() -> None:
    source_icon = SOURCE_BUILD / "assets" / "ui" / "app_icon.png"
    if not source_icon.exists():
        source_icon = SOURCE_BUILD / "assets" / "faces" / "face_11_yizai.png"
    if not source_icon.exists():
        raise FileNotFoundError(source_icon)
    ICON_PATH.parent.mkdir(parents=True, exist_ok=True)
    image = Image.open(source_icon).convert("RGBA")
    image.save(
        ICON_PATH,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )


def build_exe() -> Path:
    if not (SOURCE_BUILD / "index.html").exists():
        raise FileNotFoundError(SOURCE_BUILD / "index.html")

    DIST_PATH.mkdir(parents=True, exist_ok=True)
    WORK_PATH.mkdir(parents=True, exist_ok=True)
    SPEC_PATH.mkdir(parents=True, exist_ok=True)

    command = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--windowed",
        "--name",
        "merge_yizai_local",
        "--icon",
        str(ICON_PATH),
        "--add-data",
        f"{SOURCE_BUILD}{os.pathsep}dist",
        "--distpath",
        str(DIST_PATH),
        "--workpath",
        str(WORK_PATH),
        "--specpath",
        str(SPEC_PATH),
        str(LAUNCHER),
    ]
    subprocess.check_call(command, cwd=PROJECT_ROOT)
    built_exe = DIST_PATH / "merge_yizai_local.exe"
    if not built_exe.exists():
        raise FileNotFoundError(built_exe)
    return built_exe


def copy_to_desktop(built_exe: Path) -> Path:
    target = desktop_dir() / DESKTOP_EXE_NAME
    shutil.copy2(built_exe, target)
    return target


def main() -> int:
    make_icon()
    built_exe = build_exe()
    target = copy_to_desktop(built_exe)
    print(target)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
