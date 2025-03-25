// supabase/functions/fix-stages-sync/index.ts
// פונקציית קצה לתיקון סנכרון שלבים בפרויקטים

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // יצירת חיבור לסופרבייס
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // אנחנו צריכים להריץ את הפונקציה על פרויקט מסוים
    const { projectId } = await req.json()

    if (!projectId) {
      return new Response(
        JSON.stringify({ 
          error: 'חסר מזהה פרויקט' 
        }),
        { 
          headers: { 'Content-Type': 'application/json' }, 
          status: 400 
        }
      )
    }

    // בדיקה שהפרויקט קיים
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ 
          error: `הפרויקט ${projectId} לא נמצא`,
          details: projectError?.message
        }),
        { 
          headers: { 'Content-Type': 'application/json' }, 
          status: 404 
        }
      )
    }

    // 1. העדכון של השלבים במסד הנתונים ישירות באמצעות SQL
    const { data: syncResult, error: syncError } = await supabase.rpc(
      'copy_stages_to_project',
      { project_id: projectId }
    )

    if (syncError) {
      return new Response(
        JSON.stringify({ 
          error: 'שגיאה בתהליך העתקת השלבים',
          details: syncError.message
        }),
        { 
          headers: { 'Content-Type': 'application/json' }, 
          status: 500 
        }
      )
    }

    // 2. שליפת השלבים מהפרויקט
    const stagesTableName = `project_${projectId}_stages`
    const { data: stages, error: stagesError } = await supabase
      .from(stagesTableName)
      .select('*')

    if (stagesError) {
      return new Response(
        JSON.stringify({ 
          error: `אירעה שגיאה בגישה לטבלת השלבים ${stagesTableName}`,
          details: stagesError.message,
          sync_attempted: true
        }),
        { 
          headers: { 'Content-Type': 'application/json' }, 
          status: 500 
        }
      )
    }

    // בדיקה אם הצלחנו לגשת לטבלה אבל אין שלבים
    const { data: generalStages, error: generalStagesError } = await supabase
      .from('stages')
      .select('*')
      .is('project_id', null)

    // החזרת תשובה
    return new Response(
      JSON.stringify({
        success: true,
        message: `סנכרון השלבים לפרויקט ${project.name} (${projectId}) הושלם בהצלחה`,
        project_stages_count: stages?.length || 0,
        general_stages_count: generalStages?.length || 0,
        stages: stages
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'אירעה שגיאה בלתי צפויה',
        details: error.message 
      }),
      { 
        headers: { 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
}) 