/**
 * AI Summarize API Route
 *
 * Generates summaries for emails, threads, and daily digests.
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Lazy initialization to avoid build-time errors when API key is not set
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  if (!openaiClient) {
    throw new Error('OpenAI API key not configured')
  }
  return openaiClient
}

const PROMPTS = {
  email: `Summarize this email in 2-3 sentences, focusing on the key message and any action items.

From: {from}
Subject: {subject}
Body: {body}

Respond in JSON format:
{
  "summary": "Your summary here",
  "keyPoints": ["point1", "point2"],
  "actionItems": ["action1", "action2"]
}`,

  thread: `Summarize this email conversation thread. Include:
- The main topic/purpose
- Key decisions or outcomes
- Any pending action items
- Current status

Thread:
{thread}

Respond in JSON format:
{
  "summary": "Your summary here",
  "keyPoints": ["point1", "point2"],
  "actionItems": ["action1", "action2"],
  "status": "resolved" | "pending" | "needs_response"
}`,

  daily: `Create a brief daily email summary for these {count} emails.
Group by priority and highlight urgent items.

Emails:
{emails}

Respond in JSON format:
{
  "summary": "Brief overview of the day's emails",
  "urgent": ["urgent item 1"],
  "important": ["important item 1"],
  "actionRequired": ["action 1"],
  "fyi": ["fyi item 1"],
  "stats": {
    "total": number,
    "urgent": number,
    "needsResponse": number
  }
}`
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { type = 'email', from, subject, body: emailBody, thread, emails } = body

    let prompt: string

    switch (type) {
      case 'email':
        if (!from || !subject) {
          return NextResponse.json(
            { error: 'from and subject are required for email summary' },
            { status: 400 }
          )
        }
        prompt = PROMPTS.email
          .replace('{from}', from)
          .replace('{subject}', subject)
          .replace('{body}', (emailBody || '').substring(0, 3000))
        break

      case 'thread':
        if (!thread) {
          return NextResponse.json(
            { error: 'thread is required for thread summary' },
            { status: 400 }
          )
        }
        prompt = PROMPTS.thread.replace('{thread}', thread.substring(0, 5000))
        break

      case 'daily':
        if (!emails || !Array.isArray(emails)) {
          return NextResponse.json(
            { error: 'emails array is required for daily summary' },
            { status: 400 }
          )
        }
        const emailsText = emails
          .slice(0, 20)
          .map((e: { from: string; subject: string }, i: number) =>
            `${i + 1}. From: ${e.from}, Subject: ${e.subject}`
          )
          .join('\n')
        prompt = PROMPTS.daily
          .replace('{count}', emails.length.toString())
          .replace('{emails}', emailsText)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid summary type' },
          { status: 400 }
        )
    }

    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    })

    const content = completion.choices[0]?.message?.content || '{}'

    try {
      const result = JSON.parse(content)
      return NextResponse.json({
        type,
        ...result,
        model: completion.model,
        usage: completion.usage,
        generatedAt: new Date().toISOString()
      })
    } catch {
      return NextResponse.json({
        type,
        summary: 'Unable to generate summary.',
        keyPoints: [],
        actionItems: [],
        error: 'Failed to parse summary'
      })
    }
  } catch (error) {
    console.error('[AI Summarize API] Error:', error)
    return NextResponse.json(
      { error: 'Summarization failed' },
      { status: 500 }
    )
  }
}
