/**
 * AI Chat API Route
 *
 * Proxies requests to OpenAI API, keeping the API key server-side.
 * Used by the OpenAI service for all LLM operations.
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

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { prompt, model = 'gpt-4o-mini', temperature = 0.3, maxTokens = 1000 } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Call OpenAI
    const completion = await getOpenAIClient().chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful email assistant. Respond in JSON format when requested.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' }
    })

    const content = completion.choices[0]?.message?.content || ''

    return NextResponse.json({
      content,
      model: completion.model,
      usage: completion.usage
    })
  } catch (error) {
    console.error('[AI Chat API] Error:', error)

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
