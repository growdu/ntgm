from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.archive import (
    ArchiveChangesResponse,
    ArchiveTimelineItem,
    ArchiveTimelineResponse,
    ProfileChangeLogItem,
)
from app.services.archive_service import ArchiveService
from app.services.profile_change_service import ProfileChangeService
from app.services.user_service import UserService

router = APIRouter(prefix="/archive", tags=["archive"])


@router.get("/timeline", response_model=ArchiveTimelineResponse)
def get_archive_timeline(
    limit: int = Query(default=20, ge=1, le=100),
    types: str | None = Query(default=None, description="Comma-separated timeline item types"),
    profileVersion: int | None = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    user_service: UserService = Depends(UserService),
    archive_service: ArchiveService = Depends(ArchiveService),
) -> ArchiveTimelineResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    item_types = {item.strip() for item in types.split(",") if item.strip()} if types else None
    items = archive_service.build_timeline(
        db,
        user_id=user.id,
        limit=limit,
        item_types=item_types,
        profile_version=profileVersion,
    )
    return ArchiveTimelineResponse(
        items=[
            ArchiveTimelineItem(
                itemType=item["itemType"],
                occurredAt=item["occurredAt"],
                title=item["title"],
                summary=item["summary"],
                profileVersion=item["profileVersion"],
                metadata=item["metadata"],
            )
            for item in items
        ]
    )


@router.get("/changes", response_model=ArchiveChangesResponse)
def list_profile_changes(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    user_service: UserService = Depends(UserService),
    change_service: ProfileChangeService = Depends(ProfileChangeService),
) -> ArchiveChangesResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    changes = change_service.list_recent_changes(db, user_id=user.id, limit=limit)
    return ArchiveChangesResponse(
        items=[
            ProfileChangeLogItem(
                changeId=item.id,
                fromVersion=item.from_version,
                toVersion=item.to_version,
                changedDimensions=item.changed_dimensions,
                reasonSummary=item.reason_summary,
                createdAt=item.created_at,
            )
            for item in changes
        ]
    )
