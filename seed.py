"""Run: uv run python seed.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from datetime import datetime
from sqlmodel import Session, SQLModel, create_engine
from src.models import Bookmark

DB_PATH = "sqlite:///data/markly.db"

BOOKMARKS = [
    # 开发工具
    {"title": "GitHub", "url": "https://github.com", "description": "代码托管与协作平台", "tags": ["开发工具", "代码"], "icon": ""},
    {"title": "MDN Web Docs", "url": "https://developer.mozilla.org", "description": "Web 开发权威参考文档", "tags": ["开发工具", "文档", "前端"], "icon": ""},
    {"title": "Stack Overflow", "url": "https://stackoverflow.com", "description": "开发者问答社区", "tags": ["开发工具", "社区"], "icon": ""},
    {"title": "Can I use", "url": "https://caniuse.com", "description": "前端特性浏览器兼容性查询", "tags": ["开发工具", "前端"], "icon": ""},
    {"title": "Regex101", "url": "https://regex101.com", "description": "在线正则表达式调试工具", "tags": ["开发工具", "工具箱"], "icon": ""},
    {"title": "Carbon", "url": "https://carbon.now.sh", "description": "生成漂亮的代码截图", "tags": ["开发工具", "设计"], "icon": ""},
    # AI 工具
    {"title": "Claude", "url": "https://claude.ai", "description": "Anthropic 的 AI 助手", "tags": ["AI", "工具箱"], "icon": ""},
    {"title": "ChatGPT", "url": "https://chatgpt.com", "description": "OpenAI 的对话 AI", "tags": ["AI", "工具箱"], "icon": ""},
    {"title": "Perplexity", "url": "https://perplexity.ai", "description": "AI 驱动的搜索引擎", "tags": ["AI", "搜索"], "icon": ""},
    {"title": "Midjourney", "url": "https://midjourney.com", "description": "AI 图像生成工具", "tags": ["AI", "设计"], "icon": ""},
    # 设计资源
    {"title": "Figma", "url": "https://figma.com", "description": "UI 设计与原型工具", "tags": ["设计", "工具箱"], "icon": ""},
    {"title": "Dribbble", "url": "https://dribbble.com", "description": "设计师作品灵感社区", "tags": ["设计", "社区"], "icon": ""},
    {"title": "Coolors", "url": "https://coolors.co", "description": "快速生成配色方案", "tags": ["设计", "工具箱"], "icon": ""},
    {"title": "Google Fonts", "url": "https://fonts.google.com", "description": "免费开源字体库", "tags": ["设计", "前端"], "icon": ""},
    {"title": "Lucide Icons", "url": "https://lucide.dev", "description": "简洁美观的开源图标库", "tags": ["设计", "前端"], "icon": ""},
    # 学习资源
    {"title": "freeCodeCamp", "url": "https://freecodecamp.org", "description": "免费编程学习平台", "tags": ["学习", "前端"], "icon": ""},
    {"title": "roadmap.sh", "url": "https://roadmap.sh", "description": "开发者学习路线图", "tags": ["学习", "开发工具"], "icon": ""},
    {"title": "CS50", "url": "https://cs50.harvard.edu", "description": "哈佛大学免费计算机课程", "tags": ["学习"], "icon": ""},
    # 效率工具
    {"title": "Notion", "url": "https://notion.so", "description": "笔记与知识库工具", "tags": ["效率", "工具箱"], "icon": ""},
    {"title": "Linear", "url": "https://linear.app", "description": "现代化项目管理工具", "tags": ["效率", "工具箱"], "icon": ""},
    {"title": "Excalidraw", "url": "https://excalidraw.com", "description": "手绘风格白板工具", "tags": ["效率", "设计", "工具箱"], "icon": ""},
    # 新闻资讯
    {"title": "Hacker News", "url": "https://news.ycombinator.com", "description": "科技与创业资讯社区", "tags": ["资讯", "社区"], "icon": ""},
    {"title": "少数派", "url": "https://sspai.com", "description": "专注高质量数字生活内容", "tags": ["资讯", "效率"], "icon": ""},
    {"title": "InfoQ", "url": "https://infoq.cn", "description": "软件开发技术资讯", "tags": ["资讯", "开发工具"], "icon": ""},
]


def main():
    engine = create_engine(DB_PATH, connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    Path("data").mkdir(exist_ok=True)

    with Session(engine) as session:
        for data in BOOKMARKS:
            bm = Bookmark(**data, created_at=datetime.now(), updated_at=datetime.now())
            session.add(bm)
        session.commit()
    print(f"✓ 已导入 {len(BOOKMARKS)} 条书签")


if __name__ == "__main__":
    main()
