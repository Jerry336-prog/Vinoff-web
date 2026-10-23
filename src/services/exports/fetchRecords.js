import api from '../api';
import { collectExportPages } from './pagination';

export const fetchAllExportRecords = (path, { params = {}, signal, onProgress } = {}) =>
  collectExportPages(page => api.get(path, { params: { ...params, page, limit: 100 }, signal, timeout: 45000 }), { signal, onProgress });
