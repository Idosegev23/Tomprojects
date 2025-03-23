#!/bin/bash

echo "=== הרצת מיגרציה חדשה: תיקון פונקציית מחיקת שלב ==="

# מידע חיבור לסופאבייס (נלקח מסקריפט fetch_schema.sh)
DB_HOST="aws-0-eu-central-1.pooler.supabase.com"
DB_NAME="postgres"
DB_USER="postgres.orgkbmxecoegyjojoqmh"
DB_PASSWORD="DV55b2XoiUy3nQ4X"

# הרצת קובץ המיגרציה
echo "מריץ מיגרציה 20250327000001_fix_delete_stage.sql..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -d $DB_NAME -U $DB_USER -f migrations/20250327000001_fix_delete_stage.sql

if [ $? -eq 0 ]; then
    echo "המיגרציה הורצה בהצלחה!"
    
    # יצירת תיקיית applied אם לא קיימת
    if [ ! -d "migrations/applied" ]; then
        mkdir -p migrations/applied
    fi
    
    # העתקת קובץ המיגרציה לתיקיית applied
    cp migrations/20250327000001_fix_delete_stage.sql migrations/applied/
    echo "קובץ המיגרציה הועתק לתיקיית applied."
else
    echo "אירעה שגיאה בהרצת המיגרציה!"
    exit 1
fi

# עדכון הסכימה מחדש
./fetch_schema.sh

echo "=== תהליך המיגרציה הושלם בהצלחה! ===" 