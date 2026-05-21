import json
import re
from pathlib import Path
from django.core.management.base import BaseCommand
from apps.parliamentarians.models import Parliamentarian


class Command(BaseCommand):
    help = "Populate county field for parliamentarians from scraper JSON files"

    def handle(self, *args, **options):
        # Try to find the JSON files (relative to the project root)
        import os
        from django.conf import settings
        
        base_dir = Path(settings.BASE_DIR).parent  # Go up from backend to project root
        json_files = [
            base_dir / "scraper" / "deputati_cu_email.json",
            base_dir / "scraper" / "deputati_emails.json",
        ]

        county_map = {}
        updated_count = 0

        for json_file in json_files:
            if not json_file.exists():
                self.stdout.write(self.style.WARNING(f"File not found: {json_file}"))
                continue

            self.stdout.write(f"Reading from {json_file}...")
            
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                for entry in data:
                    name = entry.get('name', '')
                    electoral_district = entry.get('electoral_district', '')
                    
                    # Extract county from electoral_district (format: "4 / BACĂU")
                    if '/' in electoral_district:
                        county = electoral_district.split('/')[-1].strip()
                        county_map[name] = county
                        self.stdout.write(f"  {name} → {county}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error reading {json_file}: {e}"))
                continue

        # Update parliamentarians in the database
        self.stdout.write(f"\nUpdating {len(county_map)} parliamentarians...")
        
        for mp_name, county in county_map.items():
            try:
                # Try exact match first
                mp = Parliamentarian.objects.get(mp_name=mp_name)
                mp.county = county
                mp.save()
                updated_count += 1
                self.stdout.write(f"✓ Updated {mp_name}: {county}")
            except Parliamentarian.DoesNotExist:
                # Try fuzzy matching (remove extra spaces, normalize)
                normalized_name = ' '.join(mp_name.split())
                try:
                    mp = Parliamentarian.objects.get(mp_name__icontains=normalized_name)
                    mp.county = county
                    mp.save()
                    updated_count += 1
                    self.stdout.write(f"✓ Updated (fuzzy) {mp.mp_name}: {county}")
                except (Parliamentarian.DoesNotExist, Parliamentarian.MultipleObjectsReturned):
                    self.stdout.write(self.style.WARNING(f"✗ Not found: {mp_name}"))

        self.stdout.write(self.style.SUCCESS(f"\nSuccessfully updated {updated_count} parliamentarians with county data"))
