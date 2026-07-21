// Single source of truth for user-facing UI text.
//
// This is NOT internationalization: there is one locale (Japanese) and no
// runtime language switching. The goal is only to keep display literals in
// one place instead of scattering them across components and the mock
// service. Static text lives on `STRINGS`; text that embeds runtime values
// is expressed as a small function so the formatting stays here too.
//
// Anything the user can read belongs here: labels, placeholders, button
// captions, titles/headings, hints, legends, empty/error/banner messages,
// `title`/`aria-label` attributes, `window.confirm` text, and the `reason`
// strings returned by the mock service. Internal domain errors that are
// never surfaced to the user stay in their own modules.

export const STRINGS = {
  common: {
    close: '閉じる',
    cancel: 'キャンセル',
    noneFirstLevel: 'なし（第1階層）',
  },

  header: {
    brand: '変革ツリー更新アプリ',
    departmentLabel: '部署',
    fiscalYearLabel: '年度',
    prevYear: '前年度',
    nextYear: '次年度',
    fiscalYearValue: (year: number) => `${year}年度`,
    dirty: '未保存の変更があります',
    clean: '保存済み',
    saving: '保存中...',
    saveFailed: '保存に失敗しました',
    discardConfirm: 'ここまでの変更を破棄し、保存済みの状態に戻します。よろしいですか？',
    discardButton: '変更を破棄',
    saveButton: '変更をSQLiteへ保存',
    editButton: '編集',
  },

  dialog: {
    unsavedTitle: '未保存の変更があります',
    unsavedBody: '編集中の変更が保存されていません。破棄して切り替えますか？',
    unsavedDiscardSwitch: '破棄して切替',
  },

  sidebar: {
    searchLabel: '施策名検索',
    searchPlaceholder: '施策名で検索',
    hitCount: (count: number) => `${count} 件ヒット`,
    levelFilterLabel: '階層フィルター',
    levelOptions: {
      all: '全階層を表示',
      upTo5: '第5階層まで表示',
      upTo4: '第4階層まで表示',
      upTo3: '第3階層まで表示',
      upTo2: '第2階層まで表示',
      upTo1: '第1階層まで表示',
    },
    assigneeFilterLabel: '担当者フィルター',
    assigneeAll: 'すべての担当者',
    fitView: '全体表示',
    focusSelected: '選択ノードへ移動',
    legendTitle: '凡例',
    legendCommon: '共通施策 (第1〜3階層)',
    legendDept: '部署固有施策 (第4〜6階層)',
    legendPath: '選択施策までの経路',
  },

  editPanel: {
    emptyHint: 'ツリー上の施策を選択すると、ここに詳細が表示されます。',
    title: '施策詳細',
    levelText: {
      1: '第1階層',
      2: '第2階層',
      3: '第3階層',
      4: '第4階層',
      5: '第5階層',
      6: '第6階層',
    } as Record<number, string>,
    nodeCode: 'ノードコード',
    nodeCodePending: '保存後に採番されます',
    level: '階層',
    scope: '区分',
    scopeCommon: '共通施策',
    scopeDept: '部署固有施策',
    parent: '親施策',
    name: '施策名',
    subtitle: 'サブタイトル',
    assignee: '担当者',
    saveBasic: '基本情報を保存',
    readonlyCommonNote: '第1〜3階層は共通施策のため、施策名・担当者は編集できません（重みのみ部署別に編集可能）。',
    weightFromParent: '親からの重み',
    openWeightEditor: '兄弟の重みを一括編集',
    outcomeProgress: '成果進捗',
    computedTag: '計算値（子の重み付き合計）',
    areaLabel: (year: number) => `可能面積（${year}年度）`,
    areaPlaceholder: '未設定',
    areaMissing: (year: number) => `${year}年度の可能面積データがありません。`,
    detach: 'ツリーから外す（linkage解除）',
  },

  weightDialog: {
    title: (parentName: string) => `重み一括編集: ${parentName}`,
    description: (count: number) => `直下の施策（${count}件）の重みを編集します。合計が100%になるときのみ反映できます。`,
    colName: '施策名',
    colWeight: '重み (%)',
    sum: (total: number) => `合計: ${total.toFixed(1)}%`,
    surplus: (diff: number) => `${diff.toFixed(1)}% 超過`,
    shortfall: (diff: number) => `${Math.abs(diff).toFixed(1)}% 不足`,
    sumOk: 'OK',
    apply: '反映',
  },

  treeNode: {
    levelBadge: {
      1: 'L1',
      2: 'L2',
      3: 'L3',
      4: 'L4',
      5: 'L5',
      6: 'L6',
    } as Record<number, string>,
    assigneeTitle: (assignee: string) => `担当: ${assignee}`,
    expand: '子施策を表示',
    collapse: '子施策を折りたたむ',
    computed: '計算値',
    area: (area: number) => `可能面積 ${area}`,
    detach: 'ツリーから外す（linkage解除）',
    addChild: '子施策を追加',
  },

  treeCanvas: {
    empty: '表示できる施策がありません。部署または年度を確認してください。',
  },

  app: {
    addChildRejectedProgress:
      '成果進捗が入力済み（0%超）のため子施策を追加できません。成果進捗を0%にして保存してから追加してください（確認なしで操作を拒否しています）。',
    newChildDefaultName: '新しい施策',
    emptyTree: 'この部署・年度で表示できる施策がありません。',
    loadingTree: '読み込み中...',
    loadingDepartments: '部署一覧を読み込み中...',
    internalNoParent: '内部エラー: 親施策が未指定です。',
  },

  // Mock service `reason` messages (surfaced to the user as banners / panel
  // errors). Kept here so error wording lives in the same place as the rest.
  serviceReason: {
    nodeNotFound: '対象の施策が見つかりません。',
    commonNodeReadonly: '第1〜3階層の施策名・詳細は編集できません（共通ノードのため）。',
    parentNotFound: '親施策が見つかりません。',
    addChildLevelRange: '子の追加は第3→4／4→5／5→6階層でのみ可能です。',
    addChildProgressLocked:
      '成果進捗が入力済み（0%超）のため子施策を追加できません。成果進捗を0%にして保存してから追加してください。',
    weightRange: '重みは0〜1の範囲で入力してください。',
    addChildWeightSum: (total: number) =>
      `兄弟施策の重み合計が1.0になりません（現在の合計 ${total.toFixed(4)}）。追加前に重み一括編集で調整してください。`,
    detachHasChildren: '子を持つ施策はツリーから外せません。末端の施策のみ解除できます。',
    detachNotInTree: 'このツリーに属していないため解除できません。',
    weightSumInvalid: (total: number, diff: number) => {
      const diffLabel = diff > 0 ? `${diff.toFixed(4)} 超過` : `${Math.abs(diff).toFixed(4)} 不足`;
      return `重みの合計が1.0になっていません（現在 ${total.toFixed(4)} / ${diffLabel}）。`;
    },
    weightChildrenChanged: '子施策の構成が変更されています。画面を更新してやり直してください。',
    weightChildNotFound: (childNodeId: string) => `対象の子施策(${childNodeId})が見つかりません。`,
    progressLeafOnly: '成果進捗を直接入力できるのは末端施策のみです。上位階層は自動計算されます。',
    progressRange: '成果進捗は0〜100%の範囲で入力してください。',
    areaFirstLevelOnly: '可能面積を編集できるのは第1階層の施策のみです。',
    areaRange: '面積は0以上の数値で入力してください。',
    departmentNotFound: '対象の部署が見つかりません。',
    networkError: 'サーバーに接続できませんでした。API サーバーが起動しているか確認してください。',
    unknown: '不明なエラーが発生しました。',
  },
} as const;
