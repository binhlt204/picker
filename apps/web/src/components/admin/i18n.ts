import polyglotI18nProvider from 'ra-i18n-polyglot';
import englishMessages from 'ra-language-english';
import vietnameseMessages from 'ra-language-vietnamese';
import { mergeTranslations } from 'react-admin';

// Bản tiếng Việt có sẵn có thể thiếu một số khóa mới -> bổ sung từ tiếng Anh để không bị hiện khóa thô
const messages = mergeTranslations(englishMessages, vietnameseMessages);

export const i18nProvider = polyglotI18nProvider(() => messages, 'vi', { allowMissing: true });
