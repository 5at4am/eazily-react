import { useEffect, useState } from 'react';
import { catalog as fallbackCatalog } from './catalog.js';
import { supabase } from '../lib/supabase.js';
import { CatalogContext } from './catalogStore.js';

function cloneCatalog() {
  return fallbackCatalog.map(category => ({ ...category, groups: category.groups?.map(group => ({ ...group, items: [...group.items] })), items: category.items ? [...category.items] : undefined }));
}

export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState(fallbackCatalog);
  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.from('service_catalog_groups')
      .select('id,name,icon,sort_order,active,services(id,name,slug,active)')
      .eq('active', true).order('sort_order')
      .then(({ data, error }) => {
        if (!active || error || !Array.isArray(data) || !data.length) return;
        const next = cloneCatalog();
        const serviceCategory = next.find(category => category.id === 'manpower');
        if (!serviceCategory) return;
        serviceCategory.groups = data.map(group => ({
          id: group.id,
          label: group.name,
          icon: group.icon || 'grid',
          items: (group.services || []).filter(service => service.active).map(service => service.name),
        }));
        setCatalog(next);
      }).catch(() => { /* Keep the bundled catalogue as a safe offline fallback. */ });
    return () => { active = false; };
  }, []);
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}
