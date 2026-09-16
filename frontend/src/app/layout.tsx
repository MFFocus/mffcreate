import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MffConvert — Turn Educational Videos into Study Workspaces',
  description: 'Watch less. Understand more. Transform any educational video into deep notes, concept chapters, LaTeX formulas, interactive mind maps, flashcards, and quizzes.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('mffconvert_theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-300 transition-colors duration-200">
        {children}
      </body>
    </html>
  )
}
