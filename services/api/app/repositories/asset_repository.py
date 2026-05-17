from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.image_asset import ImageAsset


class AssetRepository:
    def create_asset(
        self,
        db: Session,
        *,
        user_id: UUID,
        asset_type: str,
        storage_key: str,
        content_type: str | None,
        metadata: dict[str, Any],
    ) -> ImageAsset:
        asset = ImageAsset(
            user_id=user_id,
            asset_type=asset_type,
            storage_key=storage_key,
            content_type=content_type,
            metadata_json=metadata,
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset

    def get_by_storage_key(self, db: Session, *, storage_key: str) -> ImageAsset | None:
        return db.scalar(select(ImageAsset).where(ImageAsset.storage_key == storage_key))

    def get_by_id(self, db: Session, *, asset_id: UUID) -> ImageAsset | None:
        return db.get(ImageAsset, asset_id)

    def update_features(self, db: Session, *, asset: ImageAsset, features: dict) -> ImageAsset:
        asset.metadata_json = {**(asset.metadata_json or {}), "face_features": features}
        db.commit()
        db.refresh(asset)
        return asset

