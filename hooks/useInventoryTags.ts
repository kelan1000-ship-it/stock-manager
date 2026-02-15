
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Product } from '../types';

export interface TagStyle {
  color: string;
  isFlashing: boolean;
}

/**
 * useInventoryTags - Modular hook for categorical tagging and filtering.
 * Now includes support for custom colors and flashing animations.
 */
export function useInventoryTags(data: Product[], onUpdateItem?: (itemId: string, updates: Partial<Product>) => void) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // Persistent storage for tag visual settings (color/flashing)
  const [tagSettings, setTagSettings] = useState<Record<string, TagStyle>>(() => {
    const saved = localStorage.getItem('greenchem-tag-settings');
    const defaults = {
      'antibiotic': { color: '#ef4444', isFlashing: false }, // Red
      'pain': { color: '#3b82f6', isFlashing: false }, // Blue
      'essential': { color: '#10b981', isFlashing: false }, // Emerald
      'controlled': { color: '#f59e0b', isFlashing: true }, // Amber + Flash
      'anti-inflammatory': { color: '#8b5cf6', isFlashing: false }, // Violet
      'diabetes': { color: '#06b6d4', isFlashing: false }, // Cyan
      'eye care': { color: '#ec4899', isFlashing: false }, // Pink
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  // Persist settings whenever they change
  useEffect(() => {
    localStorage.setItem('greenchem-tag-settings', JSON.stringify(tagSettings));
  }, [tagSettings]);

  // Function to toggle a tag filter
  const toggleFilter = useCallback((tag: string) => {
    setActiveFilters(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  // Clear all tag filters
  const clearFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  // Add a tag to a specific item
  const addTag = useCallback((itemId: string, newTag: string) => {
    const cleanTag = newTag.trim();
    if (!cleanTag || !onUpdateItem) return;

    const item = data.find(i => i.id === itemId);
    if (!item) return;

    const currentTags = item.tags || [];
    if (currentTags.includes(cleanTag)) return;

    onUpdateItem(itemId, {
      tags: [...currentTags, cleanTag]
    });
  }, [data, onUpdateItem]);

  // Remove a tag from a specific item
  const removeTag = useCallback((itemId: string, tagToRemove: string) => {
    if (!onUpdateItem) return;

    const item = data.find(i => i.id === itemId);
    if (!item) return;

    const currentTags = item.tags || [];
    onUpdateItem(itemId, {
      tags: currentTags.filter(t => t !== tagToRemove)
    });
  }, [data, onUpdateItem]);

  /**
   * Update the visual style of a specific tag globally
   */
  const updateTagSettings = useCallback((tag: string, settings: Partial<TagStyle>) => {
    setTagSettings(prev => ({
      ...prev,
      [tag]: {
        color: prev[tag]?.color || '#1e293b', // Default slate-800
        isFlashing: prev[tag]?.isFlashing || false,
        ...settings
      }
    }));
  }, []);

  // Extract all unique tags currently present in the data set for the filter UI
  const allUniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    data.forEach(item => {
      item.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [data]);

  // Provide filtered data based on activeFilters
  const filteredData = useMemo(() => {
    if (activeFilters.length === 0) return data;
    return data.filter(item => 
      activeFilters.every(filterTag => item.tags?.includes(filterTag))
    );
  }, [data, activeFilters]);

  return {
    activeFilters,
    toggleFilter,
    clearFilters,
    addTag,
    removeTag,
    allUniqueTags,
    filteredData,
    tagSettings,
    updateTagSettings
  };
}
