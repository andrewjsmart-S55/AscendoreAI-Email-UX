/**
 * AI Draft API Route
 *
 * Generates draft email responses using OpenAI.
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

const DRAFT_PROMPT = `Draft a professional email response.

Original Email:
From: {from}
Subject: {subject}
Body: {body}

User Instructions: {instructions}
Tone: {tone}

Write a clear, professional response. Do not include subject line.
Start with an appropriate greeting and end with a closing.
Keep the response concise and focused.`

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      from,
      subject,
      body: emailBody,
      instructions = 'Reply appropriately',
      tone = 'professional'
    } = body

    if (!from || !subject) {
      return NextResponse.json(
        { error: 'from and subject are required' },
        { status: 400 }
      )
    }

    const prompt = DRAFT_PROMPT
      .replace('{from}', from)
      .replace('{subject}', subject)
      .replace('{body}', (emailBody || '').substring(0, 2000))
      .replace('{instructions}', instructions)
      .replace('{tone}', tone)

    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a professional email writing assistant. Write clear, concise, and contextually appropriate email responses.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    const draft = completion.choices[0]?.message?.content || ''

    return NextResponse.json({
      draft: draft.trim(),
      model: completion.model,
      usage: completion.usage,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('[AI Draft API] Error:', error)
    return NextResponse.json(
      { error: 'Draft generation failed' },
      { status: 500 }
    )
  }
}
