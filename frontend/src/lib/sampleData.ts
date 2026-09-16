/**
 * High-fidelity sample study workspace for MffConvert.
 * Enables immediate public exploration of the complete workspace
 * without needing an active local processing run.
 */

import { Project, StudyMaterials, Keyframe, TranscriptSegment } from './api';

export const SAMPLE_PROJECT_ID = 'demo-calculus';

export const SAMPLE_PROJECT: Project = {
  id: SAMPLE_PROJECT_ID,
  title: 'Calculus: The Fundamental Theorem of Calculus & Particle Motion',
  source_type: 'url',
  source_url: 'https://www.youtube.com/watch?v=FnJqaIESC2s',
  duration: 480, // 8 minutes
  status: 'completed',
  stage: 'Study workspace ready',
  progress_pct: 100,
  created_at: new Date().toISOString(),
};

export const SAMPLE_TRANSCRIPT: { full_text: string; segments: TranscriptSegment[] } = {
  full_text: `Welcome everyone to today's lecture on the Fundamental Theorem of Calculus and its connection to physical kinematics. Today we bridge differential calculus—the mathematics of slopes and instantaneous velocity—with integral calculus, which accumulates continuous quantities. Consider a particle moving along a straight line with position s(t). Its instantaneous velocity v(t) is defined as the first derivative ds/dt. What happens if we only know the velocity function v(t) and wish to recover the net change in position from time t equals a to t equals b? By accumulating infinitesimal displacements v(t) dt, we compute the definite integral. The Fundamental Theorem of Calculus guarantees that the integral of f(x) from a to b equals F(b) minus F(a), where F is any antiderivative of f. Notice how integration reverses differentiation. Let us solve an exercise: A particle travels with velocity v(t) equals 3t squared minus 2t. What is its total displacement between t equals 1 and t equals 3 seconds? We integrate v(t), obtaining t cubed minus t squared evaluated from 1 to 3, yielding 18 meters.`,
  segments: [
    {
      id: 0,
      start: 0,
      end: 28,
      text: "Welcome everyone to today's lecture on the Fundamental Theorem of Calculus and its connection to physical kinematics.",
      confidence: 0.98,
    },
    {
      id: 1,
      start: 29,
      end: 65,
      text: "Today we bridge differential calculus—the mathematics of slopes and instantaneous velocity—with integral calculus, which accumulates continuous quantities.",
      confidence: 0.97,
    },
    {
      id: 2,
      start: 66,
      end: 110,
      text: "Consider a particle moving along a straight line with position s(t). Its instantaneous velocity v(t) is defined as the first derivative ds/dt.",
      confidence: 0.99,
    },
    {
      id: 3,
      start: 111,
      end: 175,
      text: "What happens if we only know the velocity function v(t) and wish to recover the net change in position from time t equals a to t equals b?",
      confidence: 0.96,
    },
    {
      id: 4,
      start: 176,
      end: 240,
      text: "By accumulating infinitesimal displacements v(t) dt, we compute the definite integral under the curve using Riemann sums.",
      confidence: 0.98,
    },
    {
      id: 5,
      start: 241,
      end: 320,
      text: "The Fundamental Theorem of Calculus guarantees that the integral of f(x) from a to b equals F(b) minus F(a), where F is any antiderivative of f.",
      confidence: 0.99,
    },
    {
      id: 6,
      start: 321,
      end: 395,
      text: "Let us solve an exercise: A particle travels with velocity v(t) equals 3t squared minus 2t. What is its total displacement between t equals 1 and t equals 3 seconds?",
      confidence: 0.97,
    },
    {
      id: 7,
      start: 396,
      end: 475,
      text: "We integrate v(t), obtaining t cubed minus t squared evaluated from 1 to 3, yielding 18 meters of net displacement.",
      confidence: 0.98,
    },
  ],
};

export const SAMPLE_KEYFRAMES: Keyframe[] = [
  {
    timestamp: 30,
    image_filename: 'demo_slide_1.jpg',
    ocr_text: 'The Fundamental Theorem of Calculus\nBridging Rates of Change & Area Accumulation',
    frame_type: 'slide',
    visual_label: 'Lecture Title & Objectives',
  },
  {
    timestamp: 85,
    image_filename: 'demo_slide_2.jpg',
    ocr_text: 'v(t) = \\frac{ds}{dt} = \\lim_{\\Delta t \\to 0} \\frac{s(t + \\Delta t) - s(t)}{\\Delta t}',
    frame_type: 'formula',
    visual_label: 'Instantaneous Velocity Definition',
  },
  {
    timestamp: 195,
    image_filename: 'demo_slide_3.jpg',
    ocr_text: '\\int_{a}^{b} f(x) dx = \\lim_{n \\to \\infty} \\sum_{i=1}^{n} f(x_i^*) \\Delta x',
    frame_type: 'diagram',
    visual_label: 'Definite Integral as Riemann Sum',
  },
  {
    timestamp: 250,
    image_filename: 'demo_slide_4.jpg',
    ocr_text: '\\int_{a}^{b} f(x) dx = F(b) - F(a) \\quad \\text{where } F\'(x) = f(x)',
    frame_type: 'formula',
    visual_label: 'Fundamental Theorem of Calculus (FTC Part 2)',
  },
  {
    timestamp: 330,
    image_filename: 'demo_slide_5.jpg',
    ocr_text: 'Problem: v(t) = 3t^2 - 2t, \\quad t \\in [1, 3]\nFind net displacement \\Delta s',
    frame_type: 'slide',
    visual_label: 'Kinematics Worked Problem',
  },
];

export const SAMPLE_STUDY: StudyMaterials = {
  deep_notes: `# Calculus: The Fundamental Theorem & Particle Motion

## 1. Executive Overview
The **Fundamental Theorem of Calculus (FTC)** is the foundational link uniting two central concepts of mathematics:
1. **Differential Calculus**: Instantaneous rates of change, slopes of tangent lines, and velocity.
2. **Integral Calculus**: Continuous accumulation, areas under curves, and total displacement.

FTC establishes that differentiation and integration are inverse operations, allowing us to evaluate definite integrals via antiderivatives rather than computing limits of infinite Riemann sums.

---

## 2. Mathematical Formulations

### Instantaneous Rate of Change (Velocity)
Given a 1D position function $s(t)$, velocity is defined as:
$$v(t) = \\frac{ds}{dt} = \\lim_{\\Delta t \\to 0} \\frac{s(t + \\Delta t) - s(t)}{\\Delta t}$$

Referenced in lecture at [01:25].

### The Definite Integral as Accumulation
Accumulating infinitesimal intervals along a continuous function $f(x)$ on $[a, b]$:
$$\\int_{a}^{b} f(x)\\,dx = \\lim_{n \\to \\infty} \\sum_{i=1}^n f(x_i^*)\\,\\Delta x$$

Referenced in lecture at [03:16].

### The Fundamental Theorem of Calculus (Part II)
If $f$ is continuous on $[a, b]$ and $F$ is an antiderivative of $f$ on $[a, b]$ ($F'(x) = f(x)$), then:
$$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a) = \\left[ F(x) \\right]_{a}^{b}$$

Referenced in lecture at [04:01].

---

## 3. Worked Example: Particle Kinematics

**Problem Statement** ([05:21]):
A particle moves along a straight coordinate line with velocity:
$$v(t) = 3t^2 - 2t \\quad (\\text{m/s})$$
Calculate the net displacement $\\Delta s$ between $t = 1\\,\\text{s}$ and $t = 3\\,\\text{s}$.

**Step-by-Step Solution**:
1. Express displacement as the definite integral of velocity:
   $$\\Delta s = \\int_{1}^{3} (3t^2 - 2t)\\,dt$$
2. Determine the general antiderivative $F(t)$:
   $$F(t) = \\int (3t^2 - 2t)\\,dt = t^3 - t^2$$
3. Apply FTC by evaluating at limits $t=3$ and $t=1$:
   $$\\Delta s = F(3) - F(1) = \\left(3^3 - 3^2\\right) - \\left(1^3 - 1^2\\right)$$
   $$\\Delta s = (27 - 9) - (1 - 1) = 18 - 0 = 18\\,\\text{meters}$$

Referenced in lecture at [06:36].

---

## 4. Key Takeaways & Common Pitfalls
* **Displacement vs Distance**: $\\int_{a}^{b} v(t)\\,dt$ gives *net displacement*. To obtain *total distance traveled*, one must integrate the absolute velocity: $\\int_{a}^{b} |v(t)|\\,dt$.
* **Continuity Requirement**: FTC requires the integrand $f(x)$ to be continuous on $[a, b]$. Discontinuities or vertical asymptotes invalidate standard evaluation.
`,

  short_notes: `# Quick Revision: Fundamental Theorem of Calculus

* **Velocity**: $v(t) = \\frac{ds}{dt}$ (instantaneous rate of change of position). See [01:25].
* **Displacement**: $\\Delta s = \\int_{a}^{b} v(t)\\,dt = s(b) - s(a)$. See [02:56].
* **FTC Core Equation**: $\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$, where $F'(x) = f(x)$. See [04:01].
* **Reversibility**: Integration and differentiation are inverse operations.
* **Worked Result**: For $v(t) = 3t^2 - 2t$ over $[1, 3]$, net displacement is $18\\,\\text{m}$. See [06:36].
`,

  chapters: [
    {
      id: 1,
      title: 'Introduction & Bridging Calculus Domains',
      start_time: 0,
      summary: 'Connecting differential calculus (slopes/rates) with integral calculus (continuous accumulation).',
    },
    {
      id: 2,
      title: 'Kinematics: Position, Velocity & Rates of Change',
      start_time: 66,
      summary: 'Defining instantaneous velocity v(t) as the derivative ds/dt of position s(t).',
    },
    {
      id: 3,
      title: 'Accumulation & The Definite Integral',
      start_time: 176,
      summary: 'Visualizing Riemann sum limits and continuous accumulation under the velocity curve.',
    },
    {
      id: 4,
      title: 'The Fundamental Theorem of Calculus',
      start_time: 241,
      summary: 'Formal theorem statement: definite integration via antiderivatives F(b) - F(a).',
    },
    {
      id: 5,
      title: 'Worked Example: Kinematics Displacement',
      start_time: 321,
      summary: 'Step-by-step computation of net displacement for v(t) = 3t^2 - 2t on [1, 3].',
    },
  ],

  formulas: [
    {
      id: 1,
      name: 'Instantaneous Velocity',
      latex: 'v(t) = \\frac{ds}{dt} = \\lim_{\\Delta t \\to 0} \\frac{s(t + \\Delta t) - s(t)}{\\Delta t}',
      explanation: 'Defines velocity as the first time derivative of the position function s(t).',
      timestamp: 85,
    },
    {
      id: 2,
      name: 'Fundamental Theorem of Calculus (Evaluation Part)',
      latex: '\\int_{a}^{b} f(x)\\,dx = F(b) - F(a) \\quad \\text{where } F\'(x) = f(x)',
      explanation: 'Evaluates the definite integral using any continuous antiderivative F without computing infinite Riemann sums.',
      timestamp: 250,
    },
    {
      id: 3,
      name: 'Net Displacement from Velocity',
      latex: '\\Delta s = s(b) - s(a) = \\int_{a}^{b} v(t)\\,dt',
      explanation: 'Accumulates instantaneous velocity across time interval [a, b] to yield net change in position.',
      timestamp: 330,
    },
  ],

  questions: [
    {
      id: 1,
      question: 'What is the physical interpretation of integrating velocity v(t) over a time interval [a, b]?',
      solution: 'Integrating velocity yields the net displacement of the object: s(b) - s(a). If velocity changes sign, negative areas cancel positive ones, yielding the net change in coordinate position rather than total distance.',
      timestamp: 111,
      source: 'Lecture Question',
    },
    {
      id: 2,
      question: 'Given v(t) = 3t^2 - 2t, calculate the net displacement of the particle from t = 1 to t = 3 seconds.',
      solution: '1) Set up integral: Δs = ∫₁³ (3t² - 2t) dt.\n2) Find antiderivative: F(t) = t³ - t².\n3) Evaluate upper bound: F(3) = 3³ - 3² = 27 - 9 = 18.\n4) Evaluate lower bound: F(1) = 1³ - 1² = 0.\n5) Net displacement: Δs = 18 - 0 = 18 meters.',
      timestamp: 321,
      source: 'Worked Board Problem',
    },
  ],

  mindmap: {
    nodes: [
      { id: 'root', label: 'Fundamental Theorem of Calculus', type: 'root', timestamp: 0 },
      { id: 'ch1', label: 'Differential Calculus (Rates)', type: 'chapter', timestamp: 66 },
      { id: 'ch2', label: 'Integral Calculus (Accumulation)', type: 'chapter', timestamp: 176 },
      { id: 'ch3', label: 'FTC Evaluation Part', type: 'chapter', timestamp: 241 },
      { id: 'ch4', label: 'Kinematics Application', type: 'chapter', timestamp: 321 },
      { id: 'f1', label: 'v(t) = ds/dt', type: 'formula', timestamp: 85 },
      { id: 'f2', label: '∫ f(x) dx = F(b) - F(a)', type: 'formula', timestamp: 250 },
      { id: 'f3', label: 'Δs = ∫ v(t) dt', type: 'formula', timestamp: 330 },
      { id: 'q1', label: 'Displacement vs Distance', type: 'question', timestamp: 111 },
      { id: 'q2', label: 'Particle Net Displacement (18m)', type: 'question', timestamp: 321 },
    ],
    edges: [
      { id: 'e1', source: 'root', target: 'ch1' },
      { id: 'e2', source: 'root', target: 'ch2' },
      { id: 'e3', source: 'root', target: 'ch3' },
      { id: 'e4', source: 'root', target: 'ch4' },
      { id: 'e5', source: 'ch1', target: 'f1' },
      { id: 'e6', source: 'ch3', target: 'f2' },
      { id: 'e7', source: 'ch4', target: 'f3' },
      { id: 'e8', source: 'ch2', target: 'q1' },
      { id: 'e9', source: 'ch4', target: 'q2' },
    ],
  },

  flashcards: [
    {
      id: 1,
      front: 'What is the primary relationship between differentiation and integration established by the FTC?',
      back: 'They are inverse operations. Differentiation measures the instantaneous rate of change, while integration accumulates those changes.',
      tag: 'Core Concept',
      timestamp: 241,
    },
    {
      id: 2,
      front: 'What formula expresses the Fundamental Theorem of Calculus Part 2?',
      back: '∫ₐᵇ f(x) dx = F(b) - F(a), where F\'(x) = f(x).',
      tag: 'Theorem',
      timestamp: 250,
    },
    {
      id: 3,
      front: 'What is the difference between net displacement and total distance traveled?',
      back: 'Net displacement is ∫ v(t) dt (vector change in position). Total distance is ∫ |v(t)| dt (scalar distance without cancellation).',
      tag: 'Kinematics',
      timestamp: 111,
    },
    {
      id: 4,
      front: 'What is the antiderivative of v(t) = 3t² - 2t?',
      back: 'F(t) = t³ - t² + C.',
      tag: 'Integration',
      timestamp: 396,
    },
  ],

  quiz: [
    {
      id: 1,
      question: 'The Fundamental Theorem of Calculus establishes that integration and differentiation are:',
      options: [
        'Completely unrelated branches of arithmetic',
        'Inverse operations of one another',
        'Valid only for linear polynomial functions',
        'Approximations that require numerical estimation',
      ],
      correct_index: 1,
      explanation: 'FTC proves that taking the derivative of an integral restores the original function, and integrating a derivative yields the net change in the function.',
      timestamp: 241,
    },
    {
      id: 2,
      question: 'If a particle has velocity v(t) = 3t² - 2t, what is its net displacement between t = 1 and t = 3 seconds?',
      options: [
        '12 meters',
        '18 meters',
        '24 meters',
        '27 meters',
      ],
      correct_index: 1,
      explanation: 'Antiderivative is F(t) = t³ - t². F(3) = 27 - 9 = 18. F(1) = 1 - 1 = 0. Δs = 18 - 0 = 18 meters.',
      timestamp: 396,
    },
    {
      id: 3,
      question: 'What mathematical condition is required on f(x) for FTC Part 2 to hold on [a, b]?',
      options: [
        'f(x) must be continuous on [a, b]',
        'f(x) must be strictly positive',
        'f(x) must be a polynomial',
        'f(x) must have a constant slope',
      ],
      correct_index: 0,
      explanation: 'Continuity of f(x) on the closed interval [a, b] is the essential prerequisite for FTC.',
      timestamp: 250,
    },
  ],
};
