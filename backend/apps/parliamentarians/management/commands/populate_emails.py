import json
from pathlib import Path
from django.core.management.base import BaseCommand
from apps.parliamentarians.models import Parliamentarian


class Command(BaseCommand):
    help = "Populate email field for parliamentarians from scraper JSON files"

    def handle(self, *args, **options):
        # Try to find the JSON files (relative to the project root)
        from django.conf import settings
        
        base_dir = Path(settings.BASE_DIR).parent  # Go up from backend to project root
        json_files = [
            base_dir / "scraper" / "parlamentari_cu_email.json",
        ]

        email_map = {}
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
                    email = entry.get('email')
                    
                    # Only store if email exists and is not null
                    if email:
                        email_map[name] = email
                        self.stdout.write(f"  {name} → {email}")
            except (json.JSONDecodeError, OSError) as e:
                self.stdout.write(self.style.ERROR(f"Error reading {json_file}: {e}"))
                continue

        # Update parliamentarians in the database
        self.stdout.write(f"\nUpdating {len(email_map)} parliamentarians with email...")
        
        for mp_name, email in email_map.items():
            try:
                # Try exact match first
                mp = Parliamentarian.objects.get(mp_name=mp_name)
                mp.email = email
                mp.save()
                updated_count += 1
                self.stdout.write(f"✓ Updated {mp_name}: {email}")
            except Parliamentarian.DoesNotExist:
                # Try fuzzy matching (remove extra spaces, normalize)
                normalized_name = ' '.join(mp_name.split())
                try:
                    mp = Parliamentarian.objects.get(mp_name__icontains=normalized_name)
                    mp.email = email
                    mp.save()
                    updated_count += 1
                    self.stdout.write(f"✓ Updated (fuzzy) {mp.mp_name}: {email}")
                except (Parliamentarian.DoesNotExist, Parliamentarian.MultipleObjectsReturned):
                    self.stdout.write(self.style.WARNING(f"✗ Not found: {mp_name}"))

        self.stdout.write(self.style.SUCCESS(f"\nSuccessfully updated {updated_count} parliamentarians with email data"))
