/*
 * Web calendar data for Kamidana.
 *
 * The formulas in this file intentionally follow the Android app's
 * ReKiUtil and MoonAge implementations. Keeping the calendar rules in one
 * small module keeps calendar calculation independent from the home page UI.
 */
(function (root, factory) {
  const api = factory();
  if (root) root.KamidanaKoyomi = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DAY_MS = 86400000;
  const SYNODIC_MONTH = 29.530588;
  const TOKYO_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const SOLAR_TERMS = [
    '春分', '清明', '穀雨', '立夏', '小満', '芒種',
    '夏至', '小暑', '大暑', '立秋', '処暑', '白露',
    '秋分', '寒露', '霜降', '立冬', '小雪', '大雪',
    '冬至', '小寒', '大寒', '立春', '雨水', '啓蟄'
  ];
  const KAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const SHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const JUNICHOKU = ['建', '除', '満', '平', '定', '執', '破', '危', '成', '納', '開', '閉'];
  const ROKUYO = ['大安', '赤口', '先勝', '友引', '先負', '仏滅'];
  const MOON_PHASES = ['新月', '三日月', '上弦', '望前', '満月', '既望', '下弦', '有明月'];
  const MOON_NAMES = [
    '新月', '繊月', '三日月', '夕月', '夕月', '夕月', '弓張月', '弓張月',
    '九夜月', '十日夜', '十日余りの月', '宵月', '十三夜月', '待宵月', '十五夜',
    '十六夜', '立待月', '居待月', '寝待月', '更待ち月', '更待月', '二十日余りの月',
    '二十三夜月', '有明月', '有明月', '二十六夜月', '有明月', '有明月', '暁月', '月隠り'
  ];

  const ROKUYO_DESCRIPTIONS = {
    '大安': '何事にも良い日とされます。めでたいことや大切なことに取り組む日に。',
    '赤口': '正午頃だけが吉とされます。メリハリを大切に、集中して動く日に。',
    '先勝': '先んずれば勝つとされる日です。早めに済ませたいことに取り組む日に。',
    '友引': '良いことは続け、気になることは整える日に。',
    '先負': '焦らず、準備や計画に集中するとよい日です。',
    '仏滅': '過去を手放し、新しい一歩を始める日に。'
  };
  const JUNICHOKU_DESCRIPTIONS = {
    '建': '新たなことを始めるのに適した日です。',
    '除': '不要なものを手放し、身の回りを整えるのに適した日です。',
    '満': '物事が満ちていく日です。積極的に育てることを意識して。',
    '平': '波風を立てず、物事を円満に進めやすい日です。',
    '定': '計画や決めごとなど、将来の基盤を固める日に。',
    '執': '決めたことを粛々と進めるのに適した日です。',
    '破': '滞っていることを見直し、新しい道を開く日に。',
    '危': '無理をせず、慎重に自分を大切に過ごす日に。',
    '成': '始めたことを最後までやり遂げるのに向く日です。',
    '納': '得たものを大切に収め、整えるのに適した日です。',
    '開': '前途が明るくなるよう、積極的に動く日に。',
    '閉': '締めくくりや区切りを意識し、上手に閉じる日に。'
  };
  const JUNICHOKU_ACTIONS = {
    '建': ['始めたいことを、ひとつ決める', '最初の一歩を小さく始める'],
    '除': ['不要なものをひとつ手放す', '先延ばしにしていたことを整える'],
    '満': ['育てたいことに時間を使う', '今あるものをひとつ広げる'],
    '平': ['身近なことを穏やかに整える', '人との約束を丁寧にする'],
    '定': ['願いをひとつ決める', 'これから続けたいことを定める'],
    '執': ['決めたことをひとつ進める', '途中のことに手を戻す'],
    '破': ['滞っていることを見直す', '手放したい習慣に区切りをつける'],
    '危': ['急がず、無理のない予定を選ぶ', '大切なことを静かに確認する'],
    '成': ['仕上げたいことをひとつ選ぶ', '小さな達成を形にする'],
    '納': ['成果や気づきを書き留める', '大切なものをしまう場所を整える'],
    '開': ['新しい話をひとつ開く', '外へ向けて最初の一歩を出す'],
    '閉': ['今日の終わりを整える', '手放すことをひとつ決める']
  };
  const SENJITSU_DESCRIPTIONS = {
    '一粒万倍日': '一粒の種が万倍にも実るとされる吉日。新しい挑戦の種を蒔く日に。',
    '天赦日': '暦の中でも特に縁起がよい日。思い切って新しいことを始める日に。',
    '寅の日': '出て行ったものがすぐ戻るとされる日。旅立ちや出費を意識する日に。',
    '巳の日': '金運や才能、芸術に縁があるとされる吉日です。',
    '己巳の日': '六十日に一度巡る特別な巳の日です。',
    '甲子の日': '六十干支の始まり。新しい目標のスタートに向く日です。',
    '天恩日': '天の恩恵を受ける日。日頃の恵みに感謝を向ける日に。'
  };
  const SENJITSU_ACTIONS = {
    '一粒万倍日': ['始めたいことを、小さく始める', '育てたい願いをひとつ言葉にする'],
    '天赦日': ['思い切って、新しいことを始める', '先送りしていた願いに手をつける'],
    '寅の日': ['出かける先と、戻りたい場所を思い浮かべる'],
    '巳の日': ['磨きたい才能や感性に時間を使う'],
    '己巳の日': ['大切に育てたいものを、ひとつ言葉にする'],
    '甲子の日': ['これからの目標をひとつ書き留める'],
    '天恩日': ['今日受け取っている恵みに目を向ける']
  };
  const ROKUYO_ACTIONS = {
    '大安': ['気になっていた大切なことに手をつける'],
    '赤口': ['正午頃に、集中してひとつ済ませる'],
    '先勝': ['午前中に、先に済ませたいことを進める'],
    '友引': ['誰かと喜びを分かち合う時間をつくる'],
    '先負': ['急がず、準備や計画を丁寧に整える'],
    '仏滅': ['過去を手放し、新しい一歩の余白をつくる']
  };
  const RESTRICTIVE_JUNICHOKU = new Set(['除', '破', '危', '納', '閉']);
  const FORWARD_SENJITSU = new Set(['一粒万倍日', '天赦日', '甲子の日']);
  const MIXED_ACTIONS = {
    '除': ['不要なものを整えてから、次に始めることを決める', '手放したあとに残したいものをひとつ選ぶ', '新しいことは、準備から始める'],
    '破': ['手放すことをひとつ決めて、次に進む余白をつくる', '見直しを終えてから、小さな一歩を選ぶ', '始める前に、滞っていることを整える'],
    '危': ['急がずに整えてから、次の一歩を決める', '大切なことを確認して、準備だけ進める', '願いは急いで始めず、今日は言葉にする'],
    '納': ['今あるものを整えてから、次に育てたいことを決める', '今日の気づきを書き留めて、次の一歩に備える', '大切なものをしまう場所を整える'],
    '閉': ['ひとつ区切りをつけてから、次に始めることを決める', '身の回りを整えて、育てたい願いをひとつ言葉にする', '今日の勢いは、準備に使う']
  };

  // 旧暦換算テーブル used by the Android app (1999–2070).
  const OLD_TO_NEW = [
    [611, 2350], [468, 3222], [316, 7317], [559, 3402], [416, 3493], [288, 2901],
    [520, 1388], [384, 5467], [637, 605], [494, 2349], [343, 6443], [585, 2709],
    [442, 2890], [302, 5962], [533, 2901], [412, 2741], [650, 1210], [507, 2651],
    [369, 2647], [611, 1323], [468, 2709], [329, 5781], [559, 1706], [416, 2773],
    [288, 2741], [533, 1206], [383, 5294], [624, 2647], [494, 1319], [356, 3366],
    [572, 3475], [442, 1450], [302, 5482], [546, 2413], [414, 2397], [650, 1198],
    [507, 2637], [370, 6733], [598, 3365], [455, 3410], [317, 6996], [559, 2922],
    [416, 2413], [288, 2395], [533, 1179], [397, 5271], [624, 2635], [481, 2853],
    [343, 5797], [585, 1748], [429, 2778], [302, 4790], [546, 2391], [424, 2359],
    [650, 1175], [507, 1611], [370, 3402], [598, 3749], [455, 1714], [316, 5548],
    [559, 2742], [429, 2359], [289, 2350], [520, 3222], [384, 6805], [624, 3402],
    [468, 3493], [343, 2901], [585, 1386], [442, 2733], [303, 4701], [546, 2349]
  ];

  function floor(value) {
    return Math.floor(value);
  }

  function dateOnly(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  function dateAtNoon(date) {
    // Use JST noon as the stable astronomical sample regardless of the viewer's timezone.
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 3, 0, 0, 0));
  }

  function dateInTokyo(input) {
    const parts = TOKYO_DATE_FORMATTER.formatToParts(input);
    const values = {};
    parts.forEach((part) => {
      if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
        values[part.type] = Number(part.value);
      }
    });
    return new Date(values.year, values.month - 1, values.day, 12, 0, 0, 0);
  }

  function ymd2Jd1600(year, month, day) {
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (year % 4 === 0) monthDays[1] = 29;
    if (year % 100 === 0) monthDays[1] = 28;
    if (year % 400 === 0) monthDays[1] = 29;

    let days = day;
    for (let index = 0; index < month - 1; index += 1) days += monthDays[index];
    if (year > 1600) {
      const adjustYear = year - 1601;
      days += floor(adjustYear * 365.250001) + 366;
      days -= floor(adjustYear * 0.010001);
      days += floor(adjustYear * 0.0025001);
    }
    return days + 2305446;
  }

  function hieto(date) {
    const jd = ymd2Jd1600(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return KAN[jd % 10] + SHI[(jd + 2) % 12];
  }

  function leapYear(year) {
    if (year % 400 === 0) return 1;
    if (year % 100 === 0) return 0;
    return year % 4 === 0 ? 1 : 0;
  }

  function numberDays(year, month, day) {
    const monthDays = [31, 28 + leapYear(year), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let days = day;
    for (let index = 0; index < month - 1; index += 1) days += monthDays[index];
    return days;
  }

  function validGregorianDate(year, month, day) {
    return year >= 2000 && year <= 2070 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
  }

  function expandedOldCalendar(year) {
    const row = OLD_TO_NEW[year - 1999];
    if (!row) return null;

    let startDay = floor(row[0] / 13 + 0.001);
    const leapMonth = row[0] % 13;
    let bits = row[1];
    const maxMonth = leapMonth === 0 ? 12 : 13;
    const table = [[startDay, 1]];

    if (leapMonth === 0) bits *= 2;
    for (let index = 1; index <= maxMonth; index += 1) {
      let nextStart = table[index - 1][0] + 29;
      if (bits >= 4096) nextStart += 1;
      table.push([nextStart, index + 1]);
      bits = (bits % 4096) * 2;
    }

    table[maxMonth][1] = 0;
    if (maxMonth > 12) {
      for (let index = leapMonth + 1; index <= 12; index += 1) table[index][1] = index;
      table[leapMonth][1] = -leapMonth;
    }
    return table;
  }

  function lunarDate(year, month, day) {
    if (!validGregorianDate(year, month, day)) return null;
    let dayOfYear = numberDays(year, month, day);
    let lunarYear = year;
    let table = expandedOldCalendar(lunarYear);
    if (!table) return null;

    if (dayOfYear < table[0][0]) {
      lunarYear -= 1;
      dayOfYear += 365 + leapYear(lunarYear);
      table = expandedOldCalendar(lunarYear);
    }

    let lunarMonth = 0;
    let lunarDay = 0;
    for (let index = 12; index >= 0; index -= 1) {
      if (table[index] && table[index][1] !== 0 && table[index][0] <= dayOfYear) {
        lunarMonth = table[index][1];
        lunarDay = dayOfYear - table[index][0] + 1;
        break;
      }
    }
    if (lunarMonth < 0) return { year: lunarYear, month: -lunarMonth, day: lunarDay, leap: true };
    return { year: lunarYear, month: lunarMonth, day: lunarDay, leap: false };
  }

  function calcLongitudeSun(timestamp) {
    const localDate = new Date(timestamp);
    const year = localDate.getFullYear();
    const month = localDate.getMonth() + 1;
    const day = localDate.getDate();
    const jy = gregorian2JY(year, month, day);
    let theta = 0.0003 * Math.sin(deg2rad(adjustAngle(329.7 + 44.43 * jy)));
    theta += 0.0003 * Math.sin(deg2rad(adjustAngle(352.5 + 1079.97 * jy)));
    theta += 0.0004 * Math.sin(deg2rad(adjustAngle(21.1 + 720.02 * jy)));
    theta += 0.0004 * Math.sin(deg2rad(adjustAngle(157.3 + 299.30 * jy)));
    theta += 0.0004 * Math.sin(deg2rad(adjustAngle(234.9 + 315.56 * jy)));
    theta += 0.0005 * Math.sin(deg2rad(adjustAngle(291.2 + 22.81 * jy)));
    theta += 0.0005 * Math.sin(deg2rad(adjustAngle(207.4 + 1.50 * jy)));
    theta += 0.0006 * Math.sin(deg2rad(adjustAngle(29.8 + 337.18 * jy)));
    theta += 0.0007 * Math.sin(deg2rad(adjustAngle(206.8 + 30.35 * jy)));
    theta += 0.0007 * Math.sin(deg2rad(adjustAngle(153.3 + 90.38 * jy)));
    theta += 0.0008 * Math.sin(deg2rad(adjustAngle(132.5 + 659.29 * jy)));
    theta += 0.0013 * Math.sin(deg2rad(adjustAngle(81.4 + 225.18 * jy)));
    theta += 0.0015 * Math.sin(deg2rad(adjustAngle(343.2 + 450.37 * jy)));
    theta += 0.0018 * Math.sin(deg2rad(adjustAngle(251.3 + 0.20 * jy)));
    theta += 0.0018 * Math.sin(deg2rad(adjustAngle(297.8 + 4452.67 * jy)));
    theta += 0.0020 * Math.sin(deg2rad(adjustAngle(247.1 + 329.64 * jy)));
    theta += 0.0048 * Math.sin(deg2rad(adjustAngle(234.95 + 19.341 * jy)));
    theta += 0.0200 * Math.sin(deg2rad(adjustAngle(355.05 + 719.981 * jy)));
    theta += (1.9146 - 0.00005 * jy) * Math.sin(deg2rad(adjustAngle(357.538 + 359.991 * jy)));
    theta += adjustAngle(280.4603 + 360.00769 * jy);
    return adjustAngle(theta);
  }

  function gregorian2JY(year, month, day) {
    let y = year - 2000;
    let m = month;
    let workingYear = y;
    if (m <= 2) {
      m += 12;
      workingYear -= 1;
    }
    let j2000 = 365 * workingYear + 30 * m + day - 33.5 - 9 / 24;
    j2000 += floor(3 * (m + 1) / 5);
    j2000 += floor(workingYear / 4);
    return j2000 / 365.25;
  }

  function adjustAngle(value) {
    if (value < 0) {
      const absolute = -value;
      return 360 - (absolute - 360 * floor(absolute / 360));
    }
    return value - 360 * floor(value / 360);
  }

  function deg2rad(value) {
    return value * Math.PI / 180;
  }

  function solarTermPosition(timestamp) {
    const nextTimestamp = timestamp + DAY_MS;
    const first = floor(calcLongitudeSun(timestamp) / 15);
    const second = floor(calcLongitudeSun(nextTimestamp) / 15);
    return first !== second ? second : -1;
  }

  function currentSolarTerm(timestamp) {
    for (let index = 0; index <= 99; index += 1) {
      const position = solarTermPosition(timestamp - DAY_MS * index);
      if (position >= 0) return position;
    }
    return -1;
  }

  function junichoku(date, separator) {
    if (separator < 0) return null;
    const jd = ymd2Jd1600(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const dayBranchIndex = SHI.indexOf(SHI[(jd + 2) % 12]);
    const buildBranch = [
      '卯', '辰', '辰', '巳', '巳', '午', '午', '未', '未', '申', '申', '酉',
      '酉', '戌', '戌', '亥', '亥', '子', '子', '丑', '丑', '寅', '寅', '卯'
    ][separator];
    const buildIndex = SHI.indexOf(buildBranch);
    if (dayBranchIndex < 0 || buildIndex < 0) return null;
    return JUNICHOKU[(dayBranchIndex - buildIndex + 12) % 12];
  }

  function moonAgeDouble(timestamp) {
    const julian = timestamp / DAY_MS + 2440587.5;
    let newMoon = newMoonJulian(julian);
    if (newMoon > julian) newMoon = newMoonJulian(julian - 1);
    return Math.abs(newMoon - julian);
  }

  function newMoonJulian(julian) {
    const k = floor((julian - 2451550.09765) / 29.530589);
    const t = k / 1236.85;
    return 2451550.09765 + 29.530589 * k + 0.0001337 * t * t
      - 0.40720 * Math.sin(deg2rad(201.5643 + 385.8169 * k))
      + 0.17241 * Math.sin(deg2rad(2.5534 + 29.1054 * k));
  }

  function roundedMoonAge(timestamp) {
    let result = Math.round(moonAgeDouble(timestamp));
    if (result >= 30) result = 29;
    if (result >= 29) {
      const nextDay = new Date(timestamp);
      nextDay.setDate(nextDay.getDate() + 1);
      if (roundedMoonAge(nextDay.getTime()) >= 1) result = 0;
    }
    return result;
  }

  function moonPhaseIndex(age) {
    let normalized = age % SYNODIC_MONTH;
    if (normalized < 0) normalized += SYNODIC_MONTH;
    const sector = SYNODIC_MONTH / 8;
    const half = sector / 2;
    if (normalized >= SYNODIC_MONTH - half || normalized < half) return 0;
    return Math.min(7, floor((normalized + half) / sector));
  }

  function senjitsuFor(hietoValue, separator) {
    const result = [];
    const has = (value) => hietoValue.includes(value);
    if (((has('丑') || has('午')) && separator >= 21 && separator < 23)
      || ((has('酉') || has('寅')) && (separator >= 23 || separator < 1))
      || ((has('子') || has('卯')) && separator >= 1 && separator < 3)
      || ((has('卯') || has('辰')) && separator >= 3 && separator < 5)
      || ((has('巳') || has('午')) && separator >= 5 && separator < 7)
      || ((has('酉') || has('午')) && separator >= 7 && separator < 9)
      || ((has('子') || has('未')) && separator >= 9 && separator < 11)
      || ((has('卯') || has('申')) && separator >= 11 && separator < 13)
      || ((has('酉') || has('午')) && separator >= 13 && separator < 15)
      || ((has('酉') || has('戌')) && separator >= 15 && separator < 17)
      || ((has('亥') || has('子')) && separator >= 17 && separator < 19)
      || ((has('卯') || has('子')) && separator >= 19 && separator < 21)) {
      result.push('一粒万倍日');
    }
    if ((hietoValue === '戊寅' && (separator < 3 || separator >= 21))
      || (hietoValue === '甲午' && separator >= 3 && separator < 9)
      || (hietoValue === '戊申' && separator >= 9 && separator < 15)
      || (hietoValue === '甲子' && separator >= 15 && separator < 21)) {
      result.push('天赦日');
    }
    if (has('寅')) result.push('寅の日');
    if (has('己巳')) result.push('己巳の日');
    else if (has('巳')) result.push('巳の日');
    if (hietoValue === '甲子') result.push('甲子の日');
    if (new Set([
      '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己卯', '庚辰', '辛巳',
      '壬午', '癸未', '甲戌', '乙亥', '丙子', '丁丑', '戊寅'
    ]).has(hietoValue)) result.push('天恩日');
    return result;
  }

  function actionSuggestionsFor({ junichoku, senjitsu = [], rokuyo, moonPhaseIndex: phaseIndex }) {
    const suggestions = [];
    const add = (items) => {
      (items || []).forEach((item) => {
        if (item && !suggestions.includes(item)) suggestions.push(item);
      });
    };

    const isRestrictive = RESTRICTIVE_JUNICHOKU.has(junichoku);
    const hasForwardSignal = senjitsu.some((item) => FORWARD_SENJITSU.has(item));

    if (isRestrictive && hasForwardSignal) {
      // Keep the day's direction coherent: prepare, close, then begin.
      add(MIXED_ACTIONS[junichoku]);
    } else {
      add(JUNICHOKU_ACTIONS[junichoku]);
      senjitsu.forEach((item) => {
        const actions = SENJITSU_ACTIONS[item];
        if (!actions) return;
        if (junichoku === '建' && item === '一粒万倍日') {
          add(actions.slice(1));
          return;
        }
        add(actions);
      });
    }
    if (suggestions.length < 2) add(ROKUYO_ACTIONS[rokuyo]);
    if (suggestions.length < 2) {
      add({
        0: ['静かに願いをひとつ思い浮かべる'],
        1: ['小さな変化の種を見つける'],
        2: ['育てたいことに目を向ける'],
        3: ['今あるものを見直す'],
        4: ['受け取ったものに感謝する'],
        5: ['手放したいことをひとつ選ぶ'],
        6: ['余白をつくる時間を選ぶ'],
        7: ['今日の終わりを静かに整える']
      }[phaseIndex]);
    }

    return suggestions.slice(0, 3);
  }

  function annualEvent(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const events = {
      '6-30': ['夏越大祓', '半年の罪や穢れを祓い、清らかな心で残り半年を迎える日です。'],
      '12-31': ['年越大祓', '一年の無事に感謝し、清らかな心で新年を迎える日です。'],
      '1-7': ['人日の節句', '七草の生命力をいただき、一年の無病息災を願う日です。'],
      '3-3': ['上巳の節句', '邪気を祓い、心身の健やかさと幸福を願う日です。'],
      '5-5': ['端午の節句', '厄を払い、健やかな成長と無病息災を願う日です。'],
      '7-7': ['七夕の節句', '星に願いを馳せ、心願成就を願う日です。'],
      '9-9': ['重陽の節句', 'これまでの健康に感謝し、健やかな日々を願う日です.']
    };
    return events[`${month}-${day}`] || null;
  }

  function calculateForDate(input) {
    const original = input instanceof Date ? input : new Date(input);
    const date = dateOnly(original);
    const noon = dateAtNoon(date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const lunar = lunarDate(year, month, day);
    const separator = currentSolarTerm(date.getTime());
    const dayHieto = hieto(date);
    const age = moonAgeDouble(noon.getTime());
    const roundedAge = roundedMoonAge(noon.getTime());
    const moonPhase = moonPhaseIndex(age);
    const dayOfWeek = date.getDay();
    const rokuyo = lunar ? ROKUYO[(lunar.month + lunar.day) % 6] : null;
    const direct = junichoku(date, separator);
    const senjitsu = senjitsuFor(dayHieto, separator);
    const event = annualEvent(date);

    const advice = direct ? JUNICHOKU_DESCRIPTIONS[direct] : '今日の暦を手がかりに、無理のない一歩を選ぶ日に。';
    const phaseAdvice = moonPhase === 0
      ? '静かに願いを灯す日。'
      : moonPhase <= 3
        ? 'ゆっくりと満ちていくとき。'
        : moonPhase === 4
          ? '今ある恵みに気づく日。'
          : '少しずつ手放し、余白を取り戻すとき。';

    return {
      date,
      isoDate: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      year,
      month,
      day,
      dayOfWeek,
      lunar,
      hieto: dayHieto,
      separator,
      solarTerm: separator >= 0 ? SOLAR_TERMS[separator] : null,
      moonAge: Math.floor(age * 10) / 10,
      roundedMoonAge,
      moonName: MOON_NAMES[roundedAge] || MOON_NAMES[0],
      moonPhase: MOON_PHASES[moonPhase],
      moonPhaseIndex: moonPhase,
      moonImageNumber: Math.max(0, Math.min(29, roundedAge)),
      moonAdvice: phaseAdvice,
      rokuyo,
      rokuyoDescription: rokuyo ? ROKUYO_DESCRIPTIONS[rokuyo] : '',
      junichoku: direct,
      junichokuDescription: direct ? JUNICHOKU_DESCRIPTIONS[direct] : '',
      senjitsu,
      senjitsuDescription: senjitsu.map((item) => SENJITSU_DESCRIPTIONS[item]),
      actionSuggestions: actionSuggestionsFor({
        junichoku: direct,
        senjitsu,
        rokuyo,
        moonPhaseIndex: moonPhase
      }),
      actionContext: [direct, ...senjitsu].filter(Boolean).slice(0, 2).join('・'),
      annualEvent: event ? event[0] : null,
      annualEventDescription: event ? event[1] : null,
      advice,
      weekdayLabel: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][dayOfWeek]
    };
  }

  function calculateToday(now = new Date()) {
    return calculateForDate(dateInTokyo(now));
  }

  return {
    calculateForDate,
    calculateToday,
    moonPhaseIndex,
    lunarDate,
    actionSuggestionsFor,
    solarTermPosition
  };
}));
