#!/bin/bash

# מידע חיבור לסופאבייס
DB_HOST="aws-0-eu-central-1.pooler.supabase.com"
DB_NAME="postgres"
DB_USER="postgres.orgkbmxecoegyjojoqmh"
DB_PASSWORD="DV55b2XoiUy3nQ4X"

# ריצת מיגרציה 1 - שינוי מבנה טבלת המשימות
echo "מריץ מיגרציה לשינוי מבנה טבלת המשימות..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -d $DB_NAME -U $DB_USER -f migrations/20250321000001_tasks_restructure.sql

# ריצת מיגרציה 2 - העברת נתונים (אופציונלי)
echo "מריץ מיגרציה להעברת נתונים..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -d $DB_NAME -U $DB_USER -f migrations/20250321000002_tasks_data_migration.sql

echo "המיגרציות הסתיימו בהצלחה!" 