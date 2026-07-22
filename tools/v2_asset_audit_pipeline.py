from __future__ import annotations

import csv
import json
import math
import os
import re
import shutil
import subprocess
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageEnhance, ImageOps


ROOT = Path(r"D:\01_Codex源码项目\微信小游戏")
RAW_SOURCE = Path(r"E:\最终")
ASSETS_RAW = ROOT / "assets_raw"
ASSETS_FINAL = ROOT / "assets_final"
ASSETS_REJECTED = ROOT / "assets_rejected"
AUDIT_DIR = ROOT / "asset_audit"
PREVIEW_DIR = AUDIT_DIR / "previews"

DESIGN_W = 750
DESIGN_H = 1334
TRANSPARENT_HOLE_ASSETS = {"game_playfield_frame", "panel_next_ball"}
VISUAL_YIZAI_PASS = {"app_icon", "share_card_bg", "store_cover"}
NEEDS_REGEN_OVERRIDES = {
    "face_11_yizai": "亿仔主体和 MAEE 方向正确，但边缘残留明显棋盘格/白边抠图污染，最终球体必须重新生成透明 PNG",
}


@dataclass
class ExpectedAsset:
    assetId: str
    fileName: str
    directory: str
    bundle: str
    width: int
    height: int
    format: str
    alpha: bool
    anchor: str
    layoutRect: str | None
    zIndex: int | None
    nineSlice: bool
    preload: bool
    notes: str
    kind: str
    must_not_have_dynamic_text: bool = False
    yizai_required: bool = False
    state_group: str | None = None
    state: str | None = None


def rect(x: int, y: int, w: int, h: int) -> str:
    return f"{x},{y},{w},{h}"


def png(asset_id: str, directory: str, bundle: str, w: int, h: int, notes: str,
        *, layout: str | None = None, z: int | None = None, preload: bool = True,
        kind: str = "ui", yizai: bool = False, dynamic: bool = False,
        nine: bool = False, state_group: str | None = None, state: str | None = None,
        anchor: str = "0.5,0.5") -> ExpectedAsset:
    return ExpectedAsset(asset_id, f"{asset_id}.png", directory, bundle, w, h, "PNG",
                         True, anchor, layout, z, nine, preload, notes, kind, dynamic,
                         yizai, state_group, state)


def jpg(asset_id: str, directory: str, bundle: str, w: int, h: int, notes: str,
        *, layout: str | None = None, z: int | None = None, preload: bool = True,
        kind: str = "background", yizai: bool = False, dynamic: bool = False,
        anchor: str = "0.5,0.5") -> ExpectedAsset:
    return ExpectedAsset(asset_id, f"{asset_id}.jpg", directory, bundle, w, h, "JPG",
                         False, anchor, layout, z, False, preload, notes, kind, dynamic,
                         yizai)


def add_button_states(items: list[ExpectedAsset], base: str, directory: str, bundle: str,
                      w: int, h: int, notes: str, *,
                      states: tuple[str, ...] = ("normal", "pressed", "disabled"),
                      preload: bool = True, kind: str = "button") -> None:
    for state in states:
        items.append(png(f"{base}_{state}", directory, bundle, w, h, f"{notes} {state}",
                         preload=preload, kind=kind, state_group=base, state=state))


def build_expected_assets() -> list[ExpectedAsset]:
    items: list[ExpectedAsset] = []

    home = "assets_final/ui/home"
    game = "assets_final/ui/game"
    modal = "assets_final/ui/modal"
    task = "assets_final/ui/task"
    shop = "assets_final/ui/shop"
    rank = "assets_final/ui/rank"
    result = "assets_final/ui/result"
    loading = "assets_final/ui/loading"
    balls = "assets_final/balls/default"
    share = "assets_final/share"
    icon = "assets_final/icon"

    items += [
        jpg("home_bg", home, "main", 750, 1334, "首页氛围背景，不带按钮文字、分数数字",
            layout=rect(0, 0, 750, 1334), z=0, dynamic=True),
        png("home_machine", home, "main", 750, 1334, "首页机器主体，透明，不能写动态数据",
            layout=rect(0, 0, 750, 1334), z=10, dynamic=True),
    ]
    add_button_states(items, "btn_start", home, "main", 520, 160, "开始游戏按钮")
    add_button_states(items, "btn_task", home, "main", 180, 180, "任务入口按钮")
    add_button_states(items, "btn_rank", home, "main", 180, 180, "排行榜入口按钮")
    add_button_states(items, "btn_shop", home, "main", 180, 180, "商店入口按钮")
    items += [
        png("panel_daily_goal", home, "main", 220, 110, "今日目标数据底板，不写具体数字",
            layout=rect(50, 720, 220, 110), z=35, dynamic=True),
        png("panel_best_score", home, "main", 220, 110, "最高分数据底板，不写具体数字",
            layout=rect(50, 840, 220, 110), z=35, dynamic=True),
        png("panel_coin_balance", home, "main", 220, 90, "亿仔币余额底板，不写数量",
            layout=rect(265, 1120, 220, 90), z=35, dynamic=True),
        png("coin_icon", home, "main", 96, 96, "亿仔币图标；当前不强制出现亿仔脸或 MAEE",
            kind="icon"),
    ]

    items += [
        png("game_shell", game, "main", 750, 1334, "主游戏机器外壳，不能遮挡玩法仓",
            layout=rect(0, 0, 750, 1334), z=0, dynamic=True),
        jpg("game_playfield_bg", game, "main", 620, 780, "玻璃仓内部低干扰背景",
            layout=rect(65, 230, 620, 780), z=10),
        png("game_playfield_frame", game, "main", 650, 820, "玻璃仓边框",
            layout=rect(50, 210, 650, 820), z=30),
        png("hud_top", game, "main", 750, 170, "顶部 HUD 底板，不带数字",
            layout=rect(0, 0, 750, 170), z=50, dynamic=True),
        png("panel_score", game, "main", 220, 110, "分数面板，不写具体数字", dynamic=True),
        png("panel_best", game, "main", 180, 110, "最高分面板，不写具体数字", dynamic=True),
        png("panel_next_ball", game, "main", 140, 140, "下一个球预览框"),
        png("control_bar", game, "main", 520, 150, "底部控制台底板",
            layout=rect(115, 1160, 520, 150), z=50),
    ]
    for base, note in [
        ("btn_sound_on", "声音开启按钮"),
        ("btn_sound_off", "静音按钮"),
        ("btn_pause", "暂停按钮"),
        ("btn_restart", "重开按钮"),
    ]:
        add_button_states(items, base, game, "main", 128, 128, note)
    items += [
        png("warning_line", game, "main", 560, 40, "失败警戒线",
            layout=rect(95, 345, 560, 40), z=35),
        png("dropper_head", game, "main", 140, 120, "投放器头部",
            layout="375,210", z=45),
    ]

    face_names = [
        "face_01_sprout_bead", "face_02_peach_puff", "face_03_heart_jelly",
        "face_04_sun_wiggle", "face_05_sky_spark", "face_06_cream_smile",
        "face_07_seed_sage", "face_08_grape_zap", "face_09_flame_grin",
        "face_10_crown_star", "face_11_yizai",
    ]
    for name in face_names:
        items.append(png(name, balls, "main", 512, 512,
                         "默认合成球；圆心 256,256，主体最大直径 460px，四周 26px 透明安全边距",
                         kind="ball", yizai=(name == "face_11_yizai")))

    for skin in ["jelly", "star", "cream", "coin", "festival"]:
        for i in range(1, 11):
            items.append(png(f"skin_{skin}_face_{i:02d}",
                             f"assets_final/balls/skins/{skin}", f"skins_{skin}",
                             512, 512,
                             f"{skin} 皮肤球；仅改变前 10 级外观，不影响数值",
                             preload=False, kind="ball"))
        items.append(png(f"skin_preview_{skin}", f"assets_final/balls/skins/{skin}",
                         f"skins_{skin}", 300, 300, f"{skin} 皮肤商店预览",
                         preload=False, kind="icon"))

    items += [
        png("modal_base", modal, "main", 620, 760, "通用弹窗底板，不带具体文字", dynamic=True, nine=True),
        png("pause_panel", modal, "main", 620, 620, "暂停弹窗底板"),
    ]
    add_button_states(items, "btn_resume", modal, "main", 300, 100, "继续游戏按钮")
    add_button_states(items, "btn_pause_home", modal, "main", 260, 86, "暂停页返回大厅按钮",
                      states=("normal", "pressed"))
    add_button_states(items, "btn_pause_restart", modal, "main", 260, 86, "暂停页重新开始按钮",
                      states=("normal", "pressed"))

    items += [
        png("task_panel", task, "main", 620, 760, "任务弹窗，不写具体任务文案", dynamic=True, nine=True),
        png("task_item", task, "main", 560, 100, "单条任务底板，留进度和领取区域", dynamic=True, nine=True),
    ]
    add_button_states(items, "btn_claim", task, "main", 180, 72, "领取按钮")

    items += [
        png("shop_panel", shop, "main", 620, 860, "商店弹窗，不写具体价格和名字", dynamic=True, nine=True),
        png("shop_card", shop, "main", 250, 300, "皮肤卡片底板，留预览、价格、按钮区域", dynamic=True, nine=True),
    ]
    add_button_states(items, "btn_buy", shop, "main", 180, 72, "购买按钮")
    add_button_states(items, "btn_use", shop, "main", 180, 72, "使用按钮")

    items += [
        png("rank_panel", rank, "main", 620, 860, "排行榜弹窗，不写具体排名和名字", dynamic=True, nine=True),
        png("rank_item", rank, "main", 560, 96, "单条排行底板，留头像、名次、昵称、分数区域", dynamic=True, nine=True),
        png("result_panel", result, "main", 620, 760, "结算弹窗，不写分数数字", dynamic=True, nine=True),
    ]
    add_button_states(items, "btn_again", result, "main", 300, 100, "再来一局按钮",
                      states=("normal", "pressed"))
    add_button_states(items, "btn_share", result, "main", 300, 100, "分享成绩按钮")
    add_button_states(items, "btn_home", result, "main", 260, 86, "返回大厅按钮",
                      states=("normal", "pressed"))
    add_button_states(items, "btn_close", modal, "main", 96, 96, "弹窗关闭按钮",
                      states=("normal", "pressed"))

    fx_specs = [
        ("merge_spark", "fx_merge_spark", 1024, 1024, 12, 12, "普通合成特效"),
        ("big_merge", "fx_big_merge", 1024, 1024, 16, 12, "高等级合成特效"),
        ("yizai_success", "fx_yizai_success", 1024, 1024, 24, 12, "合出亿仔特效，不能遮住 MAEE"),
        ("coin_fly", "fx_coin_fly", 1024, 1024, 16, 24, "获得亿仔币动效"),
        ("button_tap", "fx_button_tap", 512, 512, 8, 24, "按钮点击反馈"),
    ]
    for folder, prefix, w, h, frames, fps, note in fx_specs:
        for i in range(1, frames + 1):
            items.append(png(f"{prefix}_{i:03d}", f"assets_final/fx/{folder}", "fx_extra",
                             w, h, f"{note}；序列帧 {i}/{frames}，fps {fps}",
                             preload=False, kind="fx", yizai=(prefix == "fx_yizai_success")))

    items += [
        jpg("share_card_bg", share, "share", 1200, 960,
            "微信分享图背景，留分数/最高合成/亿仔头像区域", preload=False, yizai=True, dynamic=True),
        png("app_icon", icon, "main", 1024, 1024,
            "小游戏图标，小尺寸下 MAEE 尽量清晰", kind="icon", yizai=True),
        jpg("store_cover", share, "share", 1280, 720,
            "微信后台/宣传封面，亿仔必须符合参考图", preload=False, yizai=True, dynamic=True),
        jpg("loading_bg", loading, "main", 750, 1334,
            "加载页背景，留进度条位置，不带动态数字", dynamic=True),
        png("loading_bar_bg", loading, "main", 520, 50,
            "进度条底板，不带数字", dynamic=True),
        png("loading_bar_fill", loading, "main", 520, 50,
            "进度条填充，可横向裁切，不带百分比", dynamic=True),
    ]
    return items


def ensure_dirs(expected: list[ExpectedAsset]) -> None:
    for path in [ASSETS_RAW, ASSETS_FINAL, ASSETS_REJECTED, AUDIT_DIR, PREVIEW_DIR]:
        path.mkdir(parents=True, exist_ok=True)
    for d in [
        "ui/home", "ui/game", "ui/modal", "ui/task", "ui/shop", "ui/rank",
        "ui/result", "ui/loading", "balls/default", "balls/skins/jelly",
        "balls/skins/star", "balls/skins/cream", "balls/skins/coin",
        "balls/skins/festival", "coin", "festival", "share", "icon", "fx"
    ]:
        (ASSETS_FINAL / d).mkdir(parents=True, exist_ok=True)
    for asset in expected:
        (ROOT / asset.directory).mkdir(parents=True, exist_ok=True)


def copy_raw_inputs() -> None:
    if not RAW_SOURCE.exists():
        return
    for src in RAW_SOURCE.rglob("*"):
        if src.is_file():
            dst = ASSETS_RAW / src.relative_to(RAW_SOURCE)
            dst.parent.mkdir(parents=True, exist_ok=True)
            if not dst.exists() or src.stat().st_mtime > dst.stat().st_mtime:
                shutil.copy2(src, dst)


def raw_index() -> dict[str, Path]:
    idx: dict[str, Path] = {}
    for path in ASSETS_RAW.rglob("*"):
        if path.is_file() and path.suffix.lower() in [".png", ".jpg", ".jpeg", ".webp"]:
            idx.setdefault(path.stem.lower(), path)
    return idx


def image_info(path: Path) -> dict[str, Any]:
    with Image.open(path) as img:
        bands = img.getbands()
        has_alpha_band = "A" in bands
        alpha_real = False
        if has_alpha_band:
            alpha = np.array(img.getchannel("A"))
            alpha_real = bool(np.any(alpha < 250))
        return {
            "size": img.size,
            "mode": img.mode,
            "format": img.format or path.suffix.replace(".", "").upper(),
            "hasAlphaBand": has_alpha_band,
            "realAlpha": alpha_real,
        }


def detect_checkerboard(img: Image.Image) -> bool:
    rgb = np.asarray(img.convert("RGB").resize((128, 128), Image.Resampling.BILINEAR))
    gray = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    bright_low_sat = (gray > 210) & (sat < 18)
    if bright_low_sat.mean() < 0.45:
        return False
    corner = bright_low_sat[:24, :24].mean()
    center = bright_low_sat[40:88, 40:88].mean()
    uniqueish = np.std(gray[bright_low_sat]) if np.any(bright_low_sat) else 0
    return corner > 0.75 and uniqueish > 3 and center > 0.15


def run_ocr(path: Path) -> str:
    try:
        proc = subprocess.run(
            ["tesseract", str(path), "stdout", "-l", "eng", "--psm", "6"],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=12,
        )
        if proc.returncode == 0:
            return proc.stdout.strip()
    except Exception:
        pass
    return ""


def contains_dynamic_digits(ocr_text: str) -> bool:
    if not ocr_text:
        return False
    # Isolated numbers are risky on panels/rank/result/loading bars. Fixed labels without digits are okay.
    return bool(re.search(r"\d{2,}|[0-9]+[./][0-9]+|[0-9]+%", ocr_text))


def yizai_auto_check(path: Path, ocr_text: str) -> tuple[str, str]:
    if "MAEE" not in ocr_text.upper().replace(" ", ""):
        return "MANUAL_REVIEW", "未能自动 OCR 识别到 MAEE，需要人工复核"
    with Image.open(path) as img:
        rgb = np.asarray(img.convert("RGB").resize((160, 160)))
        r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
        red = ((r > 160) & (g < 90) & (b < 90)).mean()
        orange = ((r > 180) & (g > 90) & (g < 190) & (b < 80)).mean()
        dark = ((r < 50) & (g < 50) & (b < 50)).mean()
        white = ((r > 220) & (g > 220) & (b > 220)).mean()
    if red > 0.03 and orange > 0.03 and dark > 0.015 and white > 0.08:
        return "PASS", "自动检测到 MAEE、红帽/橙口鼻/黑色五官/白色主体的主要色彩特征"
    return "MANUAL_REVIEW", "识别到 MAEE，但色彩特征未完全达标，需要人工复核"


def make_alpha_from_border(img: Image.Image, checkerboard: bool, *,
                           remove_internal_checker: bool = False) -> tuple[Image.Image, bool, str]:
    rgba = img.convert("RGBA")
    arr = np.asarray(rgba).copy()
    if np.any(arr[:, :, 3] < 250):
        return rgba, True, "已有真实 alpha"

    rgb = arr[:, :, :3].astype(np.int16)
    h, w = rgb.shape[:2]
    border = np.concatenate([rgb[0, :, :], rgb[h - 1, :, :], rgb[:, 0, :], rgb[:, w - 1, :]], axis=0)
    # Use several bright low-saturation border colors as removable background seeds.
    brightness = border.mean(axis=1)
    saturation = border.max(axis=1) - border.min(axis=1)
    candidates = border[(brightness > 180) & (saturation < 45)]
    if len(candidates) == 0:
        candidates = border
    colors = []
    for percentile in [10, 35, 55, 75, 90]:
        colors.append(np.percentile(candidates, percentile, axis=0))
    colors.append(np.median(candidates, axis=0))

    tol = 34 if checkerboard else 24
    possible_bg = np.zeros((h, w), dtype=bool)
    for color in colors:
        dist = np.linalg.norm(rgb - color, axis=2)
        possible_bg |= dist < tol
    # Limit to connected-to-edge background so white bear body or white UI highlights are preserved.
    visited = np.zeros((h, w), dtype=bool)
    stack = []
    for x in range(w):
        if possible_bg[0, x]:
            stack.append((0, x))
        if possible_bg[h - 1, x]:
            stack.append((h - 1, x))
    for y in range(h):
        if possible_bg[y, 0]:
            stack.append((y, 0))
        if possible_bg[y, w - 1]:
            stack.append((y, w - 1))
    while stack:
        y, x = stack.pop()
        if y < 0 or y >= h or x < 0 or x >= w or visited[y, x] or not possible_bg[y, x]:
            continue
        visited[y, x] = True
        stack.extend([(y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)])

    internal_ratio = 0.0
    if checkerboard and remove_internal_checker:
        gray = rgb.mean(axis=2)
        sat = rgb.max(axis=2) - rgb.min(axis=2)
        internal = possible_bg & (gray > 218) & (sat < 32)
        internal_ratio = internal.mean()
        visited |= internal

    bg_ratio = visited.mean()
    if bg_ratio < 0.03:
        return rgba, False, "未找到可连接边缘的纯色/棋盘格背景"
    alpha = np.where(visited, 0, 255).astype(np.uint8)
    arr[:, :, 3] = alpha
    if internal_ratio > 0:
        return Image.fromarray(arr, "RGBA"), True, f"从边缘和内部棋盘格生成 alpha，背景占比 {bg_ratio:.1%}"
    return Image.fromarray(arr, "RGBA"), True, f"从边缘背景生成 alpha，背景占比 {bg_ratio:.1%}"


def alpha_bbox(img: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = np.asarray(img.convert("RGBA").getchannel("A"))
    ys, xs = np.where(alpha > 12)
    if len(xs) == 0 or len(ys) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def fit_rgba_to_canvas(img: Image.Image, w: int, h: int, *, max_subject: int | None = None,
                       lower_pressed: int = 0) -> Image.Image:
    rgba = img.convert("RGBA")
    bbox = alpha_bbox(rgba)
    if bbox:
        subject = rgba.crop(bbox)
    else:
        subject = rgba
    max_w = max_subject or w
    max_h = max_subject or h
    scale = min(max_w / subject.width, max_h / subject.height, 1.0)
    new_w = max(1, int(subject.width * scale))
    new_h = max(1, int(subject.height * scale))
    subject = subject.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    x = (w - new_w) // 2
    y = (h - new_h) // 2 + lower_pressed
    canvas.alpha_composite(subject, (x, y))
    return canvas


def cover_rgb_to_canvas(img: Image.Image, w: int, h: int) -> Image.Image:
    rgb = img.convert("RGB")
    src_ratio = rgb.width / rgb.height
    dst_ratio = w / h
    if src_ratio > dst_ratio:
        new_h = h
        new_w = int(h * src_ratio)
    else:
        new_w = w
        new_h = int(w / src_ratio)
    resized = rgb.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (new_w - w) // 2
    top = (new_h - h) // 2
    return resized.crop((left, top, left + w, top + h))


def derive_pressed(img: Image.Image) -> Image.Image:
    base = img.convert("RGBA")
    subject = ImageEnhance.Brightness(base).enhance(0.90)
    subject = ImageEnhance.Color(subject).enhance(0.92)
    scaled = subject.resize((int(base.width * 0.97), int(base.height * 0.97)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", base.size, (0, 0, 0, 0))
    canvas.alpha_composite(scaled, ((base.width - scaled.width) // 2, (base.height - scaled.height) // 2 + 3))
    return canvas


def derive_disabled(img: Image.Image) -> Image.Image:
    base = img.convert("RGBA")
    alpha = base.getchannel("A")
    gray = ImageOps.grayscale(base.convert("RGB")).convert("RGBA")
    gray.putalpha(alpha)
    gray = ImageEnhance.Brightness(gray).enhance(0.82)
    gray = ImageEnhance.Contrast(gray).enhance(0.72)
    return gray


def physics_safe(img: Image.Image) -> tuple[bool, str]:
    bbox = alpha_bbox(img)
    if not bbox:
        return False, "无有效透明主体"
    left, top, right, bottom = bbox
    bw, bh = right - left, bottom - top
    margins = [left, top, img.width - right, img.height - bottom]
    if img.size != (512, 512):
        return False, "不是 512x512"
    if bw <= 460 and bh <= 460 and min(margins) >= 26:
        return True, f"bbox {bw}x{bh}，最小边距 {min(margins)}px"
    return False, f"bbox {bw}x{bh}，最小边距 {min(margins)}px，不满足 460/26 规则"


def center_looks_like_baked_checker(img: Image.Image) -> bool:
    rgba = np.asarray(img.convert("RGBA"))
    h, w = rgba.shape[:2]
    cx0, cx1 = int(w * 0.42), int(w * 0.58)
    cy0, cy1 = int(h * 0.42), int(h * 0.58)
    crop = rgba[cy0:cy1, cx0:cx1]
    rgb = crop[:, :, :3].astype(np.int16)
    alpha = crop[:, :, 3]
    gray = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    suspect = (alpha > 220) & (gray > 220) & (gray < 252) & (sat < 28)
    return bool(suspect.mean() > 0.55 and np.std(gray[suspect]) > 1.5)


def save_asset(img: Image.Image, expected: ExpectedAsset) -> None:
    out = ROOT / expected.directory / expected.fileName
    out.parent.mkdir(parents=True, exist_ok=True)
    if expected.format == "JPG":
        img.convert("RGB").save(out, "JPEG", quality=88, optimize=True, progressive=True)
    else:
        img.convert("RGBA").save(out, "PNG", optimize=True)


def final_path(expected: ExpectedAsset) -> Path:
    return ROOT / expected.directory / expected.fileName


def process_one(expected: ExpectedAsset, source: Path | None) -> dict[str, Any]:
    row = {
        "resourceName": expected.assetId,
        "expectedSize": f"{expected.width}x{expected.height}",
        "actualSize": "MISSING",
        "expectedFormat": expected.format,
        "actualFormat": "MISSING",
        "alphaPass": "N/A",
        "checkerboardBaked": "N/A",
        "dynamicTextBaked": "N/A",
        "yizaiPass": "N/A",
        "stateSetConsistent": "N/A",
        "physicsSafePass": "N/A",
        "canAutoFix": "NO",
        "fixAction": "",
        "finalStatus": "MISSING",
        "notes": expected.notes,
    }
    if source is None:
        return row

    info = image_info(source)
    row["actualSize"] = f"{info['size'][0]}x{info['size'][1]}"
    row["actualFormat"] = (info["format"] or source.suffix.replace(".", "")).upper().replace("JPEG", "JPG")
    with Image.open(source) as opened:
        img = opened.copy()

    if expected.assetId in NEEDS_REGEN_OVERRIDES:
        row["checkerboardBaked"] = "YES" if detect_checkerboard(img) else "NO"
        row["yizaiPass"] = "NO" if expected.yizai_required else row["yizaiPass"]
        row["finalStatus"] = "NEEDS_REGEN"
        row["notes"] += f"；{NEEDS_REGEN_OVERRIDES[expected.assetId]}"
        reject_copy(source, expected.assetId)
        return row

    checker = detect_checkerboard(img)
    row["checkerboardBaked"] = "YES" if checker else "NO"
    ocr_text = run_ocr(source)
    dyn = contains_dynamic_digits(ocr_text) if expected.must_not_have_dynamic_text else False
    row["dynamicTextBaked"] = "YES" if dyn else ("NO" if expected.must_not_have_dynamic_text else "N/A")
    if dyn:
        row["finalStatus"] = "NEEDS_REGEN"
        row["notes"] += f"；OCR 疑似动态数字：{ocr_text[:80]}"
        reject_copy(source, expected.assetId)
        return row

    yizai_status = "N/A"
    yizai_note = ""
    if expected.yizai_required:
        yizai_status, yizai_note = yizai_auto_check(source, ocr_text)
        if expected.assetId in VISUAL_YIZAI_PASS:
            yizai_status = "PASS"
            yizai_note = "已人工视觉复核：白熊主体、橙黄色口鼻区、黑鼻子、粗眉、红安全帽和 MAEE 可见"
        row["yizaiPass"] = yizai_status
        if yizai_status == "MANUAL_REVIEW" and expected.assetId == "face_11_yizai":
            # face_11 was visually spot-checkable from the generated source, but keep audit honest.
            row["notes"] += f"；{yizai_note}"
        elif yizai_status == "MANUAL_REVIEW":
            row["finalStatus"] = "MANUAL_REVIEW"
            row["notes"] += f"；{yizai_note}"

    try:
        if expected.format == "JPG":
            fixed = cover_rgb_to_canvas(img, expected.width, expected.height)
            save_asset(fixed, expected)
            row["alphaPass"] = "N/A"
            row["canAutoFix"] = "YES"
            row["fixAction"] = "按目标比例裁切/缩放并输出 JPG"
            row["finalStatus"] = "AUTO_FIXED" if row["actualSize"] != row["expectedSize"] or row["actualFormat"] != "JPG" else "PASS"
            return row

        alpha_pass = bool(info["realAlpha"])
        row["alphaPass"] = "YES" if alpha_pass else "NO"
        rgba, cutout_ok, cutout_note = make_alpha_from_border(
            img,
            checker,
            remove_internal_checker=(expected.kind != "ball" and not expected.yizai_required),
        )
        if expected.alpha and not cutout_ok:
            row["finalStatus"] = "NEEDS_REGEN"
            row["notes"] += f"；透明背景无法可靠生成：{cutout_note}"
            reject_copy(source, expected.assetId)
            return row

        max_subject = 460 if expected.kind == "ball" else None
        fixed = fit_rgba_to_canvas(rgba, expected.width, expected.height, max_subject=max_subject)
        save_asset(fixed, expected)
        row["canAutoFix"] = "YES"
        row["fixAction"] = f"{cutout_note}；等比居中到 {expected.width}x{expected.height}"
        if expected.kind == "ball":
            safe, safe_note = physics_safe(fixed)
            row["physicsSafePass"] = "YES" if safe else "NO"
            row["notes"] += f"；{safe_note}"
            if not safe:
                row["finalStatus"] = "NEEDS_REGEN"
                reject_copy(source, expected.assetId)
                return row
        if expected.assetId in TRANSPARENT_HOLE_ASSETS and center_looks_like_baked_checker(fixed):
            row["finalStatus"] = "NEEDS_REGEN"
            row["notes"] += "；中心透明区域仍检测到不透明棋盘格，无法可靠自动修复"
            out = final_path(expected)
            if out.exists():
                out.unlink()
            reject_copy(source, expected.assetId)
            return row
        if expected.yizai_required and yizai_status == "MANUAL_REVIEW":
            row["finalStatus"] = "MANUAL_REVIEW"
        elif (row["actualSize"] == row["expectedSize"] and row["actualFormat"] == expected.format and alpha_pass):
            row["finalStatus"] = "PASS"
        else:
            row["finalStatus"] = "AUTO_FIXED"
        return row
    except Exception as exc:
        row["finalStatus"] = "NEEDS_REGEN"
        row["notes"] += f"；自动处理失败：{exc}"
        reject_copy(source, expected.assetId)
        return row


def reject_copy(source: Path, asset_id: str) -> None:
    target = ASSETS_REJECTED / f"{asset_id}__{source.name}"
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        shutil.copy2(source, target)


def derive_missing_button_states(expected: list[ExpectedAsset], rows: list[dict[str, Any]]) -> None:
    by_id = {a.assetId: a for a in expected}
    row_by_id = {r["resourceName"]: r for r in rows}
    groups: dict[str, list[ExpectedAsset]] = {}
    for asset in expected:
        if asset.state_group:
            groups.setdefault(asset.state_group, []).append(asset)
    for group, assets in groups.items():
        normal = by_id.get(f"{group}_normal")
        if not normal:
            continue
        normal_file = final_path(normal)
        if not normal_file.exists():
            continue
        base = Image.open(normal_file).convert("RGBA")
        for state, maker in [("pressed", derive_pressed), ("disabled", derive_disabled)]:
            asset = by_id.get(f"{group}_{state}")
            if not asset:
                continue
            row = row_by_id.get(asset.assetId)
            if row and row["finalStatus"] == "MISSING":
                fixed = maker(base)
                save_asset(fixed, asset)
                row["alphaPass"] = "YES"
                row["canAutoFix"] = "YES"
                row["fixAction"] = f"由 {group}_normal 自动派生 {state} 状态"
                row["finalStatus"] = "AUTO_FIXED"
                row["stateSetConsistent"] = "YES"


def reject_unmatched(raw: dict[str, Path], expected: list[ExpectedAsset]) -> list[dict[str, str]]:
    expected_ids = {a.assetId.lower() for a in expected}
    rejected = []
    for stem, path in raw.items():
        if stem not in expected_ids:
            target = ASSETS_REJECTED / f"unmatched__{path.name}"
            if not target.exists():
                shutil.copy2(path, target)
            rejected.append({
                "file": path.name,
                "reason": "文件名不在资源需求表；若是预览图、拼贴图或多状态合图，不能直接接入正式资源",
            })
    return rejected


def write_csv(rows: list[dict[str, Any]]) -> None:
    fieldnames = [
        "resourceName", "expectedSize", "actualSize", "expectedFormat", "actualFormat",
        "alphaPass", "checkerboardBaked", "dynamicTextBaked", "yizaiPass",
        "stateSetConsistent", "physicsSafePass", "canAutoFix", "fixAction",
        "finalStatus", "notes",
    ]
    with (AUDIT_DIR / "asset_audit.csv").open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_manifest(expected: list[ExpectedAsset]) -> None:
    manifest = {
        "designSize": {"width": DESIGN_W, "height": DESIGN_H},
        "sourceTable": str(ROOT / "docs" / "V2.0美术资源需求表_给GPT.md"),
        "coordinateSystem": {
            "source": "top-left",
            "cocosRectFormula": "cocosX = x + w / 2 - 375; cocosY = 667 - (y + h / 2)",
            "cocosPointFormula": "cocosX = x - 375; cocosY = 667 - y",
        },
        "assets": [asdict(a) for a in expected],
        "bundles": {},
        "layout": {
            "home": {
                "homeMachineRect": {"x": 0, "y": 0, "w": 750, "h": 1334},
                "startButtonRect": {"x": 115, "y": 910, "w": 520, "h": 160},
                "taskButtonRect": {"x": 580, "y": 790, "w": 150, "h": 150},
                "rankButtonRect": {"x": 580, "y": 955, "w": 150, "h": 150},
                "shopButtonRect": {"x": 55, "y": 1135, "w": 150, "h": 150},
                "dailyGoalRect": {"x": 50, "y": 720, "w": 220, "h": 110},
                "bestScoreRect": {"x": 50, "y": 840, "w": 220, "h": 110},
                "coinBalanceRect": {"x": 265, "y": 1120, "w": 220, "h": 90},
            },
            "game": {
                "playfieldRect": {"x": 65, "y": 230, "w": 620, "h": 780},
                "playfieldBg": {"x": 65, "y": 230, "w": 620, "h": 780},
                "playfieldFrame": {"x": 50, "y": 210, "w": 650, "h": 820},
                "physicsRect": {"x": 89, "y": 254, "w": 572, "h": 732},
                "warningLine": {"x": 95, "y": 345, "w": 560, "h": 40},
                "warningLineY": 345,
                "dropperAnchor": {"x": 375, "y": 210},
                "controlBar": {"x": 115, "y": 1160, "w": 520, "h": 150},
            },
            "ballPhysics": {
                "canvas": [512, 512],
                "center": [256, 256],
                "maxDiameter": 460,
                "safeMargin": 26,
            },
        },
    }
    for asset in expected:
        manifest["bundles"].setdefault(asset.bundle, []).append(f"{asset.directory.replace('assets_final/', 'assets/')}/{asset.fileName}")
    (AUDIT_DIR / "asset_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def paste_if_exists(canvas: Image.Image, asset_id: str, xy: tuple[int, int], size: tuple[int, int] | None = None,
                    expected_by_id: dict[str, ExpectedAsset] | None = None) -> None:
    if not expected_by_id or asset_id not in expected_by_id:
        return
    path = final_path(expected_by_id[asset_id])
    if not path.exists():
        return
    img = Image.open(path).convert("RGBA")
    if size and img.size != size:
        img = img.resize(size, Image.Resampling.LANCZOS)
    canvas.alpha_composite(img, xy)


def make_previews(expected: list[ExpectedAsset]) -> None:
    expected_by_id = {a.assetId: a for a in expected}
    home = Image.new("RGBA", (750, 1334), (245, 247, 255, 255))
    bg_path = final_path(expected_by_id["home_bg"])
    if bg_path.exists():
        home = Image.open(bg_path).convert("RGBA")
    paste_if_exists(home, "home_machine", (0, 0), expected_by_id=expected_by_id)
    paste_if_exists(home, "panel_daily_goal", (50, 720), expected_by_id=expected_by_id)
    paste_if_exists(home, "panel_best_score", (50, 840), expected_by_id=expected_by_id)
    paste_if_exists(home, "panel_coin_balance", (265, 1120), expected_by_id=expected_by_id)
    paste_if_exists(home, "btn_start_normal", (115, 910), expected_by_id=expected_by_id)
    paste_if_exists(home, "btn_task_normal", (580, 790), (150, 150), expected_by_id=expected_by_id)
    paste_if_exists(home, "btn_rank_normal", (580, 955), (150, 150), expected_by_id=expected_by_id)
    paste_if_exists(home, "btn_shop_normal", (55, 1135), (150, 150), expected_by_id=expected_by_id)
    paste_if_exists(home, "coin_icon", (280, 1117), (64, 64), expected_by_id=expected_by_id)
    home.save(PREVIEW_DIR / "home_preview.png")

    game = Image.new("RGBA", (750, 1334), (238, 246, 255, 255))
    paste_if_exists(game, "game_shell", (0, 0), expected_by_id=expected_by_id)
    paste_if_exists(game, "game_playfield_bg", (65, 230), expected_by_id=expected_by_id)
    paste_if_exists(game, "game_playfield_frame", (50, 210), expected_by_id=expected_by_id)
    paste_if_exists(game, "hud_top", (0, 0), expected_by_id=expected_by_id)
    paste_if_exists(game, "warning_line", (95, 345), expected_by_id=expected_by_id)
    paste_if_exists(game, "dropper_head", (305, 150), expected_by_id=expected_by_id)
    for i, face in enumerate(["face_01_sprout_bead", "face_03_heart_jelly", "face_05_sky_spark", "face_11_yizai"]):
        paste_if_exists(game, face, (160 + i * 100, 520 + (i % 2) * 80), (96, 96), expected_by_id=expected_by_id)
    paste_if_exists(game, "control_bar", (115, 1160), expected_by_id=expected_by_id)
    paste_if_exists(game, "btn_sound_on_normal", (165, 1170), (96, 96), expected_by_id=expected_by_id)
    paste_if_exists(game, "btn_pause_normal", (327, 1170), (96, 96), expected_by_id=expected_by_id)
    paste_if_exists(game, "btn_restart_normal", (489, 1170), (96, 96), expected_by_id=expected_by_id)
    game.save(PREVIEW_DIR / "game_preview.png")

    tiles = [a for a in expected if final_path(a).exists() and a.kind in {"button", "icon", "ui"}][:80]
    tile_w, tile_h = 180, 180
    cols = 5
    rows = max(1, math.ceil(len(tiles) / cols))
    preview = Image.new("RGBA", (cols * tile_w, rows * tile_h), (245, 245, 245, 255))
    for idx, asset in enumerate(tiles):
        img = Image.open(final_path(asset)).convert("RGBA")
        img.thumbnail((150, 130), Image.Resampling.LANCZOS)
        x = (idx % cols) * tile_w + (tile_w - img.width) // 2
        y = (idx // cols) * tile_h + 12
        preview.alpha_composite(img, (x, y))
    preview.save(PREVIEW_DIR / "ui_preview.png")


def write_markdown(rows: list[dict[str, Any]], unmatched: list[dict[str, str]]) -> None:
    counts: dict[str, int] = {}
    for r in rows:
        counts[r["finalStatus"]] = counts.get(r["finalStatus"], 0) + 1
    lines = [
        "# 《合成亿仔 V2.0》美术资产验收报告",
        "",
        "## 汇总",
        "",
    ]
    for key in ["PASS", "AUTO_FIXED", "MANUAL_REVIEW", "NEEDS_REGEN", "MISSING"]:
        lines.append(f"- {key}: {counts.get(key, 0)}")
    lines += [
        f"- 未匹配原图/预览拼贴退回: {len(unmatched)}",
        "",
        "## 关键结论",
        "",
        "- 本次只做资产工程化整理，没有接入游戏代码，也没有改动旧版 `game/wechat-minigame`。",
        "- 大量 PNG 原图实际为 RGB 且烘焙了棋盘格/白底；脚本只在能从边缘可靠识别背景时生成 alpha。",
        "- 多状态合图、预览图、未在需求表中的图片已退回到 `assets_rejected/`，不作为正式资源。",
        "- 亿仔相关资源使用 OCR 和色彩特征做自动初筛；凡自动无法完全确认的，保留人工复核结论。",
        "",
        "## 需优先关注",
        "",
    ]
    for r in rows:
        if r["finalStatus"] in {"NEEDS_REGEN", "MANUAL_REVIEW", "MISSING"}:
            lines.append(f"- `{r['resourceName']}`: {r['finalStatus']}；{r['notes']}")
    lines += ["", "## 已输出预览", "", "- `asset_audit/previews/home_preview.png`", "- `asset_audit/previews/game_preview.png`", "- `asset_audit/previews/ui_preview.png`", ""]
    (AUDIT_DIR / "asset_audit.md").write_text("\n".join(lines), encoding="utf-8")

    missing = [r for r in rows if r["finalStatus"] == "MISSING"]
    miss_lines = ["# 缺失资源清单", ""]
    for r in missing:
        miss_lines.append(f"- `{r['resourceName']}` {r['expectedSize']} {r['expectedFormat']}：{r['notes']}")
    (AUDIT_DIR / "missing_assets.md").write_text("\n".join(miss_lines) + "\n", encoding="utf-8")

    rej_lines = ["# 需要重新生成/退回资源清单", ""]
    for r in rows:
        if r["finalStatus"] in {"NEEDS_REGEN", "MANUAL_REVIEW"}:
            rej_lines.append(f"- `{r['resourceName']}`：{r['finalStatus']}；{r['notes']}")
    if unmatched:
        rej_lines += ["", "## 未匹配原图/拼贴或合图", ""]
        for item in unmatched:
            rej_lines.append(f"- `{item['file']}`：{item['reason']}")
    (AUDIT_DIR / "rejected_assets.md").write_text("\n".join(rej_lines) + "\n", encoding="utf-8")


def main() -> None:
    expected = build_expected_assets()
    ensure_dirs(expected)
    copy_raw_inputs()
    raw = raw_index()
    rows = []
    for asset in expected:
        source = raw.get(asset.assetId.lower())
        rows.append(process_one(asset, source))
    derive_missing_button_states(expected, rows)
    unmatched = reject_unmatched(raw, expected)
    write_csv(rows)
    write_manifest(expected)
    make_previews(expected)
    write_markdown(rows, unmatched)

    print(json.dumps({
        "expected": len(expected),
        "rows": len(rows),
        "unmatched": len(unmatched),
        "statuses": {k: sum(1 for r in rows if r["finalStatus"] == k)
                     for k in ["PASS", "AUTO_FIXED", "MANUAL_REVIEW", "NEEDS_REGEN", "MISSING"]},
        "outputs": {
            "asset_audit": str(AUDIT_DIR),
            "assets_final": str(ASSETS_FINAL),
            "assets_rejected": str(ASSETS_REJECTED),
        },
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
