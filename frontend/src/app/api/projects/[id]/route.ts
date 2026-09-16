import { NextRequest, NextResponse } from 'next/server';
import { getProject, deleteProject } from '@/lib/serverlessProcessor';
import { SAMPLE_PROJECT_ID, SAMPLE_PROJECT } from '@/lib/sampleData';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;
  if (projectId === SAMPLE_PROJECT_ID) {
    return NextResponse.json(SAMPLE_PROJECT);
  }

  const proj = getProject(projectId);
  if (!proj) {
    return NextResponse.json({ detail: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: proj.id,
    title: proj.title,
    source_type: proj.source_type,
    source_url: proj.source_url,
    duration: proj.duration,
    status: proj.status,
    stage: proj.stage,
    progress_pct: proj.progress_pct,
    created_at: proj.created_at,
    metrics: proj.metrics,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;
  if (projectId === SAMPLE_PROJECT_ID) {
    return NextResponse.json({ deleted: true });
  }

  const success = deleteProject(projectId);
  return NextResponse.json({ deleted: success });
}
