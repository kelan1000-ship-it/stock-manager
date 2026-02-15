
import { useState, useEffect } from 'react';
import { ColumnVisibility } from '../types';

const DEFAULT_VISIBILITY: ColumnVisibility = {
  rrp: true,
  margin: true,
  stock: true,
  order: true,
  status: true,
};

export function useColumnVisibility() {
  const [columns, setColumns] = useState<ColumnVisibility>(() => {
    try {
      const saved = localStorage.getItem('greenchem-column-prefs');
      return saved ? JSON.parse(saved) : DEFAULT_VISIBILITY;
    } catch {
      return DEFAULT_VISIBILITY;
    }
  });

  useEffect(() => {
    localStorage.setItem('greenchem-column-prefs', JSON.stringify(columns));
  }, [columns]);

  const toggleColumn = (key: keyof ColumnVisibility) => {
    setColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return {
    columns,
    toggleColumn
  };
}
