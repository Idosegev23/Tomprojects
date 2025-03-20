#!/bin/bash

# מידע חיבור לסופאבייס
DB_HOST="aws-0-eu-central-1.pooler.supabase.com"
DB_NAME="postgres"
DB_USER="postgres.orgkbmxecoegyjojoqmh"
DB_PASSWORD="DV55b2XoiUy3nQ4X"

# הגדרת הטבלאות שברצוננו לשאוב את הסכמה שלהן
TABLES=("stages" "tasks" "stages_history")

# יוצר קובץ תוצאה עם כותרת
echo "# סכמת מסד הנתונים העדכנית" > current_schema.md
echo "**תאריך שאיבה:** $(date)" >> current_schema.md
echo "" >> current_schema.md

# מעבר על כל הטבלאות ושאיבת המידע על העמודות
for TABLE in "${TABLES[@]}"; do
  echo "## טבלה: $TABLE" >> current_schema.md
  echo "" >> current_schema.md
  echo "| עמודה | סוג נתונים | ברירת מחדל | הערות |" >> current_schema.md
  echo "|-------|------------|-------------|-------|" >> current_schema.md
  
  # שאיבת מבנה העמודות מהטבלה
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -d $DB_NAME -U $DB_USER -t -c "
    SELECT 
      column_name, 
      data_type, 
      column_default,
      CASE 
        WHEN is_nullable = 'NO' THEN 'לא ניתן לערך NULL'
        ELSE '' 
      END as notes
    FROM 
      information_schema.columns 
    WHERE 
      table_name = '$TABLE' 
    ORDER BY 
      ordinal_position;" | while read LINE; do
    
    # חילוץ המידע והוספתו לקובץ התוצאה
    COL_NAME=$(echo $LINE | awk '{print $1}')
    DATA_TYPE=$(echo $LINE | awk '{print $2}')
    DEFAULT_VAL=$(echo $LINE | awk '{print $3}')
    NOTES=$(echo $LINE | awk '{print $4" "$5" "$6" "$7" "$8}')
    
    echo "| $COL_NAME | $DATA_TYPE | $DEFAULT_VAL | $NOTES |" >> current_schema.md
  done
  
  echo "" >> current_schema.md
  
  # שאיבת מידע על אינדקסים
  echo "### אינדקסים" >> current_schema.md
  echo "" >> current_schema.md
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -d $DB_NAME -U $DB_USER -t -c "
    SELECT
      indexname,
      indexdef
    FROM
      pg_indexes
    WHERE
      tablename = '$TABLE';" | while read LINE; do
    
    INDEX_NAME=$(echo $LINE | awk '{print $1}')
    INDEX_DEF=$(echo $LINE | awk '{$1=""; print $0}')
    
    echo "- **$INDEX_NAME:** $INDEX_DEF" >> current_schema.md
  done
  
  echo "" >> current_schema.md
  
  # שאיבת מידע על טריגרים
  echo "### טריגרים" >> current_schema.md
  echo "" >> current_schema.md
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -d $DB_NAME -U $DB_USER -t -c "
    SELECT
      trigger_name,
      event_manipulation,
      action_statement
    FROM
      information_schema.triggers
    WHERE
      event_object_table = '$TABLE';" | while read LINE; do
    
    TRIGGER_NAME=$(echo $LINE | awk '{print $1}')
    EVENT=$(echo $LINE | awk '{print $2}')
    ACTION=$(echo $LINE | awk '{$1=""; $2=""; print $0}')
    
    echo "- **$TRIGGER_NAME:** מופעל בעת $EVENT, פעולה: $ACTION" >> current_schema.md
  done
  
  echo "" >> current_schema.md
  echo "---" >> current_schema.md
  echo "" >> current_schema.md
done

echo "שאיבת מבנה הטבלאות הסתיימה בהצלחה! התוצאות נשמרו בקובץ current_schema.md" 