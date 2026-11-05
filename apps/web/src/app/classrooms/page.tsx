'use client';

import React, { useEffect, useState } from 'react';
import { api, downloadFile } from '@/lib/api';
import {
  FiUsers,
  FiPlus,
  FiTrash2,
  FiDownload,
  FiCheck,
  FiUserPlus,
  FiFileText,
  FiRefreshCw,
} from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';

interface Student {
  id: string;
  classroom_id: string;
  card_id: number;
  full_name: string;
}

function compareVietnameseNames(nameA: string, nameB: string): number {
  const cleanA = (nameA || '').trim().replace(/^[\s\d]+[.\-–/)\s]+/, '').trim();
  const cleanB = (nameB || '').trim().replace(/^[\s\d]+[.\-–/)\s]+/, '').trim();

  const partsA = cleanA.split(/\s+/);
  const partsB = cleanB.split(/\s+/);

  const tenA = partsA.length > 0 ? partsA[partsA.length - 1] : '';
  const tenB = partsB.length > 0 ? partsB[partsB.length - 1] : '';

  const collator = new Intl.Collator('vi', { sensitivity: 'base' });
  const cmpTen = collator.compare(tenA, tenB);
  if (cmpTen !== 0) return cmpTen;

  const hoDemA = partsA.slice(0, -1).join(' ');
  const hoDemB = partsB.slice(0, -1).join(' ');
  return collator.compare(hoDemA, hoDemB);
}

interface Classroom {
  id: string;
  name: string;
  created_at: string;
  students?: Student[];
}

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClass, setSelectedClass] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingCards, setDownloadingCards] = useState(false);

  // Modals state
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCard, setNewStudentCard] = useState('');

  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkNamesText, setBulkNamesText] = useState('');
  const [sortAZ, setSortAZ] = useState(true);

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadClassrooms();
  }, []);

  async function loadClassrooms() {
    try {
      setLoading(true);
      const res = await api.get('/classrooms');
      setClassrooms(res.data);
      if (res.data.length > 0 && !selectedClass) {
        loadClassDetails(res.data[0].id);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách lớp:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadClassDetails(id: string) {
    try {
      const res = await api.get(`/classrooms/${id}`);
      setSelectedClass(res.data);
    } catch (err) {
      console.error('Lỗi tải chi tiết lớp:', err);
    }
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!newClassName.trim()) return;

    try {
      setActionLoading(true);
      const res = await api.post('/classrooms', { name: newClassName.trim() });
      setClassrooms([res.data, ...classrooms]);
      setSelectedClass(res.data);
      setNewClassName('');
      setIsCreateClassOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Có lỗi xảy ra khi tạo lớp');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteClass(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa lớp này cùng toàn bộ học sinh?')) return;

    try {
      await api.delete(`/classrooms/${id}`);
      const filtered = classrooms.filter((c) => c.id !== id);
      setClassrooms(filtered);
      if (selectedClass?.id === id) {
        setSelectedClass(filtered.length > 0 ? filtered[0] : null);
        if (filtered.length > 0) {
          loadClassDetails(filtered[0].id);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi xóa lớp');
    }
  }

  async function handleAddSingleStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClass || !newStudentName.trim() || !newStudentCard) return;

    try {
      setActionLoading(true);
      await api.post(`/classrooms/${selectedClass.id}/students`, {
        full_name: newStudentName.trim(),
        card_id: parseInt(newStudentCard, 10),
      });
      loadClassDetails(selectedClass.id);
      setNewStudentName('');
      setNewStudentCard('');
      setIsAddStudentOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi thêm học sinh');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReorderAZ() {
    if (!selectedClass) return;
    if (!confirm(`Sắp xếp lại toàn bộ thẻ của lớp ${selectedClass.name} theo thứ tự bảng chữ cái A-Z (theo Tên)?`)) return;

    try {
      setActionLoading(true);
      await api.post(`/classrooms/${selectedClass.id}/reorder-az`);
      loadClassDetails(selectedClass.id);
      alert('Đã sắp xếp lại toàn bộ thẻ học sinh theo vần A-Z thành công!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi sắp xếp lại thẻ');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBulkImport(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClass || !bulkNamesText.trim()) return;

    let names = bulkNamesText
      .split('\n')
      .map((n) => n.trim().replace(/^[\s\d]+[.\-–/)\s]+/, '').trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) return;

    if (sortAZ) {
      names.sort(compareVietnameseNames);
    }

    try {
      setActionLoading(true);
      await api.post(`/classrooms/${selectedClass.id}/students/bulk`, {
        students: names.map((full_name) => ({ full_name })),
        sort_az: sortAZ,
      });
      loadClassDetails(selectedClass.id);
      setBulkNamesText('');
      setIsBulkImportOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi import học sinh');
    } finally {
      setActionLoading(false);
    }
  }


  async function handleDeleteStudent(studentId: string) {
    if (!confirm('Xóa học sinh này khỏi danh sách?')) return;
    try {
      await api.delete(`/students/${studentId}`);
      if (selectedClass) {
        loadClassDetails(selectedClass.id);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi xóa học sinh');
    }
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <FiUsers className="text-blue-500" />
            <span>Quản Lý Lớp Học & Thẻ Học Sinh</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gán số thẻ cố định (1-50) tương ứng với từng học sinh trong lớp
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedClass && (
            <Button
              variant="secondary"
              size="sm"
              disabled={downloadingCards}
              onClick={async () => {
                setDownloadingCards(true);
                try {
                  await downloadFile(`/classrooms/${selectedClass.id}/cards/pdf`, `the_trac_nghiem_${selectedClass.name}.pdf`);
                } catch (err: any) {
                  alert(err?.message || 'Tải thẻ in thất bại');
                } finally {
                  setDownloadingCards(false);
                }
              }}
              title={`Tải PDF thẻ in theo danh sách học sinh lớp ${selectedClass.name}`}
            >
              <FiDownload />
              <span>{downloadingCards ? 'Đang tạo PDF...' : `Tải Thẻ In Lớp ${selectedClass.name}`}</span>
            </Button>
          )}

          <Button size="sm" onClick={() => setIsCreateClassOpen(true)}>
            <FiPlus />
            <span>Thêm Lớp Mới</span>
          </Button>
        </div>
      </div>

      {/* Main Layout: Left = Class List, Right = Student Management */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Classes (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider px-1">
            Danh Sách Lớp ({classrooms.length})
          </h3>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Đang tải danh sách lớp...</div>
          ) : classrooms.length === 0 ? (
            <Card padding="md" className="text-center">
              <p className="text-sm text-slate-400 mb-3">Chưa có lớp học nào.</p>
              <Button size="sm" onClick={() => setIsCreateClassOpen(true)}>
                <FiPlus /> Tạo ngay
              </Button>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {classrooms.map((c) => {
                const isSelected = selectedClass?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => loadClassDetails(c.id)}
                    className={`group p-4 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/60 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <h4 className={`text-base font-bold ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>
                        {c.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ngày tạo: {c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : '—'}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                      title="Xóa lớp"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Students in Selected Class (8 cols) */}
        <Card padding="lg" className="lg:col-span-8 flex flex-col justify-between min-h-[500px]">
          {selectedClass ? (
            <div>
              {/* Class Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>{selectedClass.name}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-bold">
                      {selectedClass.students?.length || 0}/50 học sinh
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Mỗi học sinh được gán 1 mã thẻ ArUco tương ứng từ #01 đến #50
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedClass.students && selectedClass.students.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleReorderAZ}
                      disabled={actionLoading}
                      title="Sắp xếp lại toàn bộ mã thẻ #01..#50 theo thứ tự bảng chữ cái A-Z"
                    >
                      <FiRefreshCw className={actionLoading ? 'animate-spin' : ''} />
                      <span>Sắp xếp lại thẻ (A-Z)</span>
                    </Button>
                  )}

                  <Button variant="secondary" size="sm" onClick={() => setIsBulkImportOpen(true)}>
                    <FiFileText />
                    <span>Dán từ Excel</span>
                  </Button>

                  <Button size="sm" onClick={() => setIsAddStudentOpen(true)}>
                    <FiUserPlus />
                    <span>Thêm 1 HS</span>
                  </Button>
                </div>
              </div>

              {/* Students Grid / Table */}
              {!selectedClass.students || selectedClass.students.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center text-2xl mx-auto mb-3">
                    <FiUsers />
                  </div>
                  <h4 className="text-base font-bold text-slate-200 mb-1">Chưa có học sinh trong lớp</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    Nhập nhanh danh sách từ Excel hoặc thêm từng học sinh để bắt đầu gán thẻ.
                  </p>
                  <Button size="sm" onClick={() => setIsBulkImportOpen(true)}>
                    <FiFileText /> Dán danh sách học sinh
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {selectedClass.students.map((student) => (
                    <div
                      key={student.id}
                      className="group flex items-center justify-between p-3 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 font-mono font-black text-sm flex items-center justify-center flex-shrink-0">
                          #{student.card_id.toString().padStart(2, '0')}
                        </span>
                        <span className="text-sm font-semibold text-slate-200 truncate max-w-[140px]">
                          {student.full_name}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                        title="Xóa học sinh"
                      >
                        <FiTrash2 className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="m-auto text-center py-20 text-slate-400">
              Chọn hoặc tạo một lớp học ở cột bên trái để quản lý danh sách học sinh.
            </div>
          )}
        </Card>
      </div>

      {/* Modal: Create Class */}
      <Modal open={isCreateClassOpen} onClose={() => setIsCreateClassOpen(false)} title="Tạo Lớp Học Mới">
        <form onSubmit={handleCreateClass} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tên lớp học</label>
            <input
              type="text"
              placeholder="Ví dụ: 10A1, 11 Chuyên Lý..."
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateClassOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={actionLoading || !newClassName.trim()}>
              {actionLoading ? 'Đang tạo...' : 'Tạo Lớp'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Single Student */}
      <Modal open={isAddStudentOpen} onClose={() => setIsAddStudentOpen(false)} title="Thêm Học Sinh">
        <form onSubmit={handleAddSingleStudent} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Họ và tên học sinh</label>
            <input
              type="text"
              placeholder="Ví dụ: Nguyễn Văn An"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mã số thẻ ArUco (1 - 50)</label>
            <input
              type="number"
              min="1"
              max="50"
              placeholder="Nhập số từ 1 đến 50"
              value={newStudentCard}
              onChange={(e) => setNewStudentCard(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddStudentOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={actionLoading}>
              {actionLoading ? 'Đang thêm...' : 'Lưu học sinh'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Bulk Import from Excel */}
      <Modal
        open={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        title="Dán Danh Sách Học Sinh Từ Excel"
        maxWidth="xl"
      >
        <p className="text-xs text-slate-400 -mt-2 mb-4">Mỗi học sinh trên 1 dòng. Hệ thống sẽ tự động gán mã thẻ #01..#50.</p>
        <form onSubmit={handleBulkImport} className="space-y-4">
          <div>
            <textarea
              rows={8}
              placeholder={`Nguyễn Văn An\nTrần Thị Bình\nLê Hoàng Cường\nPhạm Minh Dũng...\n(Hoặc dán có số: 1. Nguyễn Văn An, 2. Trần Thị Bình...)`}
              value={bulkNamesText}
              onChange={(e) => setBulkNamesText(e.target.value)}
              className="w-full p-4 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="flex items-center gap-3 px-1">
            <Switch checked={sortAZ} onChange={setSortAZ} label="Tự động sắp xếp theo thứ tự bảng chữ cái A-Z" />
            <label className="text-xs text-slate-300 font-semibold cursor-pointer select-none" onClick={() => setSortAZ(!sortAZ)}>
              Tự động sắp xếp theo thứ tự bảng chữ cái A-Z (theo Tên chuẩn Việt Nam)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsBulkImportOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={actionLoading || !bulkNamesText.trim()}>
              <FiCheck />
              <span>{actionLoading ? 'Đang nhập...' : 'Nhập Danh Sách'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
