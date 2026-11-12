import {boards,definitions,errors} from './engine.js';

export const STORAGE_KEY = 'cubelink-starter-project-v1';
export function parseProject(text) {
  if (typeof text !== 'string' || text.length > 200000) throw Error('프로젝트 파일은 200KB 이하만 열 수 있습니다.');
  const data = JSON.parse(text), p = data?.project;
  if (data.version !== 1 || !p || !Object.hasOwn(boards,p.board) || !Array.isArray(p.setup) || !Array.isArray(p.loop) || p.setup.length+p.loop.length>300) throw Error('지원하지 않는 프로젝트 형식입니다.');
  const clean = {board:p.board,setup:[],loop:[]};
  for (const section of ['setup','loop']) for (const b of p[section]) {
    if (!b || typeof b !== 'object' || !Object.hasOwn(definitions,b.type)) throw Error('알 수 없는 블록이 있습니다.');
    const d=definitions[b.type], next={type:b.type};
    for (const field of Object.keys(d).filter(k=>!['label','category'].includes(k))) {
      if (!Object.hasOwn(b,field) || typeof b[field] !== typeof d[field]) throw Error('블록 값의 형식이 올바르지 않습니다.');
      if (typeof b[field]==='string' && b[field].length>2000) throw Error('블록의 텍스트가 너무 깁니다.');
      next[field]=b[field];
    }
    clean[section].push(next);
  }
  const issues=errors(clean); if (issues.length) throw Error(issues.join(' · '));
  return clean;
}
export function serializeProject(project) { return JSON.stringify({version:1,project},null,2); }
