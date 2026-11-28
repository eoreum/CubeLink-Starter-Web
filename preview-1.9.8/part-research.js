export async function publicPartSources(name,request=fetch){
 const term=String(name).trim().replace(/[^\p{L}\p{N} _.-]/gu,' ').slice(0,100).trim();
 if(!term)return [];
 const url='https://api.github.com/search/repositories?'+new URLSearchParams({q:term+' Arduino in:name,description,readme',per_page:'5'});
 const response=await request(url,{credentials:'omit',signal:AbortSignal.timeout(10000),headers:{Accept:'application/vnd.github+json'}});
 if(!response.ok)throw Error([403,429].includes(response.status)?'공개 검색 요청 한도에 도달했습니다. 아래 일반 검색을 이용하세요.':'공개 자료 검색에 실패했습니다.');
 const data=await response.json();
 return (Array.isArray(data.items)?data.items:[]).filter(p=>typeof p.full_name==='string'&&/^[\w.-]+\/[\w.-]+$/.test(p.full_name)).slice(0,5).map(p=>({name:p.full_name,source:'https://github.com/'+p.full_name,spec:String(p.description||'').slice(0,400),libraryCandidate:true}));
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
     label.textContent=p.name;description.textContent=p.spec||'자료 설명 없음';link.href=p.source;link.target='_blank';link.rel='noopener noreferrer';link.textContent='원문 확인';add.type='button';add.textContent='자료 후보로 가져오기';add.onclick=()=>review({name:name.slice(0,40),source:p.source,spec:p.spec});row.append(label,description,link,' ',add);box.append(row);
    }
   }catch(e){if(seq===generation)status.textContent=e.message}finally{button.disabled=false}
  };box.append(button);
 }
 find.onclick=search;
 query.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();search()}});
}
