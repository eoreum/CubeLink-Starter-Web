export function initResearch(){
 const $=id=>document.getElementById(id),query=$('catalogQuery'),model=$('researchModel'),find=$('researchFind'),status=$('researchStatus'),box=$('researchResults');
 if(model)model.value='free';
 function reset(){box.replaceChildren();status.textContent=''}
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
 }
 find.onclick=search;
 query.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();search()}});
}
