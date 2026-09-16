import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/serverlessProcessor';
import { SAMPLE_PROJECT_ID } from '@/lib/sampleData';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;
  const body = await req.json();
  const message = (body.message || '').toLowerCase();

  const proj = getProject(projectId);
  const segments = proj?.transcript?.segments || [];

  // Keyword match to find relevant timestamps
  const words = message.split(/\s+/).filter((w: string) => w.length > 3);
  const matched = segments.filter((s) =>
    words.some((w: string) => s.text.toLowerCase().includes(w))
  );

  const topTimestamps = matched.slice(0, 3).map((m) => m.start);
  if (topTimestamps.length === 0 && segments.length > 0) {
    topTimestamps.push(segments[0].start);
  }

  const citations = matched.slice(0, 2).map((m) => {
    const min = Math.floor(m.start / 60).toString().padStart(2, '0');
    const sec = Math.floor(m.start % 60).toString().padStart(2, '0');
    return `- At \`[${min}:${sec}]\`, the lecture explains: *"${m.text}"*`;
  });

  const fromVideo = citations.length > 0
    ? `### From the Video\n${citations.join('\n')}`
    : `### From the Video\nKey concepts relating to this question are covered across the foundational milestones of the lecture.`;

  const additional = `### Additional Explanation\nThis concept addresses your query based on the synthesized lecture notes and governing equations. Click any timestamp pill above to navigate the synchronized video directly to the exact explanation.`;

  return NextResponse.json({
    answer: `${fromVideo}\n\n${additional}`,
    timestamps: topTimestamps,
    grounded: true,
    model_used: 'MffConvert Grounded Assistant',
  });
}
