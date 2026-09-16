import { NextRequest, NextResponse } from 'next/server';
import { getJob, getProject } from '@/lib/serverlessProcessor';
import { SAMPLE_PROJECT_ID, SAMPLE_PROJECT } from '@/lib/sampleData';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;

  if (jobId === SAMPLE_PROJECT_ID) {
    return NextResponse.json({
      job_id: SAMPLE_PROJECT.id,
      project_id: SAMPLE_PROJECT.id,
      title: SAMPLE_PROJECT.title,
      status: 'completed',
      stage: 'Study workspace ready!',
      progress_pct: 100,
      duration: SAMPLE_PROJECT.duration,
      created_at: SAMPLE_PROJECT.created_at,
    });
  }

  const job = getJob(jobId);
  if (job) {
    return NextResponse.json(job);
  }

  const proj = getProject(jobId);
  if (proj) {
    return NextResponse.json({
      job_id: proj.id,
      project_id: proj.id,
      title: proj.title,
      status: proj.status,
      stage: proj.stage,
      progress_pct: proj.progress_pct,
      youtube_id: proj.youtube_id,
      duration: proj.duration,
      metrics: proj.metrics,
      created_at: proj.created_at,
    });
  }

  return NextResponse.json({ detail: 'Job not found' }, { status: 404 });
}
