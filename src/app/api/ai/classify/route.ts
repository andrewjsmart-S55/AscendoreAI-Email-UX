/**
 * AI Classify API Route
 *
 * Classifies emails by category, intent, urgency, and more.
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

const CLASSIFICATION_PROMPT = `You are an email classification assistant. Analyze the following email and provide a classification.

Email:
From: {from}
Subject: {subject}
Body: {body}

Respond in JSON format:
{
  "category": "urgent" | "important" | "routine" | "promotional" | "newsletter" | "automated" | "social" | "spam",
  "intent": "request" | "action_required" | "information" | "fyi" | "social" | "transactional" | "marketing",
  "sentiment": "positive" | "neutral" | "negative",
  "topics": ["topic1", "topic2"],
  "urgency": "high" | "medium" | "low" | "none",
  "requiresResponse": true | false,
  "hasDeadline": true | false,
  "deadline": "extracted deadline or null",
  "isSpam": true | false,
  "isPhishing": true | false,
  "confidence": 0.0-1.0
}`

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { from, subject, body: emailBody } = body

    if (!from || !subject) {
      return NextResponse.json(
        { error: 'from and subject are required' },
        { status: 400 }
      )
    }

    const prompt = CLASSIFICATION_PROMPT
      .replace('{from}', from)
      .replace('{subject}', subject)
      .replace('{body}', (emailBody || '').substring(0, 2000))

    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const content = completion.choices[0]?.message?.content || '{}'

    try {
      const classification = JSON.parse(content)
      return NextResponse.json({
        ...classification,
        model: completion.model,
        usage: completion.usage
      })
    } catch {
      return NextResponse.json({
        category: 'routine',
        intent: 'information',
        sentiment: 'neutral',
        topics: [],
        urgency: 'none',
        requiresResponse: false,
        hasDeadline: false,
        isSpam: false,
        isPhishing: false,
        confidence: 0.3,
        error: 'Failed to parse classification'
      })
    }
  } catch (error) {
    console.error('[AI Classify API] Error:', error)
    return NextResponse.json(
      { error: 'Classification failed' },
      { status: 500 }
    )
  }
}
