import { useEffect, useMemo, useState } from 'react';
import type { TimetableSubject } from '../../types/timetable';
import { truncateText } from '../../utils/format';

type SubjectListProps = {
  subjects: TimetableSubject[];
  allSubjects: TimetableSubject[];
  suggestions: TimetableSubject[];
  selectedCodes: string[];
  activeCode: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectSubject: (courseCode: string) => void;
  onChooseSubject: (courseCode: string) => void;
  onClearSubject: (courseCode: string) => void;
};

export function SubjectList({
  subjects,
  allSubjects,
  suggestions,
  selectedCodes,
  activeCode,
  search,
  onSearchChange,
  onSelectSubject,
  onChooseSubject,
  onClearSubject,
}: SubjectListProps) {
  const [isAllSubjectsOpen, setIsAllSubjectsOpen] = useState(false);
  const [allSearch, setAllSearch] = useState('');
  const [selectedPage, setSelectedPage] = useState(1);
  const [allPage, setAllPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const pageSize = 15;

  const filteredAllSubjects = useMemo(() => {
    const keyword = allSearch.trim().toLowerCase();
    if (!keyword) {
      return allSubjects;
    }

    return allSubjects.filter((subject) => {
      return [subject.courseCode, subject.courseName, subject.courseNameEn ?? '']
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [allSearch, allSubjects]);

  const selectedTotalPages = Math.max(1, Math.ceil(subjects.length / pageSize));
  const allTotalPages = Math.max(1, Math.ceil(filteredAllSubjects.length / pageSize));
  const suggestionSubjects = suggestions.slice(0, 5);

  const selectedPageSubjects = subjects.slice((selectedPage - 1) * pageSize, selectedPage * pageSize);
  const allPageSubjects = filteredAllSubjects.slice((allPage - 1) * pageSize, allPage * pageSize);

  useEffect(() => {
    setSelectedPage(1);
  }, [search, subjects.length]);

  useEffect(() => {
    setShowSuggestions(search.trim().length > 0);
  }, [search]);

  useEffect(() => {
    setAllPage(1);
  }, [allSearch, allSubjects.length, isAllSubjectsOpen]);

  useEffect(() => {
    setSelectedPage((currentPage) => Math.min(currentPage, selectedTotalPages));
  }, [selectedTotalPages]);

  useEffect(() => {
    setAllPage((currentPage) => Math.min(currentPage, allTotalPages));
  }, [allTotalPages]);

  return (
    <>
      <div className="tempo-subjects-panel">
        <div className="tempo-panel-toolbar">
          <div>
            <h3>Subject Selection</h3>
            <p>{subjects.length} môn đã chọn</p>
          </div>
          <div className="tempo-subject-toolbar-actions">
            <div className="tempo-subject-search-shell">
              <input
                className="tempo-search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                onFocus={() => setShowSuggestions(search.trim().length > 0)}
                onBlur={() => {
                  window.setTimeout(() => setShowSuggestions(false), 120);
                }}
                placeholder="Tìm trong môn đã chọn..."
              />

              {showSuggestions && search.trim().length > 0 ? (
                <div className="tempo-suggestion-panel tempo-suggestion-panel--dropdown">
                  <div className="tempo-suggestion-panel-title">Gợi ý môn học</div>
                  {suggestionSubjects.length > 0 ? (
                    <div className="tempo-suggestion-list">
                      {suggestionSubjects.map((subject) => {
                        const isSelected = selectedCodes.includes(subject.courseCode);
                        return (
                          <button
                            key={subject.courseCode}
                            type="button"
                            className={isSelected ? 'tempo-suggestion-item is-selected' : 'tempo-suggestion-item'}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              onSelectSubject(subject.courseCode);
                              onChooseSubject(subject.courseCode);
                              setShowSuggestions(false);
                            }}
                          >
                            <div>
                              <strong>{subject.courseCode}</strong>
                              <div className="tempo-suggestion-name">{truncateText(subject.courseName, 44)}</div>
                            </div>
                            <span>{subject.creditWeight} tín</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="tempo-suggestion-empty">Không có môn nào khớp.</div>
                  )}
                </div>
              ) : null}
            </div>

            <button type="button" className="tempo-secondary-button" onClick={() => setIsAllSubjectsOpen(true)}>
              Xem tất cả môn học
            </button>
          </div>
        </div>

        <div className="tempo-subject-list-shell">
          {selectedPageSubjects.length > 0 ? (
            <div className="tempo-subject-grid tempo-subject-grid--selected">
              {selectedPageSubjects.map((subject) => {
                const isSelected = selectedCodes.includes(subject.courseCode);
                const isActive = activeCode === subject.courseCode;

                return (
                  <div
                    key={subject.courseCode}
                    className="tempo-subject-card-wrap"
                  >
                    <button
                      type="button"
                      className={isActive ? 'tempo-subject-card is-active' : isSelected ? 'tempo-subject-card is-selected' : 'tempo-subject-card'}
                      onClick={() => onSelectSubject(subject.courseCode)}
                    >
                      <div className="tempo-subject-code">{subject.courseCode}</div>
                      <div className="tempo-subject-name">{truncateText(subject.courseName, 30)}</div>
                      <div className="tempo-subject-meta">{subject.creditWeight} tín · {subject.classCount} lớp</div>
                      {isSelected ? <span className="tempo-badge is-success">Đã chọn</span> : <span className="tempo-badge">Chưa chọn</span>}
                    </button>

                    <button
                      type="button"
                      className="tempo-subject-clear-icon"
                      aria-label={`Hủy chọn ${subject.courseCode}`}
                      title="Hủy chọn"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onClearSubject(subject.courseCode)}
                    >
                      🗑
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="tempo-empty-state tempo-subject-empty-state">
              Không tìm thấy môn đã chọn phù hợp với từ khóa.
            </div>
          )}
        </div>

        {selectedTotalPages > 1 ? (
          <div className="tempo-pagination">
            <span className="tempo-pagination-count">
              Trang {selectedPage}/{selectedTotalPages}
            </span>
            <div className="tempo-pagination-controls">
              <button
                type="button"
                className="tempo-secondary-button"
                disabled={selectedPage === 1}
                onClick={() => setSelectedPage((page) => Math.max(1, page - 1))}
              >
                Trước
              </button>
              <button
                type="button"
                className="tempo-secondary-button"
                disabled={selectedPage === selectedTotalPages}
                onClick={() => setSelectedPage((page) => Math.min(selectedTotalPages, page + 1))}
              >
                Sau
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {isAllSubjectsOpen ? (
        <div className="tempo-modal-overlay" role="presentation" onClick={() => setIsAllSubjectsOpen(false)}>
          <div
            className="tempo-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Tất cả môn học"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tempo-panel-toolbar tempo-modal-toolbar">
              <div>
                <h3>Xem tất cả môn học</h3>
                <p>Chọn môn từ toàn bộ danh sách</p>
              </div>
              <button type="button" className="tempo-secondary-button" onClick={() => setIsAllSubjectsOpen(false)}>
                Đóng
              </button>
            </div>

            <input className="tempo-search" value={allSearch} onChange={(event) => setAllSearch(event.target.value)} placeholder="Tìm kiếm trong tất cả môn học..." />

            {allPageSubjects.length > 0 ? (
              <div className="tempo-subject-grid tempo-subject-grid--modal">
                {allPageSubjects.map((subject) => {
                  const isSelected = selectedCodes.includes(subject.courseCode);
                  const isActive = activeCode === subject.courseCode;

                  return (
                    <button
                      key={subject.courseCode}
                      type="button"
                      className={isActive ? 'tempo-subject-card is-active' : isSelected ? 'tempo-subject-card is-selected' : 'tempo-subject-card'}
                      onClick={() => {
                        onSelectSubject(subject.courseCode);
                        onChooseSubject(subject.courseCode);
                        setIsAllSubjectsOpen(false);
                      }}
                    >
                      <div className="tempo-subject-code">{subject.courseCode}</div>
                      <div className="tempo-subject-name">{truncateText(subject.courseName, 30)}</div>
                      <div className="tempo-subject-meta">{subject.creditWeight} tín · {subject.classCount} lớp</div>
                      {isSelected ? <span className="tempo-badge is-success">Đã chọn</span> : <span className="tempo-badge">Chưa chọn</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="tempo-empty-state tempo-subject-empty-state">Không tìm thấy môn nào phù hợp.</div>
            )}

            {allTotalPages > 1 ? (
              <div className="tempo-pagination">
                <span className="tempo-pagination-count">
                  Trang {allPage}/{allTotalPages}
                </span>
                <div className="tempo-pagination-controls">
                  <button
                    type="button"
                    className="tempo-secondary-button"
                    disabled={allPage === 1}
                    onClick={() => setAllPage((page) => Math.max(1, page - 1))}
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    className="tempo-secondary-button"
                    disabled={allPage === allTotalPages}
                    onClick={() => setAllPage((page) => Math.min(allTotalPages, page + 1))}
                  >
                    Sau
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
