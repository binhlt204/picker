'use client';

import * as React from 'react';
import { Title, useCreatePath } from 'react-admin';
import { Link } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { api, getErrorMessage } from '@/lib/api';

interface Overview {
  counts: Record<string, number>;
  database: { sizeKb: number };
  server: { uptimeSeconds: number; nodeVersion: string };
}

const tiles: Array<{ table: string; resource: string; label: string }> = [
  { table: 'users', resource: 'users', label: 'Tài khoản' },
  { table: 'classrooms', resource: 'classrooms', label: 'Lớp học' },
  { table: 'students', resource: 'students', label: 'Học sinh' },
  { table: 'quizzes', resource: 'quizzes', label: 'Bộ đề' },
  { table: 'questions', resource: 'questions', label: 'Câu hỏi' },
  { table: 'exam_sessions', resource: 'sessions', label: 'Phiên thi' },
  { table: 'session_answers', resource: 'answers', label: 'Bài làm' },
];

export const Dashboard = () => {
  const [data, setData] = React.useState<Overview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const createPath = useCreatePath();

  React.useEffect(() => {
    api
      .get('/admin/overview')
      .then((res) => setData(res.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Title title="Tổng quan hệ thống" />
      <Typography variant="h5" gutterBottom>
        Tổng quan hệ thống
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Quản lý tài khoản và toàn bộ dữ liệu: lớp học, học sinh, bộ đề, câu hỏi, phiên thi và kết quả.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {tiles.map((t) => (
          <Card key={t.table}>
            <CardActionArea component={Link} to={createPath({ resource: t.resource, type: 'list' })}>
              <CardContent>
                <Typography variant="h4">{data ? (data.counts[t.table] ?? 0) : '…'}</Typography>
                <Typography color="text.secondary">{t.label}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      {data && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
          Cơ sở dữ liệu: {data.database.sizeKb} KB · Server chạy {Math.floor(data.server.uptimeSeconds / 60)} phút · Node{' '}
          {data.server.nodeVersion}
        </Typography>
      )}
    </Box>
  );
};
