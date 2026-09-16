import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/serverlessProcessor';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;
  const searchParams = req.nextUrl.searchParams;
  const q = (searchParams.get('q') || '').toLowerCase();
  const filter = searchParams.get('filter') || 'all';

  const proj = getProject(projectId);
  if (!proj) {
    return NextResponse.json([]);
  }

  const results: any[] = [];

  // Search formulas
  if (filter === 'all' || filter === 'formula') {
    (proj.study?.formulas || []).forEach((f) => {
      if (
        f.name.toLowerCase().includes(q) ||
        f.explanation.toLowerCase().includes(q) ||
        f.latex.toLowerCase().includes(q)
      ) {
        results.push({
          id: `formula-${f.id}`,
          source_type: 'formula',
          title: f.name,
          snippet: f.explanation,
          timestamp: f.timestamp,
          score: 1.0,
        });
      }
    });
  }

  // Search questions
  if (filter === 'all' || filter === 'question') {
    (proj.study?.questions || []).forEach((qu) => {
      if (
        qu.question.toLowerCase().includes(q) ||
        qu.solution.toLowerCase().includes(q)
      ) {
        results.push({
          id: `question-${qu.id}`,
          source_type: 'question',
          title: qu.question,
          snippet: qu.solution,
          timestamp: qu.timestamp,
          score: 0.95,
        });
      }
    });
  }

  // Search transcript
  if (filter === 'all' || filter === 'transcript') {
    (proj.transcript?.segments || []).forEach((seg) => {
      if (seg.text.toLowerCase().includes(q)) {
        results.push({
          id: `transcript-${seg.id}`,
          source_type: 'transcript',
          title: `Discussion at [${Math.floor(seg.start / 60)}:${Math.floor(
            seg.start % 60
          )
            .toString()
            .padStart(2, '0')}]`,
          snippet: seg.text,
          timestamp: seg.start,
          score: 0.9,
        });
      }
    });
  }

  return NextResponse.json(results);
}
