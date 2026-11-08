import { translate } from "../../lib/translate.js";
import { useEffect, useRef, useState } from "react";
import Icon from "../../components/Icon.jsx";
import { BottomNav, EmptyState, Field, Sheet } from "../../components/Ui.jsx";
import { heroSlides, promiseItems, topServices } from "../../data/userExperience.js";
import { getActiveServiceCatalogue, getCurrentProfile, getNearbyCustomerProfessionals } from '../../services/marketplace.js';
import { ReferralCard } from '../account/CustomerAccount.jsx';
import ServiceIllustration from '../user-art/ServiceIllustration.jsx';
import { serviceCampaignImages } from './serviceCampaignImages.js';
import { firstHomeHeroArtwork, homeHeroArtwork } from './homeHeroArtwork.js';
import { UserVendorSkeleton } from '../user-motion/UserLoading.jsx';
import './home-carousel.css';
import { mergeServicePool } from './moreServiceRotation.js';
const moreHomeServices = topServices.filter(service => !['Electrician', 'AC Service'].includes(service.name));
const bulkTickerMessage = 'Office, society ya event? • Multiple services ek saath • Apni requirement bhejein';
function HomeProviderCarousel({ providers, loading, onOpen, motionReduced }) {
  const count = providers.length;
  const providerIds = providers.map(provider => provider.id).join('|');
  const slides = count > 1 ? [providers[count - 1], ...providers, providers[0]] : providers;
  const [index, setIndex] = useState(count > 1 ? 1 : 0);
  const [transitioning, setTransitioning] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef(null), paused = useRef(false), suppressClick = useRef(false);
  useEffect(() => { setTransitioning(false); setIndex(count > 1 ? 1 : 0); setDrag(0); }, [count, providerIds]);
  useEffect(() => {
    if (count <= 1 || motionReduced || !autoPlay) return undefined;
    const timer = window.setInterval(() => { if (!paused.current && !document.hidden) { setTransitioning(true); setIndex(value => value + 1); } }, 6500);
    return () => window.clearInterval(timer);
  }, [count, motionReduced, autoPlay]);
  const finish = event => {
    if (start.current == null) return;
    const movement = event.clientX - start.current;
    suppressClick.current = Math.abs(movement) > 8;
    setDrag(0); start.current = null; paused.current = false;
    if (Math.abs(movement) > 38) { setTransitioning(true); setIndex(value => value + (movement < 0 ? 1 : -1)); }
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    window.setTimeout(() => { suppressClick.current = false; }, 60);
  };
  const current = count ? (index - 1 + count) % count : 0;
  if (loading) return <UserVendorSkeleton count={1} rail />;
  if (!count) return null;
  return <div className="home-provider-carousel"><div className="home-provider-viewport" onPointerDown={event => { start.current = event.clientX; paused.current = true; }} onPointerMove={event => { if (start.current == null) return; const movement = event.clientX - start.current; if (Math.abs(movement) > 8 && !event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId); setDrag(movement); }} onPointerUp={finish} onPointerCancel={finish}><div className={`home-provider-track${transitioning ? ' is-moving' : ''}`} style={{ transform: `translate3d(calc(${-index * 100}% + ${index * 30 + drag}px),0,0)` }} onTransitionEnd={() => { if (index === 0) { setTransitioning(false); setIndex(count); } else if (index === count + 1) { setTransitioning(false); setIndex(1); } }}>{slides.map((provider, slideIndex) => { const name = provider.display_name || provider.business_name || 'Professional'; const service = provider.selected_service || provider.service_names?.[0] || 'Home service'; return <article className="home-provider-card" key={`${provider.id}-${slideIndex}`}><div className="home-provider-photo">{provider.photo_url ? <img src={provider.photo_url} alt={name} loading="lazy" /> : <Icon name="person" size={42} />}</div><div className="home-provider-details"><small>{translate(service)}</small><h3>{translate(name)}</h3><div className="home-provider-facts">{provider.review_count > 0 ? <span><Icon name="star" size={16} />{Number(provider.rating || 0).toFixed(1)} · {provider.review_count} {translate('reviews')}</span> : <span>{translate('No reviews yet')}</span>}{provider.experience_years > 0 && <span>{provider.experience_years} Years</span>}<span className="provider-price">{translate(provider.starting_price == null ? 'Request a quote' : `From ₹${Number(provider.starting_price).toLocaleString('en-IN')}`)}</span><span><Icon name="clock" size={16} />{translate(provider.available_now ? 'Available now' : provider.available_now === false ? 'Currently offline' : provider.availability || 'Availability by confirmation')}</span>{(provider.city || provider.coverage?.[0]) && <span><Icon name="location" size={13} />{translate(provider.city || provider.coverage[0])}</span>}</div><button type="button" className="btn btn-outline full" onClick={event => { event.stopPropagation(); if (!suppressClick.current) onOpen(provider); }}>{translate('View profile')}</button></div></article>; })}</div></div>{count > 1 && <div className="home-provider-dots" aria-label="Provider slides" onFocusCapture={() => { paused.current = true; }} onBlurCapture={() => { paused.current = false; }}>{providers.map((provider, dot) => <button type="button" key={provider.id} className={dot === current ? 'active' : ''} aria-pressed={dot === current} aria-label={`Show provider ${dot + 1}`} onClick={() => { setTransitioning(true); setIndex(dot + 1); }} />)}</div>}{count > 1 && !motionReduced && <button type="button" className="link" aria-pressed={autoPlay} onClick={() => setAutoPlay(value => !value)}>{translate(autoPlay ? "Pause profiles" : "Play profiles")}</button>}</div>;
}
export default function UserHome({
  route,
  navigate,
  setRequest,
  setProfileSheet,
  notify,
  searchArea,
  onMenu,
  onVendor,
  onBulkOrders,
  city,
  onCityChange,
}) {
  const [professionals, setProfessionals] = useState([]);
  const [professionalsLoading, setProfessionalsLoading] = useState(true);
  const [professionalsError, setProfessionalsError] = useState('');
  const [professionalsReload, reloadProfessionals] = useState(0);
  const [customer, setCustomer] = useState(null);
  useEffect(() => {
    let active = true;
    setProfessionalsLoading(true);
    setProfessionalsError('');
    getNearbyCustomerProfessionals(city).then(rows => {
      if (active) {
        setProfessionals(rows);
        setProfessionalsLoading(false);
      }
    }).catch(e => {
      if (active) { setProfessionalsLoading(false); setProfessionalsError(e.message); notify(e.message); }
    });
    getCurrentProfile().then(p => {
      if (active) setCustomer(p);
    }).catch(e => { if (active) notify(e.message); });
    return () => {
      active = false;
    };
  }, [city, notify, professionalsReload]);
  const [locationOpen, setLocationOpen] = useState(false);
  const [location, setLocation] = useState({
    locality: city,
    address: "Service city"
  });
  const [addressSearch, setAddressSearch] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [heroStopped, setHeroStopped] = useState(true);
  const [motionReduced, setMotionReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [moreServicePool, setMoreServicePool] = useState(moreHomeServices);
  const touchStart = useRef(null);
  const bulkTickerText = useRef(null);
  const bulkTickerTrack = useRef(null);
  const serviceShowcases = useRef([]);
  const heroRef = useRef(null);
  const exploreGridRef = useRef(null);
  const slide = heroSlides[heroIndex];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = event => setMotionReduced(event.matches);
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);
  useEffect(() => {
    const text = bulkTickerText.current;
    const track = bulkTickerTrack.current;
    if (!text || !track) return undefined;
    const updateSpeed = () => {
      const distance = text.getBoundingClientRect().width + 24;
      track.style.setProperty('--bulk-ticker-distance', `${distance}px`);
      track.style.setProperty('--bulk-ticker-duration', `${distance / 32}s`);
    };
    updateSpeed();
    const observer = new ResizeObserver(updateSpeed);
    observer.observe(text);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    getActiveServiceCatalogue().then(services => {
      if (!active || !services.length) return;
      setMoreServicePool(mergeServicePool(moreHomeServices.map(service => ({ ...service, categoryId: 'manpower' })), services));
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (heroPaused || heroStopped || document.hidden || motionReduced) return undefined;
    const timer = window.setInterval(() => setHeroIndex(index => (index + 1) % heroSlides.length), 4500);
    return () => window.clearInterval(timer);
  }, [heroPaused, heroStopped, motionReduced]);
  useEffect(() => {
    const sections = serviceShowcases.current.filter(Boolean);
    if (motionReduced || !('IntersectionObserver' in window)) {
      sections.forEach(section => section.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14 });
    sections.forEach(section => {
      section.classList.add('service-showcase-ready');
      observer.observe(section);
    });
    return () => observer.disconnect();
  }, [motionReduced]);
  useEffect(() => {
    const selector = `link[data-eazily-home-hero="${firstHomeHeroArtwork}"]`;
    if (document.head.querySelector(selector)) return undefined;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.type = 'image/jpeg';
    link.href = firstHomeHeroArtwork;
    link.fetchPriority = 'high';
    link.dataset.eazilyHomeHero = firstHomeHeroArtwork;
    document.head.append(link);
    return () => link.remove();
  }, []);
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || motionReduced || !('requestAnimationFrame' in window)) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = hero.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const progress = ((rect.top + rect.height / 2) - vh / 2) / (vh / 2);
      const clamped = Math.max(-1, Math.min(1, progress));
      hero.style.setProperty('--px', clamped.toFixed(4));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [motionReduced]);
  useEffect(() => {
    const grid = exploreGridRef.current;
    if (!grid) return undefined;
    if (motionReduced || !('IntersectionObserver' in window)) {
      grid.classList.add('is-visible');
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    observer.observe(grid);
    return () => observer.disconnect();
  }, [motionReduced]);
  function completeSwipe(event) {
    const movement = event.changedTouches[0].clientX - (touchStart.current ?? event.changedTouches[0].clientX);
    if (Math.abs(movement) > 45) setHeroIndex(index => (index + (movement < 0 ? 1 : heroSlides.length - 1)) % heroSlides.length);
    touchStart.current = null;
    setHeroPaused(false);
  }
  return <main className="screen home-v3 user-art-home marketplace-home">
    <section className="home-discovery-header"><header className="user-home-header"><div className="user-brand-row"><span className="user-brand-lead">{onMenu && <button type="button" className="user-menu-button" onClick={onMenu} aria-label={translate("Open menu")}><Icon name="menu" size={22} /></button>}<span className="marketplace-brand">eazily<span>.</span><small>{translate("A little help, every day.")}</small></span></span><button className="location-selector compact-location" onClick={() => { setAddressSearch(city); setLocationOpen(true); }}><Icon name="location" size={15} /><span><b>{translate(location.locality)}</b><small>{translate(location.address)}</small></span><Icon name="chevronRight" size={13} /></button></div><h1>{translate(greeting)}{translate(customer?.full_name ? `, ${customer.full_name}` : "")}</h1><p>{translate("What can we make easier for you today?")}</p></header><div className="search-cart-row">{translate(searchArea)}</div></section>
    <section ref={heroRef} className={`hero-carousel hero-header hero-parallax hero-theme-${slide.id}`} style={{ '--promotion-image': `url("${homeHeroArtwork[slide.id]}")` }} onFocusCapture={() => setHeroPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHeroPaused(false); }} onMouseEnter={() => setHeroPaused(true)} onMouseLeave={() => setHeroPaused(false)} onTouchStart={event => {
      touchStart.current = event.touches[0].clientX;
      setHeroPaused(true);
    }} onTouchEnd={completeSwipe}><div className={`hero-promotion hero-promotion-${slide.id}`} key={slide.id}><div className="hero-copy"><span>{translate(slide.eyebrow)}</span><h2>{translate(slide.title)}</h2><p>{translate(slide.text)}</p><button className="btn btn-white" onClick={() => setRequest({
          categoryId: slide.categoryId,
          serviceName: slide.serviceName
        })}>{translate(slide.action)} <Icon name="chevronRight" size={15} /></button></div><div className="hero-person" aria-hidden="true"><img src={homeHeroArtwork[slide.id]} alt="" width="480" height="600" loading={heroIndex === 0 ? "eager" : "lazy"} fetchPriority={heroIndex === 0 ? "high" : "low"} decoding="async" /></div></div><div className="hero-art" aria-hidden="true"><i /><i /></div><div className="hero-controls"><div className="hero-dots home-bulk-orders-dots">{translate(heroSlides.map((item, index) => <button type="button" key={item.id} className={index === heroIndex ? "active" : ""} aria-pressed={index === heroIndex} aria-label={`Show promotion ${index + 1}`} onClick={() => setHeroIndex(index)} />))}</div>
      {!motionReduced && <button type="button" className="promotion-play" aria-pressed={!heroStopped} onClick={() => setHeroStopped(value => !value)}><Icon name={heroStopped ? "play" : "pause"} size={16} /><span className="user-sr-only">{translate(heroStopped ? "Play promotions" : "Pause promotions")}</span></button>}</div>
    </section>
    <section className="section"><div className="section-head"><h2>{translate("What's on your to-do list?")}</h2><button onClick={() => navigate("categories")}>{translate("View all")}</button></div><div ref={exploreGridRef} className="explore-grid">{translate(topServices.map((service, index) => <button key={service.id} style={{ '--i': index }} onClick={() => setRequest({
          categoryId: service.categoryId ?? "manpower",
          serviceName: service.requestName
        })}><i><ServiceIllustration name={service.requestName} /></i><b>{translate(service.name)}</b></button>))}</div></section>
    <section className="section marketplace-collections" aria-labelledby="marketplace-collections-title"><div className="section-head"><div><span className="eyebrow">{translate("Life made easier")}</span><h2 id="marketplace-collections-title">{translate("Small fixes. Big relief.")}</h2></div></div><div className="marketplace-collection-grid">{[
      { id: 'home', label: 'A fresh start at home', text: 'Make room for the good days.', action: 'Explore cleaning', service: 'Deep Cleaning', image: serviceCampaignImages.cleaning, theme: 'mint' },
      { id: 'repairs', label: 'Give your appliances a little care', text: 'Keep everyday life running.', action: 'Explore repairs', service: 'AC Service', image: serviceCampaignImages.acCare, theme: 'peach' },
      { id: 'beauty', label: 'A little time for yourself', text: 'Discover beauty and salon care at home.', action: 'Explore beauty', service: 'Salon at Home', image: serviceCampaignImages.beauty, theme: 'mint' },
      { id: 'moving', label: 'Your next chapter starts here', text: 'Find support for moving day.', action: 'Explore moving', service: 'Packers & Movers', categoryId: 'transportation', image: serviceCampaignImages.moving, theme: 'peach' }
    ].map(item => <button type="button" className={`marketplace-collection ${item.theme}`} key={item.id} onClick={() => setRequest({ categoryId: item.categoryId ?? 'manpower', serviceName: item.service })}><img className="collection-photo" src={item.image} alt="" width="1536" height="1024" loading="lazy" decoding="async" /><span className="collection-copy"><b>{translate(item.label)}</b><small>{translate(item.text)}</small><span>{translate(item.action)} <Icon name="chevronRight" size={16} /></span></span></button>)}</div></section>
    <section className="section home-professionals-section"><div className="section-head"><div><h2>{translate("Professionals near you")}</h2><p>{translate("Compare profiles, availability, and starting prices.")}</p></div></div><HomeProviderCarousel providers={professionals} loading={professionalsLoading} onOpen={onVendor} motionReduced={motionReduced} />
      {!professionalsLoading && (professionalsError ? <div><span className="user-sr-only" role="alert">{translate('Couldn’t load professionals. Check your connection, then try again.')}</span><EmptyState title="Couldn’t load professionals" text="Check your connection, then try again." actionLabel="Try again" onAction={() => reloadProfessionals(value => value + 1)} /></div> : !professionals.length && <EmptyState title="No professionals listed nearby yet" text="Choose another service or update your city to see available professionals." actionLabel="Browse services" onAction={() => navigate('categories')} />)}
    </section>
      <section className="home-bulk-orders-strip" aria-labelledby="home-bulk-orders-title" onTouchStart={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}>
        <div className="home-bulk-orders-top">
          <div className="home-bulk-orders-label"><span className="home-bulk-orders-icon"><Icon name="building" size={17} /></span><h2 id="home-bulk-orders-title">{translate("Bulk orders")}</h2></div>
          <button className="home-bulk-orders-cta" type="button" onClick={onBulkOrders}>{translate("Get Quote")} <Icon name="chevronRight" size={16} /></button>
        </div>
        <div className="home-bulk-orders-ticker-row">
          <div className="home-bulk-orders-ticker-window">
            <span className="user-sr-only">{translate(bulkTickerMessage)}</span>
            <div className="home-bulk-orders-ticker-track" ref={bulkTickerTrack} aria-hidden="true">
              <span ref={bulkTickerText}>{translate(bulkTickerMessage)}</span><span>{translate(bulkTickerMessage)}</span>
            </div>
          </div>
        </div>
      </section>
    <section className="section home-service-showcase more-service-showcase" ref={node => { serviceShowcases.current[0] = node; }}>
      <i className="service-showcase-glow" aria-hidden="true" />
      <div className="section-head service-showcase-heading"><div><span>{translate("Quick access")}</span><h2>{translate("More services")}</h2><p>{translate("More ways Eazily can help at home.")}</p></div><button onClick={() => navigate("categories")}>{translate("See all")}</button></div>
      <div className="more-service-grid">{translate(moreServicePool.slice(0, 6).map((service, index) => <button type="button" className="more-service-card" key={`more-${service.id || service.requestName}`} style={{ '--service-order': index }} onClick={() => setRequest({ categoryId: service.categoryId ?? "manpower", serviceName: service.requestName })}><i><ServiceIllustration name={service.requestName} /></i><span><b>{translate(service.name)}</b><small>{translate("Explore service")}</small></span><Icon name="chevronRight" size={17} /></button>))}</div>
    </section>
    <section className="section promise-section"><span className="eyebrow">{translate("SERVICE STANDARDS")}</span><h2>{translate("The Eazily Promise")}</h2><div className="promise-rail">{translate(promiseItems.map(item => <article key={item.id}><b>{translate(item.number)}</b><div><h3>{translate(item.title)}</h3><p>{translate(item.text)}</p></div></article>))}</div><small>{translate("Eazily protection applies only to payments completed through the official Eazily payment system or company QR. Cash payments and payments made to a professional\u2019s personal QR are not covered.")}</small></section>
    <ReferralCard onOpen={() => setProfileSheet("Refer & Earn")} />
    <BottomNav route={route} onChange={navigate} />
    {locationOpen && <Sheet onClose={() => setLocationOpen(false)}><span className="eyebrow">{translate("YOUR SERVICE AREA")}</span><h2 className="sheet-title">{translate("Choose your city")}</h2><p className="sheet-sub">{translate("Enter a city to find professionals serving your area. Add the full service address when booking.")}</p><form onSubmit={event => {
      event.preventDefault(); const nextCity = addressSearch.trim(); if (!nextCity) return;
      setLocation({ locality: nextCity, address: "Service city" }); onCityChange(nextCity); setLocationOpen(false); notify("Service city updated");
    }}><Field label="Service city" placeholder="For example, Bhopal" value={addressSearch} onChange={event => setAddressSearch(event.target.value)} required maxLength={100} /><button type="submit" className="btn btn-primary full" disabled={!addressSearch.trim()}>{translate("Confirm city")}</button></form><button type="button" className="btn btn-outline full" onClick={() => { setLocationOpen(false); setProfileSheet("Location & Addresses"); }}>{translate("Manage addresses")}</button></Sheet>}
  </main>;
}
