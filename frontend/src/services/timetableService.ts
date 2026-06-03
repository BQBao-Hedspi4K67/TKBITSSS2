import { request } from './api';
import type { ConflictPreview, SaveUserSelectionsPayload, TimetableBatchResponse, TimetableCurrentResponse, TimetableImportResponse, UserSelectionsResponse } from '../types/timetable';
import type { SaveSchedulePayload, SavedSchedule } from '../types/schedule';

export async function uploadTimetable(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return request<TimetableImportResponse>('/imports/timetable', {
    method: 'POST',
    body: formData,
  });
}

export async function getImportBatch(batchId: string) {
  return request<TimetableBatchResponse>(`/imports/timetable/${batchId}`);
}

export async function getCurrentTimetable() {
  return request<TimetableCurrentResponse>('/timetable/current');
}

export async function getUserSelections() {
  return request<UserSelectionsResponse>('/user/selections');
}

export async function saveUserSelections(payload: SaveUserSelectionsPayload) {
  return request<UserSelectionsResponse>('/user/selections', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function previewConflicts(sectionIds: string[]) {
  return request<{ conflicts: ConflictPreview[] }>('/schedules/conflicts/preview', {
    method: 'POST',
    body: JSON.stringify({ sectionIds }),
  });
}

export async function listSchedules() {
  return request<{ schedules: SavedSchedule[] }>('/schedules');
}

export async function saveSchedule(payload: SaveSchedulePayload) {
  return request<{ schedule: SavedSchedule }>('/schedules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSchedule(scheduleId: string, payload: SaveSchedulePayload) {
  return request<{ schedule: SavedSchedule }>(`/schedules/${scheduleId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteSchedule(scheduleId: string) {
  return request<{ success: boolean }>(`/schedules/${scheduleId}`, {
    method: 'DELETE',
  });
}

export async function createShare(scheduleId: string, permission: 'VIEW' | 'COMMENT' = 'VIEW') {
  return request<{ share: { id: string; slug: string; permission: 'VIEW' | 'COMMENT'; createdAt: string; expiresAt: string | null } }>(`/schedules/${scheduleId}/shares`, {
    method: 'POST',
    body: JSON.stringify({ permission }),
  });
}

export async function listShares(scheduleId: string) {
  return request<{ shares: Array<{ id: string; slug: string; permission: 'VIEW' | 'COMMENT'; createdAt: string; expiresAt: string | null; schedule: { name: string } }> }>(`/schedules/${scheduleId}/shares`);
}

export async function updateShare(scheduleId: string, shareId: string, data: { permission?: 'VIEW' | 'COMMENT'; expiresAt?: string | null }) {
  return request<{ share: { id: string; slug: string; permission: 'VIEW' | 'COMMENT'; expiresAt: string | null } }>(`/schedules/${scheduleId}/shares/${shareId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteShareFromSchedule(scheduleId: string, shareId: string) {
  return request<{ success: boolean }>(`/schedules/${scheduleId}/shares/${shareId}`, {
    method: 'DELETE',
  });
}

export async function getSharedScheduleBySlug(slug: string) {
  return request<{ slug: string; permission: 'VIEW' | 'COMMENT'; createdAt: string; schedule: { id: string; name: string; user: { fullName: string; studentCode: string | null }; items: Array<{ id: string; courseCode: string; courseName: string; classCode: string; weekday: string; startTime: string; endTime: string; room: string; building: string | null }> } }>(`/schedules/shared/${slug}`);
}
