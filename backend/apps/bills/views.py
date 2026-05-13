import math
import re
import unicodedata
from collections import Counter
from django.db import connection
from django.db.models import Prefetch, Q, Case, When, Value, IntegerField, Count, F, TextField
from django.db.models.functions import Lower, Replace
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User
from .models import Bill, AIAnalysis, VoteSession
from .filters import BillFilterSet
from apps.parliamentarians.models import MPVote
from .serializers import BillListSerializer, BillDetailSerializer, MPVoteInBillSerializer
from apps.parliamentarians.serializers import ParliamentarianVoteMapSerializer, ParliamentarianListSerializer
from apps.parliamentarians.models import Parliamentarian, MPVote as ParliamentarianVote
from apps.profiles.models import Profile

try:
    from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
except Exception:  # pragma: no cover - only needed for Postgres deployments
    SearchVector = None
    SearchQuery = None
    SearchRank = None

LEGAL_ID_PATTERN = re.compile(r"^\s*(PL)\s*[-\s]?\s*X\s*(\d{1,5})\s*/\s*(\d{4})\s*$", re.IGNORECASE)

DEFAULT_TRENDING_TOPICS = [
    "Sănătate",
    "Educație",
    "Mediu",
    "Justiție",
    "Fiscal",
    "Muncă",
]

def _normalize_text(value: str) -> str:
    return " ".join((value or "").split())

def _value_variants(value: str):
    normalized = _normalize_text(value)
    if not normalized:
        return []
    variants = [normalized, normalized.lower(), normalized.upper(), normalized.title()]
    seen = set()
    deduped = []
    for item in variants:
        if item not in seen:
            seen.add(item)
            deduped.append(item)
    return deduped

def _extract_legal_id(value: str):
    match = LEGAL_ID_PATTERN.match(value or "")
    if not match:
        return None
    _, number, year = match.groups()
    return ("PL-x", number, year)

def _legal_id_candidates(prefix: str, number: str, year: str):
    candidates = [
        f"{prefix} {number}/{year}",
        f"{prefix}{number}/{year}",
        f"{prefix.replace('-', ' ')} {number}/{year}",
        f"{prefix.replace('-', '')} {number}/{year}",
        f"{prefix.replace('-', '')}{number}/{year}",
    ]
    seen = set()
    deduped = []
    for item in candidates:
        if item not in seen:
            seen.add(item)
            deduped.append(item)
    return deduped

DIACRITIC_REPLACEMENTS = (
    ("ă", "a"),
    ("â", "a"),
    ("î", "i"),
    ("ș", "s"),
    ("ş", "s"),
    ("ț", "t"),
    ("ţ", "t"),
)

def _strip_diacritics(value: str) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")

def _normalize_for_search(value: str) -> str:
    return _strip_diacritics(_normalize_text(value)).lower()

def _tokenize_query(value: str):
    normalized = _normalize_text(value)
    if not normalized:
        return []
    return [token for token in re.split(r"[\s,]+", normalized) if token]

def _strip_diacritics_expr(field_name: str):
    expr = Lower(F(field_name))
    for source, target in DIACRITIC_REPLACEMENTS:
        expr = Replace(expr, Value(source), Value(target), output_field=TextField())
    return expr

def _build_lookup(values):
    lookup = {}
    for value in values:
        normalized = _normalize_for_search(value)
        if normalized and normalized not in lookup:
            lookup[normalized] = value
    return lookup

def _extract_entity_filters(tokens):
    counties = list(
        Parliamentarian.objects.exclude(county__isnull=True).exclude(county='').values_list('county', flat=True).distinct()
    )
    parties = list(
        Parliamentarian.objects.exclude(party__isnull=True).exclude(party='').values_list('party', flat=True).distinct()
    )

    county_lookup = _build_lookup(counties)
    party_lookup = _build_lookup(parties)

    matched_counties = []
    matched_parties = []
    remaining_tokens = []

    for token in tokens:
        normalized = _normalize_for_search(token)
        if normalized in county_lookup:
            matched_counties.append(county_lookup[normalized])
            continue
        if normalized in party_lookup:
            matched_parties.append(party_lookup[normalized])
            continue
        remaining_tokens.append(token)

    return matched_counties, matched_parties, remaining_tokens

def _apply_or_filters(base: Q, filters, field_name: str) -> Q:
    if not filters:
        return base
    conditions = Q()
    for value in filters:
        conditions |= Q(**{f"{field_name}__iexact": value})
    return base & conditions

class BillViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Bill.objects.all().order_by('-registered_at')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = BillFilterSet
    search_fields = ['title', 'bill_number', 'initiator_name']

    def get_serializer_class(self):
        if getattr(self, 'action', None) in ('list', 'feed', 'personalized'):
            return BillListSerializer
        return BillDetailSerializer

    def get_queryset(self):
        return Bill.objects.all().order_by('-registered_at')

    @staticmethod
    def _parse_page(request):
        try:
            return max(1, int(request.query_params.get('page', 1)))
        except (ValueError, TypeError):
            return 1

    @staticmethod
    def _parse_limit(request, default=20, maximum=100):
        try:
            return max(1, min(maximum, int(request.query_params.get('limit', default))))
        except (ValueError, TypeError):
            return default

    def list(self, request, *args, **kwargs):
        """Return paginated bills in the shape the frontend expects."""
        page = self._parse_page(request)
        limit = self._parse_limit(request)

        queryset = self.filter_queryset(self.get_queryset())
        total = queryset.count()
        offset = (page - 1) * limit
        bills = queryset[offset:offset + limit]
        serializer = BillListSerializer(bills, many=True)
        return Response({
            'page': page,
            'limit': limit,
            'total': total,
            'totalPages': math.ceil(total / limit) if total else 1,
            'bills': serializer.data,
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def metadata(self, request):
        # Standard lists as baseline
        categories = ["sanatate", "educatie", "fiscal", "justitie", "mediu", "munca", "administratie", "it", "pensii", "agricultura", "social"]
        profiles = ["student", "angajat", "pensionar", "pfa", "it", "parinte", "agricultor", "antreprenor", "pacient"]
        
        # Get unique counties from parliamentarians
        # Lazy import to avoid circular dependency (parliamentarians -> bills -> parliamentarians)
        from apps.parliamentarians.models import Parliamentarian
        counties = list(Parliamentarian.objects.values_list('county', flat=True).distinct())
        counties = [c for c in counties if c]
        counties.sort()

        return Response({
            "impact_categories": categories,
            "affected_profiles": profiles,
            "counties": counties
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny], url_path='trending')
    def trending(self, request):
        limit = self._parse_limit(request, default=6, maximum=12)
        recent_bills = (
            Bill.objects
            .select_related('ai_analysis')
            .order_by('-registered_at')[:200]
        )

        counter = Counter()
        for bill in recent_bills:
            analysis = getattr(bill, 'ai_analysis', None)
            if not analysis or not analysis.impact_categories:
                continue
            for category in analysis.impact_categories:
                if category:
                    counter[category] += 1

        topics = [
            {"label": label, "count": count}
            for label, count in counter.most_common(limit)
        ]
        if not topics:
            topics = [{"label": label, "count": 0} for label in DEFAULT_TRENDING_TOPICS[:limit]]

        return Response({"topics": topics})

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def feed(self, request):
        from datetime import timedelta
        from django.utils import timezone
        
        past_week = timezone.now().date() - timedelta(days=7)
        queryset = self.filter_queryset(self.get_queryset()).filter(registered_at__gte=past_week).order_by('-registered_at')
        
        if not queryset.exists():
            queryset = self.filter_queryset(self.get_queryset()).order_by('-registered_at')[:10]
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny], url_path='votes')
    def votes(self, request, pk=None):
        """
        GET /api/bills/{idp}/votes/
        Returns the MP vote breakdown for this bill's most recent VoteSession.
        Groups votes into For / Against / Abstain / Absent buckets and includes
        the session-level summary counts.
        """
        bill = self.get_object()

        # Grab the most recent vote session for this bill
        vote_session = (
            bill.vote_sessions
            .order_by('-date')
            .first()
        )
        if not vote_session:
            return Response({'detail': 'No vote sessions found for this bill.'}, status=404)

        # Fetch all MP votes for that session, with MP info pre-loaded
        mp_votes = (
            MPVote.objects
            .filter(vote_session=vote_session)
            .select_related('parliamentarian')
            .order_by('parliamentarian__mp_name')
        )

        # Group into buckets
        buckets: dict = {'for': [], 'against': [], 'abstain': [], 'absent': []}
        vote_map = {
            'Pentru': 'for',
            'Contra': 'against',
            'Abtinere': 'abstain',
            'Absent': 'absent',
            'Absentat': 'absent',
        }
        serialized = MPVoteInBillSerializer(mp_votes, many=True).data
        for row in serialized:
            bucket_key = vote_map.get(row['vote'], 'abstain')
            buckets[bucket_key].append(row)

        return Response({
            'bill_idp': bill.idp,
            'bill_number': bill.bill_number,
            'vote_session': {
                'date': vote_session.date,
                'type': vote_session.type,
                'description': vote_session.description,
                'summary': {
                    'present': vote_session.present,
                    'for': vote_session.for_votes,
                    'against': vote_session.against,
                    'abstain': vote_session.abstain,
                    'absent': vote_session.absent,
                },
            },
            'votes': buckets,
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def personalized(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        page = self._parse_page(request)
        limit = self._parse_limit(request)

        user_interests = list(getattr(profile, 'interests', []) or [])
        persona_tags = list(getattr(profile, 'persona_tags', []) or [])
        preferred_party = (getattr(profile, 'preferred_party', None) or '').strip() or None
        county = (getattr(profile, 'county', None) or '').strip() or None

        query = Q()
        for interest in user_interests:
            query |= Q(ai_analysis__impact_categories__contains=[interest])
        for persona in persona_tags:
            query |= Q(ai_analysis__affected_profiles__contains=[persona])

        queryset = self.filter_queryset(self.get_queryset())
        if query.children:
            queryset = queryset.annotate(
                is_match=Case(
                    When(query, then=Value(1)),
                    default=Value(0),
                    output_field=IntegerField(),
                )
            ).order_by('-is_match', '-registered_at').distinct()
        else:
            queryset = queryset.order_by('-registered_at')

        total = queryset.count()
        offset = (page - 1) * limit
        bills = queryset[offset:offset + limit]
        serializer = BillListSerializer(bills, many=True)

        vote_limit = 5
        representatives_queryset = self._get_representatives_queryset(county=county, preferred_party=preferred_party)
        representatives_serializer = ParliamentarianVoteMapSerializer(
            representatives_queryset[:6],
            many=True,
            context={**self.get_serializer_context(), 'vote_limit': vote_limit},
        )

        return Response({
            'page': page,
            'limit': limit,
            'total': total,
            'totalPages': math.ceil(total / limit) if total else 1,
            'bills': serializer.data,
            'profile': {
                'county': county,
                'preferredParty': preferred_party,
                'interests': user_interests,
                'personaTags': persona_tags,
                'questionnaireCompleted': bool(getattr(profile, 'questionnaire_completed', False)),
            },
            'appliedFilters': {
                'impactCategories': user_interests,
                'affectedProfiles': persona_tags,
                'county': county,
                'party': preferred_party,
            },
            'myRepresentatives': {
                'total': representatives_queryset.count(),
                'voteLimit': vote_limit,
                'parliamentarians': representatives_serializer.data,
            },
        })

    @staticmethod
    def _get_representatives_queryset(*, county, preferred_party):
        vote_queryset = (
            ParliamentarianVote.objects
            .select_related(
                'vote_session',
                'vote_session__bill',
                'vote_session__bill__ai_analysis',
            )
            .order_by('-vote_session__date')
        )
        queryset = (
            Parliamentarian.objects
            .filter(chamber__icontains='deput')
            .select_related('impact_score')
            .prefetch_related(
                Prefetch('votes', queryset=vote_queryset, to_attr='prefetched_votes')
            )
            .order_by('mp_name')
        )
        if county:
            queryset = queryset.filter(county__icontains=county)
        if preferred_party:
            queryset = queryset.filter(party__iexact=preferred_party)
        return queryset

class AdminStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        total_bills = Bill.objects.count()
        active_bills = Bill.objects.filter(status='in_procedura_legislativa').count()
        analyzed_bills = AIAnalysis.objects.count()

        return Response({
            'totalUsers': total_users,
            'activeUsers': active_users,
            'totalBills': total_bills,
            'activeBills': active_bills,
            'analyzedBills': analyzed_bills
        })


class GlobalSearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        raw_query = request.query_params.get('q', '')
        query = _normalize_text(raw_query)

        if not query:
            return Response({
                'query': '',
                'exactMatch': None,
                'laws': [],
                'mps': [],
                'filters': {
                    'laws': {'statuses': [], 'initiators': [], 'categories': []},
                    'mps': {'parties': [], 'counties': [], 'chambers': []},
                },
                'counts': {'laws': 0, 'mps': 0},
            })

        exact_bill = None
        legal_parts = _extract_legal_id(query)
        if legal_parts:
            prefix, number, year = legal_parts
            for candidate in _legal_id_candidates(prefix, number, year):
                exact_bill = (
                    Bill.objects
                    .select_related('ai_analysis')
                    .filter(bill_number__iexact=candidate)
                    .first()
                )
                if exact_bill:
                    break

        tokens = _tokenize_query(query)
        matched_counties, matched_parties, law_tokens = _extract_entity_filters(tokens)

        matched_law_ids = []
        bill_list = []
        total_laws = 0

        if law_tokens:
            bill_queryset = (
                Bill.objects
                .select_related('ai_analysis')
                .annotate(
                    n_title=_strip_diacritics_expr('title'),
                    n_bill_number=_strip_diacritics_expr('bill_number'),
                    n_initiator=_strip_diacritics_expr('initiator_name'),
                    n_title_short=_strip_diacritics_expr('ai_analysis__title_short'),
                    n_ocr_expunere=_strip_diacritics_expr('ocr_expunere'),
                    n_ocr_aviz_ces=_strip_diacritics_expr('ocr_aviz_ces'),
                    n_ocr_aviz_cl=_strip_diacritics_expr('ocr_aviz_cl'),
                )
            )

            token_query = None
            for token in law_tokens:
                normalized_token = _normalize_for_search(token)
                variants = _value_variants(token)
                if normalized_token and normalized_token not in variants:
                    variants.append(normalized_token)

                text_query = (
                    Q(title__icontains=token)
                    | Q(bill_number__icontains=token)
                    | Q(initiator_name__icontains=token)
                    | Q(ai_analysis__title_short__icontains=token)
                    | Q(ocr_expunere__icontains=token)
                    | Q(ocr_aviz_ces__icontains=token)
                    | Q(ocr_aviz_cl__icontains=token)
                )

                normalized_query = Q()
                if normalized_token:
                    normalized_query = (
                        Q(n_title__icontains=normalized_token)
                        | Q(n_bill_number__icontains=normalized_token)
                        | Q(n_initiator__icontains=normalized_token)
                        | Q(n_title_short__icontains=normalized_token)
                        | Q(n_ocr_expunere__icontains=normalized_token)
                        | Q(n_ocr_aviz_ces__icontains=normalized_token)
                        | Q(n_ocr_aviz_cl__icontains=normalized_token)
                    )

                json_query = Q()
                for item in variants:
                    if not item:
                        continue
                    json_query |= Q(ai_analysis__impact_categories__contains=[item])
                    json_query |= Q(ai_analysis__affected_profiles__contains=[item])
                    json_query |= Q(ai_analysis__key_ideas__contains=[item])

                per_token_query = text_query | normalized_query | json_query
                token_query = per_token_query if token_query is None else token_query & per_token_query

            if token_query is not None:
                bill_queryset = bill_queryset.filter(token_query)

            if connection.vendor == 'postgresql' and SearchVector and SearchQuery and SearchRank:
                vector = (
                    SearchVector('title', weight='A')
                    + SearchVector('bill_number', weight='A')
                    + SearchVector('initiator_name', weight='B')
                    + SearchVector('ai_analysis__title_short', weight='B')
                    + SearchVector('ocr_expunere', weight='C')
                    + SearchVector('ocr_aviz_ces', weight='C')
                    + SearchVector('ocr_aviz_cl', weight='C')
                )
                normalized_tokens = [_normalize_for_search(item) for item in law_tokens if item]
                query_text = " ".join(normalized_tokens) if normalized_tokens else query
                search_query = SearchQuery(query_text, search_type='websearch')
                bill_queryset = bill_queryset.annotate(rank=SearchRank(vector, search_query))
                bill_queryset = bill_queryset.order_by('-rank', '-registered_at')
            else:
                bill_queryset = bill_queryset.order_by('-registered_at')

            if exact_bill is not None:
                bill_queryset = bill_queryset.exclude(idp=exact_bill.idp)

            bill_queryset = bill_queryset.distinct()
            total_laws = bill_queryset.count()
            bill_list = list(bill_queryset[:200])
            matched_law_ids = [bill.idp for bill in bill_list]

        if exact_bill is not None:
            matched_law_ids.append(exact_bill.idp)

        mp_queryset = Parliamentarian.objects.select_related('impact_score')
        if matched_law_ids:
            initiator_names = list(
                Bill.objects
                .filter(idp__in=matched_law_ids)
                .exclude(initiator_name__isnull=True)
                .exclude(initiator_name='')
                .values_list('initiator_name', flat=True)
            )
            initiator_slugs = []
            if initiator_names:
                mp_name_rows = Parliamentarian.objects.exclude(mp_name__isnull=True).exclude(mp_name='').values_list('mp_slug', 'mp_name')
                normalized_initiators = [_normalize_for_search(item) for item in initiator_names if item]
                for mp_slug, mp_name in mp_name_rows:
                    normalized_mp = _normalize_for_search(mp_name)
                    if not normalized_mp:
                        continue
                    if any(normalized_mp in initiator for initiator in normalized_initiators):
                        initiator_slugs.append(mp_slug)

            relation_query = Q(votes__vote_session__bill__idp__in=matched_law_ids)
            if initiator_slugs:
                relation_query |= Q(mp_slug__in=initiator_slugs)

            mp_queryset = mp_queryset.filter(relation_query).distinct()
        else:
            if law_tokens:
                mp_queryset = mp_queryset.annotate(n_mp_name=_strip_diacritics_expr('mp_name'))
                mp_name_query = None
                for token in law_tokens:
                    normalized_token = _normalize_for_search(token)
                    if not normalized_token:
                        continue
                    per_token = Q(mp_name__icontains=token) | Q(n_mp_name__icontains=normalized_token)
                    mp_name_query = per_token if mp_name_query is None else mp_name_query & per_token
                if mp_name_query is not None:
                    mp_queryset = mp_queryset.filter(mp_name_query)

        mp_filter_query = Q()
        mp_filter_query = _apply_or_filters(mp_filter_query, matched_counties, 'county')
        mp_filter_query = _apply_or_filters(mp_filter_query, matched_parties, 'party')
        if mp_filter_query.children:
            mp_queryset = mp_queryset.filter(mp_filter_query)

        mp_queryset = mp_queryset.order_by('mp_name')
        total_mps = mp_queryset.count()
        mp_list = list(mp_queryset[:200])

        relation_map = {}
        if matched_law_ids:
            stats = (
                ParliamentarianVote.objects
                .filter(vote_session__bill__idp__in=matched_law_ids)
                .values('parliamentarian__mp_slug')
                .annotate(
                    related_bills=Count('vote_session__bill', distinct=True),
                    for_votes=Count('id', filter=Q(vote__iexact='Pentru')),
                )
            )
            relation_map = {
                row['parliamentarian__mp_slug']: {
                    'keyword': query,
                    'relatedBills': row['related_bills'],
                    'forVotes': row['for_votes'],
                }
                for row in stats
            }

        bill_data = BillListSerializer(bill_list, many=True).data
        mp_data = ParliamentarianListSerializer(mp_list, many=True).data
        for row in mp_data:
            relation = relation_map.get(row['mp_slug'], {'keyword': query, 'relatedBills': 0, 'forVotes': 0})
            row['relation'] = relation

        status_options = sorted({bill.status for bill in bill_list if bill.status})
        initiator_options = sorted({bill.initiator_name for bill in bill_list if bill.initiator_name})[:40]
        category_counter = Counter()
        for bill in bill_list:
            analysis = getattr(bill, 'ai_analysis', None)
            if analysis and analysis.impact_categories:
                for category in analysis.impact_categories:
                    if category:
                        category_counter[category] += 1
        category_options = [label for label, _ in category_counter.most_common(20)]

        party_options = sorted({mp.party for mp in mp_list if mp.party})
        county_options = sorted({mp.county for mp in mp_list if mp.county})
        chamber_options = sorted({mp.chamber for mp in mp_list if mp.chamber})

        return Response({
            'query': query,
            'exactMatch': BillListSerializer(exact_bill).data if exact_bill else None,
            'laws': bill_data,
            'mps': mp_data,
            'filters': {
                'laws': {
                    'statuses': status_options,
                    'initiators': initiator_options,
                    'categories': category_options,
                },
                'mps': {
                    'parties': party_options,
                    'counties': county_options,
                    'chambers': chamber_options,
                },
            },
            'counts': {
                'laws': total_laws,
                'mps': total_mps,
            },
        })
