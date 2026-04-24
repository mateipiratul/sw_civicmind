from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date, datetime

VoteChoice = Literal["for", "against", "abstain", "absent"]
VoteType = Literal["final", "amendment", "procedural", "attendance"]
InitiatorType = Literal["government", "senator", "deputy", "citizens"]
OcrQuality = Literal["text_pdf", "image_pdf", "unavailable"]
AffectedProfile = Literal["student", "angajat", "pensionar", "pfa", "it", "parinte"]


class Initiator(BaseModel):
    name: str
    type: InitiatorType


class Documents(BaseModel):
    expunere_de_motive: Optional[str] = None
    forma_initiatorului: Optional[str] = None
    aviz_ces: Optional[str] = None
    aviz_cl: Optional[str] = None
    forma_adoptata: Optional[str] = None


class VoteSummary(BaseModel):
    present: int
    for_votes: int = Field(serialization_alias="for")
    against: int
    abstain: int
    absent: int

    model_config = {"populate_by_name": True}


class PartyBreakdown(BaseModel):
    party: str
    present: int
    for_votes: int = Field(serialization_alias="for")
    against: int
    abstain: int

    model_config = {"populate_by_name": True}


class MPVote(BaseModel):
    mp_slug: str
    mp_name: str
    party: str
    vote: VoteChoice


class VoteSession(BaseModel):
    idv: int
    type: VoteType
    date: date
    time: str
    description: str
    summary: VoteSummary
    by_party: list[PartyBreakdown]
    nominal_votes: list[MPVote]


class AIAnalysis(BaseModel):
    processed_at: datetime
    model: str
    key_ideas: list[str]
    impact_categories: list[str]
    affected_profiles: list[AffectedProfile]
    arguments: dict[str, list[str]]
    ocr_quality: OcrQuality
    confidence: float


class Bill(BaseModel):
    idp: int
    bill_number: str
    title: str
    initiator: Initiator
    status: str
    procedure: Optional[str] = None
    law_type: Optional[str] = None
    decision_chamber: Optional[str] = None
    registered_at: Optional[date] = None
    adopted_at: Optional[date] = None
    source_url: str
    scraped_at: datetime
    documents: Documents
    vote_sessions: list[VoteSession]
    ai_analysis: Optional[AIAnalysis] = None
