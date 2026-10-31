import {startGame} from './mahjong.mjs';

export function newSeries(total = 4) {
  if (!Number.isInteger(total) || total < 1 || total > 32) throw Error('每桌可设置 1 至 32 局');
  return {total, round: 0, completed: []};
}

// Old rooms had no limit and remain replayable.
export function startRound(game, now = Date.now()) {
  const series = game.series;
  if (!series) return startGame(game, now);
  if (series.round >= series.total) throw Error('本桌已打完约定局数');
  const scores = game.phase === 'ended' ? game.p.map(p => p.score) : null;
  startGame(game, now);
  if (scores) series.completed.push(scores);
  series.round++;
  game.emote = null;
}

export function seriesView(game) {
  if (!game.series) return null;
  const {total, round, completed} = game.series;
  const history = game.phase === 'ended' ? [...completed, game.p.map(p => p.score)] : completed;
  return {total, round, history, final: game.phase === 'ended' && round === total,
    totals: game.p.map((p,i) => completed.reduce((sum,scores) => sum + scores[i], 0) + p.score)};
}

