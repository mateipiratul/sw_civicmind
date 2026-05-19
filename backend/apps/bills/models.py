from django.db import models

class Bill(models.Model):
    idp = models.IntegerField(primary_key=True)
    bill_number = models.CharField(max_length=50, blank=False, null=False)
    title = models.TextField(blank=True, null=False)
    initiator_name = models.TextField(blank=True, null=True)
    initiator_type = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=100, blank=True, null=True)
    procedure = models.CharField(max_length=100, blank=True, null=True)
    law_type = models.CharField(max_length=100, blank=True, null=True)
    decision_chamber = models.CharField(max_length=100, blank=True, null=True)
    registered_at = models.DateField(blank=True, null=True)
    adopted_at = models.DateField(blank=True, null=True)
    source_url = models.URLField(max_length=500, blank=True, null=True)
    scraped_at = models.DateTimeField(auto_now_add=True)
    
    # Document URLs
    doc_expunere_url = models.URLField(max_length=500, blank=True, null=True)
    doc_forma_url = models.URLField(max_length=500, blank=True, null=True)
    doc_aviz_ces_url = models.URLField(max_length=500, blank=True, null=True)
    doc_aviz_cl_url = models.URLField(max_length=500, blank=True, null=True)
    doc_adoptata_url = models.URLField(max_length=500, blank=True, null=True)
    
    # OCR Content
    ocr_expunere = models.TextField(blank=True, null=True)
    ocr_aviz_ces = models.TextField(blank=True, null=True)
    ocr_aviz_cl = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'bills'
        managed = True
        verbose_name = "Bill"
        verbose_name_plural = "Bills"

    def __str__(self):
        return f"{self.bill_number} - {self.title[:50]}..."

class ImpactCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'impact_categories'
        managed = True
        verbose_name = "Impact Category"
        verbose_name_plural = "Impact Categories"

    def __str__(self):
        return self.name

class AffectedProfile(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'affected_profiles'
        managed = True
        verbose_name = "Affected Profile"
        verbose_name_plural = "Affected Profiles"

    def __str__(self):
        return self.name

class AIAnalysis(models.Model):
    bill = models.OneToOneField(
        Bill, 
        on_delete=models.CASCADE, 
        primary_key=True, 
        db_column='bill_idp',
        related_name='ai_analysis'
    )
    processed_at = models.DateTimeField(blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    title_short = models.CharField(max_length=255, blank=True, null=True)
    
    # New Relational fields
    rel_impact_categories = models.ManyToManyField(ImpactCategory, related_name='analyses', blank=True)
    rel_affected_profiles = models.ManyToManyField(AffectedProfile, related_name='analyses', blank=True)
    
    controversy_score = models.FloatField(blank=True, null=True)
    passed_by = models.CharField(max_length=100, blank=True, null=True)
    dominant_party = models.CharField(max_length=100, blank=True, null=True)
    vote_date = models.DateField(blank=True, null=True)
    ocr_quality = models.CharField(max_length=50, blank=True, null=True)
    confidence = models.FloatField(blank=True, null=True)

    class Meta:
        db_table = 'ai_analyses'
        managed = True
        verbose_name = "AI Analysis"
        verbose_name_plural = "AI Analyses"

    def __str__(self):
        return f"Analysis for {self.pk}"

class KeyIdea(models.Model):
    analysis = models.ForeignKey(AIAnalysis, on_delete=models.CASCADE, related_name='rel_key_ideas')
    text = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'ai_key_ideas'
        managed = True
        ordering = ['order']

    def __str__(self):
        return self.text[:50]

class BillArgument(models.Model):
    ARGUMENT_TYPES = (
        ('pro', 'Pro'),
        ('con', 'Con'),
        ('general', 'General'),
    )
    analysis = models.ForeignKey(AIAnalysis, on_delete=models.CASCADE, related_name='rel_arguments')
    type = models.CharField(max_length=20, choices=ARGUMENT_TYPES)
    text = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'ai_arguments'
        managed = True
        ordering = ['type', 'order']

    def __str__(self):
        return f"[{self.type}] {self.text[:50]}"

class VoteSession(models.Model):
    idv = models.IntegerField(primary_key=True)
    bill = models.ForeignKey(
        Bill, 
        on_delete=models.CASCADE, 
        db_column='bill_idp',
        related_name='vote_sessions',
        null=True,
        blank=True
    )
    type = models.CharField(max_length=100, blank=True, null=True)
    date = models.DateField(blank=True, null=True)
    time = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    present = models.IntegerField(default=0)
    for_votes = models.IntegerField(default=0)
    against = models.IntegerField(default=0)
    abstain = models.IntegerField(default=0)
    absent = models.IntegerField(default=0)

    class Meta:
        db_table = 'vote_sessions'
        managed = True
        verbose_name = "Vote Session"
        verbose_name_plural = "Vote Sessions"

    def __str__(self):
        return f"Vote {self.idv} for {self.pk}"

class PartyVoteResult(models.Model):
    vote_session = models.ForeignKey(VoteSession, on_delete=models.CASCADE, related_name='rel_party_results')
    party = models.CharField(max_length=100)
    for_votes = models.IntegerField(default=0)
    against = models.IntegerField(default=0)
    abstain = models.IntegerField(default=0)
    absent = models.IntegerField(default=0)

    class Meta:
        db_table = 'party_vote_results'
        managed = True
        unique_together = ('vote_session', 'party')

    def __str__(self):
        return f"{self.party} on Vote {self.vote_session_id}"

class BillEvent(models.Model):
    event_key = models.CharField(primary_key=True, max_length=255)
    event_type = models.CharField(max_length=100)
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, db_column='idp', related_name='events', null=True, blank=True)
    idv = models.IntegerField(blank=True, null=True)
    bill_number = models.CharField(max_length=50, blank=True, null=True)
    source = models.CharField(max_length=50, default='cdep')
    chamber = models.CharField(max_length=50, default='deputies')
    vote_date = models.DateField(blank=True, null=True)
    summary = models.JSONField(default=dict)
    detected_at = models.DateTimeField()

    class Meta:
        db_table = 'bill_events'
        managed = True
        verbose_name = "Bill Event"
        verbose_name_plural = "Bill Events"

class BillFlag(models.Model):
    event_key = models.OneToOneField(BillEvent, on_delete=models.CASCADE, primary_key=True, db_column='event_key', related_name='flag')
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, db_column='idp', related_name='flags', null=True, blank=True)
    idv = models.IntegerField(blank=True, null=True)
    bill_number = models.CharField(max_length=50, blank=True, null=True)
    event_type = models.CharField(max_length=100)
    importance = models.CharField(max_length=50)
    flags = models.JSONField(default=list)
    classified_at = models.DateTimeField()

    class Meta:
        db_table = 'bill_flags'
        managed = True
        verbose_name = "Bill Flag"
        verbose_name_plural = "Bill Flags"
