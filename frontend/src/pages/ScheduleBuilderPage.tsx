import { useEffect, useMemo, useState } from 'react';
import { Tabs } from '../components/common/Tabs';
import { AppShell } from '../components/layout/AppShell';
import { UploadDropzone } from '../components/upload/UploadDropzone';
import { SubjectList } from '../components/subjects/SubjectList';
import { ScheduleDashboard } from '../components/schedule/ScheduleDashboard';
import { SavedSchedulesPanel } from '../components/schedule/SavedSchedulesPanel';
import { ShareScheduleModal } from '../components/schedule/ShareScheduleModal';
import { ChatPanel } from '../components/chat/ChatPanel';
import { AutoScheduleModal } from '../components/schedule/AutoScheduleModal';
import { SuggestionPanel } from '../components/schedule/SuggestionPanel';
import type { TimetableClass } from '../types/timetable';
import { useTimetableImport } from '../hooks/useTimetableImport';
import { useAuth } from '../hooks/useAuth';
import { deleteSchedule, getCurrentTimetable, getUserSelections, listSchedules, saveSchedule, updateSchedule, uploadTimetable } from '../services/timetableService';
import type { TimetableSection } from '../types/timetable';
import type { SavedSchedule } from '../types/schedule';
import { detectLocalConflicts } from '../utils/timetable';
import type { AutoScheduleResult } from '../utils/autoSchedule';

const tabs = [
  { key: 'upload', label: 'Upload Excel' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'saved', label: 'Lịch đã lưu' },
  { key: 'chat', label: ' Trò chuyện' },
];

export function ScheduleBuilderPage() {
  const { user } = useAuth();
  const { batchId, batch, subjects, sections, selectedSubject, selectedSubjectCode, selectedSubjectCodes, selectedClassCodeByCourseCode, visibleSubjects, suggestedSubjects, totalCredits, selectedClasses, selectedSections, setBatch, setBatchId, setSelectedSubjectCode, setSelectionSnapshot, chooseSubject, clearSubject, chooseClass, setSearch, search, setUploadError, uploadError } = useTimetableImport();
  const [activeTab, setActiveTab] = useState('upload');
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [remoteConflicts, setRemoteConflicts] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [scheduleRecords, setScheduleRecords] = useState<SavedSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState('');
  const [saveDialogError, setSaveDialogError] = useState<string | null>(null);
  const [saveConflictOpen, setSaveConflictOpen] = useState(false);
  const [viewingSchedule, setViewingSchedule] = useState<SavedSchedule | null>(null);
  const [previousSelectionSnapshot, setPreviousSelectionSnapshot] = useState<Array<{ courseCode: string; classCode: string | null }> | null>(null);
  const [previousActiveSubjectCode, setPreviousActiveSubjectCode] = useState<string | null>(null);
  const [shareModalSchedule, setShareModalSchedule] = useState<SavedSchedule | null>(null);
  const [autoScheduleOpen, setAutoScheduleOpen] = useState(false);
  const [autoScheduleErrorMessage, setAutoScheduleErrorMessage] = useState<string | null>(null);

  const localConflicts = useMemo(() => detectLocalConflicts(selectedSections), [selectedSections]);
  const hasOverlapConflicts = useMemo(
    () => localConflicts.some((c) => c.type === 'TIME_OVERLAP'),
    [localConflicts],
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateSchedules() {
      if (activeTab !== 'saved') {
        return;
      }

      setLoadingSchedules(true);
      try {
        const response = await listSchedules();
        if (!cancelled) {
          setScheduleRecords(response.schedules);
        }
      } finally {
        if (!cancelled) {
          setLoadingSchedules(false);
        }
      }
    }

    void hydrateSchedules();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const selectedSectionIds = useMemo(() => selectedSections.map((section) => section.id), [selectedSections]);
  const hasCurrentDraft = selectedSubjectCodes.length > 0 || selectedSections.length > 0;
  const canPrepareSchedule = Boolean(batchId);

  const dashboardSubject = selectedSubject;
  const dashboardSelectedClassCode = selectedSubject ? selectedClassCodeByCourseCode[selectedSubject.courseCode] : undefined;
  const dashboardTitle = viewingSchedule ? `Đang xem: ${viewingSchedule.name}` : 'Dashboard';

  const scheduleItemsToSelections = (schedule: SavedSchedule) => {
    const selectionsByCourse = new Map<string, string | null>();

    schedule.items.forEach((item) => {
      if (!selectionsByCourse.has(item.courseCode)) {
        selectionsByCourse.set(item.courseCode, item.classCode);
      }
    });

    return Array.from(selectionsByCourse.entries()).map(([courseCode, classCode]) => ({
      courseCode,
      classCode,
    }));
  };

  const restoreCurrentSchedule = () => {
    if (!previousSelectionSnapshot) {
      setViewingSchedule(null);
      setActiveTab('upload');
      return;
    }

    setSelectionSnapshot(previousSelectionSnapshot, previousActiveSubjectCode);
    setViewingSchedule(null);
    setPreviousSelectionSnapshot(null);
    setPreviousActiveSubjectCode(null);
    setActiveTab('dashboard');
    setStatusMessage('Đã quay về lịch hiện tại.');
  };

  const startNewSchedule = () => {
    setViewingSchedule(null);
    setPreviousSelectionSnapshot(null);
    setPreviousActiveSubjectCode(null);
    setSelectionSnapshot([], null);
    setSelectedSubjectCode(null);
    setSearch('');
    setStatusMessage('Đã chuyển sang màn chọn môn học để tạo lịch mới.');
    setActiveTab('upload');
  };

  const openPrepareDialog = () => {
    if (!canPrepareSchedule) {
      setStatusMessage('Hãy upload file Excel trước khi xếp thời khóa biểu.');
      return;
    }

    setActiveTab('dashboard');
    setStatusMessage('Đã chuyển sang màn dashboard để xếp thời khóa biểu.');
  };

  const handleViewSchedule = async (scheduleId: string) => {
    const schedule = scheduleRecords.find((item) => item.id === scheduleId) ?? null;
    if (!schedule) {
      return;
    }

    if (!viewingSchedule) {
      if (hasCurrentDraft) {
        setPreviousSelectionSnapshot(selectedSubjectCodes.map((courseCode) => ({
          courseCode,
          classCode: selectedClassCodeByCourseCode[courseCode] ?? null,
        })));
        setPreviousActiveSubjectCode(selectedSubjectCode ?? null);
      } else {
        setPreviousSelectionSnapshot(null);
        setPreviousActiveSubjectCode(null);
      }
    }

    setSelectionSnapshot(scheduleItemsToSelections(schedule), scheduleItemsToSelections(schedule)[0]?.courseCode ?? null);
    setViewingSchedule(schedule);
    setActiveTab('dashboard');
  };

  const openSaveDialog = () => {
    if (!batchId || !selectedSectionIds.length) {
      return;
    }

    if (hasOverlapConflicts) {
      setSaveConflictOpen(true);
      setSaveDialogOpen(false);
      return;
    }

    const defaultSaveName = viewingSchedule?.name;
    setSaveDialogName(defaultSaveName || `Lịch ${new Date().toLocaleString('vi-VN')}`);
    setSaveDialogError(null);
    setSaveDialogOpen(true);
  };

  const confirmSaveSchedule = async () => {
    const nextName = saveDialogName.trim();

    if (!nextName) {
      setSaveDialogError('Vui lòng nhập tên lịch.');
      return;
    }

    if (!batchId || !selectedSectionIds.length) {
      setSaveDialogError('Không có dữ liệu để lưu.');
      return;
    }

    if (hasOverlapConflicts) {
      setSaveDialogOpen(false);
      setSaveConflictOpen(true);
      return;
    }

    if (viewingSchedule) {
      await updateSchedule(viewingSchedule.id, {
        name: nextName,
        sourceBatchId: batchId,
        sectionIds: selectedSectionIds,
      });
      setStatusMessage(`Đã cập nhật lịch "${nextName}".`);
    } else {
      await saveSchedule({
        name: nextName,
        sourceBatchId: batchId,
        sectionIds: selectedSectionIds,
      });
      setStatusMessage(`Đã lưu lịch "${nextName}" vào database.`);
    }

    const response = await listSchedules();
    setScheduleRecords(response.schedules);
    setSaveDialogOpen(false);
    setViewingSchedule(null);
    setPreviousSelectionSnapshot(null);
    setPreviousActiveSubjectCode(null);
    setSelectionSnapshot([], null);
    setSelectedSubjectCode(null);
    setSearch('');
    setActiveTab('saved');
  };

  return (
    <AppShell
      sidebarTop={(
        <>
          <div className="tempo-metric">
            <span>TKB đã chọn</span>
            <strong>{batch?.fileName ?? 'None'}</strong>
          </div>
          <div className="tempo-metric">
            <span>Số môn học đã chọn</span>
            <strong>{selectedSubjectCodes.length}</strong>
          </div>
          <div className="tempo-metric">
            <span>Tổng số tín chỉ</span>
            <strong>{totalCredits}</strong>
          </div>
          <div className="tempo-metric">
            <span>Số lớp học đã chọn</span>
            <strong>{selectedClasses.length}</strong>
          </div>
          {uploadError ? <div className="tempo-error-banner">{uploadError}</div> : null}
          {remoteConflicts.length > 0 ? <div className="tempo-warning-banner">{remoteConflicts.join(' · ')}</div> : null}
          {statusMessage ? <div className="tempo-success-banner">{statusMessage}</div> : null}
        </>
      )}
    >
      <div className="tempo-builder-frame">
        

        <Tabs items={tabs} activeKey={activeTab} onChange={setActiveTab} />

        <div className="tempo-content-grid">
          <main className="tempo-main-panel">
            {activeTab === 'upload' ? (
              <section className="tempo-surface-card tempo-upload-flow">
                <div className="tempo-panel-toolbar">
                  <div>
                    <h3>Upload Excel thời khóa biểu</h3>
                  </div>
                </div>
                <UploadDropzone
                  loading={loadingUpload}
                  onUpload={async (file) => {
                    setLoadingUpload(true);
                    setUploadError(null);
                    try {
                      await uploadTimetable(file);
                      const currentTimetable = await getCurrentTimetable();

                      if (currentTimetable.batch) {
                        setBatch(currentTimetable.batch);
                        setBatchId(currentTimetable.batch.id);

                        try {
                          const userSelections = await getUserSelections();
                          const validCourseCodes = new Set(currentTimetable.batch.sections.map((section) => section.courseCode));
                          const validSelections = userSelections.selections.filter((selection) => validCourseCodes.has(selection.courseCode));
                          setSelectionSnapshot(validSelections, validSelections[0]?.courseCode ?? null);
                          setSelectedSubjectCode(validSelections[0]?.courseCode ?? null);
                        } catch {
                          setSelectionSnapshot([], null);
                          setSelectedSubjectCode(null);
                        }
                      } else {
                        setSelectionSnapshot([], null);
                        setSelectedSubjectCode(null);
                      }
                    } catch (error) {
                      setUploadError(error instanceof Error ? error.message : 'Upload thất bại');
                    } finally {
                      setLoadingUpload(false);
                    }
                  }}
                />

                {batch ? (
                  <section className="tempo-upload-selection">
                    <div className="tempo-surface-card">
                      <SubjectList
                        subjects={visibleSubjects}
                        allSubjects={subjects}
                        suggestions={suggestedSubjects}
                        selectedCodes={selectedSubjectCodes}
                        activeCode={selectedSubject?.courseCode ?? null}
                        search={search}
                        onSearchChange={setSearch}
                        onSelectSubject={setSelectedSubjectCode}
                        onChooseSubject={chooseSubject}
                        onClearSubject={clearSubject}
                        onChooseClass={chooseClass}
                      />
                    </div>


                    <button
                      type="button"
                      className="tempo-primary-button tempo-build-schedule-button"
                      disabled={!canPrepareSchedule}
                      aria-disabled={!canPrepareSchedule}
                      title={!canPrepareSchedule ? 'Upload Excel trước khi xếp thời khóa biểu' : 'Xếp thời khóa biểu'}
                      onClick={openPrepareDialog}
                    >
                      Xếp thời khóa biểu
                    </button>
                  </section>
                ) : null}
              </section>
            ) : null}

            {autoScheduleOpen && (
              <AutoScheduleModal
                subjects={subjects.filter((s) => selectedSubjectCodes.includes(s.courseCode))}
                onClose={() => setAutoScheduleOpen(false)}
                onApply={(result) => {
                  // Set selection snapshot to all chosen classes
                  const snapshot = result.classes.map((cls) => ({
                    courseCode: cls.courseCode,
                    classCode: cls.classCode,
                  }));
                  setSelectionSnapshot(snapshot, snapshot[0]?.courseCode ?? null);
                  setAutoScheduleOpen(false);
                  setStatusMessage(`Đã xếp ${result.classes.length} lớp theo yêu cầu.`);
                }}
              />
            )}

            {activeTab === 'dashboard' ? (
              <>
                {/* Top row: Subject Selection + Dashboard title */}
                <section className="tempo-surface-card tempo-dashboard-top-row">
                  <div className="tempo-panel-toolbar tempo-dashboard-title-block">
                    <div>
                      <h3>{dashboardTitle}</h3>
                    </div>
                    <div className="tempo-panel-summary">{selectedSections.length} lớp</div>
                  </div>

                  <div className="tempo-surface-card">
                    <SubjectList
                      subjects={visibleSubjects}
                      allSubjects={subjects}
                      suggestions={suggestedSubjects}
                      selectedCodes={selectedSubjectCodes}
                      activeCode={selectedSubject?.courseCode ?? null}
                      search={search}
                      onSearchChange={setSearch}
                      onSelectSubject={setSelectedSubjectCode}
                      onChooseSubject={chooseSubject}
                      onClearSubject={clearSubject}
                      onChooseClass={chooseClass}
                      selectedClassCodeByCourse={selectedClassCodeByCourseCode}
                    />
                  </div>
                </section>

                {/* Bottom row: Calendar + Suggestion Panel side by side */}
                <section className="tempo-dashboard-workbench">
                  <div className="tempo-dashboard-workbench-center">
                    <ScheduleDashboard
                      sections={selectedSections}
                      subject={dashboardSubject}
                      selectedClassCode={dashboardSelectedClassCode}
                      onChooseClass={chooseClass}
                      showHeader={false}
                      toolbarActions={
                        <button
                          type="button"
                          className="tempo-primary-button"
                          onClick={() => setAutoScheduleOpen(true)}
                          disabled={selectedSubjectCodes.length === 0}
                          style={{ padding: '8px 14px', fontSize: 13, whiteSpace: 'nowrap' }}
                          title="Hệ thống sẽ tự động chọn lịch phù hợp"
                        >
                          🪄 Xếp lịch tự động
                        </button>
                      }
                    />
                  </div>

                  {(() => {
                    const filteredSubjects = subjects.filter((s) => selectedSubjectCodes.includes(s.courseCode));
                    if (filteredSubjects.length === 0) return null;
                    return (
                      <div className="tempo-dashboard-workbench-right">
                        <SuggestionPanel
                          subjects={filteredSubjects}
                          onApply={(suggestionResult: AutoScheduleResult) => {
                            if (!suggestionResult) return;
                            const snapshot = suggestionResult.classes.map((cls: TimetableClass) => ({
                              courseCode: cls.courseCode,
                              classCode: cls.classCode,
                            }));
                            setSelectionSnapshot(snapshot, snapshot[0]?.courseCode ?? null);
                            setStatusMessage(`Đã áp dụng phương án gợi ý với ${suggestionResult.classes.length} lớp.`);
                          }}
                        />
                      </div>
                    );
                  })()}
                </section>
              </>
            ) : null}

            {activeTab === 'dashboard' ? (
              <div className="tempo-actions-row">
                <button
                  type="button"
                  className="tempo-secondary-button"
                  onClick={viewingSchedule
                    ? (previousSelectionSnapshot ? restoreCurrentSchedule : startNewSchedule)
                    : () => setActiveTab('upload')}
                >
                  {viewingSchedule
                    ? (previousSelectionSnapshot ? 'Xem lịch hiện tại' : 'Xếp lịch mới')
                    : 'Chọn lại môn học'}
                </button>
                <button
                  type="button"
                  className="tempo-secondary-button"
                  onClick={viewingSchedule ? () => {
                    setSaveDialogName(viewingSchedule.name);
                    setSaveDialogError(null);
                    setSaveDialogOpen(true);
                  } : openSaveDialog}
                >
                  {viewingSchedule ? 'Lưu thay đổi' : 'Save schedule'}
                </button>
              </div>
            ) : null}

            {activeTab === 'saved' ? (
              <SavedSchedulesPanel
                schedules={scheduleRecords}
                onDelete={async (scheduleId) => {
                  await deleteSchedule(scheduleId);
                  const response = await listSchedules();
                  setScheduleRecords(response.schedules);
                    setStatusMessage('Đã xóa lịch khỏi database.');
                }}
                onView={handleViewSchedule}
                  onShare={(schedule) => {
                    setShareModalSchedule(schedule);
                }}
                onSaveCurrent={viewingSchedule ? () => {
                  setSaveDialogName(viewingSchedule.name);
                  setSaveDialogError(null);
                  setSaveDialogOpen(true);
                } : openSaveDialog}
              />
            ) : null}

            {activeTab === 'chat' ? (
              <section className="tempo-surface-card" style={{ padding: 0 }}>
                <ChatPanel
                  currentUserId={user?.id ?? ''}
                  currentUserName={user?.fullName}
                />
              </section>
            ) : null}

            {/* conflicts tab removed: class selection now available inside SubjectList */}
          </main>
        </div>
      </div>

      {shareModalSchedule ? (
        <ShareScheduleModal
          schedule={shareModalSchedule}
          onClose={() => setShareModalSchedule(null)}
          onStatusMessage={setStatusMessage}
        />
      ) : null}

      {saveDialogOpen ? (
        <div className="tempo-modal-overlay" role="presentation" onClick={() => setSaveDialogOpen(false)}>
          <div
            className="tempo-modal-card tempo-save-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Đặt tên lịch"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tempo-panel-toolbar tempo-modal-toolbar">
              <div>
                <h3>Đặt tên lịch</h3>
                
              </div>
              <button type="button" className="tempo-secondary-button" onClick={() => setSaveDialogOpen(false)}>
                Đóng
              </button>
            </div>

            <label className="tempo-save-field">
              <span>Tên lịch</span>
              <input
                className="tempo-search"
                value={saveDialogName}
                onChange={(event) => {
                  setSaveDialogName(event.target.value);
                  setSaveDialogError(null);
                }}
                placeholder="Nhập tên lịch"
                autoFocus
              />
            </label>

            {saveDialogError ? <div className="tempo-error-banner">{saveDialogError}</div> : null}

            <div className="tempo-save-preview">
              <div className="tempo-save-preview-title">Sẽ lưu {selectedSections.length} lớp</div>
              <div className="tempo-save-preview-subtitle">
                {selectedSectionIds.length > 0 ? `Có ${selectedSectionIds.length} buổi hiển thị trên lịch.` : 'Chưa có lớp nào được chọn.'}
              </div>
            </div>

            <div className="tempo-calendar-detail-actions">
              <button type="button" className="tempo-secondary-button" onClick={() => setSaveDialogOpen(false)}>
                Hủy
              </button>
              <button type="button" className="tempo-primary-button" onClick={() => void confirmSaveSchedule()}>
                Lưu lịch
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {saveConflictOpen ? (
        <div className="tempo-modal-overlay" role="presentation" onClick={() => setSaveConflictOpen(false)}>
          <div
            className="tempo-modal-card tempo-save-modal tempo-save-modal--conflict"
            role="dialog"
            aria-modal="true"
            aria-label="Không thể lưu lịch do xung đột"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tempo-panel-toolbar tempo-modal-toolbar">
              <div>
                <h3>Không thể lưu lịch</h3>
                <p>Lịch hiện tại đang có xung đột nên chưa thể lưu.</p>
              </div>
              <button type="button" className="tempo-secondary-button" onClick={() => setSaveConflictOpen(false)}>
                Đóng
              </button>
            </div>

            <div className="tempo-save-conflict-list">
              {localConflicts.map((conflict, index) => (
                <div key={`${conflict.type}-${index}`} className="tempo-save-conflict-item">
                  {conflict.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
