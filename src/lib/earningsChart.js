// Weekly earnings bars for the vendor growth view. Uses the same amount rules as
// the dashboard totals: available/pending/paid add, reversed subtract. Renders
// pure data; the component owns the visual bars.

function sumEntry(entry) {
  const amount = Number(entry.amount || 0);
  if (['available', 'pending', 'paid'].includes(entry.state)) return amount;
  if (entry.state === 'reversed') return -amount;
  return 0;
}

export function weeklyEarnings(earnings = [], weeks = 8) {
  const anchor = new Date();
  anchor.setHours(0, 0, 0, 0);
  const daysToMonday = (anchor.getDay() + 6) % 7;
  anchor.setDate(anchor.getDate() - daysToMonday);
  const labels = [];
  const values = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    let total = 0;
    for (const entry of earnings) {
      const at = entry.created_at ? new Date(entry.created_at) : null;
      if (at && at >= start && at < end) total += sumEntry(entry);
    }
    labels.push(start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
    values.push(total);
  }
  const peak = Math.max(1, ...values.map(Math.abs));
  return { labels, values, peak };
}
