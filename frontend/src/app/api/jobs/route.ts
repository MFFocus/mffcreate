import { NextRequest, NextResponse } from 'next/server';
import { startServerlessJob } from '@/lib/serverlessProcessor';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body.url;
    const title = body.title;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ detail: 'A valid video URL is required.' }, { status: 400 });
    }

    const job = await startServerlessJob(url, title);
    return NextResponse.json({
      job_id: job.job_id,
      project_id: job.project_id,
      status: job.status,
      cached: job.status === 'completed',
      title: job.title,
      youtube_id: job.youtube_id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || 'Failed to start video processing job.' },
      { status: 500 }
    );
  }
}
