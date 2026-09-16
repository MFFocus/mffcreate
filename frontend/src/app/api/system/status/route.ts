import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'online',
    zero_cost: true,
    privacy_mode: 'Production Web Service',
    engine: 'MffConvert Public Engine',
    ollama: {
      available: false,
      models: [],
    },
    default_engine: 'Production Multimodal Synthesis Engine',
  });
}
