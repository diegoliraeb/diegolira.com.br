import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDown, ArrowUp, ArrowRight, BrainCircuit, Layers3, Monitor, ChartNoAxesCombined, Plus, Menu, X, Globe2, Instagram, Linkedin, Facebook } from 'lucide-react';
import { content, languages } from './content.js';

const serviceIcons = [BrainCircuit, Layers3, Monitor, ChartNoAxesCombined];
const external = { target: '_blank', rel: 'noopener noreferrer' };
const getLanguage = () => Object.hasOwn(content, window.location.pathname.split('/')[1]) ? window.location.pathname.split('/')[1] : 'pt';

function Brand() {
  return <a className="brand" href="#topo" aria-label="Diego Lira">Diego<span>Lira</span><i aria-hidden="true" /></a>;
}

function Crystal() {
  return <div className="crystal-stage" aria-hidden="true">
    <div className="crystal-ground" />
    <svg className="crystal" viewBox="0 0 450 460" fill="none">
      <defs>
        <linearGradient id="face1" x1="90" y1="100" x2="340" y2="380" gradientUnits="userSpaceOnUse"><stop stopColor="#4bafff"/><stop offset=".4" stopColor="#0d4397"/><stop offset="1" stopColor="#020a19"/></linearGradient>
        <linearGradient id="face2" x1="100" y1="350" x2="300" y2="150" gradientUnits="userSpaceOnUse"><stop stopColor="#06132c"/><stop offset=".5" stopColor="#17498b"/><stop offset="1" stopColor="#62c5ff"/></linearGradient>
        <linearGradient id="face3" x1="350" y1="120" x2="180" y2="380" gradientUnits="userSpaceOnUse"><stop stopColor="#020711"/><stop offset=".65" stopColor="#0752a7"/><stop offset="1" stopColor="#2ba5fa"/></linearGradient>
        <linearGradient id="edges" x1="140" y1="90" x2="340" y2="390" gradientUnits="userSpaceOnUse"><stop stopColor="#8ed3ff"/><stop offset=".5" stopColor="#2356a6"/><stop offset="1" stopColor="#65c9ff"/></linearGradient>
      </defs>
      <g stroke="url(#edges)" strokeWidth="1.1" strokeLinejoin="round">
        <path d="m85 205 84-85 140-64 53 128-52 190-165 15Z" fill="#071a35"/>
        <path d="m169 120 140-64-65 166Z" fill="url(#face1)"/>
        <path d="m309 56 53 128-118 38Z" fill="url(#face3)"/>
        <path d="m85 205 84-85 75 102Z" fill="url(#face2)"/>
        <path d="m85 205 159 17-99 167Z" fill="url(#face1)"/>
        <path d="m244 222 118-38-52 190Z" fill="url(#face2)"/>
        <path d="m244 222 66 152-165 15Z" fill="url(#face3)"/>
        <path d="m169 120 6 173 135 81M85 205l90 88 187-109M145 389l30-96 134-237" opacity=".65"/>
      </g>
      <g fill="#c0e9ff"><circle cx="244" cy="222" r="2.5"/><circle cx="169" cy="120" r="2"/><circle cx="310" cy="374" r="2"/></g>
    </svg>
  </div>;
}

function ServiceDialog({ service, index, onClose, t }) {
  const dialogRef = useRef(null);
  const Icon = serviceIcons[index];
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);
  return <dialog ref={dialogRef} className="service-dialog" aria-labelledby="service-title" onClose={onClose} onClick={event => { if (event.target === dialogRef.current) onClose(); }}>
    <div className="dialog-inner">
      <button className="icon-button dialog-close" onClick={onClose} aria-label={t.closeDetails}><X size={22}/></button>
      <span className="eyebrow">0{index + 1} / {t.nav[1]}</span>
      <Icon className="dialog-icon" size={46} strokeWidth={1.3}/>
      <h2 id="service-title">{service[0]}</h2>
      <p>{service[2]}</p>
      <a className="button" href="https://www.instagram.com/tiolira/" {...external}>{service[3]} <ArrowUpRight size={18}/></a>
    </div>
  </dialog>;
}

export default function App() {
  const [lang, setLang] = useState(getLanguage);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [activeService, setActiveService] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);
  const heroRef = useRef(null);
  const t = content[lang];

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 24);
    const onPopState = () => { setLang(getLanguage()); setMenuOpen(false); };
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('popstate', onPopState);
    return () => { window.removeEventListener('scroll', updateScroll); window.removeEventListener('popstate', onPopState); };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
    document.title = t.title;
    const url = `https://diegolira.com.br/${lang === 'pt' ? '' : lang}`;
    document.querySelector('link[rel="canonical"]').href = url;
    document.querySelector('meta[property="og:url"]').content = url;
    document.querySelector('meta[property="og:title"]').content = t.title;
    document.querySelector('meta[property="og:description"]').content = t.intro;
    document.querySelector('meta[name="description"]').content = t.intro;
  }, [lang, t]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = event => {
      if (event.key === 'Escape') { setMenuOpen(false); menuRef.current?.focus(); }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { threshold: .1 });
    document.querySelectorAll('[data-reveal]').forEach(element => { element.classList.add('will-reveal'); observer.observe(element); });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)');
    let frame;
    const move = event => {
      if (media.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        hero.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
        hero.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
        hero.style.setProperty('--portrait-x', `${(event.clientX / rect.width - .5) * 10}px`);
      });
    };
    const leave = () => { cancelAnimationFrame(frame); hero.style.setProperty('--portrait-x', '0px'); };
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', leave);
    return () => { cancelAnimationFrame(frame); hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', leave); };
  }, []);

  function switchLanguage(event) {
    const value = event.target.value;
    window.history.pushState({}, '', `/${value === 'pt' ? '' : value}${window.location.hash}`);
    setLang(value);
  }

  return <>
    <a className="skip-link" href="#conteudo">{t.skip}</a>
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container header-inner">
        <Brand/>
        <nav id="main-navigation" className={menuOpen ? 'navigation is-open' : 'navigation'} aria-label={t.menu}>
          {['#sobre', '#atuacao', '#ebrothers', 'https://tiolira.com.br'].map((href, i) => <a key={href} href={href} {...(i === 3 ? external : {})} onClick={() => setMenuOpen(false)}>{t.nav[i]}{i === 3 && <ArrowUpRight size={13}/>}</a>)}
          <a className="mobile-contact" href="#contato" onClick={() => setMenuOpen(false)}>{t.talk} <ArrowUpRight size={16}/></a>
        </nav>
        <div className="header-actions">
          <label className="language-select"><Globe2 size={14} aria-hidden="true"/><span className="sr-only">{t.language}</span><select aria-label={t.language} value={lang} onChange={switchLanguage}>{Object.entries(languages).map(([code, name]) => <option key={code} value={code} lang={code}>{code.toUpperCase()} — {name}</option>)}</select></label>
          <a className="button button-outline header-contact" href="#contato">{t.talk}<ArrowUpRight size={16}/></a>
          <button ref={menuRef} className="icon-button menu-toggle" aria-expanded={menuOpen} aria-controls="main-navigation" aria-label={menuOpen ? t.close : t.menu} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
        </div>
      </div>
    </header>

    <main id="conteudo">
      <section id="topo" ref={heroRef} className="hero">
        <div className="hero-grid" aria-hidden="true"/>
        <div className="hero-spotlight" aria-hidden="true"/>
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow"><span/>{t.eyebrow}</p>
            <h1><span>{t.headline[0]}</span><span>{t.headline[1]}</span><span className="gradient-text">{t.headline[2]}</span></h1>
            <p className="hero-description">{t.intro}</p>
            <div className="hero-actions"><a className="button" href="#contato">{t.talk}<ArrowUpRight size={20}/></a><a className="text-link" href="https://ebrothers.com.br" {...external}>{t.discover}<ArrowRight size={18}/></a></div>
            <a className="scroll-cue" href="#sobre"><span><ArrowDown size={15}/></span>{t.scroll}</a>
          </div>
          <div className="hero-visual">
            <div className="portrait-glow" aria-hidden="true"/>
            <div className="orbit orbit-one" aria-hidden="true"><i/></div><div className="orbit orbit-two" aria-hidden="true"/>
            <div className="portrait-wrap"><img className="portrait" src="/assets/diego-lira.svg" width="200" height="300" alt="Diego Lira" fetchPriority="high"/></div>
            <div className="portrait-caption"><span className="caption-line"/><strong>Diego Lira</strong><span>{t.role}</span></div>
            <div className="portrait-coordinate" aria-hidden="true">DL / 01<span>EST. FUTURE</span></div>
          </div>
        </div>
      </section>

      <div className="pillars"><div className="container pillars-inner">{t.pillars.map((pillar, i) => <div key={pillar}><span>{pillar}</span>{i !== 3 && <Plus size={13} aria-hidden="true"/>}</div>)}</div></div>

      <section className="about section container" id="sobre" data-reveal>
        <div><p className="eyebrow">{t.aboutLabel}</p><h2>{t.aboutHeading[0]}<br/>{t.aboutHeading[1]}</h2></div>
        <div className="about-copy"><p>{t.about}</p><div className={`about-expanded ${aboutOpen ? 'is-expanded' : ''}`} id="about-details" inert={!aboutOpen}><div><p>{t.aboutMore}</p></div></div><button className="text-link" aria-expanded={aboutOpen} aria-controls="about-details" onClick={() => setAboutOpen(!aboutOpen)}>{aboutOpen ? t.readLess : t.readMore}<ArrowUpRight size={17} className={aboutOpen ? 'rotated' : ''}/></button></div>
      </section>

      <section className="expertise section container" id="atuacao">
        <div className="section-heading" data-reveal><div><p className="eyebrow">{t.workLabel}</p><h2>{t.workHeading}</h2></div><p>{t.workIntro}</p></div>
        <div className="services-grid">{t.services.map((service, index) => { const Icon = serviceIcons[index]; return <button className="service-card" key={index} onClick={() => setActiveService(index)} aria-haspopup="dialog" data-reveal style={{ '--delay': `${index * 80}ms` }}>
          <div className="service-top"><Icon size={34} strokeWidth={1.4}/><span>0{index + 1}</span></div><h3>{service[0]}</h3><p>{service[1]}</p><span className="card-arrow"><ArrowUpRight size={22}/></span>
        </button>; })}</div>
      </section>

      <section className="company" id="ebrothers">
        <div className="company-grid" aria-hidden="true"/>
        <div className="container company-inner"><div className="company-copy" data-reveal><p className="eyebrow">{t.companyLabel}</p><h2>{t.companyHeading[0]}<br/>{t.companyHeading[1]}</h2><p className="company-description">{t.companyBody}</p><a className="text-link" href="https://ebrothers.com.br" {...external}>{t.discover}<ArrowUpRight size={18}/></a></div>
          <div className="company-art" data-reveal><Crystal/><div className="company-tags">{t.companyTags.map(tag => <span key={tag}>{tag}</span>)}</div></div>
        </div>
      </section>

      <section className="contact section container" id="contato" data-reveal>
        <p className="eyebrow">{t.contactLabel}</p><div className="contact-inner"><div><h2>{t.contactHeading[0]}<br/><span>{t.contactHeading[1]}</span></h2><p>{t.contactBody}</p></div><a className="contact-orb" href="https://www.instagram.com/tiolira/" {...external}><ArrowUpRight size={37} strokeWidth={1.3}/><span>{t.talk}</span><span className="sr-only"> — Instagram</span></a></div>
        <div className="contact-links"><a className="text-link" href="https://www.instagram.com/tiolira/" {...external}><Instagram size={17}/>{t.contactCta}<ArrowUpRight size={15}/></a><a className="text-link" href="https://www.linkedin.com/in/tiolira/" {...external}><Linkedin size={17}/>LinkedIn<ArrowUpRight size={15}/></a><a className="text-link" href="https://www.facebook.com/diegolira.com.br" {...external}><Facebook size={17}/>Facebook<ArrowUpRight size={15}/></a></div>
      </section>
    </main>

    <footer className="footer"><div className="container footer-inner"><Brand/><span>© {new Date().getFullYear()} Diego Lira. <span className="footer-tagline">{t.footer}</span></span><a href="#topo" className="back-top" aria-label={t.top}><ArrowUp size={17}/></a></div></footer>
    {activeService !== null && <ServiceDialog service={t.services[activeService]} index={activeService} onClose={() => setActiveService(null)} t={t}/>}
  </>;
}
