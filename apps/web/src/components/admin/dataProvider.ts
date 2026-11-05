import { HttpError } from 'react-admin';
import type { DataProvider } from 'react-admin';
import { api, getErrorMessage } from '@/lib/api';

/**
 * DataProvider của react-admin, nói chuyện với API CRUD tổng quát của server:
 *   /api/admin/resources/:resource  (chỉ tài khoản admin)
 */
const base = '/admin/resources';

/** Chuyển lỗi axios thành HttpError để react-admin hiển thị đúng thông báo và xử lý 401/403. */
async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    throw new HttpError(getErrorMessage(err), err?.response?.status ?? 500, err?.response?.data);
  }
}

function listParams(
  pagination: { page: number; perPage: number },
  sort: { field: string; order: string },
  filter: Record<string, unknown> | undefined
) {
  const { q, ...rest } = filter || {};
  const params: Record<string, unknown> = {
    _start: (pagination.page - 1) * pagination.perPage,
    _end: pagination.page * pagination.perPage,
    _sort: sort.field,
    _order: sort.order,
  };
  if (q) params.q = q;
  if (Object.keys(rest).length > 0) params.filter = JSON.stringify(rest);
  return params;
}

export const dataProvider = {
  getList: (resource: string, p: any) =>
    call(async () => {
      const res = await api.get(`${base}/${resource}`, { params: listParams(p.pagination, p.sort, p.filter) });
      return { data: res.data.data, total: res.data.total };
    }),

  getOne: (resource: string, p: any) =>
    call(async () => ({ data: (await api.get(`${base}/${resource}/${p.id}`)).data.data })),

  getMany: (resource: string, p: any) =>
    call(async () => {
      if (!p.ids || p.ids.length === 0) return { data: [] };
      const res = await api.get(`${base}/${resource}`, {
        params: { _start: 0, _end: p.ids.length, filter: JSON.stringify({ id: p.ids }) },
      });
      return { data: res.data.data };
    }),

  getManyReference: (resource: string, p: any) =>
    call(async () => {
      const res = await api.get(`${base}/${resource}`, {
        params: listParams(p.pagination, p.sort, { ...(p.filter || {}), [p.target]: p.id }),
      });
      return { data: res.data.data, total: res.data.total };
    }),

  create: (resource: string, p: any) =>
    call(async () => ({ data: (await api.post(`${base}/${resource}`, p.data)).data.data })),

  update: (resource: string, p: any) =>
    call(async () => {
      const { id: _id, ...body } = p.data;
      return { data: (await api.put(`${base}/${resource}/${p.id}`, body)).data.data };
    }),

  updateMany: (resource: string, p: any) =>
    call(async () => {
      await Promise.all(p.ids.map((id: string) => api.put(`${base}/${resource}/${id}`, p.data)));
      return { data: p.ids };
    }),

  delete: (resource: string, p: any) =>
    call(async () => ({ data: (await api.delete(`${base}/${resource}/${p.id}`)).data.data })),

  deleteMany: (resource: string, p: any) =>
    call(async () => {
      await Promise.all(p.ids.map((id: string) => api.delete(`${base}/${resource}/${id}`)));
      return { data: p.ids };
    }),
} as unknown as DataProvider;
