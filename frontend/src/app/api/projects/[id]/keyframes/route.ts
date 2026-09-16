import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/serverlessProcessor';
import { SAMPLE_PROJECT_ID, SAMPLE_KEYFRAMES } from '@/lib/sampleData';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;
  if (projectId === SAMPLE_PROJECT_ID) {
    return NextResponse.json(SAMPLE_KEYFRAMES);
  }

  const proj = getProject(projectId);
  if (!proj || !proj.keyframes) {
    return NextResponse.json([]);
  }

  return NextResponse.json(proj.keyframes);
}
