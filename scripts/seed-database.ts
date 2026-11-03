import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../apps/server/src/database';

console.log('🌱 Bắt đầu seed database...');
const db = getDB();

// 1. Tạo lớp học
const classId = uuidv4();
db.prepare('INSERT OR REPLACE INTO classrooms (id, name) VALUES (?, ?)').run(
  classId,
  'Lớp 10A1 - Năm học 2026'
);
console.log('✅ Đã tạo lớp: Lớp 10A1');

// 2. Tạo 15 học sinh với card_id 1..15
const students = [
  'Nguyễn Văn An',
  'Trần Thị Bình',
  'Lê Hoàng Cường',
  'Phạm Minh Dũng',
  'Hoàng Thu Giang',
  'Vũ Đức Hải',
  'Đặng Ngọc Khánh',
  'Bùi Tuấn Linh',
  'Đỗ Phương Mai',
  'Ngô Gia Nam',
  'Dương Thu Oanh',
  'Lý Quốc Phong',
  'Mai Hồng Quân',
  'Tạ Thuỳ Trang',
  'Võ Thành Vinh'
];

const insertStudent = db.prepare(`
  INSERT OR REPLACE INTO students (id, classroom_id, card_id, full_name)
  VALUES (?, ?, ?, ?)
`);

students.forEach((name, index) => {
  insertStudent.run(uuidv4(), classId, index + 1, name);
});
console.log(`✅ Đã thêm ${students.length} học sinh (thẻ #01 đến #${students.length})`);

// 3. Tạo đề kiểm tra
const quizId = uuidv4();
db.prepare('INSERT OR REPLACE INTO quizzes (id, title) VALUES (?, ?)').run(
  quizId,
  'Khảo sát Toán học & Khoa học Tự nhiên'
);
console.log('✅ Đã tạo bộ câu hỏi: Khảo sát Toán học & Khoa học Tự nhiên');

// 4. Tạo 5 câu hỏi
const questions = [
  {
    content: 'Phương trình bậc hai x² - 5x + 6 = 0 có tập nghiệm là gì?',
    a: 'x = 1 và x = 6',
    b: 'x = 2 và x = 3',
    c: 'x = -2 và x = -3',
    d: 'x = 1 và x = -6',
    correct: 'B',
    time: 30
  },
  {
    content: 'Hành tinh nào trong hệ Mặt Trời có kích thước lớn nhất?',
    a: 'Sao Hỏa',
    b: 'Sao Thổ',
    c: 'Sao Mộc',
    d: 'Sao Kim',
    correct: 'C',
    time: 25
  },
  {
    content: 'Công thức hóa học của nước cất là gì?',
    a: 'H2O',
    b: 'CO2',
    c: 'NaCl',
    d: 'H2SO4',
    correct: 'A',
    time: 20
  },
  {
    content: 'Trong chuyển động thẳng đều, đại lượng nào sau đây không đổi theo thời gian?',
    a: 'Quãng đường',
    b: 'Vận tốc',
    c: 'Tọa độ',
    d: 'Gia tốc',
    correct: 'B',
    time: 30
  },
  {
    content: 'Việt Nam có đường bờ biển dài xấp xỉ bao nhiêu km?',
    a: '2.360 km',
    b: '3.000 km',
    c: '3.260 km',
    d: '4.120 km',
    correct: 'C',
    time: 30
  }
];

const insertQuestion = db.prepare(`
  INSERT OR REPLACE INTO questions (
    id, quiz_id, question_order, content,
    option_a, option_b, option_c, option_d,
    correct_option, time_limit
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

questions.forEach((q, idx) => {
  insertQuestion.run(
    uuidv4(),
    quizId,
    idx + 1,
    q.content,
    q.a,
    q.b,
    q.c,
    q.d,
    q.correct,
    q.time
  );
});
console.log(`✅ Đã thêm ${questions.length} câu hỏi`);

// 5. Tạo 1 phiên thi mẫu
const sessionId = uuidv4();
db.prepare(`
  INSERT OR REPLACE INTO exam_sessions (id, classroom_id, quiz_id, status, current_question_order)
  VALUES (?, ?, ?, 'WAITING', 0)
`).run(sessionId, classId, quizId);

console.log('✅ Đã tạo phiên thi mẫu:', sessionId);
console.log('🎉 Hoàn tất seed dữ liệu thành công!');
