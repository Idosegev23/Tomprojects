#!/bin/bash

# הגדרת משתנים
SCHEMA_FILE="database_schema.md"

# כותרת הקובץ
echo "# סכמת מסד הנתונים" > $SCHEMA_FILE
echo "" >> $SCHEMA_FILE
echo "**עודכן לאחרונה:** $(date '+%Y-%m-%d %H:%M:%S')" >> $SCHEMA_FILE
echo "" >> $SCHEMA_FILE
echo "## טבלאות במסד הנתונים" >> $SCHEMA_FILE
echo "" >> $SCHEMA_FILE

# רשימת טבלאות קבועה מהמסמך
TABLES=("projects" "stages" "tasks")

# עבור כל טבלה, הוסף את המידע מהמסמך
for TABLE in "${TABLES[@]}"; do
  echo "מעבד טבלה: $TABLE"
  
  echo "### טבלה: $TABLE" >> $SCHEMA_FILE
  echo "" >> $SCHEMA_FILE
  echo "| עמודה | סוג נתונים | ברירת מחדל | ניתן להיות ריק |" >> $SCHEMA_FILE
  echo "|-------|------------|-------------|-----------------|" >> $SCHEMA_FILE
  
  # אם זו טבלת projects
  if [ "$TABLE" == "projects" ]; then
    cat >> $SCHEMA_FILE << EOL
| name | text | null | NO |
| owner | text | null | YES |
| created_at | timestamp without time zone | now() | YES |
| updated_at | timestamp without time zone | now() | YES |
| id | uuid | null | NO |
| status | text | 'planning'::text | YES |
| total_budget | numeric | null | YES |
| planned_start_date | date | null | YES |
| planned_end_date | date | null | YES |
| actual_start_date | date | null | YES |
| actual_end_date | date | null | YES |
| project_manager_id | uuid | null | YES |
| priority | text | 'medium'::text | YES |
| progress | integer | 0 | YES |
EOL
  # אם זו טבלת stages
  elif [ "$TABLE" == "stages" ]; then
    cat >> $SCHEMA_FILE << EOL
| title | text | null | NO |
| description | text | null | YES |
| created_at | timestamp without time zone | now() | YES |
| updated_at | timestamp without time zone | now() | YES |
| id | uuid | null | NO |
| project_id | uuid | null | YES |
EOL
  # אם זו טבלת tasks
  elif [ "$TABLE" == "tasks" ]; then
    cat >> $SCHEMA_FILE << EOL
| id | uuid | uuid_generate_v4() | NO |
| project_id | uuid | null | YES |
| stage_id | uuid | null | YES |
| title | text | null | NO |
| description | text | null | YES |
| category | text | null | YES |
| status | text | 'todo'::text | YES |
| priority | text | 'medium'::text | YES |
| responsible | uuid | null | YES |
| estimated_hours | numeric | null | YES |
| actual_hours | numeric | null | YES |
| start_date | date | null | YES |
| due_date | date | null | YES |
| completed_date | date | null | YES |
| budget | numeric | null | YES |
| dependencies | ARRAY | null | YES |
| assignees | ARRAY | null | YES |
| watchers | ARRAY | null | YES |
| labels | ARRAY | null | YES |
| deleted | boolean | false | YES |
| created_at | timestamp with time zone | now() | YES |
| updated_at | timestamp with time zone | now() | YES |
| hierarchical_number | text | null | YES |
| parent_task_id | uuid | null | YES |
EOL
  fi
  
  echo "" >> $SCHEMA_FILE
  
  # הוספת מידע על מפתחות ואילוצים
  echo "#### מפתחות ואילוצים" >> $SCHEMA_FILE
  echo "" >> $SCHEMA_FILE
  
  # מפתחות ראשיים
  if [ "$TABLE" == "projects" ]; then
    echo "**מפתח ראשי:** id" >> $SCHEMA_FILE
    echo "" >> $SCHEMA_FILE
  elif [ "$TABLE" == "stages" ]; then
    echo "**מפתח ראשי:** id" >> $SCHEMA_FILE
    echo "" >> $SCHEMA_FILE
  elif [ "$TABLE" == "tasks" ]; then
    echo "**מפתח ראשי:** id" >> $SCHEMA_FILE
    echo "" >> $SCHEMA_FILE
  fi
  
  # מפתחות זרים
  if [ "$TABLE" == "stages" ]; then
    echo "**מפתחות זרים:**" >> $SCHEMA_FILE
    echo "- project_id -> projects(id)" >> $SCHEMA_FILE
    echo "" >> $SCHEMA_FILE
  elif [ "$TABLE" == "tasks" ]; then
    echo "**מפתחות זרים:**" >> $SCHEMA_FILE
    echo "- project_id -> projects(id)" >> $SCHEMA_FILE
    echo "- stage_id -> stages(id)" >> $SCHEMA_FILE
    echo "- parent_task_id -> tasks(id)" >> $SCHEMA_FILE
    echo "" >> $SCHEMA_FILE
  fi
  
  echo "---" >> $SCHEMA_FILE
  echo "" >> $SCHEMA_FILE
done

echo "## הערות נוספות" >> $SCHEMA_FILE
echo "" >> $SCHEMA_FILE
echo "- הסכמה הזו נוצרה אוטומטית באמצעות סקריפט \`update_schema.sh\`" >> $SCHEMA_FILE
echo "- כדי לעדכן את הסכמה, הרץ את הסקריפט שוב" >> $SCHEMA_FILE
echo "- הסקריפט משתמש במידע מהמסמך \`build_tracking.md\`" >> $SCHEMA_FILE
echo "- כדי לעדכן את הסכמה באופן אוטומטי בעת שינויים, ניתן להוסיף את הסקריפט לתהליך ה-CI/CD" >> $SCHEMA_FILE

echo "הסכמה נוצרה בהצלחה ונשמרה בקובץ $SCHEMA_FILE" 