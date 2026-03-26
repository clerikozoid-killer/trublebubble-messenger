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
  | 'settings.language.select'
  // Attachments / composer
  | 'composer.attachments'
  | 'composer.file'
  | 'composer.drawing'
  | 'composer.geolocation'
  | 'composer.poll'
  // Geolocation modal
  | 'geo.title'
  | 'geo.chooseOnMap'
  | 'geo.searchPlaceholder'
  | 'geo.orChoosePlace'
  // Drawing modal
  | 'draw.title'
  | 'draw.send'
  | 'draw.clear'
  // Calls
  | 'call.accept'
  | 'call.reject'
  | 'call.end'
  | 'call.mute'
  | 'call.unmute'
  | 'call.cameraOff'
  | 'call.cameraOn'
  // Global incoming call modal (video)
  | 'call.acceptVideo'
  | 'call.acceptAudioOnly'
  // Geo modal (map pick)
  | 'geo.mapSend'
  | 'geo.mapCustomLabel'
  // Settings screen
  | 'settings.tab.editProfile'
  | 'settings.tab.appearance'
  | 'settings.tab.settings'
  | 'settings.menu.account'
  | 'settings.menu.editProfile'
  | 'settings.menu.privacySecurity'
  | 'settings.menu.administration'
  | 'settings.menu.createManageUsers'
  | 'settings.menu.chats'
  | 'settings.menu.createGroup'
  | 'settings.menu.createChannel'
  | 'settings.menu.notifications'
  | 'settings.menu.appearance'
  | 'settings.menu.language'
  | 'settings.menu.help'
  | 'settings.logout'
  | 'settings.title.trublebubble'
  | 'poll.new'
  | 'poll.question'
  | 'poll.questionPlaceholder'
  | 'poll.optionsTitle'
  | 'poll.addOptions'
  | 'poll.settings'
  | 'poll.anonymous'
  | 'poll.multiChoice'
  | 'poll.quizMode'
  | 'poll.create'
  | 'poll.cancel'
  | 'poll.createError'
  | 'poll.loading'
  | 'poll.correctAnswer'
  | 'poll.multipleHint'
  | 'poll.singleHint'
  | 'poll.mediaTitle'
  | 'poll.mediaHint'
  | 'poll.noMedia'
  | 'poll.imageMedia'
  | 'poll.drawMedia'
  | 'poll.optionYes'
  | 'poll.optionNo';

export const DICT: Record<LangCode, Partial<Record<I18nKey, string>>> = {
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

    'composer.attachments': 'Вложения',
    'composer.file': 'Файл',
    'composer.drawing': 'Рисунок',
    'composer.geolocation': 'Геолокация',
    'composer.poll': 'Опрос',

    'geo.title': 'Геолокация',
    'geo.chooseOnMap': 'Выбрать на карте',
    'geo.searchPlaceholder': 'Поиск места…',
    'geo.orChoosePlace': 'Или выберите место',

    'draw.title': 'Рисунок',
    'draw.send': 'Отправить',
    'draw.clear': 'Очистить',

    'call.accept': 'Принять',
    'call.reject': 'Отклонить',
    'call.end': 'Завершить',
    'call.mute': 'Без звука',
    'call.unmute': 'Включить звук',
    'call.cameraOff': 'Камера выкл.',
    'call.cameraOn': 'Камера вкл.',

    'call.acceptVideo': 'Принять видео',
    'call.acceptAudioOnly': 'Принять аудио',

    'geo.mapSend': 'Отправить',
    'geo.mapCustomLabel': 'Место',

    'poll.new': 'Новый опрос',
    'poll.question': 'Вопрос',
    'poll.questionPlaceholder': 'Можно ли так делать?',
    'poll.optionsTitle': 'Варианты ответа',
    'poll.addOptions': 'Можно добавить ещё 10 вариантов ответа',
    'poll.settings': 'Настройки',
    'poll.anonymous': 'Анонимное голосование',
    'poll.multiChoice': 'Выбор нескольких ответов',
    'poll.quizMode': 'Режим викторины',
    'poll.create': 'Создать',
    'poll.cancel': 'Отмена',
    'poll.createError': 'Не удалось создать опрос',
    'poll.loading': 'Опрос загружается…',
    'poll.correctAnswer': 'Правильный ответ',
    'poll.multipleHint': 'Можно выбрать несколько вариантов',
    'poll.singleHint': 'Выбор один',
    'poll.mediaTitle': 'Медиа для опроса',
    'poll.mediaHint': 'Картинка или рисунок (необязательно)',
    'poll.noMedia': 'Нет',
    'poll.imageMedia': 'Картинка',
    'poll.drawMedia': 'Рисунок',
    'poll.optionYes': 'да',
    'poll.optionNo': 'нет',

    'settings.tab.editProfile': 'Редактирование профиля',
    'settings.tab.appearance': 'Оформление',
    'settings.tab.settings': 'Настройки',
    'settings.menu.account': 'Аккаунт',
    'settings.menu.editProfile': 'Редактировать профиль',
    'settings.menu.privacySecurity': 'Приватность и безопасность',
    'settings.menu.administration': 'Администрирование',
    'settings.menu.createManageUsers': 'Создавать и управлять пользователями',
    'settings.menu.chats': 'Чаты',
    'settings.menu.createGroup': 'Создать группу',
    'settings.menu.createChannel': 'Создать канал',
    'settings.menu.notifications': 'Уведомления',
    'settings.menu.appearance': 'Внешний вид',
    'settings.menu.language': 'Язык',
    'settings.menu.help': 'Помощь',
    'settings.logout': 'Выйти',
    'settings.title.trublebubble': 'TrubleBubble',
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

    'composer.attachments': 'Attachments',
    'composer.file': 'File',
    'composer.drawing': 'Drawing',
    'composer.geolocation': 'Location',
    'composer.poll': 'Poll',

    'geo.title': 'Location',
    'geo.chooseOnMap': 'Choose on map',
    'geo.searchPlaceholder': 'Search place…',
    'geo.orChoosePlace': 'Or choose a place',

    'draw.title': 'Drawing',
    'draw.send': 'Send',
    'draw.clear': 'Clear',

    'call.accept': 'Accept',
    'call.reject': 'Reject',
    'call.end': 'End',
    'call.mute': 'Mute',
    'call.unmute': 'Unmute',
    'call.cameraOff': 'Camera off',
    'call.cameraOn': 'Camera on',

    'call.acceptVideo': 'Accept video',
    'call.acceptAudioOnly': 'Accept audio only',

    'geo.mapSend': 'Send',
    'geo.mapCustomLabel': 'Place',

    'poll.new': 'New poll',
    'poll.question': 'Question',
    'poll.questionPlaceholder': 'Can we do it like this?',
    'poll.optionsTitle': 'Answer options',
    'poll.addOptions': 'You can add 10 more options',
    'poll.settings': 'Settings',
    'poll.anonymous': 'Anonymous voting',
    'poll.multiChoice': 'Multiple choice',
    'poll.quizMode': 'Quiz mode',
    'poll.create': 'Create',
    'poll.cancel': 'Cancel',
    'poll.createError': 'Failed to create poll',
    'poll.loading': 'Loading poll…',
    'poll.correctAnswer': 'Correct answer',
    'poll.multipleHint': 'You can select multiple options',
    'poll.singleHint': 'Single choice',
    'poll.mediaTitle': 'Poll media',
    'poll.mediaHint': 'Image or drawing (optional)',
    'poll.noMedia': 'None',
    'poll.imageMedia': 'Image',
    'poll.drawMedia': 'Drawing',
    'poll.optionYes': 'yes',
    'poll.optionNo': 'no',

    'settings.tab.editProfile': 'Edit profile',
    'settings.tab.appearance': 'Appearance',
    'settings.tab.settings': 'Settings',
    'settings.menu.account': 'Account',
    'settings.menu.editProfile': 'Edit Profile',
    'settings.menu.privacySecurity': 'Privacy & Security',
    'settings.menu.administration': 'Administration',
    'settings.menu.createManageUsers': 'Create & manage users',
    'settings.menu.chats': 'Chats',
    'settings.menu.createGroup': 'Create Group',
    'settings.menu.createChannel': 'Create Channel',
    'settings.menu.notifications': 'Notifications',
    'settings.menu.appearance': 'Appearance',
    'settings.menu.language': 'Language',
    'settings.menu.help': 'Help',
    'settings.logout': 'Log Out',
    'settings.title.trublebubble': 'TrubleBubble',
  },
  zh: {},
  ja: {},
  sr: {},
  de: {},
  fr: {},
  es: {},
  it: {},
  pt: {},
  ar: {},
  hi: {},
  uk: {},
  tr: {},
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

