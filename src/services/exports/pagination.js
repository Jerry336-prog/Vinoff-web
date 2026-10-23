import { unwrapApiList } from '../../utils/apiResponse.js';

export const throwIfExportCancelled = signal => {
  if (signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError');
};

// Supports both the standard API meta envelope and the expense ledger envelope.
export const collectExportPages = async (getPage, { signal, onProgress } = {}) => {
  const records = [];
  const seen = new Set();
  let page = 1;
  let expectedTotal;
  while (true) {
    throwIfExportCancelled(signal);
    const response = await getPage(page);
    throwIfExportCancelled(signal);
    const items = unwrapApiList(response);
    if (response?.success === false) throw new Error(response.message || 'The server rejected the export request.');
    const meta = response?.meta?.pagination || response?.meta || response?.pagination || response?.data?.pagination || response?.data?.meta || response;
    const totalPages = Number(meta?.totalPages ?? meta?.pages);
    const totalItems = Number(meta?.totalItems ?? meta?.total);
    if (Number.isFinite(totalItems)) {
      if (expectedTotal !== undefined && expectedTotal !== totalItems) throw new Error('Records changed while exporting. Please try again for a consistent download.');
      expectedTotal = totalItems;
    }
    const currentPage = Number(meta?.currentPage ?? meta?.page);
    if (Number.isFinite(currentPage) && currentPage !== page) throw new Error('The server returned the wrong export page. Please try again.');
    let newItems = 0;
    items.forEach(item => {
      const id = item._id || item.id;
      if (id && seen.has(String(id))) throw new Error('Records changed or were repeated while exporting. No incomplete download was created.');
      if (id) seen.add(String(id));
      records.push(item);
      newItems++;
    });
    onProgress?.({ phase: 'loading', message: `Loading records: ${records.length}${expectedTotal !== undefined ? ` of ${expectedTotal}` : ''}`, completed: records.length, total: expectedTotal });
    const hasMore = typeof meta?.hasNextPage === 'boolean'
      ? meta.hasNextPage
      : Number.isFinite(totalPages) ? page < totalPages : false;
    if (!hasMore) {
      if (expectedTotal !== undefined && records.length !== expectedTotal) throw new Error('The server returned an incomplete export or inconsistent total. Please refresh and try again.');
      break;
    }
    if (!items.length || !newItems) throw new Error('Export pagination stopped returning new records. No incomplete download was created.');
    page++;
  }
  return records;
};
