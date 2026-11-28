export async function publicPartSources(name,request=fetch){
 const term=String(name).trim().replace(/[^\p{L}\p{N} _.-]/gu,' ').slice(0,100).trim();
 if(!term)return [];
 const url='https://api.github.com/search/repositories?'+new URLSearchParams({q:term+' Arduino in:name,description,readme',per_page:'5'});
 const response=await request(url,{credentials:'omit',signal:AbortSignal.timeout(10000),headers:{Accept:'application/vnd.github+json'}});
 if(!response.ok)throw Error([403,429].includes(response.status)?'공개 검색 요청 한도에 도달했습니다. 아래 일반 검색을 이용하세요.':'공개 자료 검색에 실패했습니다.');
 const data=await response.json();
 return (Array.isArray(data.items)?data.items:[]).filter(p=>typeof p.full_name==='string'&&/^[\w.-]+\/[\w.-]+$/.test(p.full_name)).slice(0,5).map(p=>({name:p.full_name,source:'https://github.com/'+p.full_name,spec:String(p.description||'').slice(0,400),libraryCandidate:true}));
}
// Evidence extraction only: a mention of a terminal is not a verified pinout.
export function extractReadmeEvidence(text){
 const lines=String(text).slice(0,120000).split(/\r?\n/);
 const selected=lines.filter(l=>/\b(?:VCC|GND|VIN|VDD|SDA|SCL|MISO|MOSI|SCK|TRIG|ECHO|PWM|GPIO|UART|I2C|SPI|voltage|pinout|power supply)\b|\d(?:\.\d+)?\s*(?:V|mA)\b/i.test(l)).slice(0,16).map(l=>l.trim().slice(0,200));
 const mentions=[...new Set(selected.join(' ').match(/\b(?:VCC|GND|VIN|VDD|SDA|SCL|MISO|MOSI|SCK|TRIG|ECHO|PWM|RX|TX|AO|DO|IN[1-4]|OUT[1-4])\b/gi)?.map(s=>s.toUpperCase())||[])];
 const libraries=[...new Set(lines.join('\n').match(/#include\s*[<"][A-Za-z0-9_.-]+\.h[>"]/g)||[])].slice(0,12);
 return {evidence:selected.join('\n'),mentions,libraries};
}
export async function readPublicPartSource(repo,request=fetch){
 if(typeof repo!=='string'||!/^[\w.-]+\/[\w.-]+$/.test(repo)||repo.split('/').some(s=>s==='.'||s==='..'))throw Error('올바른 공개 저장소 이름이 아닙니다.');
 const url='https://api.github.com/repos/'+repo.split('/').map(encodeURIComponent).join('/')+'/readme';
 const r=await request(url,{credentials:'omit',signal:AbortSignal.timeout(10000),headers:{Accept:'application/vnd.github+json'}});
 if(!r.ok)throw Error('README 자료를 읽지 못했습니다 ('+r.status+').');
 const data=await r.json();
 if(data.encoding!=='base64'||typeof data.content!=='string'||data.content.length>250000)throw Error('지원되지 않는 README 형식입니다.');
 const bytes=Uint8Array.from(atob(data.content.replace(/\s/g,'')),c=>c.charCodeAt(0));
 return extractReadmeEvidence(new TextDecoder().decode(bytes));
}
export function initResearch(review=()=>{}){
 const $=id=>document.getElementById(id),query=$('catalogQuery'),model=$('researchModel'),find=$('researchFind'),status=$('researchStatus'),box=$('researchResults');
 if(model)model.value='free';
 let generation=0;function reset(){generation++;box.replaceChildren();status.textContent=''}
 query.addEventListener('input',reset);
 function search(){
  reset();
  const name=query.value.trim();
  if(!name){query.focus();status.textContent='제품명을 입력하세요.';return}
  status.textContent='등록 목록에서 부품을 추가하거나 공개 제품 자료를 확인하세요. 외부 검색 결과는 자동 등록되지 않습니다.';
  for(const [label,term] of [['제품 및 데이터시트 검색',name+' datasheet pinout'],['국내 제품 검색',name+' 부품 모듈 핀맵']]){
   const link=document.createElement('a');
   link.href='https://www.google.com/search?'+new URLSearchParams({q:term});
   link.target='_blank';link.rel='noopener noreferrer';link.textContent=label;
   const row=document.createElement('p');row.append(link);box.append(row);
  }
  const button=document.createElement('button');button.type='button';button.textContent='공개 아두이노 자료 자동 검색';
  button.onclick=async()=>{
   const seq=generation;button.disabled=true;status.textContent='공개 자료 검색 중…';
   try{
    const matches=await publicPartSources(name);if(seq!==generation)return;
    status.textContent=matches.length?'검색된 자료 후보입니다. 제품과 일치하는지 확인하세요.':'공개 자료 후보가 없습니다. 일반 검색을 이용하세요.';
    for(const p of matches){
     const row=document.createElement('section'),label=document.createElement('strong'),description=document.createElement('p'),link=document.createElement('a'),add=document.createElement('button');
     label.textContent=p.name;description.textContent=p.spec||'자료 설명 없음';link.href=p.source;link.target='_blank';link.rel='noopener noreferrer';link.textContent='원문 확인';add.type='button';add.textContent='자료 후보로 가져오기';add.onclick=async()=>{add.disabled=true;const current=generation;try{
      const info=await readPublicPartSource(p.name);if(current!==generation)return;
      const spec=[p.spec,info.evidence,info.mentions.length?'단자 언급 후보 (미확인): '+info.mentions.join(', '):'',info.libraries.length?'헤더 후보 (설치 여부 미확인): '+info.libraries.join(', '):''].filter(Boolean).join('\n').slice(0,4000);
      review({name:name.slice(0,40),source:p.source,spec});
     }catch(e){if(current===generation){status.textContent=e.message;review({name:name.slice(0,40),source:p.source,spec:p.spec})}}finally{add.disabled=false}};row.append(label,description,link,' ',add);box.append(row);
    }
   }catch(e){if(seq===generation)status.textContent=e.message}finally{button.disabled=false}
  };box.append(button);
 }
 find.onclick=search;
 query.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();search()}});
}
