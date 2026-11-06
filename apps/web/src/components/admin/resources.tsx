'use client';

import * as React from 'react';
import {
  AutocompleteInput,
  BulkDeleteButton,
  Button,
  Create,
  Datagrid,
  DateField,
  DeleteButton,
  Edit,
  EditButton,
  FunctionField,
  List,
  NumberField,
  NumberInput,
  PasswordInput,
  ReferenceField,
  ReferenceInput,
  SaveButton,
  SearchInput,
  SelectField,
  SelectInput,
  SimpleForm,
  TextField,
  TextInput,
  Toolbar,
  maxValue,
  minValue,
  required,
  email,
  useNotify,
  useRecordContext,
  useRefresh,
  useUpdate,
} from 'react-admin';
import CheckIcon from '@mui/icons-material/Check';
import Chip from '@mui/material/Chip';

/* ===== Lựa chọn dùng chung ===== */
const roleChoices = [
  { id: 'admin', name: 'Quản trị viên' },
  { id: 'teacher', name: 'Giáo viên' },
];
const statusChoices = [
  { id: 'active', name: 'Đang hoạt động' },
  { id: 'pending', name: 'Chờ duyệt' },
  { id: 'disabled', name: 'Đã khóa' },
];
const optionChoices = ['A', 'B', 'C', 'D'].map((x) => ({ id: x, name: x }));
const sessionStatusChoices = [
  { id: 'WAITING', name: 'Chờ bắt đầu' },
  { id: 'ACTIVE', name: 'Đang diễn ra' },
  { id: 'COMPLETED', name: 'Đã kết thúc' },
];

/* ===== Thanh công cụ form có cảnh báo khi xóa ===== */
function FormToolbar({ warning }: { warning?: string }) {
  return (
    <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <SaveButton />
      <DeleteButton
        mutationMode="pessimistic"
        confirmTitle="Xác nhận xóa"
        confirmContent={warning || 'Bạn có chắc muốn xóa bản ghi này?'}
      />
    </Toolbar>
  );
}

const CascadeBulkDelete = ({ warning }: { warning: string }) => (
  <BulkDeleteButton mutationMode="pessimistic" confirmTitle="Xác nhận xóa" confirmContent={warning} />
);

const statusColor = { active: 'success', pending: 'warning', disabled: 'default' } as const;

function StatusChip() {
  const record = useRecordContext<{ status: keyof typeof statusColor }>();
  if (!record) return null;
  const label = statusChoices.find((c) => c.id === record.status)?.name ?? record.status;
  return <Chip size="small" label={label} color={statusColor[record.status] ?? 'default'} />;
}

/* ===== TÀI KHOẢN ===== */
function ApproveButton() {
  const record = useRecordContext<{ id: string; status: string }>();
  const [update, { isPending }] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();
  if (!record || record.status !== 'pending') return null;
  return (
    <Button
      label="Duyệt"
      disabled={isPending}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        update(
          'users',
          { id: record.id, data: { status: 'active' }, previousData: record },
          {
            onSuccess: () => {
              notify('Đã duyệt tài khoản');
              refresh();
            },
            onError: (err: any) => notify(err?.message || 'Duyệt thất bại', { type: 'error' }),
          }
        );
      }}
    >
      <CheckIcon />
    </Button>
  );
}

const userFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Tìm theo tên hoặc email" />,
  <SelectInput key="status" source="status" label="Trạng thái" choices={statusChoices} />,
  <SelectInput key="role" source="role" label="Vai trò" choices={roleChoices} />,
];

export const UserList = () => (
  <List filters={userFilters} sort={{ field: 'created_at', order: 'DESC' }} perPage={25}>
    <Datagrid
      rowClick="edit"
      bulkActionButtons={<CascadeBulkDelete warning="Xóa các tài khoản đã chọn? Hành động này không hoàn tác được." />}
    >
      <TextField source="full_name" label="Họ và tên" />
      <TextField source="email" label="Email" />
      <SelectField source="role" label="Vai trò" choices={roleChoices} />
      <FunctionField label="Trạng thái" render={() => <StatusChip />} />
      <DateField source="created_at" label="Ngày tạo" showTime />
      <DateField source="last_login_at" label="Đăng nhập gần nhất" showTime emptyText="Chưa đăng nhập" />
      <ApproveButton />
      <EditButton label="Sửa" />
    </Datagrid>
  </List>
);

export const UserEdit = () => (
  <Edit mutationMode="pessimistic" title="Sửa tài khoản">
    <SimpleForm toolbar={<FormToolbar warning="Xóa tài khoản này? Hành động này không hoàn tác được." />}>
      <TextInput source="full_name" label="Họ và tên" validate={required()} fullWidth />
      <TextInput source="email" label="Email" type="email" validate={[required(), email()]} fullWidth />
      <SelectInput source="role" label="Vai trò" choices={roleChoices} validate={required()} />
      <SelectInput source="status" label="Trạng thái" choices={statusChoices} validate={required()} />
      <PasswordInput
        source="password"
        label="Đặt mật khẩu mới (để trống nếu không đổi)"
        helperText="Dùng khi người dùng quên mật khẩu. Tối thiểu 8 ký tự, gồm chữ và số."
        autoComplete="new-password"
        fullWidth
      />
    </SimpleForm>
  </Edit>
);

export const UserCreate = () => (
  <Create title="Thêm tài khoản" redirect="list">
    <SimpleForm defaultValues={{ role: 'teacher', status: 'active' }}>
      <TextInput source="full_name" label="Họ và tên" validate={required()} fullWidth />
      <TextInput source="email" label="Email" type="email" validate={[required(), email()]} fullWidth />
      <SelectInput source="role" label="Vai trò" choices={roleChoices} validate={required()} />
      <SelectInput source="status" label="Trạng thái" choices={statusChoices} validate={required()} />
      <PasswordInput
        source="password"
        label="Mật khẩu (tối thiểu 8 ký tự, có chữ và số)"
        validate={required()}
        autoComplete="new-password"
        fullWidth
      />
    </SimpleForm>
  </Create>
);

/* ===== LỚP HỌC ===== */
const CLASS_WARNING = 'Xóa lớp sẽ xóa luôn TOÀN BỘ học sinh, phiên thi và kết quả của lớp này. Không hoàn tác được.';

export const ClassroomList = () => (
  <List
    filters={[<SearchInput key="q" source="q" alwaysOn placeholder="Tìm tên lớp" />]}
    sort={{ field: 'created_at', order: 'DESC' }}
    perPage={25}
  >
    <Datagrid rowClick="edit" bulkActionButtons={<CascadeBulkDelete warning={CLASS_WARNING} />}>
      <TextField source="name" label="Tên lớp" />
      <ReferenceField source="owner_id" reference="users" label="Giáo viên" link={false} emptyText="—">
        <TextField source="full_name" />
      </ReferenceField>
      <DateField source="created_at" label="Ngày tạo" showTime />
      <EditButton label="Sửa" />
    </Datagrid>
  </List>
);

export const ClassroomEdit = () => (
  <Edit mutationMode="pessimistic" title="Sửa lớp học">
    <SimpleForm toolbar={<FormToolbar warning={CLASS_WARNING} />}>
      <TextInput source="name" label="Tên lớp" validate={required()} fullWidth />
    </SimpleForm>
  </Edit>
);

export const ClassroomCreate = () => (
  <Create title="Thêm lớp học" redirect="list">
    <SimpleForm>
      <TextInput source="name" label="Tên lớp" validate={required()} fullWidth />
    </SimpleForm>
  </Create>
);

/* ===== HỌC SINH ===== */
const STUDENT_WARNING = 'Xóa học sinh sẽ xóa luôn kết quả làm bài của học sinh này. Không hoàn tác được.';

const studentFields = (
  <>
    <ReferenceInput source="classroom_id" reference="classrooms">
      <AutocompleteInput optionText="name" label="Lớp" validate={required()} />
    </ReferenceInput>
    <NumberInput
      source="card_id"
      label="Số thẻ (1-50, không trùng trong lớp)"
      validate={[required(), minValue(1), maxValue(50)]}
    />
    <TextInput source="full_name" label="Họ và tên" validate={required()} fullWidth />
  </>
);

export const StudentList = () => (
  <List
    filters={[
      <SearchInput key="q" source="q" alwaysOn placeholder="Tìm tên học sinh" />,
      <ReferenceInput key="classroom_id" source="classroom_id" reference="classrooms" alwaysOn>
        <AutocompleteInput optionText="name" label="Lớp" />
      </ReferenceInput>,
    ]}
    sort={{ field: 'card_id', order: 'ASC' }}
    perPage={50}
  >
    <Datagrid rowClick="edit" bulkActionButtons={<CascadeBulkDelete warning={STUDENT_WARNING} />}>
      <ReferenceField source="classroom_id" reference="classrooms" label="Lớp" link={false}>
        <TextField source="name" />
      </ReferenceField>
      <NumberField source="card_id" label="Số thẻ" />
      <TextField source="full_name" label="Họ và tên" />
      <EditButton label="Sửa" />
    </Datagrid>
  </List>
);

export const StudentEdit = () => (
  <Edit mutationMode="pessimistic" title="Sửa học sinh">
    <SimpleForm toolbar={<FormToolbar warning={STUDENT_WARNING} />}>{studentFields}</SimpleForm>
  </Edit>
);

export const StudentCreate = () => (
  <Create title="Thêm học sinh" redirect="list">
    <SimpleForm>{studentFields}</SimpleForm>
  </Create>
);

/* ===== BỘ ĐỀ ===== */
const QUIZ_WARNING =
  'Xóa bộ đề sẽ xóa luôn TOÀN BỘ câu hỏi, phiên thi dùng đề này và kết quả liên quan. Không hoàn tác được.';

export const QuizList = () => (
  <List
    filters={[<SearchInput key="q" source="q" alwaysOn placeholder="Tìm tên bộ đề" />]}
    sort={{ field: 'created_at', order: 'DESC' }}
    perPage={25}
  >
    <Datagrid rowClick="edit" bulkActionButtons={<CascadeBulkDelete warning={QUIZ_WARNING} />}>
      <TextField source="title" label="Tên bộ đề" />
      <ReferenceField source="owner_id" reference="users" label="Giáo viên" link={false} emptyText="—">
        <TextField source="full_name" />
      </ReferenceField>
      <DateField source="created_at" label="Ngày tạo" showTime />
      <EditButton label="Sửa" />
    </Datagrid>
  </List>
);

export const QuizEdit = () => (
  <Edit mutationMode="pessimistic" title="Sửa bộ đề">
    <SimpleForm toolbar={<FormToolbar warning={QUIZ_WARNING} />}>
      <TextInput source="title" label="Tên bộ đề" validate={required()} fullWidth />
    </SimpleForm>
  </Edit>
);

export const QuizCreate = () => (
  <Create title="Thêm bộ đề" redirect="list">
    <SimpleForm>
      <TextInput source="title" label="Tên bộ đề" validate={required()} fullWidth />
    </SimpleForm>
  </Create>
);

/* ===== CÂU HỎI ===== */
const QUESTION_WARNING = 'Xóa câu hỏi sẽ xóa luôn kết quả làm bài của câu này. Không hoàn tác được.';

const questionFields = (
  <>
    <ReferenceInput source="quiz_id" reference="quizzes">
      <AutocompleteInput optionText="title" label="Bộ đề" validate={required()} />
    </ReferenceInput>
    <NumberInput source="question_order" label="Thứ tự câu (để trống = tự xếp cuối)" validate={minValue(1)} />
    <TextInput source="content" label="Nội dung câu hỏi" validate={required()} multiline minRows={2} fullWidth />
    <TextInput source="option_a" label="Đáp án A" validate={required()} fullWidth />
    <TextInput source="option_b" label="Đáp án B" validate={required()} fullWidth />
    <TextInput source="option_c" label="Đáp án C" validate={required()} fullWidth />
    <TextInput source="option_d" label="Đáp án D" validate={required()} fullWidth />
    <SelectInput source="correct_option" label="Đáp án đúng" choices={optionChoices} validate={required()} />
    <NumberInput source="time_limit" label="Thời gian trả lời (giây, 5-180)" validate={[minValue(5), maxValue(180)]} />
  </>
);

export const QuestionList = () => (
  <List
    filters={[
      <SearchInput key="q" source="q" alwaysOn placeholder="Tìm nội dung câu hỏi" />,
      <ReferenceInput key="quiz_id" source="quiz_id" reference="quizzes" alwaysOn>
        <AutocompleteInput optionText="title" label="Bộ đề" />
      </ReferenceInput>,
    ]}
    sort={{ field: 'question_order', order: 'ASC' }}
    perPage={25}
  >
    <Datagrid rowClick="edit" bulkActionButtons={<CascadeBulkDelete warning={QUESTION_WARNING} />}>
      <ReferenceField source="quiz_id" reference="quizzes" label="Bộ đề" link={false}>
        <TextField source="title" />
      </ReferenceField>
      <NumberField source="question_order" label="Câu số" />
      <FunctionField
        label="Nội dung"
        render={(r: { content: string }) => (r.content.length > 90 ? r.content.slice(0, 90) + '…' : r.content)}
      />
      <TextField source="correct_option" label="Đáp án đúng" />
      <NumberField source="time_limit" label="Thời gian (giây)" />
      <EditButton label="Sửa" />
    </Datagrid>
  </List>
);

export const QuestionEdit = () => (
  <Edit mutationMode="pessimistic" title="Sửa câu hỏi">
    <SimpleForm toolbar={<FormToolbar warning={QUESTION_WARNING} />}>{questionFields}</SimpleForm>
  </Edit>
);

export const QuestionCreate = () => (
  <Create title="Thêm câu hỏi" redirect="list">
    <SimpleForm defaultValues={{ time_limit: 30 }}>{questionFields}</SimpleForm>
  </Create>
);

/* ===== PHIÊN THI ===== */
const SESSION_WARNING = 'Xóa phiên thi sẽ xóa luôn toàn bộ kết quả của phiên này. Không hoàn tác được.';

export const SessionList = () => (
  <List
    filters={[
      <SelectInput key="status" source="status" label="Trạng thái" choices={sessionStatusChoices} alwaysOn />,
      <ReferenceInput key="classroom_id" source="classroom_id" reference="classrooms">
        <AutocompleteInput optionText="name" label="Lớp" />
      </ReferenceInput>,
    ]}
    sort={{ field: 'created_at', order: 'DESC' }}
    perPage={25}
  >
    <Datagrid rowClick="edit" bulkActionButtons={<CascadeBulkDelete warning={SESSION_WARNING} />}>
      <ReferenceField source="classroom_id" reference="classrooms" label="Lớp" link={false}>
        <TextField source="name" />
      </ReferenceField>
      <ReferenceField source="quiz_id" reference="quizzes" label="Bộ đề" link={false}>
        <TextField source="title" />
      </ReferenceField>
      <ReferenceField source="owner_id" reference="users" label="Giáo viên" link={false} emptyText="—">
        <TextField source="full_name" />
      </ReferenceField>
      <SelectField source="status" label="Trạng thái" choices={sessionStatusChoices} />
      <NumberField source="current_question_order" label="Câu hiện tại" />
      <DateField source="created_at" label="Ngày tạo" showTime />
      <EditButton label="Sửa" />
    </Datagrid>
  </List>
);

const sessionFields = (
  <>
    <ReferenceInput source="classroom_id" reference="classrooms">
      <AutocompleteInput optionText="name" label="Lớp" validate={required()} />
    </ReferenceInput>
    <ReferenceInput source="quiz_id" reference="quizzes">
      <AutocompleteInput optionText="title" label="Bộ đề" validate={required()} />
    </ReferenceInput>
    <SelectInput source="status" label="Trạng thái" choices={sessionStatusChoices} />
    <NumberInput source="current_question_order" label="Câu hiện tại" validate={minValue(0)} />
  </>
);

export const SessionEdit = () => (
  <Edit mutationMode="pessimistic" title="Sửa phiên thi">
    <SimpleForm toolbar={<FormToolbar warning={SESSION_WARNING} />}>{sessionFields}</SimpleForm>
  </Edit>
);

export const SessionCreate = () => (
  <Create title="Thêm phiên thi" redirect="list">
    <SimpleForm defaultValues={{ status: 'WAITING', current_question_order: 0 }}>{sessionFields}</SimpleForm>
  </Create>
);

/* ===== BÀI LÀM (chỉ xem / xóa) ===== */
export const AnswerList = () => (
  <List
    filters={[
      <ReferenceInput key="session_id" source="session_id" reference="sessions" alwaysOn>
        <AutocompleteInput optionText="id" label="Mã phiên" />
      </ReferenceInput>,
    ]}
    sort={{ field: 'submitted_at', order: 'DESC' }}
    perPage={50}
    actions={false}
  >
    <Datagrid bulkActionButtons={<CascadeBulkDelete warning="Xóa các bài làm đã chọn? Không hoàn tác được." />}>
      <ReferenceField source="student_id" reference="students" label="Học sinh" link={false}>
        <TextField source="full_name" />
      </ReferenceField>
      <ReferenceField source="question_id" reference="questions" label="Câu hỏi" link={false}>
        <FunctionField render={(r: { question_order: number }) => `Câu ${r.question_order}`} />
      </ReferenceField>
      <TextField source="selected_option" label="Đã chọn" />
      <FunctionField label="Kết quả" render={(r: { is_correct: number }) => (r.is_correct ? '✓ Đúng' : '✗ Sai')} />
      <DateField source="submitted_at" label="Thời điểm nộp" showTime />
      <DeleteButton mutationMode="pessimistic" label="Xóa" />
    </Datagrid>
  </List>
);
