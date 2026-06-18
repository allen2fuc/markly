import uuid
from datetime import datetime
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import UUID, String, DateTime, JSON, Integer


class Bookmark(SQLModel, table=True):

    __tablename__ = "bookmarks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, sa_column=Column(UUID, primary_key=True))
    title: str = Field(sa_column=Column(String, nullable=False, comment="书签标题"))
    url: str = Field(sa_column=Column(String, nullable=False, comment="书签链接"))
    description: str = Field(default="", sa_column=Column(String, nullable=True, comment="描述"))
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False, comment="标签列表"))
    icon: str = Field(default="", sa_column=Column(String, nullable=True, comment="图标 URL"))
    order: int = Field(default=0, sa_column=Column(Integer, nullable=False, server_default="0", comment="显示顺序"))
    created_at: datetime = Field(sa_column=Column(DateTime, nullable=False, default=datetime.now))
    updated_at: datetime = Field(sa_column=Column(DateTime, nullable=False, default=datetime.now))
