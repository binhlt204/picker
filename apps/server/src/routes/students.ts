import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../database';

const router = Router();

// Hàm so sánh tên theo chuẩn tiếng Việt: Tên trước, Họ và Đệm sau
export function compareVietnameseNames(nameA: string, nameB: string): number {
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


// GET /api/classrooms/:classId/students - Danh sách HS của lớp
router.get('/classrooms/:classId/students', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const students = db.prepare(
      'SELECT * FROM students WHERE classroom_id = ? ORDER BY card_id ASC'
    ).all(req.params.classId);
    res.json(students);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/classrooms/:classId/students - Thêm 1 HS
router.post('/classrooms/:classId/students', (req: Request, res: Response) => {
  try {
    const { full_name, card_id } = req.body;
    const { classId } = req.params;

    if (!full_name || card_id === undefined) {
      return res.status(400).json({ error: 'full_name and card_id are required' });
    }

    const cardNum = parseInt(card_id, 10);
    if (isNaN(cardNum) || cardNum < 1 || cardNum > 50) {
      return res.status(400).json({ error: 'card_id must be between 1 and 50' });
    }

    const db = getDB();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO students (id, classroom_id, card_id, full_name)
      VALUES (?, ?, ?, ?)
    `).run(id, classId, cardNum, full_name.trim());

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    res.status(201).json(student);
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Mã thẻ này đã được gán cho học sinh khác trong lớp.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/classrooms/:classId/students/bulk - Import hàng loạt (auto-assign card_id)
router.post('/classrooms/:classId/students/bulk', (req: Request, res: Response) => {
  try {
    const { students } = req.body; // Array<{ full_name: string }>
    const { classId } = req.params;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Danh sách học sinh không hợp lệ' });
    }

    const db = getDB();

    // Lấy các card_id đã dùng trong lớp
    const existingStudents = db.prepare(
      'SELECT card_id FROM students WHERE classroom_id = ?'
    ).all(classId) as { card_id: number }[];
    const usedCardIds = new Set(existingStudents.map((s) => s.card_id));

    // Tìm các card_id còn trống từ 1..50
    const availableCardIds: number[] = [];
    for (let i = 1; i <= 50; i++) {
      if (!usedCardIds.has(i)) {
        availableCardIds.push(i);
      }
    }

    if (students.length > availableCardIds.length) {
      return res.status(400).json({
        error: `Lớp chỉ còn trống ${availableCardIds.length} mã thẻ (tối đa 50 học sinh/lớp). Không thể thêm ${students.length} học sinh.`,
      });
    }

    const insertStmt = db.prepare(`
      INSERT INTO students (id, classroom_id, card_id, full_name)
      VALUES (?, ?, ?, ?)
    `);

    const insertedList: any[] = [];
    // Làm sạch tiền tố số (1., 02/, 3 -...)
    const cleanStudents = students.map((item) => {
      const rawName = item.full_name || '';
      const cleanName = rawName.trim().replace(/^[\s\d]+[.\-–/)\s]+/, '').trim();
      return { ...item, full_name: cleanName };
    }).filter(s => s.full_name.length > 0);

    // Tự động sắp xếp theo A-Z nếu được yêu cầu (hoặc mặc định)
    const { sort_az } = req.body;
    if (sort_az !== false) {
      cleanStudents.sort((a, b) => compareVietnameseNames(a.full_name, b.full_name));
    }

    const transaction = db.transaction(() => {
      cleanStudents.forEach((item, index) => {
        const id = uuidv4();
        const cardId = availableCardIds[index];
        const name = item.full_name;
        if (name) {
          insertStmt.run(id, classId, cardId, name);
          insertedList.push({ id, classroom_id: classId, card_id: cardId, full_name: name });
        }
      });
    });

    transaction();

    res.status(201).json(insertedList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/students/:id - Cập nhật HS
router.put('/students/:id', (req: Request, res: Response) => {
  try {
    const { full_name, card_id } = req.body;
    const db = getDB();

    const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const newName = full_name !== undefined ? full_name.trim() : existing.full_name;
    const newCard = card_id !== undefined ? parseInt(card_id, 10) : existing.card_id;

    if (newCard < 1 || newCard > 50) {
      return res.status(400).json({ error: 'card_id must be between 1 and 50' });
    }

    db.prepare(`
      UPDATE students SET full_name = ?, card_id = ? WHERE id = ?
    `).run(newName, newCard, req.params.id);

    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Mã thẻ này đã được sử dụng bởi học sinh khác.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/students/:id - Xóa HS
router.delete('/students/:id', (req: Request, res: Response) => {
  try {
    const db = getDB();
    // Học sinh là dữ liệu chính: xóa luôn các bài làm của học sinh này để không bị chặn bởi khóa ngoại
    const result = db.transaction((id: string) => {
      db.prepare('DELETE FROM session_answers WHERE student_id = ?').run(id);
      return db.prepare('DELETE FROM students WHERE id = ?').run(id);
    })(String(req.params.id));
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// POST /api/classrooms/:classId/reorder-az - Tự động sắp xếp lại toàn bộ thẻ học sinh trong lớp theo vần A-Z
router.post('/classrooms/:classId/reorder-az', (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const db = getDB();

    const students = db.prepare('SELECT id, full_name, card_id FROM students WHERE classroom_id = ?').all(classId) as any[];
    if (students.length === 0) {
      return res.json({ success: true, count: 0, students: [] });
    }

    // Sắp xếp danh sách theo bảng chữ cái tiếng Việt (Tên -> Họ và Đệm)
    students.sort((a, b) => compareVietnameseNames(a.full_name, b.full_name));

    // Dùng transaction và tạm thời gán card_id âm để không xung đột UNIQUE constraint
    const updateStmt = db.prepare('UPDATE students SET card_id = ? WHERE id = ?');
    const transaction = db.transaction(() => {
      students.forEach((st, idx) => {
        updateStmt.run(-(idx + 1000), st.id);
      });
      students.forEach((st, idx) => {
        updateStmt.run(idx + 1, st.id);
      });
    });

    transaction();

    const updated = db.prepare('SELECT * FROM students WHERE classroom_id = ? ORDER BY card_id ASC').all(classId);
    res.json({ success: true, count: updated.length, students: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
