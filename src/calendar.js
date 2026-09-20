'use strict';
const DB=JSON.parse(document.getElementById('database').textContent);

const MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const SHORT=['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>s.toLocaleLowerCase('ru').replace(/ё/g,'е');
const REGION_COUNTRIES={
 'Россия':[],
 'Азия':['Абхазия','Азербайджан','Армения','Вьетнам','Израиль','Индия','Индонезия','Иран','Китай','Таиланд','Турция','Узбекистан','Шри-Ланка'],
 'Европа':['Сербия'],
 'Африка':['Гана','Египет','Мадагаскар','Марокко','ЮАР'],
 'Южная Америка':['Аргентина','Бразилия','Колумбия','Перу','Чили','Эквадор'],
 'Северная Америка':['Коста-Рика','Мексика']
};
function regionOf(origin){if(origin==='Россия'||origin.startsWith('Россия ·'))return 'Россия';for(const [region,countries] of Object.entries(REGION_COUNTRIES))if(countries.includes(origin))return region;throw Error('Неизвестное происхождение: '+origin)}
function matchesOrigin(origin,selected){if(!selected)return true;if(selected.startsWith('region:'))return regionOf(origin)===selected.slice(7);return origin===selected.slice(8)}
function originOptions(){return '<option value="">Все происхождения</option>'+Object.entries(REGION_COUNTRIES).map(([region,countries])=>{
 const origins=region==='Россия'?[...new Set(DB.rows.filter(r=>regionOf(r.origin)==='Россия').map(r=>r.origin))].sort((a,b)=>a.localeCompare(b,'ru')):countries.filter(c=>DB.rows.some(r=>r.origin===c));
 return '<optgroup label="'+region+'"><option value="region:'+region+'">'+region+' — все</option>'+origins.map(c=>'<option value="country:'+esc(c)+'">'+esc(region==='Россия'?(c==='Россия'?'Россия — регион не уточнён':c.replace('Россия ·','Россия —')):c)+'</option>').join('')+'</optgroup>';
 }).join('')}

function readStore(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function saveStore(key,val){try{localStorage.setItem(key,JSON.stringify(val))}catch{}}
let favs=new Set(readStore('moscow-season-favorites-v2',[])),yearView=false;
let month=Number(new Intl.DateTimeFormat('en',{timeZone:'Europe/Moscow',month:'numeric'}).format(new Date()))-1;
function pill(s){return '<span class="pill '+s+'">'+DB.statuses[s][0]+' '+DB.statuses[s][1]+'</span>'}
function symbol(s){return '<span class="symbol '+s+'">'+DB.statuses[s][0]+'</span>'}
$('origin').innerHTML=originOptions();
$('month').innerHTML=MONTHS.map((x,i)=>'<option value="'+i+'">'+x+'</option>').join('');$('month').value=month;
for(const [id,key] of [['category','category']])$(id).innerHTML+=[...new Set(DB.rows.map(r=>r[key]))].sort((a,b)=>a.localeCompare(b,'ru')).map(x=>'<option>'+esc(x)+'</option>').join('');
$('status').innerHTML+=Object.entries(DB.statuses).map(([k,v])=>'<option value="'+k+'">'+v[0]+' '+v[1]+'</option>').join('');
$('legend-items').innerHTML=Object.entries(DB.statuses).map(([k,v])=>'<span title="'+esc(v[2])+'">'+symbol(k)+esc(v[1])+'</span>').join('');
const known=DB.rows.filter(r=>r.months.some(s=>s!=='u')).length;
$('coverage').textContent='В базе '+DB.rows.length+' позиций. У '+known+' есть хотя бы частичный сезонный ориентир. Если данных недостаточно, показан знак вопроса.';
$('hero-count').textContent=DB.rows.length;
$('methods').innerHTML=DB.method.map(x=>'<li>'+esc(x)+'</li>').join('');
function sourceList(ids){return '<ul class="source-list">'+ids.map(id=>{let s=DB.sources[id];return '<li><span class="source-id">'+esc(id)+'</span><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a><p>Дата: '+esc(s.date)+'. Проверено: '+s.checked+'.</p><p>'+esc(s.scope)+'</p><p><b>Пределы:</b> '+esc(s.limit)+'</p></li>'}).join('')+'</ul>'}
$('source-list').innerHTML=sourceList(Object.keys(DB.sources));
$('source-count').textContent=Object.keys(DB.sources).length;
function update(){month=Number($('month').value);const q=norm($('search').value.trim());let list=DB.rows.filter(r=>(!q||norm(r.name+' '+r.origin).includes(q))&&matchesOrigin(r.origin,$('origin').value)&&(!$('category').value||r.category===$('category').value)&&(!$('status').value||r.months[month]===$('status').value)&&(!$('favorites').checked||favs.has(r.id))&&(!$('known-only').checked||r.months[month]!=='u'));
const rank={p:0,g:1,b:4,h:2,t:3,a:1,n:5,u:6};
list.sort((a,b)=>($('sort').value==='season'?rank[a.months[month]]-rank[b.months[month]]:0)||a.name.localeCompare(b.name,'ru')||a.origin.localeCompare(b.origin,'ru'));
const months=yearView?Array.from({length:12},(_,i)=>i):[(month+11)%12,month,(month+1)%12];
$('table-head').innerHTML='<tr><th scope="col">Продукт</th><th scope="col">Происхождение</th><th scope="col">'+MONTHS[month]+': ориентир</th>'+months.map(m=>'<th scope="col" class="month '+(m===month?'selected':'')+'">'+SHORT[m]+'</th>').join('')+'<th scope="col"><span title="Избранное">♡</span></th></tr>';
$('table-body').innerHTML=list.map(r=>'<tr><td class="product"><button class="name" data-detail="'+r.id+'">'+esc(r.name)+'</button><small class="row-category">'+esc(r.category)+'</small><small class="mobile-origin">'+esc(r.origin)+'</small></td><td class="origin">'+esc(r.origin)+'</td><td class="decision"><button class="cellbtn" data-detail="'+r.id+'" data-month="'+month+'" aria-label="'+esc(r.name+': '+DB.statuses[r.months[month]][1])+', объяснение">'+pill(r.months[month])+'</button></td>'+months.map(m=>'<td class="month '+(m===month?'selected':'')+'"><button class="cellbtn" data-detail="'+r.id+'" data-month="'+m+'" title="'+MONTHS[m]+': '+DB.statuses[r.months[m]][1]+'" aria-label="'+esc(r.name)+', '+MONTHS[m]+': '+DB.statuses[r.months[m]][1]+'">'+symbol(r.months[m])+'</button></td>').join('')+'<td><button class="fav" data-fav="'+r.id+'" aria-label="'+(favs.has(r.id)?'Убрать из избранного: ':'Добавить в избранное: ')+esc(r.name+', '+r.origin)+'" aria-pressed="'+favs.has(r.id)+'">'+(favs.has(r.id)?'♥':'♡')+'</button></td></tr>').join('')||'<tr><td class="empty" colspan="'+(4+months.length)+'">Ничего не найдено. Измените фильтры или сбросьте их.</td></tr>';
$('month-title').textContent=MONTHS[month]+' · Москва';
const good=list.filter(r=>['p','g','a'].includes(r.months[month])).length,unknown=list.filter(r=>r.months[month]==='u').length;
$('result-count').textContent='Позиций: '+list.length+' · '+good+' в сезоне / круглый год · '+unknown+' без данных на месяц';
$('focus-view').setAttribute('aria-pressed',!yearView);$('year-view').setAttribute('aria-pressed',yearView);
}
function details(id,m=month){const r=DB.rows.find(x=>x.id===id),s=r.months[m];$('dialog-content').innerHTML='<div class="dialog-head"><div><p class="fine">'+esc(r.category)+'</p><h2 id="dialog-title">'+esc(r.name)+'</h2><p>'+esc(r.origin)+'</p></div><button class="close" id="close-dialog" aria-label="Закрыть подробности">×</button></div><div class="detail-note">'+pill(s)+' <strong>· '+MONTHS[m]+'</strong><p>'+esc(DB.statuses[s][2])+'</p></div><p>'+esc(r.note)+'</p><div class="year-mini">'+r.months.map((s,i)=>'<div>'+SHORT[i]+symbol(s)+'</div>').join('')+'</div><p><b>Надёжность:</b> '+esc(r.confidence)+'.</p><p><b>Поставки:</b> '+esc(r.supply)+'</p><p class="fine">'+esc(r.basis)+'</p><h3>Основания для этой строки</h3>'+(r.sources.length?sourceList(r.sources):'<p class="notice">Надёжного помесячного подтверждения пока нет. </p>');
$('close-dialog').onclick=()=>$('detail-dialog').close();$('detail-dialog').showModal();}
$('table-body').addEventListener('click',e=>{const d=e.target.closest('[data-detail]'),f=e.target.closest('[data-fav]');if(d)details(d.dataset.detail,d.dataset.month===undefined?month:Number(d.dataset.month));if(f){favs.has(f.dataset.fav)?favs.delete(f.dataset.fav):favs.add(f.dataset.fav);saveStore('moscow-season-favorites-v2',[...favs]);update();const b=document.querySelector('[data-fav="'+f.dataset.fav+'"]');if(b)b.focus();}});
for(const id of ['month','origin','category','status','favorites','known-only','sort'])$(id).addEventListener('change',update);$('search').addEventListener('input',update);
$('focus-view').onclick=()=>{yearView=false;update()};$('year-view').onclick=()=>{yearView=true;update()};
$('reset').onclick=()=>{for(const id of ['search','origin','category','status'])$(id).value='';$('favorites').checked=false;$('known-only').checked=false;$('sort').value='season';update()};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-selected',x===b));document.querySelectorAll('[data-panel]').forEach(x=>x.hidden=x.dataset.panel!==b.dataset.tab)});
const dark=readStore('moscow-season-dark',false);document.body.classList.toggle('dark',dark);$('theme').setAttribute('aria-pressed',dark);
$('theme').onclick=()=>{const d=document.body.classList.toggle('dark');saveStore('moscow-season-dark',d);$('theme').setAttribute('aria-pressed',d)};
$('detail-dialog').addEventListener('click',e=>{if(e.target===$('detail-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
update();
