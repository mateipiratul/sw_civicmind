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
        managed = False
        verbose_name = "Bill"
        verbose_name_plural = "Bills"

    def __str__(self):
        return f"{self.bill_number} - {self.title[:50]}..."

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
    key_ideas = models.JSONField(default=list)
    impact_categories = models.JSONField(default=list)
    affected_profiles = models.JSONField(default=list)
    arguments = models.JSONField(default=dict)
    pro_arguments = models.JSONField(default=list)
    con_arguments = models.JSONField(default=list)
    controversy_score = models.FloatField(blank=True, null=True)
    passed_by = models.CharField(max_length=100, blank=True, null=True)
    dominant_party = models.CharField(max_length=100, blank=True, null=True)
    vote_date = models.DateField(blank=True, null=True)
    ocr_quality = models.CharField(max_length=50, blank=True, null=True)
    confidence = models.FloatField(blank=True, null=True)

    class Meta:
        db_table = 'ai_analyses'
        managed = False
        verbose_name = "AI Analysis"
        verbose_name_plural = "AI Analyses"

    def __str__(self):
        return f"Analysis for {self.pk}"

class VoteSession(models.Model):
    idv = models.IntegerField(primary_key=True)
    bill = models.ForeignKey(
        Bill, 
        on_delete=models.CASCADE, 
        db_column='bill_idp',
        related_name='vote_sessions'
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
    by_party = models.JSONField(default=list)

    class Meta:
        db_table = 'vote_sessions'
        managed = False
        verbose_name = "Vote Session"
        verbose_name_plural = "Vote Sessions"

    def __str__(self):
        return f"Vote {self.idv} for {self.pk}"
