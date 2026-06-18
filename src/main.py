import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Annotated, Generator, Optional, TypedDict, cast

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, ConfigDict, Field
from pydantic_settings import BaseSettings
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel, create_engine, select

from .models import Bookmark

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    DB_PATH: str = "sqlite:///data/markly.db"
    DB_ECHO: bool = False

    model_config = ConfigDict(env_file=".env")


settings = Settings()
logger.info(f"Database: {settings.DB_PATH}")


class State(TypedDict):
    engine: Engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    engine = create_engine(settings.DB_PATH, echo=settings.DB_ECHO, connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    logger.info("Application started")
    yield State(engine=engine)
    engine.dispose()
    logger.info("Application stopped")


app = FastAPI(title="Markly", description="个人书签与搜索中心", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")


# ── Schemas ──────────────────────────────────────────────────────────────────

class BookmarkBase(BaseModel):
    title: Annotated[str, Field(description="书签标题")]
    url: Annotated[str, Field(description="书签链接")]
    description: Annotated[str, Field(default="", description="描述")]
    tags: Annotated[list[str], Field(default_factory=list, description="标签列表")]
    icon: Annotated[str, Field(default="", description="图标 URL（留空自动使用 favicon）")]
    order: Annotated[int, Field(default=0, description="显示顺序，数字越小越靠前")]


class BookmarkRead(BookmarkBase):
    id: Annotated[uuid.UUID, Field(description="书签 ID")]
    created_at: Annotated[datetime, Field(description="创建时间")]
    updated_at: Annotated[datetime, Field(description="更新时间")]


class BookmarkCreate(BookmarkBase):
    pass


class BookmarkUpdate(BaseModel):
    title: Annotated[Optional[str], Field(default=None, description="书签标题")]
    url: Annotated[Optional[str], Field(default=None, description="书签链接")]
    description: Annotated[Optional[str], Field(default=None, description="描述")]
    tags: Annotated[Optional[list[str]], Field(default=None, description="标签列表")]
    icon: Annotated[Optional[str], Field(default=None, description="图标 URL")]
    order: Annotated[Optional[int], Field(default=None, description="显示顺序")]


# ── DB dependency ─────────────────────────────────────────────────────────────

def get_db(request: Request) -> Generator[Session, None, None]:
    state: State = cast(State, request.state)
    with Session(state.engine) as session:
        yield session


# ── Pages ─────────────────────────────────────────────────────────────────────

@app.get("/")
def get_index(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.get("/admin")
def get_admin(request: Request):
    return templates.TemplateResponse(request, "admin.html")


# ── API ───────────────────────────────────────────────────────────────────────

@app.get("/api/bookmarks", response_model=list[BookmarkRead])
def list_bookmarks(
    tag: str | None = None,
    q: str | None = None,
    session: Session = Depends(get_db),
):
    stmt = select(Bookmark)
    if tag:
        stmt = stmt.where(Bookmark.tags.contains([tag]))
    if q:
        stmt = stmt.where(Bookmark.title.contains(q) | Bookmark.description.contains(q) | Bookmark.url.contains(q))
    stmt = stmt.order_by(Bookmark.order.asc(), Bookmark.created_at.desc())
    return session.exec(stmt).all()


@app.get("/api/bookmarks/{bookmark_id}", response_model=BookmarkRead)
def get_bookmark(bookmark_id: uuid.UUID, session: Session = Depends(get_db)):
    bm = session.get(Bookmark, bookmark_id)
    if not bm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="书签不存在")
    return bm


@app.post("/api/bookmarks", response_model=BookmarkRead, status_code=status.HTTP_201_CREATED)
def create_bookmark(data: BookmarkCreate, session: Session = Depends(get_db)):
    bm = Bookmark(**data.model_dump())
    session.add(bm)
    session.commit()
    session.refresh(bm)
    return bm


@app.put("/api/bookmarks/{bookmark_id}", response_model=BookmarkRead)
def update_bookmark(bookmark_id: uuid.UUID, data: BookmarkUpdate, session: Session = Depends(get_db)):
    bm = session.get(Bookmark, bookmark_id)
    if not bm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="书签不存在")
    raw = data.model_dump(exclude_none=True)
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无更新字段")
    for key, value in raw.items():
        setattr(bm, key, value)
    bm.updated_at = datetime.now()
    session.commit()
    session.refresh(bm)
    return bm


@app.delete("/api/bookmarks/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark(bookmark_id: uuid.UUID, session: Session = Depends(get_db)):
    bm = session.get(Bookmark, bookmark_id)
    if not bm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="书签不存在")
    session.delete(bm)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
