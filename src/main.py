import logging
import uuid
from contextlib import asynccontextmanager
from typing import Annotated, Generator, TypedDict, cast

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel, create_engine, select

from .models import Bookmark, BookmarkPublic, BookmarkCreate, BookmarkUpdate

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




# ── DB dependency ─────────────────────────────────────────────────────────────

def get_db(request: Request) -> Generator[Session, None, None]:
    state: State = cast(State, request.state)
    with Session(state.engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_db)]

# ── Pages ─────────────────────────────────────────────────────────────────────

@app.get("/")
def get_index(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.get("/admin")
def get_admin(request: Request):
    return templates.TemplateResponse(request, "admin.html")


# ── API ───────────────────────────────────────────────────────────────────────

@app.get("/api/bookmarks", response_model=list[BookmarkPublic])
def list_bookmarks(
    session: SessionDep,
    tag: str | None = None,
    q: str | None = None,
):
    stmt = select(Bookmark)
    if tag:
        stmt = stmt.where(Bookmark.tags.contains([tag]))
    if q:
        stmt = stmt.where(Bookmark.title.contains(q) | Bookmark.description.contains(q) | Bookmark.url.contains(q))
    stmt = stmt.order_by(Bookmark.order.asc(), Bookmark.created_at.desc())
    bookmarks = session.exec(stmt).all()
    return bookmarks


@app.get("/api/bookmarks/{bookmark_id}", response_model=BookmarkPublic)
def get_bookmark(bookmark_id: uuid.UUID, session: SessionDep):
    bm = session.get(Bookmark, bookmark_id)
    if not bm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="书签不存在")
    return bm


@app.post("/api/bookmarks", response_model=BookmarkPublic, status_code=status.HTTP_201_CREATED)
def create_bookmark(data: BookmarkCreate, session: SessionDep):
    bm = Bookmark.model_validate(data)
    session.add(bm)
    session.commit()
    session.refresh(bm)
    return bm


@app.put("/api/bookmarks/{bookmark_id}", response_model=BookmarkPublic)
def update_bookmark(bookmark_id: uuid.UUID, data: BookmarkUpdate, session: SessionDep):
    bm = session.get(Bookmark, bookmark_id)
    if not bm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="书签不存在")
    raw = data.model_dump(exclude_none=True)
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无更新字段")
    bm.sqlmodel_update(raw)
    session.add(bm)
    session.commit()
    session.refresh(bm)
    return bm


@app.delete("/api/bookmarks/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark(bookmark_id: uuid.UUID, session: SessionDep):
    bm = session.get(Bookmark, bookmark_id)
    if not bm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="书签不存在")
    session.delete(bm)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
