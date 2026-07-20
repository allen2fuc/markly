import uuid
from datetime import datetime
from typing import Annotated, Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import UUID, DateTime, JSON



# ── Schemas ──────────────────────────────────────────────────────────────────

class BookmarkBase(SQLModel):
    title: Annotated[str, Field(description="书签标题")]
    url: Annotated[str, Field(description="书签链接")]
    description: Annotated[str, Field(description="描述")]
    tags: Annotated[list[str], Field(default_factory=list, description="标签列表")]
    icon: Annotated[str, Field(description="图标 URL（留空自动使用 favicon）")]
    order: Annotated[int, Field(description="显示顺序，数字越小越靠前")]


class BookmarkPublic(BookmarkBase):
    id: Annotated[uuid.UUID, Field(description="书签 ID")]
    created_at: Annotated[datetime, Field(description="创建时间")]
    updated_at: Annotated[datetime, Field(description="更新时间")]

class BookmarkCreate(BookmarkBase):
    pass

class BookmarkUpdate(BookmarkBase):
    title: Optional[str]
    url: Optional[str]
    description: Optional[str]
    tags: Optional[list[str]]
    icon: Optional[str]
    order: Optional[int]


class Bookmark(BookmarkBase, table=True):

    __tablename__ = "bookmarks"

    id: Annotated[uuid.UUID, Field(default_factory=uuid.uuid4, sa_column=Column(UUID, primary_key=True, comment="书签 ID"))]
    tags: Annotated[list[str], Field(sa_column=Column(JSON, nullable=False, comment="标签列表"))]
    created_at: Annotated[datetime, Field(default_factory=datetime.now, sa_column=Column(DateTime, nullable=False, comment="创建时间"))]
    updated_at: Annotated[datetime, Field(default_factory=datetime.now, sa_column=Column(DateTime, nullable=False, comment="更新时间"))]
