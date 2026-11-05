import { useContext } from 'react';
import { CatalogContext } from './catalogStore.js';

export function useCatalog() { return useContext(CatalogContext); }
