// Fiverr-style seller tiers derived from real work data. Levels are computed
// from completed work, average rating, and accept rate so a badge never claims
// anything the data can't prove.

export function computeSellerLevel({ completed = 0, rating = null, acceptedCount = 0, decidedCount = 0 } = {}) {
  const acceptRate = decidedCount >= 3 ? acceptedCount / decidedCount : null;
  if (completed >= 25 && rating != null && rating >= 4.5 && acceptRate != null && acceptRate >= 0.85) {
    return { key: 'top-rated', label: 'Top Rated', tier: 3 };
  }
  if (completed >= 10 && rating != null && rating >= 4.3) {
    return { key: 'level-2', label: 'Level 2', tier: 2 };
  }
  if (completed >= 1 && rating != null && rating >= 4) {
    return { key: 'level-1', label: 'Level 1', tier: 1 };
  }
  return { key: 'new', label: 'New seller', tier: 0 };
}

// Public-facing level uses only the stats any customer can see (completed jobs and
// average rating). Accept-rate data is private, so Top Rated is reserved for the
// strongest public evidence.
export function computePublicLevel({ completed = 0, rating = null } = {}) {
  if (completed >= 25 && rating != null && rating >= 4.5) {
    return { key: 'top-rated', label: 'Top Rated', tier: 3 };
  }
  if (completed >= 10 && rating != null && rating >= 4.3) {
    return { key: 'level-2', label: 'Level 2', tier: 2 };
  }
  if (completed >= 1 && rating != null && rating >= 4) {
    return { key: 'level-1', label: 'Level 1', tier: 1 };
  }
  return { key: 'new', label: 'New seller', tier: 0 };
}
