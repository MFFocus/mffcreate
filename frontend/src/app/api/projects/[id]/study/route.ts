import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/serverlessProcessor';
import { SAMPLE_PROJECT_ID, SAMPLE_STUDY } from '@/lib/sampleData';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;
  if (projectId === SAMPLE_PROJECT_ID) {
    return NextResponse.json(SAMPLE_STUDY);
  }

  const proj = getProject(projectId);
  if (!proj || !proj.study) {
    return NextResponse.json({ detail: 'Study materials not ready yet' }, { status: 404 });
  }

  return NextResponse.json(proj.study);
}
