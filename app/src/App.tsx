import { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  Clock, 
  ChevronRight,
  Mail,
  Twitter,
  Github,
  Bookmark,
  Search,
  Loader2
} from 'lucide-react';
import { generateArticle } from './api';
import type { Article } from './types';
import './App.css';

gsap.registerPlugin(ScrollTrigger);

// Suggested topic chips — user can also type their own
const suggestedTopics = [
  { name: 'Science', color: '#00E5C0' },
  { name: 'Technology', color: '#2D8FFF' },
  { name: 'Philosophy', color: '#B829F7' },
  { name: 'History', color: '#FF9F2D' },
  { name: 'Psychology', color: '#FF6B9D' },
  { name: 'Space', color: '#00B4D8' },
  { name: 'Mathematics', color: '#FFD93D' },
  { name: 'Art', color: '#FF2D8F' },
  { name: 'Economics', color: '#06D6A0' },
  { name: 'Biology', color: '#8AC926' },
];

// Dynamic badge color generator
function getBadgeStyle(topic: string) {
  const colors: Record<string, string> = {
    science: '#00E5C0',
    technology: '#2D8FFF',
    tech: '#2D8FFF',
    philosophy: '#B829F7',
    history: '#FF9F2D',
    psychology: '#FF6B9D',
    design: '#FF2D8F',
    space: '#00B4D8',
    mathematics: '#FFD93D',
    art: '#FF2D8F',
    economics: '#06D6A0',
    biology: '#8AC926',
  };
  const color = colors[topic.toLowerCase()] || '#FF2D8F';
  return {
    background: `${color}1F`,
    color: color,
  };
}

// Dynamic image generation via Picsum Photos (using query as seed for consistency)
function getImageUrl(query: string, width = 800, height = 500) {
  const seed = encodeURIComponent(query.toLowerCase().replace(/[^a-z0-9]/g, ''));
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

function App() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Refs for animations
  const heroRef = useRef<HTMLDivElement>(null);
  const featuredRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const relatedRef = useRef<HTMLDivElement>(null);
  const newsletterRef = useRef<HTMLDivElement>(null);
  
  const featuredCardRef = useRef<HTMLDivElement>(null);
  const articleHeaderRef = useRef<HTMLDivElement>(null);

  // Entrance animation on load
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 });
      
      tl.fromTo('.hero-eyebrow', 
        { y: -18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
      )
      .fromTo('.hero-headline span',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.08 },
        '-=0.3'
      )
      .fromTo('.hero-subheadline',
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' },
        '-=0.4'
      )
      .fromTo('.topic-chip',
        { scale: 0.96, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.05 },
        '-=0.3'
      )
      .fromTo('.custom-topic-row',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
        '-=0.2'
      )
      .fromTo('.hero-cta',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
        '-=0.2'
      );
    });

    return () => ctx.revert();
  }, []);

  // Animate article content when it appears
  const animateArticleContent = useCallback(() => {
    // Kill existing scroll triggers before creating new ones
    ScrollTrigger.getAll().forEach(st => st.kill());

    const ctx = gsap.context(() => {
      // Featured card
      if (featuredRef.current && featuredCardRef.current) {
        gsap.fromTo(featuredCardRef.current,
          { y: 100, scale: 0.96, opacity: 0 },
          {
            y: 0, scale: 1, opacity: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: featuredRef.current,
              start: 'top 80%',
              end: 'top 30%',
              scrub: 1,
            }
          }
        );
      }

      // Article header
      if (articleRef.current && articleHeaderRef.current) {
        gsap.fromTo(articleHeaderRef.current,
          { x: -50, opacity: 0 },
          {
            x: 0, opacity: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: articleRef.current,
              start: 'top 70%',
              end: 'top 30%',
              scrub: 1,
            }
          }
        );
      }

      // Section headings
      gsap.utils.toArray<HTMLElement>('.article-h2').forEach((el) => {
        gsap.fromTo(el,
          { x: -40, opacity: 0 },
          {
            x: 0, opacity: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 60%', scrub: 1 }
          }
        );
      });

      // Paragraphs
      gsap.utils.toArray<HTMLElement>('.article-para').forEach((el) => {
        gsap.fromTo(el,
          { y: 24, opacity: 0 },
          {
            y: 0, opacity: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 65%', scrub: 1 }
          }
        );
      });

      // Images
      gsap.utils.toArray<HTMLElement>('.inline-image').forEach((el) => {
        gsap.fromTo(el,
          { y: 60, scale: 0.98, opacity: 0 },
          {
            y: 0, scale: 1, opacity: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 55%', scrub: 1 }
          }
        );
      });

      // Related cards
      gsap.utils.toArray<HTMLElement>('.related-card').forEach((el) => {
        gsap.fromTo(el,
          { y: 80, opacity: 0, scale: 0.98 },
          {
            y: 0, opacity: 1, scale: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 60%', scrub: 1 }
          }
        );
      });

      // Newsletter
      if (newsletterRef.current) {
        gsap.fromTo('.newsletter-content',
          { y: 40, opacity: 0 },
          {
            y: 0, opacity: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: newsletterRef.current,
              start: 'top 80%',
              end: 'top 50%',
              scrub: 1,
            }
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  // Re-run scroll animations when article content changes
  useEffect(() => {
    if (article) {
      // Wait for DOM to update before animating
      const timer = setTimeout(() => {
        animateArticleContent();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [article, animateArticleContent]);

  const handleTopicSelect = (topicName: string) => {
    if (selectedTopic === topicName) {
      setSelectedTopic(null);
    } else {
      setSelectedTopic(topicName);
      setCustomTopic('');
    }
  };

  const handleGenerateArticle = async () => {
    const topic = customTopic.trim() || selectedTopic;
    if (!topic) return;

    setIsLoading(true);
    setError(null);
    setArticle(null);

    // Scroll to the featured section to show loading
    featuredRef.current?.scrollIntoView({ behavior: 'smooth' });

    try {
      const generatedArticle = await generateArticle(topic);
      setArticle(generatedArticle);
      // Scroll to the featured card after a moment
      setTimeout(() => {
        featuredRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong generating your article.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelatedTopicClick = (topicTitle: string) => {
    setCustomTopic(topicTitle);
    setSelectedTopic(null);
    // Auto-scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Auto-generate
    setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      setArticle(null);
      featuredRef.current?.scrollIntoView({ behavior: 'smooth' });
      try {
        const generatedArticle = await generateArticle(topicTitle);
        setArticle(generatedArticle);
        setTimeout(() => {
          featuredRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 200);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        setIsLoading(false);
      }
    }, 600);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setEmail('');
    }
  };

  const scrollToArticle = () => {
    articleRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeTopic = customTopic.trim() || selectedTopic;

  return (
    <div className="min-h-screen bg-charcoal text-near-white overflow-x-hidden">
      {/* Grain Overlay */}
      <div className="grain-overlay" />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-12 py-5 flex items-center justify-between bg-charcoal/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-hot-pink" />
          <span className="font-display font-bold text-xl tracking-tight">Curiosity</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#topics" className="font-ui text-sm text-cool-gray hover:text-near-white transition-colors">Topics</a>
          <a href="#archive" className="font-ui text-sm text-cool-gray hover:text-near-white transition-colors">Archive</a>
          <a href="#saved" className="font-ui text-sm text-cool-gray hover:text-near-white transition-colors">Saved</a>
          <a href="#about" className="font-ui text-sm text-cool-gray hover:text-near-white transition-colors">About</a>
        </div>
      </nav>

      {/* Section 1: Hero + Topic Picker */}
      <section ref={heroRef} className="min-h-screen flex items-center justify-center relative px-6 lg:px-12 pt-20">
        {/* Background Outline Word */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <span 
            className="font-display font-black text-[20vw] text-transparent select-none"
            style={{ 
              WebkitTextStroke: '1px rgba(244, 246, 250, 0.06)',
              opacity: 0.5
            }}
          >
            CURIOSITY
          </span>
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Eyebrow */}
          <p className="hero-eyebrow font-ui text-xs tracking-[0.2em] text-cool-gray uppercase mb-6">
            Daily Drops for the Inquisitive
          </p>

          {/* Headline */}
          <h1 className="hero-headline font-display font-black text-5xl sm:text-6xl lg:text-7xl xl:text-8xl uppercase leading-[0.95] mb-8">
            <span className="block">One Curiosity</span>
            <span className="block text-gradient">Every Day</span>
          </h1>

          {/* Subheadline */}
          <p className="hero-subheadline font-body text-base lg:text-lg text-cool-gray max-w-xl mx-auto mb-10 leading-relaxed">
            Pick a topic or type your own. Get one essential story—concise, visual, and generated fresh by AI in under 6 minutes of reading.
          </p>

          {/* Topic Chips */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {suggestedTopics.map((topic) => (
              <button
                key={topic.name}
                onClick={() => handleTopicSelect(topic.name)}
                className={`topic-chip font-ui text-sm ${selectedTopic === topic.name ? 'active' : ''}`}
                style={selectedTopic === topic.name ? { 
                  background: `${topic.color}1F`,
                  borderColor: topic.color,
                  color: topic.color,
                } : {}}
              >
                {topic.name}
              </button>
            ))}
          </div>

          {/* Custom Topic Input */}
          <div className="custom-topic-row flex items-center justify-center gap-3 mb-10 max-w-md mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cool-gray" />
              <input
                type="text"
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  if (e.target.value.trim()) setSelectedTopic(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customTopic.trim()) {
                    handleGenerateArticle();
                  }
                }}
                placeholder="Or type any topic…"
                className="w-full pl-11 pr-5 py-3 rounded-full bg-white/5 border border-white/10 font-ui text-sm text-near-white placeholder:text-cool-gray/60 focus:outline-none focus:border-hot-pink/50 transition-colors"
              />
            </div>
          </div>

          {/* CTA Button */}
          <div className="hero-cta">
            <button 
              onClick={handleGenerateArticle}
              disabled={!activeTopic || isLoading}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  {activeTopic ? `Generate ${activeTopic} article` : "Pick a topic to start"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Section 2: Featured Article Card / Loading / Error */}
      <section ref={featuredRef} className="min-h-screen flex items-center justify-center px-6 lg:px-12 py-20">
        {isLoading ? (
          /* Loading Skeleton */
          <div className="w-full max-w-5xl">
            <div className="article-card h-[70vh] min-h-[500px] relative overflow-hidden">
              <div className="absolute inset-0 loading-shimmer" />
              <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 space-y-4">
                <div className="h-6 w-20 rounded-full bg-white/10 animate-pulse" />
                <div className="h-12 w-3/4 rounded-xl bg-white/10 animate-pulse" />
                <div className="h-8 w-1/2 rounded-xl bg-white/5 animate-pulse" />
                <div className="h-4 w-2/3 rounded-lg bg-white/5 animate-pulse" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-hot-pink animate-spin mx-auto mb-4" />
                  <p className="font-ui text-sm text-cool-gray">Crafting your article…</p>
                  <p className="font-ui text-xs text-cool-gray/60 mt-1">This takes about 10-15 seconds</p>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          /* Error State */
          <div className="w-full max-w-xl text-center">
            <div className="article-card p-12">
              <div className="text-4xl mb-4">😔</div>
              <h3 className="font-display font-bold text-xl uppercase mb-3">Something went wrong</h3>
              <p className="font-body text-cool-gray text-sm mb-6">{error}</p>
              <button 
                onClick={handleGenerateArticle}
                className="btn-primary inline-flex items-center gap-2"
              >
                Try again <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : article ? (
          /* Featured Article Card */
          <div 
            ref={featuredCardRef}
            className="article-card w-full max-w-5xl h-[70vh] min-h-[500px] relative group"
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <img 
                src={getImageUrl(article.heroImageQuery, 1200, 800)} 
                alt={article.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/60 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12">
              <span 
                className="px-3 py-1 rounded-full text-xs font-ui font-semibold mb-4 inline-block"
                style={getBadgeStyle(article.topic)}
              >
                {article.topic.toUpperCase()}
              </span>
              <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl uppercase leading-tight mb-4 max-w-2xl">
                {article.title}
              </h2>
              <p className="font-body text-cool-gray text-base lg:text-lg max-w-xl mb-6 leading-relaxed">
                {article.subtitle}
              </p>
              <button 
                onClick={scrollToArticle}
                className="inline-flex items-center gap-2 font-ui text-sm text-hot-pink hover:gap-3 transition-all"
              >
                Read the story <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Empty State — before any generation */
          <div className="w-full max-w-xl text-center">
            <div className="article-card p-12 border-dashed">
              <Sparkles className="w-10 h-10 text-hot-pink mx-auto mb-4 opacity-50" />
              <h3 className="font-display font-bold text-xl uppercase mb-3">Your article awaits</h3>
              <p className="font-body text-cool-gray text-sm">
                Select a topic above or type your own, then hit generate to get a fresh, AI-crafted article.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Section 3: Article Reader — only shown when article is loaded */}
      {article && (
        <section ref={articleRef} className="py-20 lg:py-32">
          {/* Article Header */}
          <div ref={articleHeaderRef} className="px-6 lg:px-12 mb-16">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
              {/* Text Column */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span 
                    className="px-3 py-1 rounded-full text-xs font-ui font-semibold"
                    style={getBadgeStyle(article.topic)}
                  >
                    {article.topic.toUpperCase()}
                  </span>
                  <span className="font-ui text-xs text-cool-gray flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {article.readTime}
                  </span>
                </div>
                <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl uppercase leading-tight mb-6">
                  {article.title}
                </h2>
                <p className="font-body text-cool-gray text-lg leading-relaxed mb-6">
                  {article.subtitle}
                </p>
                <p className="font-ui text-sm text-cool-gray">
                  By <span className="text-near-white">Curiosity AI</span>
                </p>
              </div>

              {/* Image Column */}
              <div className="relative">
                <img 
                  src={getImageUrl(article.heroImageQuery, 800, 600)} 
                  alt={article.title} 
                  className="w-full h-[400px] lg:h-[500px] object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>

          {/* Article Body */}
          <div className="px-6 lg:px-12">
            <div className="reading-column">
              {article.sections.map((section, i) => (
                <div key={i}>
                  <h3 className="article-h2 font-display font-black text-2xl lg:text-3xl uppercase mb-6 mt-16">
                    {section.heading}
                  </h3>
                  {section.paragraphs.map((para, j) => (
                    <p key={j} className="article-para font-body text-base lg:text-lg text-cool-gray leading-relaxed mb-6">
                      {para}
                    </p>
                  ))}

                  {/* Inline Image */}
                  <div className="inline-image my-12">
                    <img 
                      src={getImageUrl(section.imageQuery, 980, 550)} 
                      alt={section.imageCaption} 
                      className="w-full h-auto rounded-2xl"
                    />
                    <p className="font-ui text-xs text-cool-gray mt-3 text-center">
                      {section.imageCaption}
                    </p>
                  </div>
                </div>
              ))}

              {/* Article Actions */}
              <div className="flex items-center gap-4 pt-8 border-t border-white/10">
                <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                  <Bookmark className="w-4 h-4" />
                  <span className="font-ui text-sm">Save for later</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                  <Twitter className="w-4 h-4" />
                  <span className="font-ui text-sm">Share</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Section 4: Related Curiosities — only shown when article is loaded */}
      {article && article.relatedTopics && article.relatedTopics.length > 0 && (
        <section ref={relatedRef} className="py-20 lg:py-32 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto mb-16">
            <h2 className="font-display font-black text-4xl lg:text-5xl uppercase mb-4">
              More to Explore
            </h2>
            <p className="font-body text-cool-gray text-lg">
              Click any card to generate a new article.
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {article.relatedTopics.map((related, i) => (
              <div 
                key={i}
                onClick={() => handleRelatedTopicClick(related.title)}
                className="related-card article-card aspect-[4/3] relative group cursor-pointer"
              >
                <div className="absolute inset-0">
                  <img 
                    src={getImageUrl(related.imageQuery, 600, 450)} 
                    alt={related.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-transparent" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span 
                    className="px-3 py-1 rounded-full text-xs font-ui font-semibold mb-3 inline-block"
                    style={getBadgeStyle(related.topic)}
                  >
                    {related.topic.toUpperCase()}
                  </span>
                  <h3 className="font-display font-bold text-lg uppercase leading-tight">
                    {related.title}
                  </h3>
                </div>

                <div className="absolute inset-0 bg-hot-pink/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 5: Newsletter + Footer */}
      <section ref={newsletterRef} className="py-20 lg:py-32 px-6 lg:px-12 border-t border-white/5">
        <div className="newsletter-content max-w-xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Mail className="w-6 h-6 text-hot-pink" />
          </div>
          <h2 className="font-display font-black text-3xl lg:text-4xl uppercase mb-4">
            Get the Next Drop
          </h2>
          <p className="font-body text-cool-gray mb-8">
            One email. No noise. Unsubscribe anytime.
          </p>

          {!isSubscribed ? (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-5 py-3 rounded-full bg-white/5 border border-white/10 font-ui text-sm focus:outline-none focus:border-hot-pink/50 transition-colors"
                required
              />
              <button type="submit" className="btn-primary">
                Subscribe
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2 text-science-teal">
              <Sparkles className="w-5 h-5" />
              <span className="font-ui font-medium">You're on the list!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-white/5">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-hot-pink" />
              <span className="font-display font-bold text-lg">Curiosity</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="font-ui text-sm text-cool-gray hover:text-near-white transition-colors">Privacy</a>
              <a href="#" className="font-ui text-sm text-cool-gray hover:text-near-white transition-colors">Terms</a>
              <a href="#" className="font-ui text-sm text-cool-gray hover:text-near-white transition-colors">Contact</a>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="text-cool-gray hover:text-near-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-cool-gray hover:text-near-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-cool-gray hover:text-near-white transition-colors">
                <BookOpen className="w-5 h-5" />
              </a>
            </div>
          </div>
          <p className="text-center font-ui text-xs text-cool-gray/60 mt-8">
            © 2026 Curiosity Daily. All rights reserved.
          </p>
        </footer>
      </section>
    </div>
  );
}

export default App;
