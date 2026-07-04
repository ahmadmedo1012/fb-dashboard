import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    keywords = Column(JSON, nullable=False)  # list[str]
    reply_template = Column(Text, nullable=False)
    enabled = Column(Boolean, default=True)
    description = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class Reply(Base):
    __tablename__ = "replies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fb_comment_id = Column(String(100), nullable=False, unique=True)
    fb_post_id = Column(String(100), nullable=False)
    commenter_name = Column(String(200), default="")
    comment_text = Column(Text, default="")
    reply_text = Column(Text, default="")
    rule_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class BotLog(Base):
    __tablename__ = "bot_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    level = Column(String(20), default="INFO")
    message = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class BotState(Base):
    __tablename__ = "bot_state"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), nullable=False, unique=True)
    value = Column(Text, default="")
