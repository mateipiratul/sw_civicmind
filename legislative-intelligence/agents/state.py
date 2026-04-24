from __future__ import annotations
from typing import Optional
from typing_extensions import TypedDict


class ScoutState(TypedDict):
    bill_path: str
    bill: dict
    expunere_text: str
    aviz_text: str
    structure: dict        # LLM output: key_ideas, categories, profiles, pro_args
    opposition: dict       # LLM output: con_args
    vote_metadata: dict    # Python: controversy_score, passed_by, dominant_party
    ai_analysis: dict      # final assembled output
    error: Optional[str]


class AuditorState(TypedDict):
    data_dir: str
    all_votes: list        # [{mp_slug, mp_name, party, vote, bill_number, bill_idp}]
    scores: dict           # {mp_slug: {score, total, for, against, abstain, absent}}
    narratives: dict       # {mp_slug: "2-sentence narrative"}
    error: Optional[str]


class QAState(TypedDict):
    bill: dict             # full bill JSON
    question: str
    context: str           # assembled context string passed to LLM
    intent: str            # classified: impact|vote_info|arguments|general
    answer: str
    error: Optional[str]


class MessengerState(TypedDict):
    bill: dict
    mp_name: str
    user_name: str
    user_stance: str       # 'support' | 'oppose'
    email_draft: dict      # {subject, body}
    error: Optional[str]


class NotificationState(TypedDict):
    data_dir: str
    processed_dir: str
    preferences_path: str
    bills: list
    preferences: list
    previous_events: list
    events: list
    flags: dict
    jobs: list
    error: Optional[str]
