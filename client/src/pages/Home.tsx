/*
 * DESIGN: Dark Technical Minimalism
 * - Near-black background, electric cyan accents, IBM Plex Mono labels
 * - Asymmetric layout, particle graph hero, data-layer hover reveals
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  Github, Linkedin, Globe, BookOpen, Mail, Phone,
  ExternalLink, ChevronRight, Award, Cpu, Brain,
  Layers, Radio, MapPin, ArrowRight, Users
} from "lucide-react";

// ─── Publication type ───────────────────────────────────────────────────────
interface Publication {
  title: string;
  venue: string;
  year: string;
  citations: number | null;
  link: string;
  github: string | null;
  demo: boolean;
}

// ─── Animated particle canvas ───────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const W = () => canvas.width;
    const H = () => canvas.height;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const N = 55;
    type Particle = { x: number; y: number; vx: number; vy: number; r: number; alpha: number };
    const particles: Particle[] = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2.5 + 1,
      alpha: Math.random() * 0.6 + 0.3,
    }));

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // Draw edges
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.25;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      particles.forEach((p) => {
        ctx.beginPath();
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grad.addColorStop(0, `rgba(0, 229, 255, ${p.alpha})`);
        grad.addColorStop(1, "rgba(0, 229, 255, 0)");
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(0, 229, 255, ${p.alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.55 }}
      aria-hidden="true"
      role="presentation"
    />
  );
}

// ─── Section fade-in wrapper ─────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav() {
  const [active, setActive] = useState("about");
  const sections = ["about", "expertise", "experience", "publications", "contact"];

  useEffect(() => {
    const handleScroll = () => {
      for (const id of [...sections].reverse()) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 160) {
          setActive(id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Desktop left rail */}
      <nav aria-label="Site navigation" className="hidden lg:flex fixed left-0 top-0 h-full w-[200px] flex-col justify-between py-10 px-6 z-50 border-r border-border/40 bg-background/80 backdrop-blur-md">
        <div>
          <div className="mb-10">
            <div className="mono-label mb-1">Portfolio</div>
            <div className="text-sm font-semibold text-foreground leading-tight">Abduallah<br />Mohamed</div>
          </div>
          <div className="flex flex-col gap-1">
            {sections.map((s, i) => (
              <button
                key={s}
                onClick={() => scrollTo(s)}
                aria-label={`Navigate to ${s} section`}
                aria-current={active === s ? "true" : undefined}
                className={`flex items-center gap-3 text-left px-2 py-2 rounded transition-all duration-200 group ${
                  active === s ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-xs font-medium capitalize tracking-wide">{s}</span>
                {active === s && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="ml-auto w-1 h-4 rounded-full bg-primary"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <a href="https://github.com/abduallahmohamed" target="_blank" rel="noreferrer" aria-label="GitHub profile (opens in new tab)" className="text-muted-foreground hover:text-primary transition-colors">
            <Github size={16} aria-hidden="true" />
          </a>
          <a href="https://www.linkedin.com/in/abduallah-mohamed/" target="_blank" rel="noreferrer" aria-label="LinkedIn profile (opens in new tab)" className="text-muted-foreground hover:text-primary transition-colors">
            <Linkedin size={16} aria-hidden="true" />
          </a>
          <a href="https://scholar.google.com/citations?hl=en&user=FAOtbV4AAAAJ" target="_blank" rel="noreferrer" aria-label="Google Scholar profile (opens in new tab)" className="text-muted-foreground hover:text-primary transition-colors">
            <BookOpen size={16} aria-hidden="true" />
          </a>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav aria-label="Mobile site navigation" className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="mono-label text-[0.6rem]">Portfolio</div>
          <div className="text-sm font-bold">Abduallah Mohamed</div>
        </div>
        <div className="flex gap-3">
          {sections.slice(0, 5).map((s, i) => (
            <button
              key={s}
              onClick={() => scrollTo(s)}
              aria-label={`Navigate to ${s} section`}
              aria-current={active === s ? "true" : undefined}
              className={`text-[0.65rem] font-mono uppercase tracking-wider transition-colors ${
                active === s ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

// ─── Static fallback publications data ───────────────────────────────────────
const staticPublications = [
  { year: "2026", title: "EgoInertia-MI: A Multimodal Egocentric Vision and IMU Benchmark for Motor Impairment Assessment", venue: "arXiv", citations: null, link: "https://arxiv.org/abs/2607.03934", demo: false, github: null },
  { year: "2026", title: "PAVE: A Cognitive Architecture for Legitimate Violation in Generative Agent Societies", venue: "arXiv", citations: null, link: "https://arxiv.org/abs/2605.19351", demo: false, github: null },
  { year: "2026", title: "EgoTraj: Real-World Egocentric Human Trajectory Dataset for Multimodal Prediction", venue: "arXiv", citations: null, link: "https://arxiv.org/abs/2605.19004", demo: false, github: null },
  { year: "2026", title: "iMotion-LLM: Instruction-Conditioned Trajectory Generation", venue: "WACV", citations: 5, link: "https://arxiv.org/abs/2403.04928", demo: false, github: null },
  { year: "2024", title: "A Review of Deep Learning for Video Captioning", venue: "IEEE TPAMI", citations: 76, link: "https://scholar.google.com/citations?user=FAOtbV4AAAAJ", demo: false, github: null },
  { year: "2023", title: "FollowMe: Vehicle Behaviour Prediction in Autonomous Vehicle Settings", venue: "arXiv", citations: null, link: "https://arxiv.org/abs/2304.06121", demo: false, github: null },
  { year: "2022", title: "Social-Implicit: Rethinking Trajectory Prediction Evaluation and The Effectiveness of Implicit MLE", venue: "ECCV", citations: 163, link: "https://arxiv.org/abs/2203.03057", demo: false, github: "https://github.com/abduallahmohamed/Social-Implicit" },
  { year: "2022", title: "HAR-GCNN: Deep Graph CNNs for Human Activity Recognition From Highly Unlabeled Mobile Sensor Data", venue: "IEEE PerCom", citations: 45, link: "https://arxiv.org/abs/2011.01902", demo: false, github: null },
  { year: "2022", title: "On the Motion and Action Prediction Using Deep Graph Models (PhD Thesis)", venue: "UT Austin", citations: null, link: "https://repositories.lib.utexas.edu/handle/2152/115782", demo: false, github: null },
  { year: "2021", title: "Skeleton-Graph: Long-Term 3D Motion Prediction From 2D Observations Using Deep Spatio-Temporal Graph CNNs", venue: "ICCV Workshop", citations: 14, link: "https://arxiv.org/abs/2109.10257", demo: false, github: null },
  { year: "2021", title: "Putting SOTIF into Practice: Safety Critical Event Detection Using Predictive Models", venue: "SAE Technical Paper", citations: 13, link: "https://www.sae.org/publications/technical-papers/content/2021-01-0089/", demo: false, github: null },
  { year: "2020", title: "SocialSTGCNN: A Social Spatio-Temporal Graph Convolutional Neural Network for Human Trajectory Prediction", venue: "CVPR", citations: 1467, link: "https://arxiv.org/abs/2002.11927", demo: true, github: "https://github.com/abduallahmohamed/Social-STGCNN" },
  { year: "2020", title: "Inner Ensemble Networks: Average Ensemble as an Effective Regularizer", venue: "arXiv", citations: 1, link: "https://arxiv.org/abs/2006.08305", demo: false, github: "https://github.com/abduallahmohamed/inner_ensemble_nets" },
  { year: "2019", title: "Physics Informed Data Driven Model for Flood Prediction: Application of Deep Learning in Prediction of Urban Flood Development", venue: "arXiv", citations: 49, link: "https://arxiv.org/abs/1908.10312", demo: false, github: null },
  { year: "2018", title: "An IMU-based Traffic and Road Condition Monitoring System", venue: "HardwareX", citations: 40, link: "https://www.sciencedirect.com/science/article/pii/S2468067218300543", demo: false, github: null },
  { year: "2018", title: "MCRM: Mother Compact Recurrent Memory", venue: "arXiv", citations: 1, link: "https://arxiv.org/abs/1808.02016", demo: false, github: null },
  { year: "2018", title: "Locating an Object in the Environment of a Motor Vehicle by an Ultrasonic Sensor System", venue: "DE Patent DE102017101476B3", citations: null, link: "https://patents.google.com/patent/DE102017101476B3", demo: false, github: null },
];

const experience = [
  {
    title: "VP of AI/ML",
    company: "AIDAChip Inc",
    period: "Jun 2026 – Present",
    startYear: "2026",
    location: "Redmond, WA",
    desc: "Building the AI platform that chip design teams actually run on. AIDAChip is the alignment layer for silicon engineering, automating semiconductor IP development and cutting design cycle time by up to 40%. Leading the agent architecture, model selection, and verification systems that hold shared context across analog, digital, and verification teams — so intent carries cleanly through every handoff.",
    tags: ["Agentic AI", "LLM Agents", "Chip Design Automation", "Semiconductor IP", "AI Platform"],
    img: null,
    link: "https://www.aidachip.com/",
    note: null,
    simple: false,
  },
  {
    title: "Principal Applied Research Scientist",
    company: "Meta Reality Labs",
    period: "2022 – 2026",
    startYear: "2022",
    location: "Redmond, WA",
    desc: "Technical lead across 4+ product groups and 6+ teams. Research in outdoor/indoor motion tracking, fitness AI, SLAM pipelines, and non-visual localization for Smart Glasses and AR/VR devices. Architected LLM-based swarm intelligence frameworks for product development.",
    tags: ["SLAM", "Sensor Fusion", "Edge AI", "LLM Agents", "AR/VR"],
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663382653785/gKvNkkVqVoDXab76WfQ77g/meta-rl-work-2DBkzAbFzJEgSSj9BUK2sE.webp",
    note: null,
    simple: false,
  },
  {
    title: "PhD Internships",
    company: "Meta · Apple · Intuitive Surgical",
    period: "2018 – 2021",
    startYear: "2018",
    location: "USA",
    desc: "Research internships at Meta, Apple, and Intuitive Surgical during doctoral studies at UT Austin.",
    tags: [],
    img: null,
    note: "During PhD at UT Austin",
    simple: true,
  },
  {
    title: "R&D Autonomous Driving Algorithms",
    company: "Avelabs",
    period: "2016 – 2017",
    startYear: "2016",
    location: "Egypt",
    desc: "Technical lead for the algorithms team. Developed real-time deep learning systems for object tracking, lane detection, road recognition, and traffic sign recognition for autonomous vehicles.",
    tags: ["Object Detection", "Lane Detection", "Deep Learning", "Autonomous Driving"],
    img: null,
    note: null,
    simple: false,
  },
  {
    title: "R&D Autonomous Driving Algorithms",
    company: "Valeo",
    period: "2015 – 2016",
    startYear: "2015",
    location: "Egypt",
    desc: "Designed algorithm for processing raw ultrasonic sensor data to detect and track multiple objects using unsupervised deep learning — subsequently patented. Worked on static mapping using Extended Kalman Filters.",
    tags: ["Ultrasonic Sensors", "EKF", "Unsupervised Learning", "Patent"],
    img: null,
    note: null,
    simple: false,
  },
  {
    title: "Software Engineer",
    company: "ITWorx",
    period: "2014 – 2015",
    startYear: "2014",
    location: "Egypt",
    desc: "Designed, executed, assessed, and troubleshot software programs and web-based applications across multiple client projects.",
    tags: ["Software Engineering", "Web Applications"],
    img: null,
    note: null,
    simple: false,
  },
  {
    title: "Co-founder & ML Consultant",
    company: "AR/VR Startup · Freelance",
    period: "2011 – 2014",
    startYear: "2011",
    location: "Egypt",
    desc: "Co-founded and ran a startup in the AR/VR space. Simultaneously worked as a freelance machine learning consultant specializing in computer vision.",
    tags: ["AR/VR", "Computer Vision", "Entrepreneurship", "Freelance ML"],
    img: null,
    note: null,
    simple: false,
  },
];

const expertise = [
  {
    icon: Cpu,
    label: "Agentic Systems",
    desc: "LLM-driven swarm intelligence frameworks, automated hardware debugging pipelines, and autonomous engineer persona agents for complex multi-team environments.",
    tags: ["LLM Agents", "Swarm AI", "Auto-debugging", "Pipelines"],
  },
  {
    icon: Brain,
    label: "Applied AI",
    desc: "Real-time ML for edge devices — fitness tracking, AR/VR, sensor fusion, trajectory analysis with strict memory and power constraints.",
    tags: ["Edge ML", "Sensor Fusion", "Fitness AI", "AR/VR"],
  },
  {
    icon: Layers,
    label: "Motion & Trajectory",
    desc: "Deep learning models for multi-agent motion forecasting, SLAM, non-visual localization, and multi-level data fusion systems.",
    tags: ["Trajectory Prediction", "SLAM", "Localization", "Graph CNNs"],
  },
  {
    icon: Radio,
    label: "Sensors",
    desc: "Full-stack sensor system development from signal quality assessment to application abstraction. IMU, GNSS, magnetometers, ultrasonic.",
    tags: ["IMU", "GNSS", "Magnetometers", "Ultrasonic"],
  },
  {
    icon: Users,
    label: "Technical Leadership",
    desc: "VP of AI/ML at AIDAChip Inc. Former tech lead across 4+ orgs and 6+ teams at Meta Reality Labs. Defining multi-year R&D roadmaps, AI/ML hiring, and cross-functional HW/SW/ML execution from research to product.",
    tags: ["VP AI/ML", "R&D Roadmaps", "Team Building", "Cross-Functional"],
  },
];



// ─── Experience with dynamic year indicator ─────────────────────────────────
function ExperienceSection() {
  const currentYear = String(new Date().getFullYear());
  const [activeYear, setActiveYear] = useState(currentYear);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Only update when the experience section itself is visible in the viewport
      const section = sectionRef.current;
      if (!section) return;
      const sectionRect = section.getBoundingClientRect();
      // If section hasn't entered the viewport yet, keep current year
      if (sectionRect.top > window.innerHeight * 0.6) return;

      let current = currentYear;
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.45) {
          current = experience[i].startYear;
        }
      });
      setActiveYear(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    // Run once on mount to set correct state
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
      <section id="experience" aria-labelledby="experience-heading" className="py-24 bg-card/30" ref={sectionRef}>
      <div className="container">
        <FadeIn>
                        <div className="flex items-center gap-4 mb-12">
                <div className="h-px bg-border/50 w-[40px]" aria-hidden="true" />
                <h2 id="experience-heading" className="text-3xl lg:text-4xl font-bold">Experience</h2>
          </div>
        </FadeIn>

        <div className="flex gap-8">
          {/* Dynamic year column — desktop only */}
          <div className="hidden lg:flex flex-col items-end w-20 shrink-0 pt-1">
            <div className="sticky top-32">
              <motion.div
                key={activeYear}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="text-right"
              >
                <div className="text-3xl font-bold text-primary tabular-nums leading-none">{activeYear}</div>
                <div className="mono-label text-[0.55rem] text-muted-foreground mt-1 text-right">Year</div>
              </motion.div>
              <div className="mt-4 w-px h-24 bg-gradient-to-b from-primary/50 to-transparent ml-auto" />
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent hidden lg:block" style={{ left: "11px" }} />

            <div className="flex flex-col gap-6">
              {experience.map((job, i) => (
                <FadeIn key={i} delay={i * 0.08}>
                  <div
                    ref={(el) => { itemRefs.current[i] = el; }}
                    className="lg:pl-10 relative"
                  >
                    {/* Timeline dot */}
                    <div className="hidden lg:block absolute left-0 top-4 w-[23px] h-[23px] rounded-full border-2 border-primary bg-background" style={{ left: 0 }}>
                      <div className="absolute inset-[3px] rounded-full bg-primary/40" />
                    </div>

                    {job.simple ? (
                      /* Simple one-liner for internships */
                      <div className="bg-card/60 border border-border/40 rounded-lg px-5 py-3 flex flex-wrap items-center gap-3">
                        <span className="font-semibold text-sm">{job.title}</span>
                        <span className="mono-label text-[0.6rem] px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary/80">{job.company}</span>
                        {job.note && (
                          <span className="mono-label text-[0.58rem] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400/80">{job.note}</span>
                        )}
                        <span className="mono-label text-[0.6rem] text-muted-foreground ml-auto">{job.period}</span>
                        <span className="text-xs text-muted-foreground">{job.desc}</span>
                      </div>
                    ) : (
                      /* Full card */
                      <div className="card-hover bg-card rounded-lg p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-1">
                              <h3 className="font-bold text-base">{job.title}</h3>
                              <span className="mono-label text-[0.6rem] px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary/80">{job.company}</span>
                              {job.note && (
                                <span className="mono-label text-[0.58rem] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400/80">{job.note}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                              <span className="mono-label text-[0.6rem] text-muted-foreground">{job.period}</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                              <span className="flex items-center gap-1 mono-label text-[0.6rem] text-muted-foreground">
                                <MapPin size={9} />{job.location}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{job.desc}</p>
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {job.tags.map((t) => (
                                <span key={t} className="mono-label text-[0.58rem] px-2 py-0.5 rounded border border-border text-muted-foreground">
                                  {t}
                                </span>
                              ))}
                              {(job as any).link && (
                                <a href={(job as any).link} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 mono-label text-[0.6rem] text-primary/80 hover:text-primary transition-colors">
                                  <ExternalLink size={10} /> Visit Website
                                </a>
                              )}
                            </div>
                          </div>
                          {job.img && (
                            <div className="shrink-0 w-full lg:w-48 h-28 rounded overflow-hidden border border-border/50">
                              <img src={job.img} alt={job.company} className="w-full h-full object-cover opacity-80" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const { data: scholarData, isLoading: scholarLoading } = trpc.scholar.publications.useQuery(undefined, {
    staleTime: 1000 * 60 * 30, // 30 min cache
    retry: 1,
    // Static deployment (GitHub Pages) has no backend — skip fetch, use baked-in staticPublications below.
    enabled: false,
  });

  const publications: Publication[] = (scholarData?.publications as Publication[] | undefined) ?? staticPublications;
  const totalCitations = scholarData?.totalCitations ?? 1877;
  const isLoadingPublications = scholarLoading;

  const stats = [
    { value: `${totalCitations.toLocaleString()}+`, label: "Citations", href: "https://scholar.google.com/citations?hl=en&user=FAOtbV4AAAAJ" },
    { value: "10+", label: "Publications", href: "#publications" },
    { value: "5+", label: "Research Domains", href: null },
    { value: "1", label: "Patent", href: "https://patents.google.com/patent/DE102017101476B3" },
    { value: "200+", label: "GitHub Stars", href: "https://github.com/abduallahmohamed" },
  ];

    return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Skip to main content — screen reader / keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Nav />
      {/* Main content offset for left rail */}
      <main id="main-content" className="lg:pl-[200px]">

        {/* ── HERO ── */}
        <section id="about" aria-label="Introduction and profile" className="relative min-h-screen flex items-center overflow-hidden">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663382653785/gKvNkkVqVoDXab76WfQ77g/hero-particle-graph-nZWiQzFWpC6CR9drSarzVs.webp)` }}
            aria-hidden="true"
            role="presentation"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          {/* Particle canvas overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <ParticleCanvas />
          </div>

          {/* Grid dots */}
          <div className="absolute inset-0 grid-dots opacity-30 pointer-events-none" />

          <div className="relative z-10 container py-24 lg:py-0 mt-16 lg:mt-0">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl"
            >
              {/* Headshot + title row */}
              <div className="flex items-center gap-5 mb-6">
                <img
                  src="/profile.webp"
                  alt="Abduallah Mohamed, PhD — VP of AI/ML at AIDAChip Inc"
                  width={300}
                  height={300}
                  className="w-24 h-24 lg:w-32 lg:h-32 rounded-full object-cover border-2 border-primary/40 shadow-lg shrink-0" style={{ objectPosition: '50% 15%' }}
                />
                <div>
                  <div className="mono-label mb-1">VP of AI/ML · AIDAChip Inc</div>
                  <div className="text-xs text-muted-foreground mono-label">Previously: Principal Applied Research Scientist · Meta Reality Labs</div>
                </div>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
                Abduallah<br />
                <span className="text-primary cyan-glow">Mohamed</span>
                <span className="text-muted-foreground">, PhD</span>
              </h1>
              <p className="text-base lg:text-lg text-muted-foreground leading-relaxed max-w-xl mb-8">
                VP of AI/ML at <span className="text-foreground font-medium">AIDAChip Inc</span>, building the AI platform for semiconductor IP development. Former Principal Research Scientist at <span className="text-foreground font-medium">Meta Reality Labs</span>.
                Core expertise spans <span className="text-foreground/80">agentic AI &amp; LLM frameworks</span>, <span className="text-foreground/80">IMU &amp; multi-modal sensor fusion</span>, <span className="text-foreground/80">indoor/outdoor motion tracking</span>, <span className="text-foreground/80">SLAM &amp; non-visual localization</span>, and <span className="text-foreground/80">multi-agent trajectory prediction</span>.
                PhD, Electrical &amp; Computer Engineering — UT Austin.
              </p>

              {/* Collaboration note */}
              <div className="flex items-start gap-2.5 max-w-xl mb-8 px-3.5 py-3 rounded-md border border-rose-500/50" style={{ background: "rgba(244,63,94,0.12)" }}>
                <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                <p className="text-xs leading-relaxed" style={{ color: "oklch(0.72 0.19 15)" }}>
                  <span className="font-semibold" style={{ color: "oklch(0.78 0.2 15)" }}>Open to collaboration —</span>{" "}
                  I'm currently co-supervising and collaborating with PhD students and researchers working on motion &amp; agentic AI problems. Please reach out if you seek collaboration.
                </p>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 mb-10">
                {stats.map((s) => (
                  s.href ? (
                    <a key={s.label} href={s.href} target={s.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" aria-label={`${s.label}: ${s.value}${s.href.startsWith("http") ? " (opens in new tab)" : ""}`} className="group">
                      <div className="text-2xl font-bold text-primary group-hover:opacity-80 transition-opacity">{s.value}</div>
                      <div className="mono-label text-[0.6rem] text-muted-foreground">{s.label}</div>
                    </a>
                  ) : (
                    <div key={s.label}>
                      <div className="text-2xl font-bold text-primary">{s.value}</div>
                      <div className="mono-label text-[0.6rem] text-muted-foreground">{s.label}</div>
                    </div>
                  )
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#publications"
                  onClick={(e) => { e.preventDefault(); document.getElementById("publications")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  View Research <ChevronRight size={14} aria-hidden="true" />
                </a>

                <a
                  href="mailto:abduallah.adel.omar@gmail.com"
                  aria-label="Send email to Abduallah Mohamed"
                  className="flex items-center gap-2 border border-border text-muted-foreground px-5 py-2.5 rounded text-sm font-semibold hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <Mail size={14} aria-hidden="true" /> Contact
                </a>
                <a
                  href="https://docs.google.com/document/d/1kjwufHH1gzeKYCvm9kC1PCGX4iw7XPuSqGwhofgA-ic/export?format=pdf"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Download resume PDF (opens in new tab)"
                  className="flex items-center gap-2 border border-border text-muted-foreground px-5 py-2.5 rounded text-sm font-semibold hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <ExternalLink size={14} aria-hidden="true" /> Resume
                </a>
              </div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            aria-hidden="true"
          >
            <div className="mono-label text-[0.55rem] text-muted-foreground/50">scroll</div>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              className="w-px h-8 bg-gradient-to-b from-primary/50 to-transparent"
            />
          </motion.div>
        </section>

        {/* ── EXPERTISE ── */}
        <section id="expertise" aria-labelledby="expertise-heading" className="py-24 relative">
          <div className="absolute inset-0 grid-dots opacity-20 pointer-events-none" />
          <div className="container relative">
            <FadeIn>
              <div className="flex items-center gap-4 mb-12">
                <div className="h-px bg-border/50 w-[40px]" aria-hidden="true" />
                <h2 id="expertise-heading" className="text-3xl lg:text-4xl font-bold">Areas of Expertise</h2>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {expertise.map((item, i) => (
                <FadeIn key={item.label} delay={i * 0.1}>
                  <div className="card-hover bg-card rounded-lg p-6 h-full">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded bg-primary/10 border border-primary/20 shrink-0">
                        <item.icon size={20} aria-hidden="true" className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base mb-2">{item.label}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{item.desc}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.tags.map((t) => (
                            <span key={t} className="mono-label text-[0.6rem] px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary/70">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <ExperienceSection />

        {/* ── PUBLICATIONS ── */}
        {/* Screen-reader live region for publication loading state */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {isLoadingPublications ? "Loading publications..." : ""}
        </div>
        <section id="publications" aria-labelledby="publications-heading" aria-busy={isLoadingPublications} className="py-24">
          <div className="container">
            <FadeIn>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-px bg-border/50 w-[40px]" aria-hidden="true" />
                <h2 id="publications-heading" className="text-3xl lg:text-4xl font-bold">Publications</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-10 ml-0 lg:ml-0">
                {totalCitations.toLocaleString()}+ citations across CVPR, ECCV, ICCV, IEEE PerCom, and WACV.{" "}
                <a href="https://scholar.google.com/citations?hl=en&user=FAOtbV4AAAAJ" target="_blank" rel="noreferrer" aria-label="View all publications on Google Scholar (opens in new tab)" className="text-primary hover:underline inline-flex items-center gap-1">
                  Google Scholar <ExternalLink size={11} aria-hidden="true" />
                </a>
              </p>
            </FadeIn>

            <div className="flex flex-col gap-3">
              {publications.map((pub, i) => (
                <FadeIn key={i} delay={i * 0.05}>
                  <div className="card-hover bg-card rounded-lg px-5 py-4 flex items-start gap-4 group">
                    <div className="shrink-0 w-12 text-center">
                      <div className="mono-label text-[0.6rem] text-primary/70">{pub.year}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={pub.link}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${pub.title} — ${pub.venue} (opens in new tab)`}
                        className="text-sm font-medium leading-snug mb-1.5 hover:text-primary transition-colors block"
                      >
                        {pub.title}
                      </a>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="mono-label text-[0.6rem] px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary/80">{pub.venue}</span>
                        {pub.citations && (
                          <span className="mono-label text-[0.58rem] text-muted-foreground flex items-center gap-1">
                            <Award size={9} aria-hidden="true" /> {pub.citations} citations
                          </span>
                        )}
                        {pub.demo && (
                          <Link
                            href="/demo"
                            className="mono-label text-[0.6rem] px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1 hover:bg-amber-500/25 transition-colors"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Interactive Demo
                          </Link>
                        )}
                        {pub.github && (
                          <a
                            href={pub.github}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`View source code for ${pub.title} on GitHub (opens in new tab)`}
                            className="mono-label text-[0.6rem] px-2 py-0.5 rounded bg-muted/40 border border-border text-muted-foreground flex items-center gap-1 hover:text-foreground hover:border-foreground/30 transition-colors"
                          >
                            <Github size={9} aria-hidden="true" /> Code
                          </a>
                        )}
                      </div>
                    </div>
                    <a href={pub.link} target="_blank" rel="noreferrer" aria-label={`Open paper: ${pub.title} (opens in new tab)`} className="shrink-0 mt-1">
                      <ExternalLink size={12} aria-hidden="true" className="text-muted-foreground/30 hover:text-primary/60 transition-colors" />
                    </a>
                  </div>
                </FadeIn>
              ))}
            </div>

            {/* Patent */}
            <FadeIn delay={0.4}>
              <a
                href="https://patents.google.com/patent/DE102017101476B3"
                target="_blank"
                rel="noreferrer"
                aria-label="View patent DE102017101476B3: Locating an object using ultrasonic sensors (opens in new tab)"
                className="mt-8 p-5 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-start gap-3 group hover:border-amber-500/40 transition-colors block"
              >
                        <Award size={18} aria-hidden="true" className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="mono-label text-[0.6rem] text-amber-400 mb-1">Patent · DE102017101476B3 · 2018</div>
                  <div className="text-sm font-medium group-hover:text-amber-300 transition-colors">Locating an object in an environment of a motor vehicle by means of an ultrasonic sensor system</div>
                  <div className="text-xs text-muted-foreground mt-1">Filed during tenure at Valeo — ultrasonic-based multi-object detection and tracking</div>
                </div>
                <ExternalLink size={12} className="shrink-0 mt-1 text-amber-400/40 group-hover:text-amber-400/80 transition-colors" />
              </a>
            </FadeIn>
          </div>
        </section>



        {/* ── EDUCATION ── */}
        <section className="py-16 border-t border-border/30">
          <div className="container">
            <FadeIn>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div>
                  <div className="mono-label mb-3">Education</div>
                  <h3 className="text-lg font-bold mb-2">PhD, Electrical & Computer Engineering</h3>
                  <div className="text-sm text-muted-foreground">The University of Texas at Austin · 2017–2022</div>
                  <div className="text-xs text-muted-foreground mt-1">Supervised by Prof. Claudel & Prof. Tewfik · Co-advised by Prof. Elhoseiny (KAUST/Stanford)</div>
                </div>
                <div>
                  <div className="mono-label mb-3">Research Focus</div>
                  <p className="text-sm text-muted-foreground">Trajectory prediction for autonomous and non-autonomous objects. Member of the Mobile Automation and Sensing Systems (MASS) lab.</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── CONTACT ── */}
        <section id="contact" aria-labelledby="contact-heading" className="py-24 bg-card/30">
          <div className="container">
            <FadeIn>
              <div className="flex items-center gap-4 mb-12">
                <div className="h-px bg-border/50 w-[40px]" aria-hidden="true" />
                <h2 id="contact-heading" className="text-3xl lg:text-4xl font-bold">Contact</h2>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <FadeIn>
                <div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                    Open to research collaborations, speaking engagements, and advisory opportunities in applied AI, sensor systems, and autonomous systems.
                  </p>
                  <div className="flex flex-col gap-4">
                    <a href="mailto:abduallah.adel.omar@gmail.com" aria-label="Email: abduallah.adel.omar@gmail.com" className="flex items-center gap-3 text-sm group">
                      <div className="p-2 rounded bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                        <Mail size={14} aria-hidden="true" className="text-primary" />
                      </div>
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">abduallah.adel.omar@gmail.com</span>
                    </a>
                    <a href="tel:5129241587" aria-label="Phone: 512-924-1587" className="flex items-center gap-3 text-sm group">
                      <div className="p-2 rounded bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                        <Phone size={14} aria-hidden="true" className="text-primary" />
                      </div>
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">512-924-1587</span>
                    </a>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded bg-primary/10 border border-primary/20">
                        <MapPin size={14} aria-hidden="true" className="text-primary" />
                      </div>
                      <span className="text-muted-foreground">Redmond, WA</span>
                    </div>
                  </div>
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <div className="flex flex-col gap-3">
                  {[
                    { icon: Github, label: "GitHub", href: "https://github.com/abduallahmohamed", sub: "github.com/abduallahmohamed" },
                    { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/in/abduallah-mohamed/", sub: "linkedin.com/in/abduallah-mohamed" },
                    { icon: BookOpen, label: "Google Scholar", href: "https://scholar.google.com/citations?hl=en&user=FAOtbV4AAAAJ", sub: `${totalCitations.toLocaleString()}+ citations` },
                  ].map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${link.label}: ${link.sub} (opens in new tab)`}
                      className="card-hover flex items-center gap-4 bg-card rounded-lg px-4 py-3 group"
                    >
                      <link.icon size={16} aria-hidden="true" className="text-primary shrink-0" />
                      <div>
                        <div className="text-sm font-medium group-hover:text-primary transition-colors">{link.label}</div>
                        <div className="mono-label text-[0.58rem] text-muted-foreground">{link.sub}</div>
                      </div>
                      <ExternalLink size={12} aria-hidden="true" className="ml-auto text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                    </a>
                  ))}
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="py-8 border-t border-border/30">
          <div className="container flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="mono-label text-[0.6rem] text-muted-foreground/50">
              © 2026 Abduallah Mohamed, PhD · Redmond, WA
            </div>
            <div className="mono-label text-[0.6rem] text-muted-foreground/40">
              VP of AI/ML · AIDAChip Inc
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
