#!/bin/bash

# קובץ זה בודק את פונקציית get_tasks_tree עם פרמטרים שונים

# פרטי התחברות לסופאבייס (יש לשנות לפי הצורך)
SUPABASE_URL=${SUPABASE_URL:-"https://orgkbmxecoegyjojoqmh.supabase.co"}
SUPABASE_KEY=${SUPABASE_KEY:-"$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2)"}

# מזהה פרויקט לבדיקה - שנה לפי הצורך
PROJECT_ID=${PROJECT_ID:-"2a9e930c-ce1f-4174-9852-2a380f271394"}

# הרצת הבדיקה
echo "בודק את פונקציית get_tasks_tree עבור פרויקט $PROJECT_ID"
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/get_tasks_tree" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d "{ \"project_id\": \"$PROJECT_ID\" }" | jq

echo "בודק את הטבלה הספציפית של הפרויקט"
curl -s -X GET "$SUPABASE_URL/rest/v1/project_${PROJECT_ID}_tasks?select=*" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" | jq

echo "סיום בדיקה." 