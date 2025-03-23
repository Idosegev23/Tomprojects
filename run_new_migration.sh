#!/bin/bash

# סקריפט להרצת המיגרציה החדשה
# 20250325000001_optimize_project_tables.sql

echo "הרצת מיגרציה חדשה לשיפור טבלאות פרויקט ומניעת כפילויות..."

# טעינת משתני הסביבה מקובץ .env.local
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
    echo "נטענו משתני סביבה מקובץ .env.local"
else
    echo "שגיאה: קובץ .env.local לא נמצא"
    exit 1
fi

# שימוש ב-PSQL להרצת המיגרציה
PGPASSWORD=$SUPABASE_DB_PASSWORD psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME -f migrations/20250325000001_optimize_project_tables.sql

if [ $? -eq 0 ]; then
    echo "המיגרציה הורצה בהצלחה!"
    
    # העברת המיגרציה לתיקיית המיגרציות שהורצו
    mkdir -p migrations/applied
    cp migrations/20250325000001_optimize_project_tables.sql migrations/applied/
    echo "המיגרציה הועברה לתיקיית המיגרציות שהורצו"
else
    echo "שגיאה בהרצת המיגרציה"
    exit 1
fi

echo "עדכון סכמת מסד הנתונים..."

# הרצת סקריפט עדכון סכמה
sh fetch_schema.sh

echo "סיום התהליך בהצלחה!" 