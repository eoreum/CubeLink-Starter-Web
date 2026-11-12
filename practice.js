import {boards,examples} from './engine.js?v=1.5.0';

// Student drafts never share storage with the earlier answer-filled demo.
export const PRACTICE_KEY='cubelink-starter-practice-v1';
export function blankProject(mission,board='uno') {
  if(!Object.hasOwn(examples,mission)||!Object.hasOwn(boards,board))throw Error('지원하지 않는 미션 또는 보드입니다.');
  return {board,setup:[],loop:[],mission};
}
export function answerProject(mission,board='uno') {
  if(!Object.hasOwn(examples,mission)||!Object.hasOwn(boards,board))throw Error('지원하지 않는 미션 또는 보드입니다.');
  return {...structuredClone(examples[mission]),board,mission};
}
