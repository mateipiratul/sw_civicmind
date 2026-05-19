import re
import unicodedata
from collections import Counter
from django.db import models
from django.db.models import Q, Case, When, Value, IntegerField, F, TextField, Prefetch
from django.db.models.functions import Lower, Replace
from django.db import connection

from .models import Bill, AIAnalysis
from apps.parliamentarians.models import Parliamentarian, MPVote

LEGAL_ID_PATTERN = re.compile(r"^\s*(PL)\s*[-\s]?\s*X\s*(\d{1,5})\s*/\s*(\d{4})\s*$", re.IGNORECASE)

VOTE_BUCKETS = {
    "pentru": "for", "for": "for",
    "contra": "against", "against": "against",
    "abtinere": "abstain", "abținere": "abstain", "abstain": "abstain",
    "absent": "absent", "absentat": "absent",
}

DIACRITIC_REPLACEMENTS = (
    ("ă", "a"), ("â", "a"), ("î", "i"), ("ș", "s"), ("ş", "s"), ("ț", "t"), ("ţ", "t"),
)

class FeedService:
    @staticmethod
    def get_personalized_bills(user_interests: list[str], persona_tags: list[str], queryset=None):
        if queryset is None:
            queryset = Bill.objects.all()

        query = Q()
        for interest in user_interests:
            query |= Q(ai_analysis__rel_impact_categories__name__iexact=interest)
        for persona in persona_tags:
            query |= Q(ai_analysis__rel_affected_profiles__name__iexact=persona)

        if query.children:
            return queryset.annotate(
                is_match=Case(
                    When(query, then=Value(1)),
                    default=Value(0),
                    output_field=IntegerField()
                )
            ).order_by('-is_match', '-registered_at').distinct()
        
        return queryset.order_by('-registered_at')

    @staticmethod
    def get_representatives(county: str | None = None, preferred_party: str | None = None, limit: int = 6):
        vote_queryset = (
            MPVote.objects
            .select_related('vote_session', 'vote_session__bill', 'vote_session__bill__ai_analysis')
            .only(
                'id', 'vote_session_id', 'parliamentarian_id', 'vote', 'party',
                'vote_session__date', 'vote_session__type',
                'vote_session__bill__idp', 'vote_session__bill__bill_number', 
                'vote_session__bill__title', 'vote_session__bill__status',
                'vote_session__bill__ai_analysis__title_short',
                'vote_session__bill__ai_analysis__controversy_score',
            )
            .order_by('-vote_session__date')
        )

        queryset = (
            Parliamentarian.objects
            .filter(chamber__icontains='deput')
            .select_related('impact_score')
            .prefetch_related(Prefetch('votes', queryset=vote_queryset, to_attr='prefetched_votes'))
            .order_by('mp_name')
        )

        if county:
            queryset = queryset.filter(county__icontains=county)
        if preferred_party:
            queryset = queryset.filter(party__iexact=preferred_party)
            
        return queryset[:limit]

class VoteAnalyticsService:
    @staticmethod
    def get_bill_vote_buckets(vote_session):
        from .serializers import MPVoteInBillSerializer

        mp_votes = (
            MPVote.objects
            .filter(vote_session=vote_session)
            .select_related('parliamentarian')
            .order_by('parliamentarian__mp_name')
        )
        
        buckets = {'for': [], 'against': [], 'abstain': [], 'absent': []}
        serialized = MPVoteInBillSerializer(mp_votes, many=True).data
        
        for row in serialized:
            bucket_key = VOTE_BUCKETS.get((row['vote'] or "").casefold(), 'abstain')
            buckets[bucket_key].append(row)
            
        return buckets

class SearchService:
    @staticmethod
    def normalize_text(value: str) -> str:
        return " ".join((value or "").split())

    @staticmethod
    def strip_diacritics(value: str) -> str:
        if not value: return ""
        normalized = unicodedata.normalize("NFD", value)
        return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")

    @staticmethod
    def normalize_for_search(value: str) -> str:
        return SearchService.strip_diacritics(SearchService.normalize_text(value)).lower()

    @staticmethod
    def tokenize_query(value: str):
        normalized = SearchService.normalize_text(value)
        if not normalized: return []
        return [token for token in re.split(r"[\s,]+", normalized) if token]

    @staticmethod
    def get_value_variants(value: str):
        normalized = SearchService.normalize_text(value)
        if not normalized: return []
        variants = [normalized, normalized.lower(), normalized.upper(), normalized.title()]
        return list(dict.fromkeys(variants))

    @staticmethod
    def get_strip_diacritics_expr(field_name: str):
        expr = Lower(F(field_name))
        for source, target in DIACRITIC_REPLACEMENTS:
            expr = Replace(expr, Value(source), Value(target), output_field=TextField())
        return expr

    @staticmethod
    def extract_legal_id(value: str):
        match = LEGAL_ID_PATTERN.match(value or "")
        if not match: return None
        _, number, year = match.groups()
        return ("PL-x", number, year)

    @staticmethod
    def get_legal_id_candidates(prefix: str, number: str, year: str):
        candidates = [
            f"{prefix} {number}/{year}", f"{prefix}{number}/{year}",
            f"{prefix.replace('-', ' ')} {number}/{year}",
            f"{prefix.replace('-', '')} {number}/{year}",
            f"{prefix.replace('-', '')}{number}/{year}",
        ]
        return list(dict.fromkeys(candidates))

    @classmethod
    def execute_global_search(cls, raw_query: str):
        query = cls.normalize_text(raw_query)
        if not query:
            return {
                'query': '', 'exactMatch': None, 'laws': [], 'mps': [],
                'filters': {'laws': {'statuses': [], 'initiators': [], 'categories': []}, 'mps': {'parties': [], 'counties': [], 'chambers': []}},
                'counts': {'laws': 0, 'mps': 0},
            }

        # 1. Exact Match Logic
        exact_bill = None
        legal_parts = cls.extract_legal_id(query)
        if legal_parts:
            prefix, number, year = legal_parts
            for candidate in cls.get_legal_id_candidates(prefix, number, year):
                exact_bill = Bill.objects.select_related('ai_analysis').filter(bill_number__iexact=candidate).first()
                if exact_bill: break

        # 2. Tokenize and Entity Extraction
        tokens = cls.tokenize_query(query)
        counties = list(Parliamentarian.objects.exclude(county__isnull=True).exclude(county='').values_list('county', flat=True).distinct())
        parties = list(Parliamentarian.objects.exclude(party__isnull=True).exclude(party='').values_list('party', flat=True).distinct())
        names = list(Parliamentarian.objects.exclude(mp_name__isnull=True).exclude(mp_name='').values_list('mp_name', flat=True).distinct())
        
        county_lookup = { cls.normalize_for_search(v): v for v in counties if cls.normalize_for_search(v) }
        party_lookup = { cls.normalize_for_search(v): v for v in parties if cls.normalize_for_search(v) }
        name_parts_set = { cls.normalize_for_search(p) for name in names for p in cls.tokenize_query(name) if cls.normalize_for_search(p) }
        
        matched_counties, matched_parties, matched_names, law_tokens = [], [], [], []
        for token in tokens:
            norm = cls.normalize_for_search(token)
            if norm in county_lookup: matched_counties.append(county_lookup[norm])
            elif norm in party_lookup: matched_parties.append(party_lookup[norm])
            elif norm in name_parts_set: matched_names.append(token)
            else: law_tokens.append(token)

        # 3. Build Bill Queryset
        bill_queryset = Bill.objects.select_related('ai_analysis')
        effective_law_tokens = law_tokens if law_tokens else matched_names
        
        if effective_law_tokens:
            bill_queryset = bill_queryset.annotate(
                n_title=cls.get_strip_diacritics_expr('title'), 
                n_bill_number=cls.get_strip_diacritics_expr('bill_number'),
                n_initiator=cls.get_strip_diacritics_expr('initiator_name'), 
                n_title_short=cls.get_strip_diacritics_expr('ai_analysis__title_short'),
                n_ocr_expunere=cls.get_strip_diacritics_expr('ocr_expunere'), 
                n_ocr_aviz_ces=cls.get_strip_diacritics_expr('ocr_aviz_ces'),
                n_ocr_aviz_cl=cls.get_strip_diacritics_expr('ocr_aviz_cl'),
            )
            token_query = Q()
            for token in effective_law_tokens:
                norm = cls.normalize_for_search(token)
                variants = cls.get_value_variants(token)
                if norm and norm not in variants: variants.append(norm)
                
                tq = Q(title__icontains=token) | Q(bill_number__icontains=token) | Q(initiator_name__icontains=token) | Q(ai_analysis__title_short__icontains=token) | Q(ocr_expunere__icontains=token) | Q(ocr_aviz_ces__icontains=token) | Q(ocr_aviz_cl__icontains=token)
                nq = Q()
                if norm: nq = Q(n_title__icontains=norm) | Q(n_bill_number__icontains=norm) | Q(n_initiator__icontains=norm) | Q(n_title_short__icontains=norm) | Q(n_ocr_expunere__icontains=norm) | Q(n_ocr_aviz_ces__icontains=norm) | Q(n_ocr_aviz_cl__icontains=norm)
                
                json_query = Q()
                for item in variants:
                    if not item: continue
                    json_query |= Q(ai_analysis__rel_impact_categories__name__iexact=item)
                    json_query |= Q(ai_analysis__rel_affected_profiles__name__iexact=item)
                    json_query |= Q(ai_analysis__rel_key_ideas__text__icontains=item)

                token_query |= (tq | nq | json_query)

            if token_query: bill_queryset = bill_queryset.filter(token_query)
            if exact_bill: bill_queryset = bill_queryset.exclude(idp=exact_bill.idp)
            bill_queryset = bill_queryset.order_by('-registered_at').distinct()
        else:
            bill_queryset = bill_queryset.none()

        total_laws = bill_queryset.count()
        bill_list = list(bill_queryset[:200])
        matched_law_codes = [b.bill_number for b in bill_list if b.bill_number]
        if exact_bill and exact_bill.bill_number: matched_law_codes.append(exact_bill.bill_number)
        matched_law_codes = list(dict.fromkeys(matched_law_codes))

        # 4. Build MP Queryset
        mp_queryset = Parliamentarian.objects.select_related('impact_score')
        
        if matched_names:
            name_query = Q()
            for n in matched_names: name_query |= Q(mp_name__icontains=n)
            mp_queryset = mp_queryset.filter(name_query)

        mp_filter = Q()
        if matched_law_codes:
            mp_filter |= Q(votes__vote_session__bill__bill_number__in=matched_law_codes)
        
        entity_filter = Q()
        for c in matched_counties: entity_filter |= Q(county__iexact=c)
        for p in matched_parties: entity_filter |= Q(party__iexact=p)
        
        if entity_filter:
            mp_filter &= entity_filter
        elif not matched_law_codes and not matched_names:
            mp_queryset = mp_queryset.none()
            mp_filter = None
            
        if mp_filter:
            mp_queryset = mp_queryset.filter(mp_filter).order_by('mp_name').distinct()
        
        mp_list = list(mp_queryset)

        # 5. Build Relation Map
        relation_map = {}
        if matched_law_codes:
            v_rows = MPVote.objects.filter(
                vote_session__bill__bill_number__in=matched_law_codes,
                parliamentarian__in=mp_list
            ).values(
                'parliamentarian__mp_slug', 
                'vote_session__bill__idp', 
                'vote_session__bill__bill_number', 
                'vote'
            )
            r_sets = {}
            for r in v_rows:
                mp_s, b_id, b_n, v = r['parliamentarian__mp_slug'], r['vote_session__bill__idp'], r['vote_session__bill__bill_number'], r['vote']
                if not mp_s or b_id is None: continue
                rel = r_sets.setdefault(mp_s, {'billIds': set(), 'billNumbers': set(), 'for': set(), 'against': set(), 'abstain': set(), 'absent': set()})
                rel['billIds'].add(b_id)
                if b_n:
                    rel['billNumbers'].add(b_n)
                    bucket = VOTE_BUCKETS.get((v or "").casefold())
                    if bucket: rel[bucket].add(b_n)
            for s, r in r_sets.items():
                active_votes = r['for'] | r['against'] | r['abstain']
                relation_map[s] = {
                    'keyword': query, 
                    'billIds': sorted(r['billIds']), 
                    'billNumbers': sorted(r['billNumbers']), 
                    'relatedBills': len(active_votes), 
                    'totalMatchedBills': len(r['billNumbers']),
                    'forVotes': len(r['for']), 'againstVotes': len(r['against']), 'abstainVotes': len(r['abstain']), 'absentVotes': len(r['absent'])
                }
        elif mp_list and not law_tokens:
            for mp in mp_list:
                relation_map[mp.mp_slug] = {
                    'keyword': query, 
                    'billIds': [], 'billNumbers': [], 'relatedBills': 0, 'totalMatchedBills': 0,
                    'forVotes': 0, 'againstVotes': 0, 'abstainVotes': 0, 'absentVotes': 0
                }

        return {
            'query': query,
            'exactMatch': exact_bill,
            'laws': bill_list,
            'mps': mp_list,
            'total_laws': total_laws,
            'relation_map': relation_map,
        }
