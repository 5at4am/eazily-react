// Keep a partial directory available when one source is healthy, but do not
// turn two backend failures into a misleading "no results" state.
export async function readDirectorySources(readModern, readLegacy) {
  const results = await Promise.allSettled([readModern(), readLegacy()]);
  const available = results.filter(result => result.status === 'fulfilled');

  if (!available.length) {
    throw new AggregateError(
      results.map(result => result.reason),
      'Professional listings could not be loaded. Check your connection and try again.'
    );
  }

  return results.map(result => result.status === 'fulfilled' ? result.value ?? [] : []);
}
