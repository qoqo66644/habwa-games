import { getAdminPlayed, markAdminPlayed, resetAdminPlayed } from "@/lib/admin-played.functions";
import { supabase as cloudClient } from "@/integrations/supabase/client";

// Loose-typed handle so the existing query helpers below keep working.
export const supabase = cloudClient as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};


// Types for database tables
export interface DBCategory {
  id: string
  name: string
  icon_key: string
  icon_url?: string | null | undefined
  created_at?: string | undefined
  updated_at?: string | undefined
}

export interface DBQuestion {
  id: string
  category_id: string
  level: number
  question: string
  answer: string
  image_url?: string | null | undefined
  answer_image_url?: string | null | undefined
  video_url?: string | null | undefined
  answer_video_url?: string | null | undefined
  qr_enabled?: boolean | undefined
  qr_token?: string | undefined
  created_at?: string | undefined
}

export interface DBActivationKey {
  id?: string | undefined
  key: string
  is_active: boolean
  remaining_uses: number
  used_question_ids: string[]
  help_pit_used: boolean
  help_call_used: boolean
  help_two_answers_used: boolean
  created_at?: string | undefined
}

export interface DBPlayedQuestion {
  id?: string | undefined
  question_id: string
  played_at?: string | undefined
}

// Category operations
export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select(`
      *,
      questions (*)
    `)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('[v0] Error fetching categories:', error)
    return null
  }
  return data
}

export async function upsertCategory(category: Omit<DBCategory, 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('categories')
    .upsert({
      id: category.id,
      name: category.name,
      icon_key: category.icon_key,
      icon_url: category.icon_url || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
    .select()
  
  if (error) {
    console.error('[v0] Error upserting category:', error)
    return null
  }
  return data
}

export async function deleteCategory(categoryId: string) {
  // Delete all questions in category first
  await supabase.from('questions').delete().eq('category_id', categoryId)
  
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
  
  if (error) {
    console.error('[v0] Error deleting category:', error)
    return false
  }
  return true
}

// Question operations
export async function upsertQuestion(categoryId: string, question: Omit<DBQuestion, 'created_at' | 'category_id'> & { category_id?: string }) {
  try {
    const questionData = {
      id: question.id,
      category_id: categoryId,
      level: question.level,
      question: question.question,
      answer: question.answer,
      image_url: question.image_url || null,
      answer_image_url: question.answer_image_url || null,
      video_url: question.video_url || null,
      answer_video_url: question.answer_video_url || null,
      qr_enabled: question.qr_enabled ?? false,
      ...(question.qr_token ? { qr_token: question.qr_token } : {})
    }
    
    console.log('[v0] Upserting question:', questionData)
    
    const { data, error } = await supabase
      .from('questions')
      .upsert(questionData, { onConflict: 'id' })
      .select()
    
    if (error) {
      console.error('[v0] Error upserting question:', error.message, error.details)
      return null
    }
    
    console.log('[v0] Question upserted successfully:', data)
    return data?.[0] ?? null
  } catch (err) {
    console.error('[v0] Exception upserting question:', err)
    return null
  }
}

export async function deleteQuestion(questionId: string) {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId)
  
  if (error) {
    console.error('[v0] Error deleting question:', error)
    return false
  }
  return true
}

// Activation keys operations
export async function fetchActivationKeys() {
  try {
    // Add timeout to prevent infinite loading
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout
    
    const { data, error } = await supabase
      .from('activation_keys')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .abortSignal(controller.signal)
    
    clearTimeout(timeoutId)
    
    if (error) {
      console.error('[v0] Error fetching activation keys:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.error('[v0] Exception fetching activation keys:', err)
    return null
  }
}

export async function addActivationKey(key: string, remainingUses: number = 999) {
  const { data, error } = await supabase
    .from('activation_keys')
    .insert({
      key: key.trim().toUpperCase(),
      is_active: true,
      remaining_uses: remainingUses,
      used_question_ids: [],
      help_pit_used: false,
      help_call_used: false,
      help_two_answers_used: false
    })
    .select()
  
  if (error) {
    console.error('[v0] Error adding activation key:', error)
    return null
  }
  return data
}

export async function removeActivationKey(key: string) {
  const { error } = await supabase
    .from('activation_keys')
    .update({ is_active: false })
    .eq('key', key)
  
  if (error) {
    console.error('[v0] Error removing activation key:', error)
    return false
  }
  return true
}

export type ValidationResult = 
  | { status: 'valid'; data: DBActivationKey }
  | { status: 'not_found' }
  | { status: 'used' }
  | { status: 'expired' }
  | { status: 'error'; message: string }

export async function validateActivationKey(key: string): Promise<DBActivationKey | null> {
  const result = await validateActivationKeyWithStatus(key)
  if (result.status === 'valid') {
    return result.data
  }
  return null
}

export async function validateActivationKeyWithStatus(key: string): Promise<ValidationResult> {
  try {
    const normalizedKey = key.trim().toUpperCase()
    console.log('[v0] Validating key:', normalizedKey)
    
    // Add timeout to prevent infinite loading
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    // First, check if the key exists at all (regardless of is_active status)
    const { data: allData, error: allError } = await supabase
      .from('activation_keys')
      .select('*')
      .eq('key', normalizedKey)
      .abortSignal(controller.signal)
    
    clearTimeout(timeoutId)
    
    if (allError) {
      console.error('[v0] Error querying activation key:', allError.message)
      return { status: 'error', message: allError.message }
    }
    
    // Key doesn't exist
    if (!allData || allData.length === 0) {
      console.log('[v0] Key not found in database')
      return { status: 'not_found' }
    }
    
    const keyData = allData[0] as DBActivationKey
    
    // Key exists but is deactivated
    if (!keyData.is_active) {
      console.log('[v0] Key is deactivated')
      return { status: 'expired' }
    }
    
    // A depleted key can still access its saved games for replay.
    // New-game consumption is enforced atomically by start_habwa_game().
    console.log('[v0] Key validated successfully:', keyData.key)
    return { status: 'valid', data: keyData }
  } catch (err) {
    console.error('[v0] Exception validating activation key:', err)
    return { status: 'error', message: String(err) }
  }
}

export async function getActivationKeyData(key: string) {
  const { data, error } = await supabase
    .from('activation_keys')
    .select('*')
    .eq('key', key.trim().toUpperCase())
    .eq('is_active', true)
    .single()
  
  if (error || !data) {
    return null
  }
  return data as DBActivationKey
}

export async function getActivationKeyDataForStart(key: string): Promise<
  | { ok: true; data: DBActivationKey }
  | { ok: false; operation: 'credit_check'; message: string }
> {
  const { data, error } = await supabase
    .from('activation_keys')
    .select('*')
    .eq('key', key.trim().toUpperCase())
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[habwa] credit_check:', error)
    return { ok: false, operation: 'credit_check', message: error.message }
  }
  if (!data) {
    return { ok: false, operation: 'credit_check', message: 'INVALID_ACTIVATION_KEY' }
  }
  return { ok: true, data: data as DBActivationKey }
}

export async function decrementKeyUses(key: string) {
  const { data: current } = await supabase
    .from('activation_keys')
    .select('remaining_uses')
    .eq('key', key.trim().toUpperCase())
    .single()
  
  if (!current || current.remaining_uses === null) return true
  
  const { error } = await supabase
    .from('activation_keys')
    .update({ remaining_uses: Math.max(0, current.remaining_uses - 1) })
    .eq('key', key.trim().toUpperCase())
  
  return !error
}

export async function markQuestionUsedForKey(key: string, questionId: string) {
  const { data: current } = await supabase
    .from('activation_keys')
    .select('used_question_ids')
    .eq('key', key.trim().toUpperCase())
    .single()
  
  if (!current) return false
  
  const usedIds = current.used_question_ids || []
  if (usedIds.includes(questionId)) return true
  
  const { error } = await supabase
    .from('activation_keys')
    .update({ used_question_ids: [...usedIds, questionId] })
    .eq('key', key.trim().toUpperCase())
  
  return !error
}

export async function useHelpTool(key: string, tool: 'pit' | 'call' | 'two_answers') {
  const column = tool === 'pit' ? 'help_pit_used' : tool === 'call' ? 'help_call_used' : 'help_two_answers_used'
  
  const { error } = await supabase
    .from('activation_keys')
    .update({ [column]: true })
    .eq('key', key.trim().toUpperCase())
  
  return !error
}

export async function resetHelpToolsForKey(key: string) {
  const { error } = await supabase
    .from('activation_keys')
    .update({ 
      help_pit_used: false, 
      help_call_used: false, 
      help_two_answers_used: false 
    })
    .eq('key', key.trim().toUpperCase())
  
  return !error
}


export interface DBGameSession {
  id: string
  activation_key: string
  game_name: string
  selected_categories: string[]
  active_board: Record<string, DBQuestion[]>
  team_names: [string, string]
  starting_team_index: 0 | 1
  replay_count: number
  created_at?: string
  updated_at?: string
}

export type StartGameRpcResult =
  | { ok: true; gameId: string | null; remaining: number | null }
  | { ok: false; code: 'no_credit' | 'invalid_key' | 'error'; operation: 'start_habwa_game'; message?: string }

export async function startNewGameForKey(params: {
  key: string
  gameName: string
  selectedCategories: string[]
  activeBoard: Record<string, DBQuestion[]>
  teamNames: [string, string]
  startingTeamIndex: 0 | 1
}): Promise<StartGameRpcResult> {
  const { data, error } = await supabase.rpc('start_habwa_game', {
    p_key: params.key.trim().toUpperCase(),
    p_game_name: params.gameName || 'لعبة حبوة',
    p_selected_categories: params.selectedCategories,
    p_active_board: params.activeBoard,
    p_team_names: params.teamNames,
    p_starting_team_index: params.startingTeamIndex,
  })
  if (error) {
    console.error('[habwa] start_habwa_game:', error)
    const msg = String(error.message ?? '')
    if (msg.includes('NO_REMAINING_GAMES')) return { ok: false, code: 'no_credit', operation: 'start_habwa_game' }
    if (msg.includes('INVALID_ACTIVATION_KEY')) return { ok: false, code: 'invalid_key', operation: 'start_habwa_game' }
    return { ok: false, code: 'error', operation: 'start_habwa_game', message: msg }
  }
  const row = data?.[0] ?? data ?? null
  return {
    ok: true,
    gameId: row?.game_id ?? row?.id ?? null,
    remaining: typeof row?.remaining_uses === 'number' ? row.remaining_uses : null,
  }
}

export async function fetchGameSessions(key: string): Promise<DBGameSession[]> {
  const { data, error } = await supabase.rpc('get_habwa_games', {
    p_key: key.trim().toUpperCase(),
  })
  if (error) {
    console.error('[habwa] fetchGameSessions:', error)
    return []
  }
  return (data ?? []) as DBGameSession[]
}

export async function replayGameForKey(key: string, gameId: string) {
  const { data, error } = await supabase.rpc('replay_habwa_game', {
    p_key: key.trim().toUpperCase(),
    p_game_id: gameId,
  })
  if (error) {
    console.error('[habwa] replay_habwa_game:', error)
    return null
  }
  return data?.[0] ?? data ?? null
}

// Played questions operations
function adminToken(): string | null {
  if (typeof window === 'undefined') return null
  if (window.sessionStorage.getItem('habwa-admin-unlocked') !== '1') return null
  return window.sessionStorage.getItem('habwa-admin-token')
}

async function currentUserId(): Promise<string | null> {
  const { data } = await cloudClient.auth.getSession()
  return data.session?.user?.id ?? null
}

export async function fetchPlayedQuestions() {
  const tok = adminToken()
  if (tok) {
    try { return await getAdminPlayed({ data: { token: tok } }) } catch { return [] }
  }
  const userId = await currentUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from('played_questions')
    .select('question_id')
    .eq('user_id', userId)

  if (error) {
    console.error('[v0] Error fetching played questions:', error)
    return []
  }
  return data?.map((p: any) => p.question_id) || []
}

export async function markQuestionAsPlayed(questionId: string) {
  const tok = adminToken()
  if (tok) {
    try { return (await markAdminPlayed({ data: { token: tok, questionId } })).ok } catch { return false }
  }
  const userId = await currentUserId()
  if (!userId) return false
  const { error } = await supabase
    .from('played_questions')
    .upsert({ question_id: questionId, user_id: userId }, { onConflict: 'user_id,question_id' })

  if (error) {
    console.error('[v0] Error marking question as played:', error)
    return false
  }
  return true
}

export async function resetPlayedQuestions() {
  const tok = adminToken()
  if (tok) {
    try { return (await resetAdminPlayed({ data: { token: tok } })).ok } catch { return false }
  }
  const userId = await currentUserId()
  if (!userId) return false
  const { error } = await supabase
    .from('played_questions')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('[v0] Error resetting played questions:', error)
    return false
  }
  return true
}

// Bulk operations for initial sync
export async function syncAllCategories(categories: Array<{
  id: string
  name: string
  iconKey: string
  iconUrl?: string | undefined
  questions: Array<{
    id: string
    level: number
    question: string
    answer: string
    imageUrl?: string | undefined
    answerImageUrl?: string | undefined
    videoUrl?: string | undefined
    answerVideoUrl?: string | undefined
  }>
}>) {
  for (const cat of categories) {
    await upsertCategory({
      id: cat.id,
      name: cat.name,
      icon_key: cat.iconKey,
      icon_url: cat.iconUrl
    })
    
    for (const q of cat.questions) {
      await upsertQuestion(cat.id, {
        id: q.id,
        level: q.level,
        question: q.question,
        answer: q.answer,
        image_url: q.imageUrl,
        answer_image_url: q.answerImageUrl,
        video_url: q.videoUrl,
      })

    }
  }
}
