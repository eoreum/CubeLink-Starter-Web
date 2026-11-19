import {boards,errors,examples,migrateLegacyProject,walkProject} from './engine.js?v=1.9.5-servo';

export const STORAGE_KEY = 'cubelink-starter-project-v1';
export function parseProject(text) {
  if (typeof text !== 'string' || text.length > 200000) throw Error('프로젝트 파일은 200KB 이하만 열 수 있습니다.');
  const data = JSON.parse(text), source = data?.project;
  if (![1,2].includes(data.version) || !source || !Object.hasOwn(boards,source.board) || !Array.isArray(source.setup) || !Array.isArray(source.loop)) throw Error('지원하지 않는 프로젝트 형식입니다.');
  const migrated=data.version===1?migrateLegacyProject(source):source;
  const clean=structuredClone({board:migrated.board,setup:migrated.setup,loop:migrated.loop});
  const nodes=walkProject(clean);if(nodes.length>500)throw Error('프로젝트의 블록이 너무 많습니다.');
  for(const node of nodes)for(const value of Object.values(node))if(typeof value==='string'&&value.length>2000)throw Error('블록의 텍스트가 너무 깁니다.');
  const issues=errors(clean); if (issues.length) throw Error(issues.join(' · '));
  if(typeof migrated.mission==='string'&&Object.hasOwn(examples,migrated.mission))clean.mission=migrated.mission;
  return clean;
}
export function serializeProject(project) { return JSON.stringify({version:2,project},null,2); }
