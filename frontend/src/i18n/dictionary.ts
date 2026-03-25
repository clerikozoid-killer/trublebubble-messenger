import type { LangCode } from './languages';

export type I18nKey =
  | 'chat.discussions'
  | 'chat.chats'
  | 'message.discuss'
  | 'message.pin'
  | 'message.unpin'
  | 'message.pinned'
  | 'toast.messagePinned'
  | 'toast.messageUnpinned'
  | 'sidebar.context.unpinChat'
  | 'sidebar.context.pinChat'
  | 'settings.language.title'
  | 'settings.language.select';

export const DICT: Record<LangCode, Record<I18nKey, string>> = {
  ru: {
    'chat.discussions': 'Обсуждения',
    'chat.chats': 'Чаты',
    'message.discuss': 'Обсудить',
    'message.pin': 'Закрепить',
    'message.unpin': 'Открепить',
    'message.pinned': 'Закреплено',
    'toast.messagePinned': 'Сообщение закреплено',
    'toast.messageUnpinned': 'Сообщение откреплено',
    'sidebar.context.unpinChat': 'Открепить',
    'sidebar.context.pinChat': 'Закрепить',
    'settings.language.title': 'Язык',
    'settings.language.select': 'Выберите язык интерфейса',
  },
  en: {
    'chat.discussions': 'Discussions',
    'chat.chats': 'Chats',
    'message.discuss': 'Discuss',
    'message.pin': 'Pin',
    'message.unpin': 'Unpin',
    'message.pinned': 'Pinned',
    'toast.messagePinned': 'Message pinned',
    'toast.messageUnpinned': 'Message unpinned',
    'sidebar.context.unpinChat': 'Unpin chat',
    'sidebar.context.pinChat': 'Pin chat',
    'settings.language.title': 'Language',
    'settings.language.select': 'Select UI language',
  },
  ang: {
    'chat.discussions': 'Sprǣcaþ',
    'chat.chats': 'Cwide',
    'message.discuss': 'Spræce',
    'message.pin': 'Sticcað',
    'message.unpin': 'Unsticcað',
    'message.pinned': 'Sticcod',
    'toast.messagePinned': 'Mesage sticcod',
    'toast.messageUnpinned': 'Mesage unsticcod',
    'sidebar.context.unpinChat': 'Unsticcað',
    'sidebar.context.pinChat': 'Sticcað',
    'settings.language.title': 'Tunge',
    'settings.language.select': 'Geseoþ ǣlcne tungelíce',
  },
  grc: {
    'chat.discussions': 'Συζητήσεις',
    'chat.chats': 'Συνομιλίες',
    'message.discuss': 'Συζήτησε',
    'message.pin': 'Καρφίτσωσε',
    'message.unpin': 'Ξεκαρφίτσωσε',
    'message.pinned': 'Καρφιτσωμένο',
    'toast.messagePinned': 'Το μήνυμα καρφιτσώθηκε',
    'toast.messageUnpinned': 'Το μήνυμα ξεκαρφιτσώθηκε',
    'sidebar.context.unpinChat': 'Ξεκαρφίτσωσε',
    'sidebar.context.pinChat': 'Καρφίτσωσε',
    'settings.language.title': 'Γλώσσα',
    'settings.language.select': 'Διάλεξε γλώσσα διεπαφής',
  },
  sa: {
    'chat.discussions': 'चर्चाएँ',
    'chat.chats': 'संवादाः',
    'message.discuss': 'चर्चा करें',
    'message.pin': 'पिन करें',
    'message.unpin': 'पिन हटाएँ',
    'message.pinned': 'पिन हुआ',
    'toast.messagePinned': 'संदेश पिन हुआ',
    'toast.messageUnpinned': 'संदेश पिन हटाया गया',
    'sidebar.context.unpinChat': 'पिन हटाएँ',
    'sidebar.context.pinChat': 'पिन करें',
    'settings.language.title': 'भाषा',
    'settings.language.select': 'इंटरफ़ेस की भाषा चुनें',
  },
  eo: {
    'chat.discussions': 'Diskutoj',
    'chat.chats': 'Babiladoj',
    'message.discuss': 'Diskuti',
    'message.pin': 'Alpingli',
    'message.unpin': 'Forigi alpinglon',
    'message.pinned': 'Alpinglita',
    'toast.messagePinned': 'Mesaĝo alpinglita',
    'toast.messageUnpinned': 'Mesaĝo forigita',
    'sidebar.context.unpinChat': 'Forigi alpinglon',
    'sidebar.context.pinChat': 'Alpingli',
    'settings.language.title': 'Lingvo',
    'settings.language.select': 'Elektu lingvon de la interfaco',
  },
  dothraki: {
    'chat.discussions': 'Dothraki-nim',
    'chat.chats': 'Sathre',
    'message.discuss': 'Ukhaar',
    'message.pin': 'Qoyi',
    'message.unpin': 'Qoyi-maa',
    'message.pinned': 'Qoyid',
    'toast.messagePinned': 'Mesej qoyid',
    'toast.messageUnpinned': 'Mesej qoyid-maa',
    'sidebar.context.unpinChat': 'Qoyi-maa',
    'sidebar.context.pinChat': 'Qoyi',
    'settings.language.title': 'Tungan',
    'settings.language.select': 'Xaro tungan',
  },
  tlh: {
    'chat.discussions': 'chaHlogh',
    'chat.chats': 'Qogh',
    'message.discuss': 'tlhIngan Hol',
    'message.pin': 'Qong',
    'message.unpin': "Qong-wo'",
    'message.pinned': 'QongDaq',
    'toast.messagePinned': 'tlhIngan woveng Qong',
    'toast.messageUnpinned': 'tlhIngan woveng Qong-wo’',
    'sidebar.context.unpinChat': "Qong-wo'",
    'sidebar.context.pinChat': 'Qong',
    'settings.language.title': 'tlhIngan',
    'settings.language.select': 'jIHegh',
  },
};

