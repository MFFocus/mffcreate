import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/serverlessProcessor';
import { SAMPLE_PROJECT_ID, SAMPLE_PROJECT, SAMPLE_STUDY } from '@/lib/sampleData';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; format: string } }
) {
  const { id: projectId, format } = params;

  let proj: any = getProject(projectId);
  let study: any = proj?.study;

  if (projectId === SAMPLE_PROJECT_ID) {
    proj = SAMPLE_PROJECT;
    study = SAMPLE_STUDY;
  }

  if (!proj || !study) {
    return NextResponse.json({ detail: 'Project not found' }, { status: 404 });
  }

  if (format === 'markdown') {
    const md = `${study.deep_notes}\n\n${study.short_notes}`;
    return new NextResponse(md, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename=study_notes_${projectId}.md`,
      },
    });
  } else if (format === 'html') {
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${proj.title}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6;padding:20px;color:#1e293b}h1,h2,h3{color:#0f172a}</style>
</head>
<body><h1>${proj.title}</h1><div>${study.deep_notes.replace(/\\n/g, '<br>')}</div></body>
</html>`;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
  } else if (format === 'anki') {
    const tsv = (study.flashcards || [])
      .map((f: any) => `${f.front}\t${f.back}\t${f.tag}`)
      .join('\n');
    return new NextResponse(tsv, {
      headers: {
        'Content-Type': 'text/tab-separated-values',
        'Content-Disposition': `attachment; filename=flashcards_${projectId}.tsv`,
      },
    });
  }

  return NextResponse.json({ detail: 'Unsupported export format' }, { status: 400 });
}
