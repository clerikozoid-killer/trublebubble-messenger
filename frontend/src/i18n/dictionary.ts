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
  // Language names (displayed in Settings)
  | 'language.name.ru'
  | 'language.name.en'
  | 'language.name.zh'
  | 'language.name.ja'
  | 'language.name.sr'
  | 'language.name.de'
  | 'language.name.fr'
  | 'language.name.es'
  | 'language.name.it'
  | 'language.name.pt'
  | 'language.name.ar'
  | 'language.name.hi'
  | 'language.name.uk'
  | 'language.name.tr'
  | 'language.name.ang'
  | 'language.name.grc'
  | 'language.name.sa'
  | 'language.name.eo'
  | 'language.name.dothraki'
  | 'language.name.tlh'
  // Attachments / composer
  | 'composer.attachments'
  | 'composer.file'
  | 'composer.drawing'
  | 'composer.geolocation'
  | 'composer.poll'
  // Geolocation modal
  | 'geo.title'
  | 'geo.chooseOnMap'
  | 'geo.mapAria'
  | 'geo.searchPlaceholder'
  | 'geo.orChoosePlace'
  | 'geo.placeType.shop'
  | 'geo.placeType.square'
  | 'geo.placeType.cafe'
  | 'geo.placeType.river'
  | 'geo.placeType.food'
  | 'geo.placeType.nature'
  | 'geo.placeType.custom'
  | 'geo.place.coffeeShop'
  | 'geo.place.centralSquare'
  | 'geo.place.molkaCafe'
  | 'geo.place.volgaEmbankment'
  | 'geo.place.grenochka'
  | 'geo.place.konakovskyForest'
  // Drawing modal
  | 'draw.title'
  | 'draw.send'
  | 'draw.clear'
  | 'draw.colorAria'
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
  | 'settings.group.app'
  | 'common.back'
  | 'settings.privacySecurity.title'
  | 'settings.notifications.title'
  | 'settings.appearance.title'
  | 'settings.appearance.subtitle'
  | 'settings.profile.tapToUpload'
  | 'settings.notifications.sounds.title'
  | 'settings.notifications.sounds.test'
  | 'settings.createGroup.title'
  | 'settings.createGroup.submit'
  | 'settings.createChannel.title'
  | 'settings.createChannel.submit'
  // Common / profile / sidebar / chat info
  | 'common.close'
  | 'common.cancel'
  | 'common.ok'
  | 'common.loading'
  | 'common.more'
  | 'common.logout'
  | 'sidebar.newMessages'
  | 'sidebar.mainMenu'
  | 'sidebar.noMessages'
  | 'sidebar.attachment'
  | 'profile.title'
  | 'profile.userNotFound'
  | 'profile.online'
  | 'profile.offline'
  | 'profile.lastSeen'
  | 'profile.message'
  | 'profile.call'
  | 'profile.callUnavailableBot'
  | 'profile.callUnavailableDemo'
  | 'profile.blockConfirm'
  | 'profile.blockUser'
  | 'profile.blockUnavailableBot'
  | 'profile.blockThanks'
  | 'profile.reportUnavailableBot'
  | 'profile.reportPrompt'
  | 'profile.reportUser'
  | 'profile.reportThanks'
  | 'profile.phone'
  | 'profile.username'
  | 'profile.memberSince'
  | 'profile.registrationDate'
  | 'profile.sharedMedia'
  | 'profile.noSharedMedia'
  | 'profile.notifications'
  | 'chatInfo.title'
  | 'chatInfo.changePhoto'
  | 'chatInfo.name'
  | 'chatInfo.usernameOptional'
  | 'chatInfo.publicLinkPlaceholder'
  | 'chatInfo.saveMeta'
  | 'chatInfo.saving'
  | 'chatInfo.chatFallbackTitle'
  | 'chatInfo.addMembers.title'
  | 'chatInfo.addMembers.filterPlaceholder'
  | 'chatInfo.addMembers.loading'
  | 'chatInfo.addMembers.none'
  | 'chatInfo.errorCouldNotSave'
  | 'chatInfo.errorCouldNotUploadPhoto'
  | 'chatInfo.errorCouldNotAddMember'
  // ChatView / chat UI
  | 'chat.loading'
  | 'chat.unknown'
  | 'chat.online'
  | 'chat.lastSeenRecently'
  | 'chat.today'
  | 'chat.yesterday'
  | 'chat.message'
  // Store errors (if displayed)
  | 'chat.store.failedToLoadMessages'
  | 'chat.store.failedToLoadChats'
  | 'chat.members.one'
  | 'chat.members.other'
  | 'chat.search.placeholder'
  | 'chat.search.title'
  | 'chat.search.close'
  | 'chat.search.filter.all'
  | 'chat.search.filter.photo'
  | 'chat.search.filter.video'
  | 'chat.search.filter.files'
  | 'chat.search.filter.voice'
  | 'chat.typing'
  | 'chat.menu.reply'
  | 'chat.menu.edit'
  | 'chat.menu.actions'
  | 'chat.menu.select'
  | 'chat.menu.deselect'
  | 'chat.menu.saved'
  | 'chat.menu.copyText'
  | 'chat.menu.delete'
  | 'chat.menu.animate'
  | 'chat.menu.animateStop'
  | 'chat.toast.saved'
  | 'chat.toast.botNotFound'
  | 'chat.toast.discussionsUnavailable'
  | 'chat.toast.discussionOpenFailed'
  | 'chat.toast.copied'
  | 'chat.toast.copyFailed'
  | 'chat.toast.copySelectedFailed'
  | 'chat.toast.copiedN'
  | 'chat.confirm.deleteChat'
  | 'chat.confirm.clearHistory'
  | 'chat.toast.deleteFailed'
  | 'chat.toast.clearFailed'
  | 'chat.toast.historyCleared'
  | 'chat.toast.exported'
  | 'chat.toast.notificationsUnmuted'
  | 'chat.toast.notificationsMuted'
  | 'chat.toast.noContact'
  | 'chat.toast.themeApplied'
  | 'chat.toast.defaultTheme'
  | 'chat.toast.sendFailed'
  | 'chat.toast.micUnavailable'
  | 'chat.toast.micPermission'
  | 'chat.toast.recordingTooShort'
  | 'chat.toast.voiceSendFailed'
  | 'call.toast.speechNotSupported'
  | 'call.toast.connectionLost'
  | 'call.toast.backendNotResponding'
  | 'call.toast.socketNotConnected'
  | 'call.toast.permissionDenied'
  | 'call.toast.failedToStart'
  | 'call.toast.rejected'
  | 'chat.snippet.poll'
  | 'chat.snippet.location'
  | 'chat.snippet.drawing'
  | 'chat.snippet.audio'
  | 'chat.snippet.file'
  | 'chat.snippet.message'
  | 'chat.mentions'
  | 'chat.noMatches'
  | 'chat.emoji'
  | 'chat.composer.placeholder'
  | 'chat.yesterdayAt'
  | 'chat.theme.choose'
  | 'chat.theme.resetDefault'
  | 'call.waking'
  | 'chat.selection.selectedCount'
  | 'chat.selection.copy'
  | 'chat.selection.repost'
  | 'chat.selection.clear'
  | 'call.ui.incomingCall'
  | 'call.ui.videoCall'
  | 'call.ui.voiceCall'
  | 'call.ui.incomingVideoCall'
  | 'call.ui.incomingVoiceCall'
  | 'call.ui.connectingVideoCall'
  | 'call.ui.connectingVoiceCall'
  | 'call.ui.translation'
  | 'call.ui.holdToTranslate'
  | 'call.ui.hold'
  | 'call.ui.closeCall'
  | 'call.ui.speakerYou'
  | 'call.ui.speakerPeer'
  | 'call.ui.voiceInProgress'
  | 'call.ui.connectingVoice'
  | 'call.ui.transcript'
  | 'call.ui.stop'
  | 'call.ui.start'
  | 'call.ui.cloudTranslationTooltip'
  | 'call.ui.cloud'
  | 'call.ui.noCloud'
  | 'call.ui.duckingTooltip'
  | 'call.ui.repeatTooltip'
  | 'call.ui.duckingOn'
  | 'call.ui.duckingOff'
  | 'call.ui.asr'
  | 'call.ui.translateTo'
  | 'call.ui.tts'
  | 'call.ui.skipTermsLabel'
  | 'call.ui.skipTermsPlaceholder'
  | 'call.ui.repeat'
  | 'call.ui.show'
  | 'call.ui.hide'
  | 'chat.navigation.chatMenu'
  | 'call.ui.on'
  | 'call.ui.off'
  | 'call.ui.speaking'
  | 'call.ui.idle'
  | 'call.ui.mic'
  | 'call.ui.net'
  | 'call.ui.noTranscriptYet'
  | 'call.ui.transcriptAndTranslation'
  | 'call.ui.callDebugLog'
  | 'call.ui.noEventsYet'
  | 'call.ui.presetsLabel'
  | 'call.translationTarget.auto'
  | 'call.ui.linesCount'
  | 'call.ui.me'
  | 'call.ui.peer'
  | 'call.ui.forever'
  | 'chat.menu.muteNotifications'
  | 'chat.menu.chatInfo'
  | 'chat.menu.searchInChat'
  | 'chat.menu.reaction'
  | 'chat.menu.until'
  | 'chat.menu.disableMute'
  | 'chat.menu.mute1h'
  | 'chat.menu.mute8h'
  | 'chat.menu.mute1w'
  | 'chat.menu.muteForever'
  | 'call.summary.title'
  | 'call.summary.closeAria'
  | 'chat.navigation.backToParentChat'
  | 'chat.navigation.backToChats'
  | 'chat.navigation.searchInChat'
  | 'chat.navigation.voiceCall'
  | 'chat.navigation.videoCall'
  | 'chat.composer.removeAttachmentAria'
  | 'chat.composer.send'
  | 'chat.composer.stopAndSend'
  | 'chat.composer.recordVoice'
  | 'chat.composer.sendMessageAria'
  | 'chat.composer.stopRecordingAria'
  | 'chat.composer.recordVoiceMessageAria'
  | 'chat.message.replyingTo'
  | 'chat.message.editingMessage'
  | 'chat.message.deleted'
  | 'chat.message.pinned'
  | 'call.ui.transcriptNoYetShort'
  | 'call.ui.presetsLabelShort'
  | 'poll.create.imageUploadFailed'
  | 'poll.create.clearCanvas'
  | 'poll.create.caption'
  | 'poll.create.captionPlaceholder'
  | 'emoji.title'
  | 'emoji.searchPlaceholder'
  | 'emoji.recent'
  | 'emoji.group.smiles'
  | 'emoji.group.gestures'
  | 'emoji.group.hearts'
  | 'emoji.group.misc'
  | 'emoji.group.animals'
  | 'emoji.group.food'
  | 'emoji.group.flags'
  | 'emoji.group.drops'
  | 'chatSidebar.toast.muted8h'
  | 'chatSidebar.confirm.deleteChat'
  | 'chatSidebar.toast.deleteFailed'
  | 'chatSidebar.toast.blockSoon'
  | 'chatSidebar.profile.openSettings'
  | 'chatSidebar.profile.online'
  | 'chatSidebar.menu.collapse'
  | 'chatSidebar.menu.expand'
  | 'chatSidebar.menu.myProfile'
  | 'chatSidebar.menu.createGroup'
  | 'chatSidebar.menu.createChannel'
  | 'chatSidebar.menu.contacts'
  | 'chatSidebar.menu.saved'
  | 'chatSidebar.menu.settings'
  | 'chatSidebar.menu.soon'
  | 'chatSidebar.theme.night'
  | 'chatSidebar.searchPlaceholder'
  | 'chatSidebar.section.chats'
  | 'chatSidebar.empty.noMatches'
  | 'chatSidebar.section.people'
  | 'chatSidebar.section.messages'
  | 'chatSidebar.empty.searching'
  | 'chatSidebar.empty.noUsers'
  | 'chatSidebar.empty.noMessages'
  | 'chatSidebar.empty.noChats'
  | 'chatSidebar.empty.startNew'
  | 'chatSidebar.newMessage'
  | 'chatSidebar.context.mute8h'
  | 'chatSidebar.context.deleteChat'
  | 'chatSidebar.context.block'
  | 'chatSidebar.modal.newMessageTitle'
  | 'chatSidebar.modal.searchUserPlaceholder'
  | 'chatSidebar.modal.noOtherUsers'
  | 'chatSidebar.modal.noOneFound'
  | 'chatSidebar.modal.createGroup'
  | 'chatSidebar.online'
  | 'chat.discussionPrefix'
  | 'chatInfo.addMembers.noneFound'
  | 'saved.title'
  | 'saved.backToChatsAria'
  | 'saved.description'
  | 'saved.emptyState'
  | 'saved.openChatTitle'
  | 'saved.removeSavedTitle'
  | 'settings.profile.usernameLabel'
  | 'settings.profile.bioLabel'
  | 'settings.profile.bioPlaceholder'
  | 'settings.profile.publicUsernameHint'
  | 'settings.profile.usernameFallback'
  | 'settings.profile.displayNameLabel'
  | 'settings.profile.saveChanges'
  | 'settings.profile.profileSaved'
  | 'settings.profile.uploadPhotoFailed'
  | 'settings.menu.noExtraOptions'
  | 'settings.createGroup.errorCouldNotCreate'
  | 'settings.createGroup.nameLabel'
  | 'settings.createGroup.namePlaceholder'
  | 'settings.createGroup.usernameOptionalLabel'
  | 'settings.createGroup.usernamePlaceholder'
  | 'settings.createChannel.errorCouldNotCreate'
  | 'settings.createChannel.nameLabel'
  | 'settings.createChannel.namePlaceholder'
  | 'settings.createChannel.usernameOptionalLabel'
  | 'settings.createChannel.usernamePlaceholder'
  | 'settings.notifications.sounds.description'
  | 'settings.notifications.sounds.enableLabel'
  | 'settings.notifications.sounds.disableHint'
  | 'settings.notifications.sounds.volumeLabel'
  | 'settings.notifications.sounds.tip'
  | 'auth.common.optional'
  | 'auth.login.title'
  | 'auth.login.emailOrUsernameLabel'
  | 'auth.login.emailOrUsernamePlaceholder'
  | 'auth.login.passwordLabel'
  | 'auth.login.passwordPlaceholder'
  | 'auth.login.signInButton'
  | 'auth.login.registerPrompt'
  | 'auth.login.registerButton'
  | 'auth.login.errorInvalidCredentials'
  | 'auth.register.title'
  | 'auth.register.joinHint'
  | 'auth.register.emailLabel'
  | 'auth.register.emailPlaceholder'
  | 'auth.register.displayNameLabel'
  | 'auth.register.displayNamePlaceholder'
  | 'auth.register.usernameLabel'
  | 'auth.register.usernamePlaceholder'
  | 'auth.register.usernameHint'
  | 'auth.register.passwordLabel'
  | 'auth.register.passwordPlaceholder'
  | 'auth.register.confirmPasswordLabel'
  | 'auth.register.confirmPasswordPlaceholder'
  | 'auth.register.createButton'
  | 'auth.register.alreadyHaveAccountPrompt'
  | 'auth.register.signInButton'
  | 'auth.register.errorPasswordsDoNotMatch'
  | 'auth.register.errorPasswordTooShort'
  | 'auth.register.errorRegistrationFailed'
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
  | 'poll.setCorrectOption'
  | 'poll.multipleHint'
  | 'poll.singleHint'
  | 'poll.mediaTitle'
  | 'poll.mediaHint'
  | 'poll.noMedia'
  | 'poll.imageMedia'
  | 'poll.drawMedia'
  | 'poll.optionYes'
  | 'poll.optionNo'
  // Admin panel
  | 'adminUsers.title'
  | 'adminUsers.createAccountTitle'
  | 'adminUsers.emailLabel'
  | 'adminUsers.passwordLabel'
  | 'adminUsers.displayNameLabel'
  | 'adminUsers.usernameOptionalLabel'
  | 'adminUsers.grantAdminLabel'
  | 'adminUsers.creating'
  | 'adminUsers.createUserButton'
  | 'adminUsers.errorLoadUsersOrAccessDenied'
  | 'adminUsers.errorCreateFailed'
  | 'adminUsers.accountsTitle'
  | 'adminUsers.adminBadge';

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

    'language.name.ru': 'Русский',
    'language.name.en': 'Английский',
    'language.name.zh': 'Китайский',
    'language.name.ja': 'Японский',
    'language.name.sr': 'Сербский',
    'language.name.de': 'Немецкий',
    'language.name.fr': 'Французский',
    'language.name.es': 'Испанский',
    'language.name.it': 'Итальянский',
    'language.name.pt': 'Португальский',
    'language.name.ar': 'Арабский',
    'language.name.hi': 'Хинди',
    'language.name.uk': 'Украинский',
    'language.name.tr': 'Турецкий',
    'language.name.ang': 'Англосаксонский',
    'language.name.grc': 'Древнегреческий',
    'language.name.sa': 'Санскрит',
    'language.name.eo': 'Эсперанто',
    'language.name.dothraki': 'Дотракийский',
    'language.name.tlh': 'Клингон',

    'composer.attachments': 'Вложения',
    'composer.file': 'Файл',
    'composer.drawing': 'Рисунок',
    'composer.geolocation': 'Геолокация',
    'composer.poll': 'Опрос',

    'geo.title': 'Геолокация',
    'geo.chooseOnMap': 'Выбрать на карте',
    'geo.mapAria': 'Карта',
    'geo.searchPlaceholder': 'Поиск места…',
    'geo.orChoosePlace': 'Или выберите место',
    'geo.placeType.shop': 'Магазин',
    'geo.placeType.square': 'Площадь',
    'geo.placeType.cafe': 'Кафе',
    'geo.placeType.river': 'Река',
    'geo.placeType.food': 'Еда',
    'geo.placeType.nature': 'Природа',
    'geo.placeType.custom': 'Другое',
    'geo.place.coffeeShop': 'Кофейня',
    'geo.place.centralSquare': 'Центральная площадь',
    'geo.place.molkaCafe': 'Кафе Молка',
    'geo.place.volgaEmbankment': 'Набережная Волги',
    'geo.place.grenochka': 'Греночка',
    'geo.place.konakovskyForest': 'Конаковский бор',

    'draw.title': 'Рисунок',
    'draw.send': 'Отправить',
    'draw.clear': 'Очистить',
    'draw.colorAria': 'Цвет: {color}',

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
    'poll.setCorrectOption': 'Установить правильный вариант',
    'poll.multipleHint': 'Можно выбрать несколько вариантов',
    'poll.singleHint': 'Выбор один',
    'poll.mediaTitle': 'Медиа для опроса',
    'poll.mediaHint': 'Картинка или рисунок (необязательно)',
    'poll.noMedia': 'Нет',
    'poll.imageMedia': 'Картинка',
    'poll.drawMedia': 'Рисунок',
    'poll.optionYes': 'да',
    'poll.optionNo': 'нет',

    // Admin panel
    'adminUsers.title': 'Админ — пользователи',
    'adminUsers.createAccountTitle': 'Создать аккаунт',
    'adminUsers.emailLabel': 'Email',
    'adminUsers.passwordLabel': 'Пароль',
    'adminUsers.displayNameLabel': 'Отображаемое имя',
    'adminUsers.usernameOptionalLabel': 'Юзернейм (необязательно)',
    'adminUsers.grantAdminLabel': 'Сделать администратором',
    'adminUsers.creating': 'Создание…',
    'adminUsers.createUserButton': 'Создать пользователя',
    'adminUsers.errorLoadUsersOrAccessDenied': 'Не удалось загрузить пользователей или доступ запрещён',
    'adminUsers.errorCreateFailed': 'Не удалось создать пользователя',
    'adminUsers.accountsTitle': 'Аккаунты',
    'adminUsers.adminBadge': 'админ',

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
    'settings.group.app': 'Приложение',
    'common.back': 'Назад',
    'settings.privacySecurity.title': 'Приватность и безопасность',
    'settings.notifications.title': 'Уведомления',
    'settings.appearance.title': 'Оформление',
    'settings.appearance.subtitle': 'Тема: тёмная, светлая или как в системе.',
    'settings.profile.tapToUpload': 'Нажмите на фото, чтобы загрузить (JPEG, PNG, GIF, WebP — максимум 2 МБ)',
    'settings.notifications.sounds.title': 'Звуки',
    'settings.notifications.sounds.test': 'Проверить звук',
    'settings.createGroup.title': 'Создать группу',
    'settings.createGroup.submit': 'Создать группу',
    'settings.createChannel.title': 'Создать канал',
    'settings.createChannel.submit': 'Создать канал',

    'common.close': 'Закрыть',
    'common.cancel': 'Отмена',
    'common.ok': 'ОК',
    'common.loading': 'Загрузка…',
    'common.more': 'Ещё',
    'common.logout': 'Выйти',
    'sidebar.newMessages': 'Новые сообщения',
    'sidebar.mainMenu': 'Главное меню',
    'sidebar.noMessages': 'Нет сообщений',
    'sidebar.attachment': '[вложение]',
    'profile.title': 'Профиль',
    'profile.userNotFound': 'Пользователь не найден',
    'profile.online': 'Онлайн',
    'profile.offline': 'Оффлайн',
    'profile.lastSeen': 'Был(а) в сети',
    'profile.message': 'Написать',
    'profile.call': 'Позвонить',
    'profile.callUnavailableBot': 'Bubble_Bot — демо бот, звонки недоступны.',
    'profile.callUnavailableDemo': 'Звонки недоступны в демо-сборке.',
    'profile.blockConfirm': 'Заблокировать пользователя?',
    'profile.blockUser': 'Заблокировать',
    'profile.blockUnavailableBot': 'Это системный демо-аккаунт — Bubble_Bot нельзя заблокировать.',
    'profile.blockThanks': 'Спасибо — полноценная блокировка будет в следующих обновлениях.',
    'profile.reportUnavailableBot': 'Нечего жаловаться — Bubble_Bot официальный демо-бот.',
    'profile.reportPrompt': 'Опишите проблему (демо):',
    'profile.reportUser': 'Пожаловаться',
    'profile.reportThanks': 'Спасибо — ваш отзыв сохранён (только демо).',
    'profile.phone': 'Телефон',
    'profile.username': 'Юзернейм',
    'profile.memberSince': 'В приложении с',
    'profile.registrationDate': 'Дата регистрации',
    'profile.sharedMedia': 'Медиа',
    'profile.noSharedMedia': 'Пока нет общих медиа',
    'profile.notifications': 'Уведомления',
    'chatInfo.title': 'Информация о чате',
    'chatInfo.changePhoto': 'Сменить фото',
    'chatInfo.name': 'Название',
    'chatInfo.usernameOptional': 'Юзернейм (необязательно)',
    'chatInfo.publicLinkPlaceholder': 'публичная_ссылка',
    'chatInfo.saveMeta': 'Сохранить название и юзернейм',
    'chatInfo.saving': 'Сохранение…',
    'chatInfo.chatFallbackTitle': 'Чат',
    'chatInfo.addMembers.title': 'Добавить участников',
    'chatInfo.addMembers.filterPlaceholder': 'Фильтр по имени или @username…',
    'chatInfo.addMembers.loading': 'Загрузка списка…',
    'chatInfo.addMembers.none': 'Нет других пользователей в системе — зарегистрируйте коллег, чтобы добавить их в группу.',

    'chatInfo.errorCouldNotSave': 'Не удалось сохранить',
    'chatInfo.errorCouldNotUploadPhoto': 'Не удалось загрузить фото',
    'chatInfo.errorCouldNotAddMember': 'Не удалось добавить участника',

    'chat.loading': 'Загрузка…',
    'chat.unknown': 'Неизвестно',
    'chat.online': 'Онлайн',
    'chat.lastSeenRecently': 'Был(а) недавно',
    'chat.today': 'Сегодня',
    'chat.yesterday': 'Вчера',
    'chat.message': 'Сообщение',
    'chat.store.failedToLoadMessages': 'Не удалось загрузить сообщения',
    'chat.store.failedToLoadChats': 'Не удалось загрузить чаты',
    'chat.members.one': 'участник',
    'chat.members.other': 'участников',
    'chat.search.placeholder': 'Поиск по сообщениям…',
    'chat.search.title': 'Поиск в чате',
    'chat.search.close': 'Закрыть поиск',
    'chat.search.filter.all': 'Все',
    'chat.search.filter.photo': 'Фото',
    'chat.search.filter.video': 'Видео',
    'chat.search.filter.files': 'Файлы',
    'chat.search.filter.voice': 'Голос',
    'chat.typing': 'печатает…',
    'chat.menu.reply': 'Ответить',
    'chat.menu.edit': 'Редактировать',
    'chat.menu.actions': 'Действия с сообщением',
    'chat.menu.select': 'Выбрать',
    'chat.menu.deselect': 'Убрать выбор',
    'chat.menu.saved': 'В избранное',
    'chat.menu.copyText': 'Копировать текст',
    'chat.menu.delete': 'Удалить',
    'chat.menu.animate': 'Анимация',
    'chat.menu.animateStop': 'Остановить анимации',
    'chat.toast.saved': 'Сохранено в избранное',
    'chat.toast.botNotFound': 'bubble_bot не найден',
    'chat.toast.discussionsUnavailable': 'Обсуждения для каналов пока недоступны',
    'chat.toast.discussionOpenFailed': 'Не удалось открыть обсуждение',
    'chat.toast.copied': 'Скопировано',
    'chat.toast.copyFailed': 'Не удалось скопировать',
    'chat.toast.copySelectedFailed': 'Не удалось скопировать выбранные сообщения',
    'chat.toast.copiedN': 'Скопировано: {n}',
    'chat.confirm.deleteChat': 'Удалить чат для всех? Это нельзя отменить.',
    'chat.confirm.clearHistory': 'Очистить историю чата для всех?',
    'chat.toast.deleteFailed': 'Не удалось удалить чат',
    'chat.toast.clearFailed': 'Не удалось очистить историю',
    'chat.toast.historyCleared': 'История очищена',
    'chat.toast.exported': 'Чат экспортирован',
    'chat.toast.notificationsUnmuted': 'Уведомления включены',
    'chat.toast.notificationsMuted': 'Уведомления выключены',
    'chat.toast.noContact': 'Нет контакта',
    'chat.toast.themeApplied': 'Тема применена',
    'chat.toast.defaultTheme': 'Тема по умолчанию',
    'chat.toast.sendFailed': 'Не удалось отправить. Проверьте соединение и попробуйте снова.',
    'chat.toast.micUnavailable': 'Микрофон недоступен в этом браузере',
    'chat.toast.micPermission': 'Разрешите доступ к микрофону, чтобы записывать голосовые',
    'chat.toast.recordingTooShort': 'Запись слишком короткая или пустая — попробуйте подержать дольше',
    'chat.toast.voiceSendFailed': 'Не удалось отправить голосовое',
    'call.toast.speechNotSupported': 'Распознавание речи не поддерживается в этом браузере',
    'call.toast.connectionLost': 'Соединение со звонком потеряно',
    'call.toast.backendNotResponding': 'Сервер не отвечает. Попробуйте позже.',
    'call.toast.socketNotConnected': 'Нет соединения. Попробуйте снова.',
    'call.toast.permissionDenied': 'Доступ к микрофону/камере запрещён',
    'call.toast.failedToStart': 'Не удалось начать звонок',
    'call.toast.rejected': 'Звонок отклонён',
    'chat.snippet.poll': '📊 Опрос',
    'chat.snippet.location': '📍 Локация',
    'chat.snippet.drawing': 'Рисунок',
    'chat.snippet.audio': 'Аудио',
    'chat.snippet.file': 'Файл',
    'chat.snippet.message': 'Сообщение',
    'chat.mentions': 'Упоминания',
    'chat.noMatches': 'Нет совпадений',
    'chat.emoji': 'Эмодзи',
    'chat.composer.placeholder': 'Сообщение',
    'chat.yesterdayAt': 'Вчера {time}',
    'chat.theme.choose': 'Выберите тему',
    'chat.theme.resetDefault': 'Сбросить на тему по умолчанию',
    'call.waking': 'Сервер просыпается. Сейчас будет звонок…',
    'chat.selection.selectedCount': 'Выбрано: {count}',
    'chat.selection.copy': 'Копировать',
    'chat.selection.repost': 'Репост',
    'chat.selection.clear': 'Убрать выбор',
    'call.ui.incomingCall': 'Входящий вызов',
    'call.ui.videoCall': 'Видеозвонок',
    'call.ui.voiceCall': 'Аудиозвонок',
    'call.ui.incomingVideoCall': 'Входящий видеозвонок',
    'call.ui.incomingVoiceCall': 'Входящий аудиозвонок',
    'call.ui.connectingVideoCall': 'Подключение видеозвонка…',
    'call.ui.connectingVoiceCall': 'Подключение аудиозвонка…',
    'call.ui.translation': 'Перевод',
    'call.ui.holdToTranslate': 'Удерживайте для перевода',
    'call.ui.hold': 'Удерживать',
    'call.ui.closeCall': 'Закрыть вызов',
    'call.ui.speakerYou': 'Вы',
    'call.ui.speakerPeer': 'Собеседник',
    'call.ui.voiceInProgress': 'Идет аудиозвонок',
    'call.ui.connectingVoice': 'Подключение аудиозвонка…',
    'call.ui.transcript': 'Транскрипт',
    'call.ui.stop': 'Стоп',
    'call.ui.start': 'Старт',
    'call.ui.cloudTranslationTooltip': 'Облачный перевод использует /api/translate',
    'call.ui.cloud': 'Облако',
    'call.ui.noCloud': 'Без облака',
    'call.ui.duckingTooltip': 'Уменьшить громкость оригинала во время перевода',
    'call.ui.repeatTooltip': 'Повторить последнюю произнесенную фразу',
    'call.ui.duckingOn': 'Даккинг: Вкл',
    'call.ui.duckingOff': 'Даккинг: Выкл',
    'call.ui.asr': 'ASR',
    'call.ui.translateTo': 'Перевод на',
    'call.ui.tts': 'TTS',
    'call.ui.on': 'Вкл',
    'call.ui.off': 'Выкл',
    'call.ui.speaking': 'Говорит',
    'call.ui.idle': 'Пауза',
    'call.ui.mic': 'Микрофон',
    'call.ui.net': 'Сеть',
    'call.ui.skipTermsLabel': 'Пропустить термины (без перевода)',
    'call.ui.skipTermsPlaceholder': 'например: имена, бренды (через запятую)',
    'call.ui.repeat': 'Повторить',
    'call.ui.show': 'Показать',
    'call.ui.hide': 'Скрыть',
    'chat.navigation.chatMenu': 'Меню чата',
    'call.ui.noTranscriptYet': 'Пока нет транскрипта…',
    'call.ui.transcriptAndTranslation': 'Транскрипт и перевод',
    'call.ui.callDebugLog': 'Журнал звонка',
    'call.ui.noEventsYet': 'Пока нет событий…',
    'call.ui.transcriptNoYetShort': 'Пока нет транскрипта…',
    'call.ui.presetsLabel': 'Пресеты:',
    'call.translationTarget.auto': 'Авто',
    'call.ui.linesCount': '{n} строк',
    'call.ui.me': 'Вы',
    'call.ui.peer': 'Собеседник',
    'call.ui.forever': 'Навсегда',
    'chat.menu.muteNotifications': 'Отключить уведомления',
    'chat.menu.chatInfo': 'Информация о чате',
    'chat.menu.searchInChat': 'Поиск в чате',
    'chat.menu.reaction': 'Реакция',
    'chat.menu.until': 'До {time}',
    'chat.menu.disableMute': 'Выключить без звука',
    'chat.menu.mute1h': 'Без звука 1 ч.',
    'chat.menu.mute8h': 'Без звука 8 ч.',
    'chat.menu.mute1w': 'Без звука 1 нед.',
    'chat.menu.muteForever': 'Без звука навсегда',
    'call.summary.title': 'Итог звонка',
    'call.summary.closeAria': 'Закрыть итог звонка',
    'chat.navigation.backToParentChat': 'Назад к родительскому чату',
    'chat.navigation.backToChats': 'Назад к чатам',
    'chat.navigation.searchInChat': 'Поиск в чате',
    'chat.navigation.voiceCall': 'Аудиозвонок',
    'chat.navigation.videoCall': 'Видеозвонок',
    'chat.composer.removeAttachmentAria': 'Убрать вложение',
    'chat.composer.send': 'Отправить',
    'chat.composer.stopAndSend': 'Остановить и отправить',
    'chat.composer.recordVoice': 'Записать голос',
    'chat.composer.sendMessageAria': 'Отправить сообщение',
    'chat.composer.stopRecordingAria': 'Остановить запись',
    'chat.composer.recordVoiceMessageAria': 'Записать голосовое сообщение',
    'chat.message.replyingTo': 'Ответ на {name}',
    'chat.message.editingMessage': 'Редактирование сообщения',
    'chat.message.deleted': 'Это сообщение удалено',
    'chat.message.pinned': 'Закреплено',
    'poll.create.imageUploadFailed': 'Не удалось загрузить картинку',
    'poll.create.clearCanvas': 'Очистить',
    'poll.create.caption': 'Подпись',
    'poll.create.captionPlaceholder': 'Например: что изображено на картинке',
    'emoji.title': 'Эмодзи',
    'emoji.searchPlaceholder': 'Поиск эмодзи…',
    'emoji.recent': 'Недавние',
    'emoji.group.smiles': 'Смайлы',
    'emoji.group.gestures': 'Жесты',
    'emoji.group.hearts': 'Сердца',
    'emoji.group.misc': 'Разное',
    'emoji.group.animals': 'Животные',
    'emoji.group.food': 'Еда',
    'emoji.group.flags': 'Флаги',
    'emoji.group.drops': 'Капельки (trublebubble)',
    'chatSidebar.toast.muted8h': 'Уведомления отключены на 8 ч.',
    'chatSidebar.confirm.deleteChat': 'Удалить этот чат?',
    'chatSidebar.toast.deleteFailed': 'Не удалось удалить чат',
    'chatSidebar.toast.blockSoon': 'Блокировка пользователя будет в следующей версии',
    'chatSidebar.profile.openSettings': 'Открыть настройки профиля',
    'chatSidebar.profile.online': 'онлайн',
    'chatSidebar.menu.collapse': 'Свернуть меню',
    'chatSidebar.menu.expand': 'Развернуть меню',
    'chatSidebar.menu.myProfile': 'Мой профиль',
    'chatSidebar.menu.createGroup': 'Создать группу',
    'chatSidebar.menu.createChannel': 'Создать канал',
    'chatSidebar.menu.contacts': 'Контакты',
    'chatSidebar.menu.saved': 'Избранное',
    'chatSidebar.menu.settings': 'Настройки',
    'chatSidebar.menu.soon': 'Скоро',
    'chatSidebar.theme.night': 'Ночная тема',
    'chatSidebar.searchPlaceholder': 'Поиск или начать новый чат',
    'chatSidebar.section.chats': 'Чаты',
    'chatSidebar.empty.noMatches': 'Нет совпадений в списке',
    'chatSidebar.section.people': 'Люди',
    'chatSidebar.section.messages': 'Сообщения',
    'chatSidebar.empty.searching': 'Поиск…',
    'chatSidebar.empty.noUsers': 'Нет пользователей',
    'chatSidebar.empty.noMessages': 'Нет сообщений',
    'chatSidebar.empty.noChats': 'Нет чатов',
    'chatSidebar.empty.startNew': 'Начните новый разговор',
    'chatSidebar.newMessage': 'Новое сообщение',
    'chatSidebar.context.mute8h': 'Без звука 8 ч.',
    'chatSidebar.context.deleteChat': 'Удалить чат',
    'chatSidebar.context.block': 'Заблокировать',
    'chatSidebar.modal.newMessageTitle': 'Новое сообщение',
    'chatSidebar.modal.searchUserPlaceholder': 'Поиск по имени пользователя…',
    'chatSidebar.modal.noOtherUsers': 'Нет других пользователей для переписки.',
    'chatSidebar.modal.noOneFound': 'Никого не найдено по запросу.',
    'chatSidebar.modal.createGroup': 'Создать группу',
    'chatSidebar.online': 'онлайн',
    'chat.discussionPrefix': 'обсуждение',
    'chatInfo.addMembers.noneFound': 'Никого не найдено — попробуйте другой запрос.',
    'saved.title': 'Избранное',
    'saved.backToChatsAria': 'Назад к чатам',
    'saved.description': 'Сохраняйте сообщения через меню «⋯» в чате → «В избранное».',
    'saved.emptyState': 'Пока пусто. Откройте любой чат, наведите на сообщение, нажмите «⋯» и выберите «В избранное».',
    'saved.openChatTitle': 'Открыть чат',
    'saved.removeSavedTitle': 'Удалить из избранного',
    'settings.profile.usernameLabel': 'Юзернейм',
    'settings.profile.displayNameLabel': 'Имя',
    'settings.profile.bioLabel': 'О себе',
    'settings.profile.bioPlaceholder': 'Напишите что-нибудь о себе...',
    'settings.profile.publicUsernameHint': '@{username} — публичный юзернейм в TrubleBubble',
    'settings.profile.usernameFallback': 'username',
    'settings.profile.saveChanges': 'Сохранить изменения',
    'settings.profile.profileSaved': 'Профиль сохранён',
    'settings.profile.uploadPhotoFailed': 'Не удалось загрузить фото',
    'settings.menu.noExtraOptions': 'Больше опций пока нет.',
    'settings.createGroup.errorCouldNotCreate': 'Не удалось создать группу',
    'settings.createGroup.nameLabel': 'Название группы',
    'settings.createGroup.namePlaceholder': 'Введите название группы',
    'settings.createGroup.usernameOptionalLabel': 'Юзернейм группы (необязательно)',
    'settings.createGroup.usernamePlaceholder': 'unique_username',
    'settings.createChannel.errorCouldNotCreate': 'Не удалось создать канал',
    'settings.createChannel.nameLabel': 'Название канала',
    'settings.createChannel.namePlaceholder': 'Введите название канала',
    'settings.createChannel.usernameOptionalLabel': 'Юзернейм канала (необязательно)',
    'settings.createChannel.usernamePlaceholder': 'unique_username',
    'settings.notifications.sounds.description':
      'Проигрывать случайные звуки при входящих сообщениях (выстрел / попадание / «Эй!»).',
    'settings.notifications.sounds.enableLabel': 'Включить звуки',
    'settings.notifications.sounds.disableHint': 'Можно отключить в любой момент.',
    'settings.notifications.sounds.volumeLabel': 'Громкость',
    'settings.notifications.sounds.tip':
      'Совет: скачай MP3/WAV (например из разделов «пули»), положи в frontend/public/sounds как hey.mp3, shot.mp3, hit.mp3.',
    'auth.common.optional': '(необязательно)',
    'auth.login.title': 'Войти в аккаунт',
    'auth.login.emailOrUsernameLabel': 'Email или имя пользователя',
    'auth.login.emailOrUsernamePlaceholder': 'you@example.com или username',
    'auth.login.passwordLabel': 'Пароль',
    'auth.login.passwordPlaceholder': 'Введите ваш пароль',
    'auth.login.signInButton': 'Войти',
    'auth.login.registerPrompt': "У вас нет аккаунта?",
    'auth.login.registerButton': 'Зарегистрироваться по email',
    'auth.login.errorInvalidCredentials': 'Неверный email/username или пароль.',
    'auth.register.title': 'Создать аккаунт',
    'auth.register.joinHint': 'Присоединяйтесь к TrubleBubble по email',
    'auth.register.emailLabel': 'Email',
    'auth.register.emailPlaceholder': 'you@example.com',
    'auth.register.displayNameLabel': 'Имя',
    'auth.register.displayNamePlaceholder': 'Ваше имя',
    'auth.register.usernameLabel': 'Юзернейм',
    'auth.register.usernamePlaceholder': 'johndoe',
    'auth.register.usernameHint': 'Только буквы, цифры и подчёркивания',
    'auth.register.passwordLabel': 'Пароль',
    'auth.register.passwordPlaceholder': 'Не меньше 6 символов',
    'auth.register.confirmPasswordLabel': 'Повторите пароль',
    'auth.register.confirmPasswordPlaceholder': 'Повторите ваш пароль',
    'auth.register.createButton': 'Создать аккаунт',
    'auth.register.alreadyHaveAccountPrompt': 'У вас уже есть аккаунт?',
    'auth.register.signInButton': 'Войти',
    'auth.register.errorPasswordsDoNotMatch': 'Пароли не совпадают',
    'auth.register.errorPasswordTooShort': 'Пароль должен быть не менее 6 символов',
    'auth.register.errorRegistrationFailed': 'Email или username уже занят, либо регистрация не удалась',
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

    'language.name.ru': 'Russian',
    'language.name.en': 'English',
    'language.name.zh': 'Chinese',
    'language.name.ja': 'Japanese',
    'language.name.sr': 'Serbian',
    'language.name.de': 'German',
    'language.name.fr': 'French',
    'language.name.es': 'Spanish',
    'language.name.it': 'Italian',
    'language.name.pt': 'Portuguese',
    'language.name.ar': 'Arabic',
    'language.name.hi': 'Hindi',
    'language.name.uk': 'Ukrainian',
    'language.name.tr': 'Turkish',
    'language.name.ang': 'Anglo-Saxon',
    'language.name.grc': 'Ancient Greek',
    'language.name.sa': 'Sanskrit',
    'language.name.eo': 'Esperanto',
    'language.name.dothraki': 'Dothraki',
    'language.name.tlh': 'Klingon',

    'composer.attachments': 'Attachments',
    'composer.file': 'File',
    'composer.drawing': 'Drawing',
    'composer.geolocation': 'Location',
    'composer.poll': 'Poll',

    'geo.title': 'Location',
    'geo.chooseOnMap': 'Choose on map',
    'geo.mapAria': 'Map',
    'geo.searchPlaceholder': 'Search place…',
    'geo.orChoosePlace': 'Or choose a place',
    'geo.placeType.shop': 'Shop',
    'geo.placeType.square': 'Square',
    'geo.placeType.cafe': 'Cafe',
    'geo.placeType.river': 'River',
    'geo.placeType.food': 'Food',
    'geo.placeType.nature': 'Nature',
    'geo.placeType.custom': 'Custom',
    'geo.place.coffeeShop': 'Coffee Shop',
    'geo.place.centralSquare': 'Central Square',
    'geo.place.molkaCafe': 'Molka Cafe',
    'geo.place.volgaEmbankment': 'Volga Embankment',
    'geo.place.grenochka': 'Grenochka',
    'geo.place.konakovskyForest': 'Konakovsky Forest',

    'draw.title': 'Drawing',
    'draw.send': 'Send',
    'draw.clear': 'Clear',
    'draw.colorAria': 'Color: {color}',

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
    'poll.setCorrectOption': 'Set correct option',
    'poll.multipleHint': 'You can select multiple options',
    'poll.singleHint': 'Single choice',
    'poll.mediaTitle': 'Poll media',
    'poll.mediaHint': 'Image or drawing (optional)',
    'poll.noMedia': 'None',
    'poll.imageMedia': 'Image',
    'poll.drawMedia': 'Drawing',
    'poll.optionYes': 'yes',
    'poll.optionNo': 'no',

    // Admin panel
    'adminUsers.title': 'Admin — users',
    'adminUsers.createAccountTitle': 'Create account',
    'adminUsers.emailLabel': 'Email',
    'adminUsers.passwordLabel': 'Password',
    'adminUsers.displayNameLabel': 'Display name',
    'adminUsers.usernameOptionalLabel': 'Username (optional)',
    'adminUsers.grantAdminLabel': 'Grant admin',
    'adminUsers.creating': 'Creating…',
    'adminUsers.createUserButton': 'Create user',
    'adminUsers.errorLoadUsersOrAccessDenied': 'Failed to load users or access denied.',
    'adminUsers.errorCreateFailed': 'Create failed',
    'adminUsers.accountsTitle': 'Accounts',
    'adminUsers.adminBadge': 'admin',

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
    'settings.group.app': 'App',
    'common.back': 'Back',
    'settings.privacySecurity.title': 'Privacy & Security',
    'settings.notifications.title': 'Notifications',
    'settings.appearance.title': 'Appearance',
    'settings.appearance.subtitle': 'Theme: dark, light, or follow the system setting.',
    'settings.profile.tapToUpload': 'Tap the photo to upload (JPEG, PNG, GIF, WebP — max 2 MB)',
    'settings.notifications.sounds.title': 'Sounds',
    'settings.notifications.sounds.test': 'Test sound',
    'settings.createGroup.title': 'Create group',
    'settings.createGroup.submit': 'Create group',
    'settings.createChannel.title': 'Create channel',
    'settings.createChannel.submit': 'Create channel',

    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.ok': 'OK',
    'common.loading': 'Loading…',
    'common.more': 'More',
    'common.logout': 'Log out',
    'sidebar.newMessages': 'New messages',
    'sidebar.mainMenu': 'Main menu',
    'sidebar.noMessages': 'No messages',
    'sidebar.attachment': '[attachment]',
    'profile.title': 'Profile',
    'profile.userNotFound': 'User not found',
    'profile.online': 'Online',
    'profile.offline': 'Offline',
    'profile.lastSeen': 'Last seen',
    'profile.message': 'Message',
    'profile.call': 'Call',
    'profile.callUnavailableBot': 'Bubble_Bot is a demo bot — voice calls are not available.',
    'profile.callUnavailableDemo': 'Voice calls are not available in this demo build.',
    'profile.blockConfirm': 'Block this user?',
    'profile.blockUser': 'Block user',
    'profile.blockUnavailableBot': 'This is a system demo account — you can’t block Bubble_Bot.',
    'profile.blockThanks': 'Thanks — full blocking will be available in a future update.',
    'profile.reportUnavailableBot': 'Nothing to report — Bubble_Bot is an official demo bot.',
    'profile.reportPrompt': 'Describe the issue (demo):',
    'profile.reportUser': 'Report user',
    'profile.reportThanks': 'Thanks — your feedback was noted (demo only).',
    'profile.phone': 'Phone',
    'profile.username': 'Username',
    'profile.memberSince': 'Member since',
    'profile.registrationDate': 'Registration date',
    'profile.sharedMedia': 'Shared Media',
    'profile.noSharedMedia': 'No shared media yet',
    'profile.notifications': 'Notifications',
    'chatInfo.title': 'Chat info',
    'chatInfo.changePhoto': 'Change photo',
    'chatInfo.name': 'Name',
    'chatInfo.usernameOptional': 'Username (optional)',
    'chatInfo.publicLinkPlaceholder': 'public_link',
    'chatInfo.saveMeta': 'Save name & username',
    'chatInfo.saving': 'Saving…',
    'chatInfo.chatFallbackTitle': 'Chat',
    'chatInfo.addMembers.title': 'Add members',
    'chatInfo.addMembers.filterPlaceholder': 'Filter by name or @username…',
    'chatInfo.addMembers.loading': 'Loading list…',
    'chatInfo.addMembers.none': 'No other users in the system — register colleagues to add them to the group.',

    'chatInfo.errorCouldNotSave': 'Could not save',
    'chatInfo.errorCouldNotUploadPhoto': 'Could not upload photo',
    'chatInfo.errorCouldNotAddMember': 'Could not add member',

    'chat.loading': 'Loading…',
    'chat.unknown': 'Unknown',
    'chat.online': 'Online',
    'chat.lastSeenRecently': 'Last seen recently',
    'chat.today': 'Today',
    'chat.yesterday': 'Yesterday',
    'chat.message': 'Message',
    'chat.store.failedToLoadMessages': 'Failed to load messages',
    'chat.store.failedToLoadChats': 'Failed to load chats',
    'chat.members.one': 'member',
    'chat.members.other': 'members',
    'chat.search.placeholder': 'Search messages…',
    'chat.search.title': 'Search in chat',
    'chat.search.close': 'Close search',
    'chat.search.filter.all': 'All',
    'chat.search.filter.photo': 'Photo',
    'chat.search.filter.video': 'Video',
    'chat.search.filter.files': 'Files',
    'chat.search.filter.voice': 'Voice',
    'chat.typing': 'typing…',
    'chat.menu.reply': 'Reply',
    'chat.menu.edit': 'Edit',
    'chat.menu.actions': 'Message actions',
    'chat.menu.select': 'Select',
    'chat.menu.deselect': 'Deselect',
    'chat.menu.saved': 'Save',
    'chat.menu.copyText': 'Copy text',
    'chat.menu.delete': 'Delete',
    'chat.menu.animate': 'Animation',
    'chat.menu.animateStop': 'Stop animations',
    'chat.toast.saved': 'Saved',
    'chat.toast.botNotFound': 'bubble_bot not found',
    'chat.toast.discussionsUnavailable': 'Discussions are not available for channels yet',
    'chat.toast.discussionOpenFailed': 'Failed to open discussion',
    'chat.toast.copied': 'Copied',
    'chat.toast.copyFailed': 'Could not copy',
    'chat.toast.copySelectedFailed': 'Could not copy selected messages',
    'chat.toast.copiedN': 'Copied: {n}',
    'chat.confirm.deleteChat': 'Delete this chat for everyone? This cannot be undone.',
    'chat.confirm.clearHistory': 'Clear all messages in this chat for everyone?',
    'chat.toast.deleteFailed': 'Could not delete chat',
    'chat.toast.clearFailed': 'Could not clear history',
    'chat.toast.historyCleared': 'Chat history cleared',
    'chat.toast.exported': 'Chat exported',
    'chat.toast.notificationsUnmuted': 'Notifications unmuted',
    'chat.toast.notificationsMuted': 'Notifications muted',
    'chat.toast.noContact': 'No contact to show',
    'chat.toast.themeApplied': 'Theme applied',
    'chat.toast.defaultTheme': 'Default theme',
    'chat.toast.sendFailed': 'Could not send. Check connection and try again.',
    'chat.toast.micUnavailable': 'Microphone is not available in this browser',
    'chat.toast.micPermission': 'Allow microphone access to record voice',
    'chat.toast.recordingTooShort': 'Recording too short or empty — try holding a bit longer',
    'chat.toast.voiceSendFailed': 'Could not send voice message',
    'call.toast.speechNotSupported': 'Speech recognition is not supported in this browser',
    'call.toast.connectionLost': 'Call connection lost',
    'call.toast.backendNotResponding': 'Backend is not responding. Try again.',
    'call.toast.socketNotConnected': 'Socket not connected. Try again.',
    'call.toast.permissionDenied': 'Microphone/camera permission denied',
    'call.toast.failedToStart': 'Call failed to start',
    'call.toast.rejected': 'Call rejected',
    'chat.snippet.poll': '📊 Poll',
    'chat.snippet.location': '📍 Location',
    'chat.snippet.drawing': 'Drawing',
    'chat.snippet.audio': 'Audio',
    'chat.snippet.file': 'File',
    'chat.snippet.message': 'Message',
    'chat.mentions': 'Mentions',
    'chat.noMatches': 'No matches',
    'chat.emoji': 'Emoji',
    'chat.composer.placeholder': 'Message',
    'chat.yesterdayAt': 'Yesterday {time}',
    'chat.theme.choose': 'Choose theme',
    'chat.theme.resetDefault': 'Reset to default',
    'call.waking': 'Waking up server. The call will start soon…',
    'chat.selection.selectedCount': 'Selected: {count}',
    'chat.selection.copy': 'Copy',
    'chat.selection.repost': 'Repost',
    'chat.selection.clear': 'Clear selection',
    'call.ui.incomingCall': 'Incoming call',
    'call.ui.videoCall': 'Video call',
    'call.ui.voiceCall': 'Voice call',
    'call.ui.incomingVideoCall': 'Incoming video call',
    'call.ui.incomingVoiceCall': 'Incoming voice call',
    'call.ui.connectingVideoCall': 'Connecting video call…',
    'call.ui.connectingVoiceCall': 'Connecting voice call…',
    'call.ui.translation': 'Translation',
    'call.ui.holdToTranslate': 'Hold to translate',
    'call.ui.hold': 'Hold',
    'call.ui.closeCall': 'Close call',
    'call.ui.speakerYou': 'You',
    'call.ui.speakerPeer': 'Peer',
    'call.ui.voiceInProgress': 'Voice call in progress',
    'call.ui.connectingVoice': 'Connecting voice call…',
    'call.ui.transcript': 'Transcript',
    'call.ui.stop': 'Stop',
    'call.ui.start': 'Start',
    'call.ui.cloudTranslationTooltip': 'Cloud translation uses /api/translate',
    'call.ui.cloud': 'Cloud',
    'call.ui.noCloud': 'No cloud',
    'call.ui.duckingTooltip': 'Toggle ducking (reduce original audio while translating)',
    'call.ui.repeatTooltip': 'Repeat last spoken line',
    'call.ui.duckingOn': 'Ducking: On',
    'call.ui.duckingOff': 'Ducking: Off',
    'call.ui.asr': 'ASR',
    'call.ui.translateTo': 'Translate to',
    'call.ui.tts': 'TTS',
    'call.ui.skipTermsLabel': 'Skip terms (no translation)',
    'call.ui.skipTermsPlaceholder': 'e.g. names, brands (comma-separated)',
    'call.ui.repeat': 'Repeat',
    'call.ui.show': 'Show',
    'call.ui.hide': 'Hide',
    'chat.navigation.chatMenu': 'Chat menu',
    'call.ui.noTranscriptYet': 'No transcript yet…',
    'call.ui.transcriptAndTranslation': 'Transcript & translation',
    'call.ui.callDebugLog': 'Call debug log',
    'call.ui.noEventsYet': 'No events yet…',
    'call.ui.transcriptNoYetShort': 'No transcript yet…',
    'call.ui.presetsLabel': 'Presets:',
    'call.translationTarget.auto': 'Auto',
    'call.ui.linesCount': '{n} lines',
    'call.ui.me': 'Me',
    'call.ui.peer': 'Peer',
    'call.ui.forever': 'Forever',
    'chat.menu.muteNotifications': 'Mute notifications',
    'chat.menu.chatInfo': 'Chat info',
    'chat.menu.searchInChat': 'Search in chat',
    'chat.menu.reaction': 'Reaction',
    'chat.menu.until': 'Until {time}',
    'chat.menu.disableMute': 'Disable mute',
    'chat.menu.mute1h': 'Mute for 1 hour',
    'chat.menu.mute8h': 'Mute for 8 hours',
    'chat.menu.mute1w': 'Mute for 1 week',
    'chat.menu.muteForever': 'Mute forever',
    'call.summary.title': 'Call summary',
    'call.summary.closeAria': 'Close call summary',
    'chat.navigation.backToParentChat': 'Back to parent chat',
    'chat.navigation.backToChats': 'Back to chats',
    'chat.navigation.searchInChat': 'Search in chat',
    'chat.navigation.voiceCall': 'Voice call',
    'chat.navigation.videoCall': 'Video call',
    'chat.composer.removeAttachmentAria': 'Remove attachment',
    'chat.composer.send': 'Send',
    'chat.composer.stopAndSend': 'Stop and send',
    'chat.composer.recordVoice': 'Record voice',
    'chat.composer.sendMessageAria': 'Send message',
    'chat.composer.stopRecordingAria': 'Stop recording',
    'chat.composer.recordVoiceMessageAria': 'Record voice message',
    'chat.message.replyingTo': 'Replying to {name}',
    'chat.message.editingMessage': 'Editing message',
    'chat.message.deleted': 'This message was deleted',
    'chat.message.pinned': 'Pinned',
    'poll.create.imageUploadFailed': 'Failed to upload image',
    'poll.create.clearCanvas': 'Clear',
    'poll.create.caption': 'Caption',
    'poll.create.captionPlaceholder': 'For example: what is shown in the image',
    'emoji.title': 'Emoji',
    'emoji.searchPlaceholder': 'Search emoji…',
    'emoji.recent': 'Recent',
    'emoji.group.smiles': 'Smiles',
    'emoji.group.gestures': 'Gestures',
    'emoji.group.hearts': 'Hearts',
    'emoji.group.misc': 'Misc',
    'emoji.group.animals': 'Animals',
    'emoji.group.food': 'Food',
    'emoji.group.flags': 'Flags',
    'emoji.group.drops': 'Drops (trublebubble)',
    'chatSidebar.toast.muted8h': 'Notifications muted for 8h',
    'chatSidebar.confirm.deleteChat': 'Delete this chat?',
    'chatSidebar.toast.deleteFailed': 'Could not delete chat',
    'chatSidebar.toast.blockSoon': 'Blocking will be available in the next version',
    'chatSidebar.profile.openSettings': 'Open profile settings',
    'chatSidebar.profile.online': 'online',
    'chatSidebar.menu.collapse': 'Collapse menu',
    'chatSidebar.menu.expand': 'Expand menu',
    'chatSidebar.menu.myProfile': 'My profile',
    'chatSidebar.menu.createGroup': 'Create group',
    'chatSidebar.menu.createChannel': 'Create channel',
    'chatSidebar.menu.contacts': 'Contacts',
    'chatSidebar.menu.saved': 'Saved',
    'chatSidebar.menu.settings': 'Settings',
    'chatSidebar.menu.soon': 'Soon',
    'chatSidebar.theme.night': 'Night mode',
    'chatSidebar.searchPlaceholder': 'Search or start a new chat',
    'chatSidebar.section.chats': 'Chats',
    'chatSidebar.empty.noMatches': 'No matches in the list',
    'chatSidebar.section.people': 'People',
    'chatSidebar.section.messages': 'Messages',
    'chatSidebar.empty.searching': 'Searching…',
    'chatSidebar.empty.noUsers': 'No users',
    'chatSidebar.empty.noMessages': 'No messages',
    'chatSidebar.empty.noChats': 'No chats',
    'chatSidebar.empty.startNew': 'Start a new conversation',
    'chatSidebar.newMessage': 'New message',
    'chatSidebar.context.mute8h': 'Mute for 8h',
    'chatSidebar.context.deleteChat': 'Delete chat',
    'chatSidebar.context.block': 'Block',
    'chatSidebar.modal.newMessageTitle': 'New message',
    'chatSidebar.modal.searchUserPlaceholder': 'Search by user name…',
    'chatSidebar.modal.noOtherUsers': 'No other users available to message.',
    'chatSidebar.modal.noOneFound': 'No one found for your query.',
    'chatSidebar.modal.createGroup': 'Create group',
    'chatSidebar.online': 'online',
    'chat.discussionPrefix': 'discussion',
    'chatInfo.addMembers.noneFound': 'No one found — try another query.',
    'saved.title': 'Saved Messages',
    'saved.backToChatsAria': 'Back to chats',
    'saved.description': 'Save messages via ⋯ menu in the chat → Saved.',
    'saved.emptyState': 'Nothing saved yet. Open any chat, hover a message, tap ⋯ and choose “Saved”.',
    'saved.openChatTitle': 'Open chat',
    'saved.removeSavedTitle': 'Remove from saved',
    'settings.profile.usernameLabel': 'Username',
    'settings.profile.displayNameLabel': 'Display Name',
    'settings.profile.bioLabel': 'Bio',
    'settings.profile.bioPlaceholder': 'Write something about yourself...',
    'settings.profile.publicUsernameHint': '@{username} — public username in TrubleBubble',
    'settings.profile.usernameFallback': 'username',
    'settings.profile.saveChanges': 'Save changes',
    'settings.profile.profileSaved': 'Profile saved',
    'settings.profile.uploadPhotoFailed': 'Could not upload photo',
    'settings.menu.noExtraOptions': 'No extra options here yet.',
    'settings.createGroup.errorCouldNotCreate': 'Could not create group',
    'settings.createGroup.nameLabel': 'Group name',
    'settings.createGroup.namePlaceholder': 'Enter group name',
    'settings.createGroup.usernameOptionalLabel': 'Group username (optional)',
    'settings.createGroup.usernamePlaceholder': 'unique_username',
    'settings.createChannel.errorCouldNotCreate': 'Could not create channel',
    'settings.createChannel.nameLabel': 'Channel name',
    'settings.createChannel.namePlaceholder': 'Enter channel name',
    'settings.createChannel.usernameOptionalLabel': 'Channel username (optional)',
    'settings.createChannel.usernamePlaceholder': 'unique_username',
    'settings.notifications.sounds.description':
      'Play random sounds on incoming messages (gun / hit / «Hey!»).',
    'settings.notifications.sounds.enableLabel': 'Enable sounds',
    'settings.notifications.sounds.disableHint': 'You can disable this anytime.',
    'settings.notifications.sounds.volumeLabel': 'Volume',
    'settings.notifications.sounds.tip':
      'Tip: download MP3/WAV (e.g. from “pulses”), place them in frontend/public/sounds as hey.mp3, shot.mp3, hit.mp3.',
    'auth.common.optional': '(optional)',
    'auth.login.title': 'Sign in to your account',
    'auth.login.emailOrUsernameLabel': 'Email or username',
    'auth.login.emailOrUsernamePlaceholder': 'you@example.com or username',
    'auth.login.passwordLabel': 'Password',
    'auth.login.passwordPlaceholder': 'Enter your password',
    'auth.login.signInButton': 'Sign In',
    'auth.login.registerPrompt': "Don't have an account?",
    'auth.login.registerButton': 'Register with email',
    'auth.login.errorInvalidCredentials': 'Invalid email/username or password.',
    'auth.register.title': 'Create Account',
    'auth.register.joinHint': 'Join TrubleBubble with your email',
    'auth.register.emailLabel': 'Email',
    'auth.register.emailPlaceholder': 'you@example.com',
    'auth.register.displayNameLabel': 'Display Name',
    'auth.register.displayNamePlaceholder': 'Your name',
    'auth.register.usernameLabel': 'Username',
    'auth.register.usernamePlaceholder': 'johndoe',
    'auth.register.usernameHint': 'Letters, numbers, underscores only',
    'auth.register.passwordLabel': 'Password',
    'auth.register.passwordPlaceholder': 'At least 6 characters',
    'auth.register.confirmPasswordLabel': 'Confirm Password',
    'auth.register.confirmPasswordPlaceholder': 'Repeat your password',
    'auth.register.createButton': 'Create Account',
    'auth.register.alreadyHaveAccountPrompt': 'Already have an account?',
    'auth.register.signInButton': 'Sign in',
    'auth.register.errorPasswordsDoNotMatch': 'Passwords do not match',
    'auth.register.errorPasswordTooShort': 'Password must be at least 6 characters',
    'auth.register.errorRegistrationFailed': 'Email or username already taken, or registration failed',
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

