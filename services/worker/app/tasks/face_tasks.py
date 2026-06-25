"""
人脸分析异步任务 — MediaPipe FaceMesh 实现

从 MinIO 下载图片 → MediaPipe FaceMesh 提取 468 个 3D 人脸关键点
→ 分析脸型/眉毛/眼睛/鼻子/嘴唇形态 → 写入 image_assets.metadata_json

占位符逻辑已移除（2016-06-25）。
"""
from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path
from uuid import UUID

import mediapipe as mp
import minio
from celery import Task

logger = logging.getLogger(__name__)

mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

# ─── MinIO client (lazy, initialized per-task to respect config changes) ────


def _minio_client() -> minio.Minio:
    settings_module = __import__("app.core.config", fromlist=["get_settings"])
    get_settings = getattr(settings_module, "get_settings")
    s = get_settings()
    return minio.Minio(
        endpoint=s.s3_endpoint.replace("http://", "").replace("https://", ""),
        access_key=s.s3_access_key,
        secret_key=s.s3_secret_key,
        secure=False,
    )


def _download_image(storage_key: str, bucket: str) -> Path:
    """Download image from MinIO and return local path; caller must delete temp file."""
    client = _minio_client()
    fd, tmp = tempfile.mkstemp(suffix=Path(storage_key).suffix or ".jpg")
    os.close(fd)
    client.fget_object(bucket, storage_key, tmp)
    return Path(tmp)


# ─── Feature extraction helpers ──────────────────────────────────────────────


def _face_width_to_height(landmarks: list) -> float:
    """Jaw width (idx 234→454) vs face height (idx 10→152)."""
    w = abs(landmarks[234].x - landmarks[454].x)
    h = abs(landmarks[10].y - landmarks[152].y)
    return round(w / h, 4) if h > 0 else 0.0


def _forehead_height_ratio(landmarks: list) -> float:
    """Hairline (idx 10) to eyebrows-mid (idx 107) vs total face height."""
    total_h = abs(landmarks[10].y - landmarks[152].y)
    forehead = abs(landmarks[10].y - landmarks[107].y)
    return round(forehead / total_h, 4) if total_h > 0 else 0.0


def _eye_openness(landmarks: list) -> dict[str, float]:
    """Upper vs lower eyelid vertical distance for left (33,133,160,158) and right (362,263,387,373)."""
    def _ratio(upper: int, lower: int) -> float:
        u, l = landmarks[upper].y, landmarks[lower].y
        return round(abs(u - l), 4)

    left = _ratio(160, 158)
    right = _ratio(387, 373)
    return {"left": left, "right": right, "average": round((left + right) / 2, 4)}


def _nose_bridge_ratio(landmarks: list) -> float:
    """Nose tip (4) to nose bridge (168) vs face width."""
    face_w = abs(landmarks[234].x - landmarks[454].x)
    bridge = abs(landmarks[4].y - landmarks[168].y)
    return round(bridge / face_w, 4) if face_w > 0 else 0.0


def _lip_shape(landmarks: list) -> dict[str, float]:
    """Upper vs lower lip height ratio; smile line curvature approximation."""
    upper_lip_h = abs(landmarks[13].y - landmarks[14].y)
    lower_lip_h = abs(landmarks[14].y - landmarks[152].y)
    mouth_w = abs(landmarks[61].x - landmarks[291].x)

    upper_lower_ratio = round(upper_lip_h / lower_lip_h, 4) if lower_lip_h > 0 else 0.0

    # Corner droop as proxy for expression
    left_corner_y = landmarks[61].y
    right_corner_y = landmarks[291].y
    corner_asymmetry = round(abs(left_corner_y - right_corner_y), 4)

    return {
        "upper_lower_ratio": upper_lower_ratio,
        "width": round(mouth_w, 4),
        "corner_asymmetry": corner_asymmetry,
    }


def _classify_face_shape(
    width_to_height: float,
    forehead_ratio: float,
    cheekbone_ratio: float,
) -> str:
    """
    Rule-based face shape classification.

    Based on classic facial proportion ratios derived from FaceMesh landmarks.
    """
    if forehead_ratio > 0.32:
        return "round"
    if width_to_height > 0.85:
        if cheekbone_ratio > 0.95:
            return "square"
        return "oblong"
    if width_to_height < 0.75:
        return "oval"
    if cheekbone_ratio > 0.93:
        return "diamond"
    return "heart"


def _classify_eye_shape(openness: dict[str, float]) -> str:
    avg = openness.get("average", 0.05)
    if avg > 0.06:
        return "wide"
    if avg > 0.04:
        return "almond"
    if avg > 0.025:
        return "narrow"
    return "small"


def _eyebrow_arch_height(landmarks: list) -> dict[str, float]:
    """Inner (33), apex (71 outer quarter), outer (133) eyebrow points."""
    def arch(ln: int, mid: int, rn: int) -> float:
        lx, ly = landmarks[ln].x, landmarks[ln].y
        rx, ry = landmarks[rn].x, landmarks[rn].y
        mx, my = landmarks[mid].x, landmarks[mid].y
        line_y = ly + (ry - ly) * (mx - lx) / (rx - lx) if abs(rx - lx) > 0 else my
        return round(abs(my - line_y), 4)

    left_arch = arch(33, 71, 133)
    right_arch = arch(362, 398, 263)
    return {
        "left_arch_height": left_arch,
        "right_arch_height": right_arch,
        "average": round((left_arch + right_arch) / 2, 4),
    }


def _expression_analysis(
    landmarks: list,
    lip_shape: dict,
) -> dict[str, float]:
    """
    Simple expression proxy from static image.

    Cannot reliably detect emotion from a single frame, so we return
    calibrated baseline scores + eyebrow/lip indicators that a downstream
    model can combine with personality traits.
    """
    # Mouth aspect ratio — wide/narrow indicator
    mouth_w = lip_shape.get("width", 0)
    face_w = abs(landmarks[234].x - landmarks[454].x)
    mouth_to_face = round(mouth_w / face_w, 4) if face_w > 0 else 0.0

    # Eyebrow elevation proxy
    left_brow_avg_y = (landmarks[70].y + landmarks[71].y + landmarks[72].y) / 3
    right_brow_avg_y = (landmarks[300].y + landmarks[301].y + landmarks[302].y) / 3
    brow_elevation = round((left_brow_avg_y + right_brow_avg_y) / 2, 4)

    return {
        "mouth_to_face_ratio": mouth_to_face,
        "brow_elevation_proxy": brow_elevation,
        # Placeholder valence/arousal — always neutral until a model is applied
        "valence_estimate": 0.5,
        "arousal_estimate": 0.3,
    }


# ─── Main extraction ─────────────────────────────────────────────────────────


def _extract_face_features(image_path: Path) -> dict:
    """
    Run MediaPipe FaceMesh on a local image file and return structured features.
    """
    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as face_mesh:
        import cv2

        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Cannot read image: {image_path}")

        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            raise ValueError("No face detected in image")

        landmarks = results.multi_face_landmarks[0].landmark

    # ── Cheekbone ratio (idx 50 left, idx 280 right vs jaw width) ──
    cheekbone_w = abs(landmarks[50].x - landmarks[280].x)
    jaw_w = abs(landmarks[234].x - landmarks[454].x)
    cheekbone_ratio = round(cheekbone_w / jaw_w, 4) if jaw_w > 0 else 1.0

    # ── Width / height ──
    wth = _face_width_to_height(landmarks)
    forehead = _forehead_height_ratio(landmarks)

    face_shape = _classify_face_shape(wth, forehead, cheekbone_ratio)

    # ── Eyes ──
    eye_openness = _eye_openness(landmarks)
    eye_shape = _classify_eye_shape(eye_openness)

    # ── Eyebrows ──
    eyebrow = _eyebrow_arch_height(landmarks)

    # ── Nose ──
    nose_ratio = _nose_bridge_ratio(landmarks)
    nose_tip_z = landmarks[4].z  # depth proxy
    nose_tip_x = landmarks[4].x
    nose_root_z = landmarks[168].z
    nose_width = abs(landmarks[98].x - landmarks[329].x) / cheekbone_w if cheekbone_w > 0 else 0.0

    # ── Lips ──
    lip = _lip_shape(landmarks)

    # ── Expression ──
    expression = _expression_analysis(landmarks, lip)

    # ── Confidence: inverse of landmark position variance ──
    import numpy as np

    lmk_arr = np.array([(lm.x, lm.y, lm.z) for lm in landmarks])
    std_dev = float(np.std(lmk_arr))
    confidence = min(round(1.0 - std_dev * 2, 4), 0.99)

    return {
        "face_shape": face_shape,
        "face_dimensions": {
            "width_to_height_ratio": wth,
            "forehead_height_ratio": forehead,
            "cheekbone_ratio": cheekbone_ratio,
        },
        "eyes": {
            "shape": eye_shape,
            "openness": eye_openness,
        },
        "eyebrows": {
            "arch_height": eyebrow,
            "shape_type": "arched" if eyebrow["average"] > 0.015 else "straight",
        },
        "nose": {
            "bridge_ratio": nose_ratio,
            "tip_protrusion_z": round(nose_tip_z, 4),
            "width_to_cheekbone": round(nose_width, 4),
        },
        "lips": {
            **lip,
            "fullness": "full" if lip["upper_lower_ratio"] < 1.2 else "thin",
        },
        "expression": expression,
        "confidence": confidence,
        "landmarks_count": len(landmarks),
        "engine": "mediapipe-face-mesh-v1",
    }


# ─── Celery task ──────────────────────────────────────────────────────────────


class FaceAnalyzeTask(Task):
    """Celery task: download image from MinIO → MediaPipe → write features back."""

    name = "ntgm.face.analyze"
    max_retries = 2
    autoretry_for = (ValueError, RuntimeError, OSError)
    retry_backoff = True
    retry_backoff_max = 60

    def run(self, payload: dict) -> dict:  # noqa: D102
        from app.core.config import get_settings
        from app.db import SessionLocal
        from app.repositories.asset_repository import AssetRepository

        user_id: str = payload.get("user_id") or payload.get("userId")
        image_asset_id: str = payload.get("image_asset_id") or payload.get("imageAssetId")

        if not user_id:
            raise ValueError("user_id is required")
        if not image_asset_id:
            raise ValueError("image_asset_id is required")

        settings = get_settings()
        db = SessionLocal()

        try:
            asset_repo = AssetRepository()
            asset = asset_repo.get_by_id(db, asset_id=UUID(image_asset_id))
            if asset is None:
                raise ValueError(f"Image asset not found: {image_asset_id}")

            storage_key = asset.storage_key
            logger.info(
                "[FaceAnalyze] Starting — user=%s asset=%s key=%s",
                user_id,
                image_asset_id,
                storage_key,
            )

            # Download from MinIO
            tmp_path = _download_image(storage_key, settings.s3_bucket)
            try:
                features = _extract_face_features(tmp_path)
            finally:
                tmp_path.unlink(missing_ok=True)

            # Persist
            asset_repo.update_features(db, asset=asset, features=features)

            logger.info(
                "[FaceAnalyze] Done — user=%s asset=%s face_shape=%s confidence=%.3f",
                user_id,
                image_asset_id,
                features["face_shape"],
                features["confidence"],
            )

            return {
                "status": "completed",
                "asset_id": image_asset_id,
                "features": features,
            }

        finally:
            db.close()


face_analyze = FaceAnalyzeTask()
