import editorialBanner from './eazily-home-editorial.jpg';
import { serviceCampaignImages } from './serviceCampaignImages.js';
// User-home carousel only. Slide copy, destinations and timing remain in data/userExperience.js.
export const homeHeroArtwork = Object.freeze({
  today: editorialBanner,
  'home-care': serviceCampaignImages.cleaning,
  confidence: serviceCampaignImages.electrical,
  moving: serviceCampaignImages.moving,
});

export const firstHomeHeroArtwork = homeHeroArtwork.today;
