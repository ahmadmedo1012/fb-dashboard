import asyncio
import json
import logging
from typing import Any
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from database import AsyncSessionLocal
from models import Rule, Reply, BotLog, BotState
from fb_client import FBClient
from config import settings

log = logging.getLogger("fb-bot")


def match_rule(text: str, rules: list[dict]) -> str | None:
    text_lower = text.lower().strip()
    for rule in rules:
        if not rule.get("enabled", True):
            continue
        for kw in rule.get("keywords", []):
            if not kw:
                return rule.get("reply_template")
            if kw.lower() in text_lower:
                return rule.get("reply_template")
    return None


async def add_log(session, level: str, message: str):
    session.add(BotLog(level=level, message=message))
    await session.commit()


async def load_replied_ids(session) -> set:
    stmt = select(Reply.fb_comment_id)
    result = await session.execute(stmt)
    return {row[0] for row in result}


async def import_json_data(session, rules_file: str, state_file: str):
    count = await session.scalar(select(text("count(*) from rules")))
    if count == 0:
        import json
        with open(rules_file, encoding="utf-8") as f:
            data = json.load(f)
        for r in data.get("rules", []):
            session.add(Rule(
                name=r["id"],
                keywords=r["keywords"],
                reply_template=r["reply"],
                description=r.get("description", ""),
            ))
        await session.commit()
        log.info(f"Imported {len(data['rules'])} rules from JSON")

    import os
    if os.path.exists(state_file):
        pass


async def run_auto_reply(fb: FBClient):
    async with AsyncSessionLocal() as session:
        try:
            rules_data = await _load_rules(session)
            if not rules_data:
                return

            replied_ids = await load_replied_ids(session)
            posts = await fb.get_page_posts(10)

            for post in posts:
                pid = post["id"]
                comments = await fb.get_post_comments(pid)
                for c in comments:
                    cid = c["id"]
                    msg = c.get("message", "").strip()
                    if not msg or cid in replied_ids:
                        continue

                    # SKIP comments from the page itself (bot's own replies)
                    from_id = str(c.get("from", {}).get("id", ""))
                    if from_id == str(fb.page_id):
                        continue

                    # SKIP recent comments (<3s old)
                    created = c.get("created_time", "")
                    if created:
                        try:
                            from datetime import datetime, timezone
                            t = datetime.fromisoformat(created.replace("Z", "+00:00"))
                            if (datetime.now(timezone.utc) - t).total_seconds() < 3:
                                continue
                        except Exception:
                            pass

                    reply_text = match_rule(msg, rules_data)
                    if not reply_text:
                        continue

                    name = fb.get_first_name(c)
                    final_reply = reply_text.replace("{name}", name)

                    # POST reply to Facebook FIRST
                    result = await fb.reply_to_comment(cid, final_reply)
                    if not result:
                        log.error(f"API rejected reply to {cid}")
                        continue

                    # THEN save to DB
                    replied_ids.add(cid)
                    session.add(Reply(
                        fb_comment_id=cid,
                        fb_post_id=pid,
                        commenter_name=name,
                        comment_text=msg,
                        reply_text=final_reply,
                    ))
                    try:
                        await session.commit()
                        log.info(f"Replied to {name}: {msg[:40]}")
                    except IntegrityError:
                        await session.rollback()
                        log.info(f"Duplicate prevented for comment {cid}")

                    await asyncio.sleep(0.5)

        except Exception as e:
            log.error(f"Bot error: {e}", exc_info=True)
            await add_log(session, "ERROR", str(e))


async def _load_rules(session) -> list[dict]:
    stmt = select(Rule)
    result = await session.execute(stmt)
    return [
        {
            "id": r.id,
            "keywords": r.keywords,
            "reply_template": r.reply_template,
            "enabled": r.enabled,
        }
        for r in result.scalars().all()
    ]


async def bot_worker():
    log.info("FB Auto-Reply Bot started")
    fb = FBClient(settings.FACEBOOK_ACCESS_TOKEN, settings.FACEBOOK_PAGE_ID)

    async with AsyncSessionLocal() as session:
        await import_json_data(
            session,
            str(Path(__file__).resolve().parent.parent / "facebook_automation.json"),
            str(Path(__file__).resolve().parent.parent / ".replied_comments.json"),
        )

    while True:
        await run_auto_reply(fb)
        await asyncio.sleep(settings.BOT_INTERVAL_SECONDS)


if __name__ == "__main__":
    from pathlib import Path
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    asyncio.run(bot_worker())
