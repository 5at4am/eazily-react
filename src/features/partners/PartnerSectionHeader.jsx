import Icon from '../../components/Icon.jsx';
import { translate as t } from '../../lib/translate.js';

/** Consistent, scannable heading row for partner workspace content groups. */
export default function PartnerSectionHeader({ title, subtitle, icon, count, action, className = 'pd-section-title' }) {
  return <div className={`partner-section-heading ${className}`.trim()}>
    <div className="partner-section-heading-copy">
      <h2>{icon && <Icon name={icon} size={19} />}{t(title)}{count !== undefined && <span className="pd-count">{count}</span>}</h2>
      {subtitle && <p>{t(subtitle)}</p>}
    </div>
    {action && <div className="partner-section-heading-action">{action}</div>}
  </div>;
}
