import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Depends, Query, HTTPException, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import select, func, text, desc, cast, Date

from config import settings
from database import engine, AsyncSessionLocal, get_db
from models import Base, Rule, Reply, BotLog, BotState
from fb_client import FBClient
from bot import run_auto_reply, import_json_data

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("fb-api")

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"
PARENT_DIR = BASE_DIR.parent

fb = FBClient(settings.FACEBOOK_ACCESS_TOKEN, settings.FACEBOOK_PAGE_ID)
_bot_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    log.info("DB tables ready")

    # import existing data if any
    rules_file = BASE_DIR / "facebook_automation.json"
    state_file = BASE_DIR / ".replied_comments.json"
    async with AsyncSessionLocal() as session:
        await import_json_data(session, str(rules_file), str(state_file))

    # start bot if configured
    if settings.START_BOT:
        global _bot_task
        _bot_task = asyncio.create_task(_run_bot_loop())
        log.info("Bot started in background")

    yield

    # shutdown
    if _bot_task:
        _bot_task.cancel()
    await fb.close()
    await engine.dispose()


app = FastAPI(title="FB Dashboard", lifespan=lifespan)
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


async def _run_bot_loop():
    while True:
        try:
            await run_auto_reply(fb)
        except Exception as e:
            log.error(f"Bot loop err: {e}")
        await asyncio.sleep(settings.BOT_INTERVAL_SECONDS)


# ---- Pages ----

@app.get("/", response_class=HTMLResponse)
async def dashboard_page(request: Request):
    static_index = STATIC_DIR / "index.html"
    if static_index.exists():
        return HTMLResponse(static_index.read_text(encoding="utf-8"))
    html_path = TEMPLATES_DIR / "index.html"
    if html_path.exists():
        return HTMLResponse(html_path.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>SmartBot Dashboard</h1><p>Loading...</p>")


# ---- API: Stats ----

@app.get("/api/stats")
async def get_stats(db=Depends(get_db)):
    total_replies = await db.scalar(select(func.count(Reply.id))) or 0
    today = datetime.utcnow().date()
    today_replies = 0
    try:
        all_replies = await db.execute(select(Reply.created_at, Reply.id))
        today_replies = sum(1 for r in all_replies if r[0] and r[0].date() == today)
    except Exception:
        today_replies = 0

    top = None
    try:
        stmt = select(Reply.rule_id, func.count(Reply.id).label("cnt")).group_by(Reply.rule_id).order_by(desc("cnt")).limit(1)
        top = (await db.execute(stmt)).first()
    except Exception:
        pass

    fan_count = 0
    try:
        fan_count = await fb.get_page_fan_count()
    except Exception:
        pass

    chart_data = {}
    try:
        all_replies = await db.execute(select(Reply.created_at).where(Reply.created_at >= datetime.utcnow() - timedelta(days=7)))
        for row in all_replies:
            if row[0]:
                d = str(row[0].date())
                chart_data[d] = chart_data.get(d, 0) + 1
    except Exception:
        pass

    return {
        "total_replies": total_replies,
        "today_replies": today_replies,
        "fan_count": fan_count,
        "top_rule_id": int(top[0]) if top and top[0] is not None else None,
        "chart": chart_data,
    }


# ---- API: Rules ----

@app.get("/api/rules")
async def list_rules(db=Depends(get_db)):
    rows = await db.execute(select(Rule).order_by(Rule.id))
    return [{
        "id": r.id,
        "name": r.name,
        "keywords": r.keywords,
        "reply_template": r.reply_template,
        "enabled": r.enabled,
        "description": r.description,
    } for r in rows.scalars().all()]


@app.post("/api/rules")
async def create_rule(
    name: str = Form(...), keywords: str = Form(...),
    reply_template: str = Form(...), description: str = Form(""),
    db=Depends(get_db)
):
    kw_list = [k.strip() for k in keywords.split(",") if k.strip()]
    rule = Rule(name=name, keywords=kw_list, reply_template=reply_template, description=description)
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {"id": rule.id}


@app.put("/api/rules/{rule_id}")
async def update_rule(
    rule_id: int, name: str = Form(...), keywords: str = Form(...),
    reply_template: str = Form(...), description: str = Form(""),
    db=Depends(get_db)
):
    rule = await db.get(Rule, rule_id)
    if not rule:
        raise HTTPException(404, "Rule not found")
    rule.name = name
    rule.keywords = [k.strip() for k in keywords.split(",") if k.strip()]
    rule.reply_template = reply_template
    rule.description = description
    await db.commit()
    return {"ok": True}


@app.delete("/api/rules/{rule_id}")
async def delete_rule(rule_id: int, db=Depends(get_db)):
    rule = await db.get(Rule, rule_id)
    if not rule:
        raise HTTPException(404, "Rule not found")
    await db.delete(rule)
    await db.commit()
    return {"ok": True}


@app.post("/api/rules/{rule_id}/toggle")
async def toggle_rule(rule_id: int, db=Depends(get_db)):
    rule = await db.get(Rule, rule_id)
    if not rule:
        raise HTTPException(404, "Rule not found")
    rule.enabled = not rule.enabled
    await db.commit()
    return {"enabled": rule.enabled}


# ---- API: Replies ----

@app.get("/api/replies")
async def list_replies(page: int = Query(1), per_page: int = Query(20), db=Depends(get_db)):
    offset = (page - 1) * per_page
    total = await db.scalar(select(func.count(Reply.id)))
    rows = await db.execute(
        select(Reply).order_by(desc(Reply.created_at)).offset(offset).limit(per_page)
    )
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": r.id,
            "commenter_name": r.commenter_name,
            "comment_text": r.comment_text,
            "reply_text": r.reply_text,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in rows.scalars().all()]
    }


# ---- API: Posts ----

@app.get("/api/posts")
async def list_posts():
    posts = await fb.get_page_posts(10)
    return [{
        "id": p["id"],
        "message": p.get("message", "")[:200],
        "created_time": p.get("created_time", ""),
    } for p in posts]


@app.post("/api/publish")
async def publish_post(message: str = Form(...)):
    result = await fb.post_to_page(message)
    return result or {"error": "Failed to post"}


# ---- API: Bot Control ----

@app.get("/api/bot/status")
async def bot_status():
    return {
        "running": _bot_task is not None and not _bot_task.done(),
        "interval": settings.BOT_INTERVAL_SECONDS,
    }


@app.post("/api/bot/restart")
async def restart_bot():
    global _bot_task
    if _bot_task:
        _bot_task.cancel()
    _bot_task = asyncio.create_task(_run_bot_loop())
    return {"ok": True}


# ---- API: Logs ----

@app.get("/api/logs")
async def get_logs(limit: int = Query(50), db=Depends(get_db)):
    rows = await db.execute(
        select(BotLog).order_by(desc(BotLog.created_at)).limit(limit)
    )
    return [{
        "level": r.level,
        "message": r.message,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in rows.scalars().all()]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
