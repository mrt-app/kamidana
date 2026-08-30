const assert = require('node:assert/strict');
const test = require('node:test');

const { actionSuggestionsFor, calculateForDate, calculateToday } = require('./koyomi.js');

function day(year, month, date) {
  return new Date(Date.UTC(year, month - 1, date, 12, 0, 0, 0));
}

test('uses the Japan date at the JST day boundary', () => {
  const beforeMidnightJst = calculateToday(new Date('2026-08-30T14:59:59Z'));
  const afterMidnightJst = calculateToday(new Date('2026-08-30T15:30:00Z'));

  assert.equal(beforeMidnightJst.isoDate, '2026-08-30');
  assert.equal(afterMidnightJst.isoDate, '2026-08-31');
  assert.equal(afterMidnightJst.weekdayLabel, '月曜日');
});

test('matches the Android calendar values for the current release date', () => {
  const result = calculateForDate(day(2026, 8, 30));

  assert.deepEqual(result.lunar, { year: 2026, month: 7, day: 18, leap: false });
  assert.equal(result.moonAge, 17.4);
  assert.equal(result.moonName, '居待月');
  assert.equal(result.moonPhase, '既望');
  assert.equal(result.rokuyo, '赤口');
  assert.equal(result.junichoku, '定');
  assert.deepEqual(result.senjitsu, ['一粒万倍日', '天恩日']);
  assert.equal(result.hieto, '丙子');
  assert.equal(result.solarTerm, '処暑');
});

test('keeps the Android moon naming around new and full moon', () => {
  assert.equal(calculateForDate(day(2026, 8, 13)).moonName, '新月');
  assert.equal(calculateForDate(day(2026, 8, 13)).moonPhase, '新月');
  assert.equal(calculateForDate(day(2026, 8, 28)).moonPhase, '満月');
});

test('matches the Android solar-term and twelve-directors boundary checks', () => {
  const solarTerms = [
    [1, 5, '小寒'], [1, 20, '大寒'], [2, 4, '立春'], [2, 19, '雨水'],
    [3, 5, '啓蟄'], [3, 21, '春分'], [4, 5, '清明'], [4, 20, '穀雨'],
    [5, 5, '立夏'], [5, 21, '小満'], [6, 6, '芒種'], [6, 21, '夏至'],
    [7, 7, '小暑'], [7, 23, '大暑'], [8, 7, '立秋'], [8, 23, '処暑'],
    [9, 8, '白露'], [9, 23, '秋分'], [10, 8, '寒露'], [10, 23, '霜降'],
    [11, 7, '立冬'], [11, 22, '小雪'], [12, 7, '大雪'], [12, 22, '冬至']
  ];
  solarTerms.forEach(([month, date, name]) => {
    assert.equal(calculateForDate(day(2022, month, date)).solarTerm, name);
  });

  const directDays = [
    [11, 1, '危'], [11, 2, '成'], [11, 3, '納'], [11, 4, '開'], [11, 5, '閉'],
    [11, 6, '建'], [11, 7, '建'], [11, 8, '除'], [11, 9, '満'], [11, 10, '平'],
    [11, 11, '定'], [11, 12, '執'], [11, 13, '破'], [11, 14, '危'], [11, 15, '成'],
    [11, 16, '納'], [11, 17, '開'], [11, 18, '閉'], [11, 19, '建'], [11, 20, '除'],
    [11, 21, '満'], [11, 22, '平'], [11, 23, '定'], [11, 24, '執'], [11, 25, '破'],
    [11, 26, '危'], [11, 27, '成'], [11, 28, '納'], [11, 29, '開'], [11, 30, '閉']
  ];
  directDays.forEach(([month, date, name]) => {
    assert.equal(calculateForDate(day(2024, month, date)).junichoku, name);
  });
});

test('derives small next steps from each day\'s calendar values', () => {
  const releaseDate = calculateForDate(day(2026, 8, 30));
  assert.deepEqual(releaseDate.actionSuggestions, [
    '願いをひとつ決める',
    'これから続けたいことを定める',
    '始めたいことを、小さく始める'
  ]);
  assert.equal(releaseDate.actionContext, '定・一粒万倍日');

  const nextDate = calculateForDate(day(2026, 8, 31));
  assert.notDeepEqual(nextDate.actionSuggestions, releaseDate.actionSuggestions);
  assert.equal(nextDate.actionSuggestions[0], '決めたことをひとつ進める');
});

test('resolves restrictive and forward calendar signals into one direction', () => {
  const mixedSuggestions = actionSuggestionsFor({
    junichoku: '閉',
    senjitsu: ['一粒万倍日'],
    rokuyo: '大安',
    moonPhaseIndex: 2
  });

  assert.deepEqual(mixedSuggestions, [
    'ひとつ区切りをつけてから、次に始めることを決める',
    '身の回りを整えて、育てたい願いをひとつ言葉にする',
    '今日の勢いは、準備に使う'
  ]);
  assert.equal(mixedSuggestions.includes('始めたいことを、小さく始める'), false);
});
