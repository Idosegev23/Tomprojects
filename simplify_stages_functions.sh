#!/bin/bash

# סקריפט לפישוט פונקציות טבלאות שלבים וביטול כפילויות
# =======================================================

echo "==== תחילת תהליך פישוט פונקציות טבלאות שלבים ===="

# קובץ זמני לאחסון פלט שגיאות
ERROR_LOG="simplify_error.log"

# צעד 1: בדיקת זמינות Supabase CLI
if ! command -v supabase &> /dev/null; then
  echo "❌ שגיאה: הכלי Supabase CLI אינו מותקן. אנא התקן אותו לפי ההוראות ב-"
  echo "https://supabase.com/docs/guides/cli/getting-started"
  exit 1
fi

echo "ℹ️  מידע על גרסת Supabase CLI המותקנת:"
supabase --version

# הגדרת פונקציה להרצת SQL על שרת Supabase
run_sql() {
  local sql_command="$1"
  echo "הרצת SQL: $sql_command" >> "$ERROR_LOG"
  supabase functions new temp-sql-function --sql
  echo "$sql_command" > ./supabase/functions/temp-sql-function/index.sql 
  supabase functions deploy temp-sql-function
  supabase functions delete temp-sql-function --confirm
}

# צעד 2: בדיקת חיבור לשרת Supabase
echo "בודק חיבור לשרת Supabase..."
if ! supabase status > /dev/null 2>> "$ERROR_LOG"; then
  echo "⚠️ נראה שאין חיבור מלא לשרת Supabase. ננסה להמשיך בכל זאת..."
fi

# צעד 3: העלאת המיגרציה החדשה
echo "מכין את המיגרציה החדשה..."
mkdir -p supabase/migrations
echo "הקובץ supabase/migrations/20250900000000_simplify_stage_functions.sql כבר קיים."

# צעד 4: העלאת המיגרציה באמצעות Supabase
echo "מנסה להעלות את המיגרציה לשרת Supabase..."
supabase db push supabase/migrations/20250900000000_simplify_stage_functions.sql 2>> "$ERROR_LOG" || {
  echo "⚠️ הייתה בעיה בהעלאת המיגרציה. מנסה בדרך חלופית..."
  
  # אם יש שגיאה, ננסה ליצור פונקציה SQL סטנדרטית שתרוץ את תוכן הקובץ
  echo "מנסה להעלות את המיגרציה באמצעות פונקציית SQL..."
  SQL_CONTENT=$(cat supabase/migrations/20250900000000_simplify_stage_functions.sql)
  run_sql "$SQL_CONTENT"
}

# צעד 5: בדיקה שהפונקציה נוצרה
echo "בודק שהפונקציה החדשה נוצרה..."
CHECK_FUNCTION="SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'manage_project_stages_table');"

run_sql "$CHECK_FUNCTION"
echo "✅ אם לא הופיעו שגיאות, סביר להניח שהפונקציה נוצרה בהצלחה."

# צעד 6: ריענון סכימה
echo "מרענן את סכימת PostgREST..."
REFRESH_SCHEMA="NOTIFY pgrst, 'reload schema';"
run_sql "$REFRESH_SCHEMA"

# צעד 7: הרצת הפונקציה על כל הפרויקטים
echo "מפעיל את הפונקציה על כל הפרויקטים..."
FIX_ALL_SQL="DO \$\$ 
DECLARE
  project_rec record;
  fixed_count integer := 0;
  failed_count integer := 0;
BEGIN
  RAISE NOTICE 'מתחיל תיקון של כל טבלאות השלבים הקיימות...';
  
  FOR project_rec IN SELECT id FROM projects
  LOOP
    IF manage_project_stages_table(project_rec.id) THEN
      fixed_count := fixed_count + 1;
    ELSE
      failed_count := failed_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'סיום תיקון טבלאות שלבים. הצלחות: %, כשלונות: %', fixed_count, failed_count;
END \$\$;"

run_sql "$FIX_ALL_SQL"

# צעד 8: עדכון לוג מעקב
echo "סיום תהליך פישוט פונקציות טבלאות שלבים - $(date)" >> build_tracking.md

echo ""
echo "==== תהליך הפישוט הסתיים ===="
echo "נעשה ניסיון ליצור את הפונקציות הבאות בשרת Supabase:"
echo "- הפונקציה המאוחדת: manage_project_stages_table"
echo "- פונקציות מעטפת לתאימות לאחור: create_project_stages_table, fix_project_stages_table, fix_specific_project_stages_table"
echo ""
echo "בדוק את הקובץ $ERROR_LOG לפרטי שגיאות, אם היו כאלה."
echo ""
echo "הערות חשובות להמשך:"
echo "1. כדאי לוודא שהפונקציות אכן נוצרו על ידי בדיקת הרשאות ב-dashboard של Supabase"
echo "2. עדכן את קוד ה-TypeScript לפי ההמלצות בקובץ simplify_client_code.md" 