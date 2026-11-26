export function terminalNames(value) {
 if (!Array.isArray(value) || value.length > 48) throw Error('단자 목록을 확인하세요.');
 return [...new Set(value.map(v => {
   if (typeof v !== 'string' || !v.trim() || v.length > 48) throw Error('단자 이름을 확인하세요.');
   return v.trim();
 }))];
}
export function drawRegistered(host, parts) {
 const ns='http://www.w3.org/2000/svg';
 function shape(tag,attrs,text) {
   const node=document.createElementNS(ns,tag);
   for(const [k,v] of Object.entries(attrs)) node.setAttribute(k,v);
   if(text) node.textContent=text;
   return node;
 }
 host.replaceChildren();
 for(const part of parts){
   const pins=Object.entries(part.fields).map(([role,pin])=>role.toUpperCase()+' → '+(/^\d+$/.test(pin)?'D':'')+pin);
   const terminals=[...pins,...(part.terminals||[])];
   const height=58+Math.max(1,terminals.length)*24;
   const svg=shape('svg',{viewBox:'0 0 340 '+height,role:'img','aria-label':part.name+' 등록 부품 단자도',width:'290'});
   svg.append(shape('rect',{x:10,y:4,width:320,height:height-8,rx:10,fill:'#ecf6f5',stroke:'#157a78'}));
   svg.append(shape('text',{x:25,y:30,fill:'#135456','font-size':17},part.name));
   (terminals.length?terminals:['단자 정보 확인 필요']).forEach((label,i)=>{
     const y=58+i*24;
     svg.append(shape('circle',{cx:25,cy:y-5,r:4,fill:'#187b78'}),shape('text',{x:40,y,'font-size':14},label));
   });
   host.append(svg);
 }
}
