import { useState, useCallback, useEffect } from 'react';
import { getAuditTrail } from '../services/auditService.js';

const DEFAULT_LIMIT = 20;

export function useAuditTrail(initialFilters = {}) {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const limit = DEFAULT_LIMIT;

  const fetchPage = useCallback(async (pageNum, activeFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditTrail({ page: pageNum, limit, ...activeFilters });
      setEvents(data?.items || []);
      setTotal(data?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPage(page, filters);
  }, [page, filters, fetchPage]);

  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const nextPage = useCallback(() => {
    const totalPages = Math.ceil(total / limit);
    if (page < totalPages) setPage((p) => p + 1);
  }, [page, total, limit]);

  const prevPage = useCallback(() => {
    if (page > 1) setPage((p) => p - 1);
  }, [page]);

  const goToPage = useCallback((p) => {
    const totalPages = Math.ceil(total / limit);
    if (p >= 1 && p <= totalPages) setPage(p);
  }, [total, limit]);

  const refresh = useCallback(() => {
    fetchPage(page, filters);
  }, [fetchPage, page, filters]);

  return {
    events,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    loading,
    error,
    filters,
    applyFilters,
    nextPage,
    prevPage,
    goToPage,
    refresh,
  };
}

export default useAuditTrail;
