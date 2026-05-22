import re
import unicodedata
import os
import time
import hashlib
from apps.core.services import CacheService
from django.db import connection
from django.db.models import Q, Value, TextField, F, IntegerField, Case, When
from django.db.models.functions import Lower, Replace

from apps.bills.models import Bill
from apps.parliamentarians.models import Parliamentarian, MPVote

try:
    from mistralai.client import Mistral
except ImportError:
    Mistral = None

LEGAL_ID_PATTERN = re.compile(r"^\s*(PL)\s*[-\s]?\s*X\s*(\d{1,5})\s*/\s*(\d{4})\s*$", re.IGNORECASE)

VOTE_BUCKETS = {
    "pentru": "for", "for": "for",
    "contra": "against", "against": "against",
    "abtinere": "abstain", "abținere": "abstain", "abstain": "abstain",
    "absent": "absent", "absentat": "absent",
}

class SearchService:
    @staticmethod
    def _get_mistral_client():
        api_key = os.getenv("MISTRAL_API_KEY")
        if not api_key or Mistral is None:
            return None
        return Mistral(api_key=api_key)

    @staticmethod
    def get_query_embedding(query: str) -> list[float] | None:
        if len(query) < 4: return None
        
        # Use stable MD5 hash for cache key
        query_hash = hashlib.md5(query.encode('utf-8')).hexdigest()
        cache_key = f"embed_{query_hash}"
        cached = CacheService.get(cache_key)
        if cached:
            return cached

        client = SearchService._get_mistral_client()
        if not client:
            return None
        try:
            # We set a strict timeout if possible, or just catch exceptions
            # Mistral client might not have a direct timeout param in embeddings.create
            response = client.embeddings.create(model="mistral-embed", inputs=[query])
            embedding = response.data[0].embedding
            CacheService.set(cache_key, embedding, 3600) 
            return embedding
        except Exception as e:
            print(f"Embedding error: {e}")
            return None

    @staticmethod
    def get_cached_entities():
        cache_key = "search_entities_v2"
        cached = CacheService.get(cache_key)
        if cached:
            return cached
        
        # Batch fetch all needed entity data in one go
        counties = list(Parliamentarian.objects.exclude(county__isnull=True).exclude(county='').values_list('county', flat=True).distinct())
        parties = list(Parliamentarian.objects.exclude(party__isnull=True).exclude(party='').values_list('party', flat=True).distinct())
        names = list(Parliamentarian.objects.exclude(mp_name__isnull=True).exclude(mp_name='').values_list('mp_name', flat=True).distinct())
        
        entities = {
            'counties': counties,
            'parties': parties,
            'names': names
        }
        CacheService.set(cache_key, entities, 86400) 
        return entities

    @staticmethod
    def semantic_bill_search(embedding: list[float], threshold=0.72, limit=20):
        if not embedding:
            return []
        
        query = """
            SELECT DISTINCT bill_idp, similarity
            FROM match_legislation_chunks(%s, %s, %s)
            WHERE bill_idp IS NOT NULL
            ORDER BY similarity DESC
        """
        with connection.cursor() as cursor:
            cursor.execute(query, [embedding, threshold, limit])
            return cursor.fetchall()

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
        return [normalized, normalized.lower(), normalized.title()]

    @staticmethod
    def extract_legal_id(value: str):
        match = LEGAL_ID_PATTERN.match(value or "")
        if not match: return None
        _, number, year = match.groups()
        return ("PL-x", number, year)

    @staticmethod
    def get_legal_id_candidates(prefix: str, number: str, year: str):
        return [f"{prefix} {number}/{year}", f"{prefix}{number}/{year}"]

    @classmethod
    def execute_global_search(cls, raw_query: str):
        start_time = time.time()
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

        # 2. Semantic Search (Parallelizing would be better but we are in a sync environment)
        semantic_results = []
        embedding = cls.get_query_embedding(query)
        if embedding:
            semantic_results = cls.semantic_bill_search(embedding)
        
        semantic_bill_ids = [r[0] for r in semantic_results]
        semantic_scores = {r[0]: r[1] for r in semantic_results}

        # 3. Entity Extraction from Cache
        tokens = cls.tokenize_query(query)
        entities = cls.get_cached_entities()
        
        county_lookup = { cls.normalize_for_search(v): v for v in entities['counties'] }
        party_lookup = { cls.normalize_for_search(v): v for v in entities['parties'] }
        name_parts_set = { cls.normalize_for_search(p) for name in entities['names'] for p in cls.tokenize_query(name) }
        
        matched_counties, matched_parties, matched_names, law_tokens = [], [], [], []
        for token in tokens:
            norm = cls.normalize_for_search(token)
            if norm in county_lookup: matched_counties.append(county_lookup[norm])
            elif norm in party_lookup: matched_parties.append(party_lookup[norm])
            elif norm in name_parts_set: matched_names.append(token)
            else: law_tokens.append(token)

        # 4. Build Bill Queryset with PREFETCH
        bill_queryset = Bill.objects.select_related('ai_analysis').prefetch_related(
            'ai_analysis__rel_impact_categories',
            'ai_analysis__rel_affected_profiles',
            'ai_analysis__rel_key_ideas',
            'ai_analysis__rel_arguments'
        )
        
        effective_law_tokens = law_tokens if law_tokens else matched_names
        hybrid_filter = Q()
        if semantic_bill_ids:
            hybrid_filter |= Q(idp__in=semantic_bill_ids)

        if effective_law_tokens:
            token_query = Q()
            for token in effective_law_tokens:
                variants = cls.get_value_variants(token)
                tq = Q(title__icontains=token) | Q(bill_number__icontains=token) | Q(initiator_name__icontains=token)
                json_query = Q()
                for item in variants:
                    json_query |= Q(ai_analysis__rel_impact_categories__name__iexact=item)
                    json_query |= Q(ai_analysis__rel_affected_profiles__name__iexact=item)
                    json_query |= Q(ai_analysis__rel_key_ideas__text__icontains=item)
                token_query |= (tq | json_query)
            hybrid_filter |= token_query

        if hybrid_filter:
            bill_queryset = bill_queryset.filter(hybrid_filter)
            if exact_bill: bill_queryset = bill_queryset.exclude(idp=exact_bill.idp)
            
            if semantic_bill_ids:
                bill_queryset = bill_queryset.annotate(
                    semantic_rank=Case(
                        *[When(idp=idp, then=Value(int(score * 100))) for idp, score in semantic_scores.items()],
                        default=Value(0),
                        output_field=IntegerField()
                    )
                ).order_by('-semantic_rank', '-registered_at')
            else:
                bill_queryset = bill_queryset.order_by('-registered_at')
            
            bill_list = list(bill_queryset.distinct()[:200])
        else:
            bill_list = []

        total_laws = len(bill_list)
        matched_law_codes = [b.bill_number for b in bill_list if b.bill_number]
        if exact_bill and exact_bill.bill_number: matched_law_codes.append(exact_bill.bill_number)
        matched_law_codes = list(set(matched_law_codes))

        # 5. Build MP Queryset
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
            mp_list = list(mp_queryset.filter(mp_filter).order_by('mp_name').distinct())
        else:
            mp_list = []

        # 6. Build Relation Map
        relation_map = {}
        if matched_law_codes and mp_list:
            v_rows = MPVote.objects.filter(
                vote_session__bill__bill_number__in=matched_law_codes,
                parliamentarian__in=mp_list
            ).values(
                'parliamentarian__mp_slug', 'vote_session__bill__idp', 'vote_session__bill__bill_number', 'vote'
            )
            r_sets = {}
            for r in v_rows:
                mp_s, b_id, b_n, v = r['parliamentarian__mp_slug'], r['vote_session__bill__idp'], r['vote_session__bill__bill_number'], r['vote']
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
                    'billIds': sorted(r['billIds']), 'billNumbers': sorted(r['billNumbers']), 
                    'relatedBills': len(active_votes), 'totalMatchedBills': len(r['billNumbers']),
                    'forVotes': len(r['for']), 'againstVotes': len(r['against']), 'abstainVotes': len(r['abstain']), 'absentVotes': len(r['absent'])
                }

        print(f"Search executed in {time.time() - start_time:.4f}s")
        return {
            'query': query,
            'exactMatch': exact_bill,
            'laws': bill_list,
            'mps': mp_list,
            'total_laws': total_laws,
            'relation_map': relation_map,
        }
