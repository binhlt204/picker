'use client';

import * as React from 'react';
import { Admin, Resource, defaultDarkTheme, defaultTheme } from 'react-admin';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SchoolIcon from '@mui/icons-material/School';
import GroupsIcon from '@mui/icons-material/Groups';
import QuizIcon from '@mui/icons-material/Quiz';
import HelpIcon from '@mui/icons-material/Help';
import EventNoteIcon from '@mui/icons-material/EventNote';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { authProvider } from './authProvider';
import { dataProvider } from './dataProvider';
import { i18nProvider } from './i18n';
import { Dashboard } from './Dashboard';
import {
  AnswerList,
  ClassroomCreate,
  ClassroomEdit,
  ClassroomList,
  QuestionCreate,
  QuestionEdit,
  QuestionList,
  QuizCreate,
  QuizEdit,
  QuizList,
  SessionCreate,
  SessionEdit,
  SessionList,
  StudentCreate,
  StudentEdit,
  StudentList,
  UserCreate,
  UserEdit,
  UserList,
} from './resources';

/**
 * Dashboard quản trị (react-admin) chạy tại /admin: quản lý tài khoản và toàn bộ dữ liệu backend.
 * Dùng chung phiên đăng nhập với web; chỉ tài khoản admin gọi được API (server kiểm tra lại mỗi request).
 */
export default function AdminApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/admin/*"
          element={
          <Admin
            basename="/admin"
            title="Pickball - Quản trị"
            dataProvider={dataProvider}
            authProvider={authProvider}
            i18nProvider={i18nProvider}
            dashboard={Dashboard}
            theme={defaultTheme}
            darkTheme={defaultDarkTheme}
            defaultTheme="dark"
            requireAuth
          >
            <Resource
              name="users"
              options={{ label: 'Tài khoản' }}
              icon={ManageAccountsIcon}
              list={UserList}
              edit={UserEdit}
              create={UserCreate}
              recordRepresentation="full_name"
            />
            <Resource
              name="classrooms"
              options={{ label: 'Lớp học' }}
              icon={SchoolIcon}
              list={ClassroomList}
              edit={ClassroomEdit}
              create={ClassroomCreate}
              recordRepresentation="name"
            />
            <Resource
              name="students"
              options={{ label: 'Học sinh' }}
              icon={GroupsIcon}
              list={StudentList}
              edit={StudentEdit}
              create={StudentCreate}
              recordRepresentation="full_name"
            />
            <Resource
              name="quizzes"
              options={{ label: 'Bộ đề' }}
              icon={QuizIcon}
              list={QuizList}
              edit={QuizEdit}
              create={QuizCreate}
              recordRepresentation="title"
            />
            <Resource
              name="questions"
              options={{ label: 'Câu hỏi' }}
              icon={HelpIcon}
              list={QuestionList}
              edit={QuestionEdit}
              create={QuestionCreate}
              recordRepresentation="content"
            />
            <Resource
              name="sessions"
              options={{ label: 'Phiên thi' }}
              icon={EventNoteIcon}
              list={SessionList}
              edit={SessionEdit}
              create={SessionCreate}
            />
            <Resource name="answers" options={{ label: 'Bài làm' }} icon={FactCheckIcon} list={AnswerList} />
          </Admin>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
