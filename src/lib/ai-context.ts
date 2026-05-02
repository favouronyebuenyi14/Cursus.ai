import { createClient } from '@/lib/supabase/server'

export async function getGlobalContext(query: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ''

  try {
    // 1. Fetch all user content
    // We fetch a bit of everything and do a simple keyword search in memory for now
    // In a production app, this would use pgvector or a search index
    const [docsRes, notesRes, researchRes] = await Promise.all([
      supabase.from('documents').select('title, extracted_text').eq('user_id', user.id).not('extracted_text', 'is', null),
      supabase.from('notes').select('title, content').eq('user_id', user.id),
      supabase.from('research_documents').select('title, content').eq('user_id', user.id)
    ])

    const allContext: { title: string, content: string, type: string }[] = []

    if (docsRes.data) docsRes.data.forEach(d => allContext.push({ title: d.title, content: d.extracted_text!, type: 'PDF' }))
    if (notesRes.data) notesRes.data.forEach(n => allContext.push({ title: n.title, content: n.content || '', type: 'Note' }))
    if (researchRes.data) researchRes.data.forEach(r => allContext.push({ title: r.title, content: r.content || '', type: 'Research' }))

    if (allContext.length === 0) return ''

    // 2. Simple Keyword Scoring
    const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3)
    
    const scoredContext = allContext.map(item => {
      let score = 0
      const text = (item.title + ' ' + item.content).toLowerCase()
      keywords.forEach(word => {
        if (text.includes(word)) score += 1
      })
      return { ...item, score }
    })

    // 3. Sort by score and take top 3
    const topContext = scoredContext
      .filter(item => item.score > 0 || keywords.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    if (topContext.length === 0) return ''

    // 4. Format the context string
    const contextString = topContext.map(item => {
      return `--- CONTEXT FROM ${item.type}: ${item.title} ---\n${item.content.slice(0, 2000)}`
    }).join('\n\n')

    return `\n\nUSE THE FOLLOWING CONTEXT FROM THE USER'S LIBRARY TO INFORM YOUR RESPONSE:\n${contextString}\n\n`
    
  } catch (err) {
    console.error('Failed to get global context:', err)
    return ''
  }
}
