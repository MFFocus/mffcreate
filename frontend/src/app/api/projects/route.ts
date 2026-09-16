import { NextRequest, NextResponse } from 'next/server';
import { listProjects } from '@/lib/serverlessProcessor';

export const dynamic = 'force-dynamic';

export async function GET() {
  const projects = listProjects().map((p) => ({
    id: p.id,
    title: p.title,
    source_type: p.source_type,
    source_url: p.source_url,
    duration: p.duration,
    status: p.status,
    stage: p.stage,
    progress_pct: p.progress_pct,
    created_at: p.created_at,
    metrics: p.metrics,
  }));
  return NextResponse.json(projects);
}
