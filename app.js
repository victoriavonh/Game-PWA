const STORAGE_KEY="generic-game-companion-v1";

const defaultState={
  activeGameId:"skyrim",
  games:[
    {id:"skyrim",name:"Skyrim"},
    {id:"demo",name:"Demo Game"}
  ],
  quests:[
    {id:"q1",gameId:"skyrim",name:"Build Lakeview Manor",category:"Hearthfire",area:"Falkreath",notes:"",steps:[
      {id:"s1",text:"Purchase land",done:true},{id:"s2",text:"Draft the house layout",done:true},
      {id:"s3",text:"Gather building materials",done:false},{id:"s4",text:"Construct the main hall",done:false}
    ]}
  ],
  materials:[
    {id:"m1",gameId:"skyrim",name:"Iron Ingot",owned:7,needed:18,project:"Lakeview Manor"},
    {id:"m2",gameId:"skyrim",name:"Sawn Log",owned:10,needed:20,project:"Lakeview Manor"},
    {id:"m3",gameId:"skyrim",name:"Corundum Ingot",owned:4,needed:4,project:"Lakeview Manor"}
  ],
  collections:[
    {id:"c1",gameId:"skyrim",name:"Stones of Barenziah",category:"Quest Collectible",notes:"24 total",items:[
      {id:"ci1",name:"Ansilvund",done:false},{id:"ci2",name:"Black-Briar Lodge",done:false},
      {id:"ci3",name:"Dark Brotherhood Sanctuary",done:false},{id:"ci4",name:"Dead Crone Rock",done:false}
    ]}
  ],
  enemies:[
    {id:"e1",gameId:"skyrim",name:"Frost Troll",type:"Troll",location:"Cold / mountainous regions",hpMin:460,hpMax:460,
     resistances:"Frost",weaknesses:"Fire",notes:"Regenerates health quickly. Keep pressure on it."}
  ]
};

let state=loadState();
let currentModal=null;
let installPrompt=null;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const uid=prefix=>prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>Math.max(0,Math.min(999999,Number.isFinite(Number(v))?Math.floor(Number(v)):0));

function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return structuredClone(defaultState);
    const parsed=JSON.parse(raw);
    return {...structuredClone(defaultState),...parsed};
  }catch{return structuredClone(defaultState)}
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function activeGame(){return state.games.find(g=>g.id===state.activeGameId)||state.games[0]}
function gameItems(type){return state[type].filter(x=>x.gameId===state.activeGameId)}
function questDone(q){return q.steps.length>0&&q.steps.every(s=>s.done)}
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),1800)}

function renderGames(){
  const sel=$("#gameSelect");
  sel.innerHTML=state.games.map(g=>`<option value="${g.id}" ${g.id===state.activeGameId?"selected":""}>${esc(g.name)}</option>`).join("");
}
function renderDashboard(){
  const quests=gameItems("quests"), mats=gameItems("materials"), cols=gameItems("collections"), enemies=gameItems("enemies");
  const qDone=quests.filter(questDone).length;
  const missing=mats.reduce((a,m)=>a+Math.max(num(m.needed)-num(m.owned),0),0);
  const collectTotal=cols.reduce((a,c)=>a+c.items.length,0);
  const collectDone=cols.reduce((a,c)=>a+c.items.filter(i=>i.done).length,0);
  $("#statsGrid").innerHTML=[
    ["Quests",`${qDone}/${quests.length}`],["Materials missing",missing],["Collectibles",`${collectDone}/${collectTotal}`],["Bestiary entries",enemies.length]
  ].map(([l,v])=>`<div class="stat"><p class="eyebrow">${l}</p><div class="number">${v}</div></div>`).join("");

  const shopping=mats.map(m=>({...m,remaining:Math.max(num(m.needed)-num(m.owned),0)})).filter(m=>m.remaining>0).sort((a,b)=>b.remaining-a.remaining);
  $("#shoppingList").innerHTML=shopping.length?shopping.map(m=>`<div class="item"><div class="item-head"><div><h3>${esc(m.name)}</h3><div class="meta">${esc(m.project||"Unassigned")}</div></div><span class="badge">Need ${m.remaining}</span></div></div>`).join(""):`<div class="empty">You have everything currently listed.</div>`;
  const active=quests.filter(q=>!questDone(q)).slice(0,6);
  $("#dashboardQuests").innerHTML=active.length?active.map(q=>questCard(q,true)).join(""):`<div class="empty">No active quests.</div>`;
}
function questCard(q,compact=false){
  const done=q.steps.filter(s=>s.done).length, pct=q.steps.length?Math.round(done/q.steps.length*100):0;
  return `<article class="item" data-id="${q.id}">
    <div class="item-head"><div><h3>${esc(q.name)}</h3><div class="meta">${[q.category,q.area].filter(Boolean).map(esc).join(" · ")||"Uncategorized"}</div></div>
    ${compact?`<span class="badge">${done}/${q.steps.length}</span>`:`<div class="row-actions"><button class="secondary edit-quest">Edit</button><button class="secondary delete-quest">Delete</button></div>`}</div>
    <div class="progress"><span style="width:${pct}%"></span></div>
    ${compact?"":`<div class="steps">${q.steps.map(s=>`<label class="check-row"><input type="checkbox" class="quest-step" data-step="${s.id}" ${s.done?"checked":""}><span class="${s.done?"done":""}">${esc(s.text)}</span></label>`).join("")}</div>
      <form class="collection-add add-step-form"><input maxlength="160" placeholder="Add another step…"><button>Add</button></form>`}
  </article>`
}
function renderQuests(){
  const term=$("#questSearch").value.trim().toLowerCase(), status=$("#questStatusFilter").value;
  let qs=gameItems("quests").filter(q=>!term||[q.name,q.category,q.area,q.notes].join(" ").toLowerCase().includes(term));
  if(status==="active")qs=qs.filter(q=>!questDone(q));if(status==="complete")qs=qs.filter(questDone);
  $("#questList").innerHTML=qs.length?qs.map(q=>questCard(q)).join(""):`<div class="empty">No matching quests.</div>`;
}
function renderMaterials(){
  const mats=gameItems("materials");
  $("#materialList").innerHTML=mats.length?mats.map(m=>{
    const rem=Math.max(num(m.needed)-num(m.owned),0);
    return `<article class="item material-grid" data-id="${m.id}">
      <div class="material-name"><h3>${esc(m.name)}</h3><div class="meta">${esc(m.project||"Unassigned")}</div></div>
      <label>Owned<input class="mat-owned" type="number" min="0" value="${num(m.owned)}"></label>
      <label>Needed<input class="mat-needed" type="number" min="0" value="${num(m.needed)}"></label>
      <div><label>Remaining</label><div class="qty-result">${rem===0?"✓":rem}</div></div>
      <div class="row-actions"><button class="secondary edit-material">Edit</button><button class="secondary delete-material">Delete</button></div>
    </article>`}).join(""):`<div class="empty">No materials yet.</div>`;
}
function collectionCard(c){
  const done=c.items.filter(i=>i.done).length,pct=c.items.length?Math.round(done/c.items.length*100):0;
  return `<article class="item" data-id="${c.id}">
    <div class="item-head"><div><h3>${esc(c.name)}</h3><div class="meta">${esc(c.category||"Collection")} · ${done}/${c.items.length}${c.notes?` · ${esc(c.notes)}`:""}</div></div>
    <div class="row-actions"><button class="secondary edit-collection">Edit</button><button class="secondary delete-collection">Delete</button></div></div>
    <div class="progress"><span style="width:${pct}%"></span></div>
    <div class="collection-items">${c.items.map(i=>`<label class="check-row"><input class="collection-check" type="checkbox" data-item="${i.id}" ${i.done?"checked":""}><span class="${i.done?"done":""}">${esc(i.name)}</span></label>`).join("")}</div>
    <form class="collection-add add-collection-item"><input maxlength="160" placeholder="Add collectible / location…"><button>Add</button></form>
  </article>`
}
function renderCollections(){
  const cs=gameItems("collections");
  $("#collectibleList").innerHTML=cs.length?cs.map(collectionCard).join(""):`<div class="empty">No collections yet.</div>`;
}
function renderEnemies(){
  const term=$("#enemySearch").value.trim().toLowerCase();
  const es=gameItems("enemies").filter(e=>!term||[e.name,e.type,e.location,e.resistances,e.weaknesses,e.notes].join(" ").toLowerCase().includes(term));
  $("#enemyList").innerHTML=es.length?es.map(e=>`<article class="item" data-id="${e.id}">
    <div class="item-head"><div><h3>${esc(e.name)}</h3><div class="meta">${esc(e.type||"Unknown type")}${e.location?` · ${esc(e.location)}`:""}</div></div>
    <div class="row-actions"><button class="secondary edit-enemy">Edit</button><button class="secondary delete-enemy">Delete</button></div></div>
    <div class="enemy-stats"><div class="mini-stat"><span>HP min</span>${num(e.hpMin)||"—"}</div><div class="mini-stat"><span>HP max</span>${num(e.hpMax)||"—"}</div><div class="mini-stat"><span>Range</span>${num(e.hpMin)||0}–${num(e.hpMax)||0}</div></div>
    ${e.resistances?`<p><strong>Resists:</strong> ${esc(e.resistances)}</p>`:""}
    ${e.weaknesses?`<p><strong>Weak to:</strong> ${esc(e.weaknesses)}</p>`:""}
    ${e.notes?`<p class="notes">${esc(e.notes)}</p>`:""}
  </article>`).join(""):`<div class="empty">No matching bestiary entries.</div>`;
}
function renderAll(){renderGames();renderDashboard();renderQuests();renderMaterials();renderCollections();renderEnemies();saveState()}

function modalFields(type,item={}){
  if(type==="quest")return `<div class="form-grid">
    <div class="form-field"><label>Name<input name="name" required maxlength="100" value="${esc(item.name||"")}"></label></div>
    <div class="form-row"><div class="form-field"><label>Category<input name="category" maxlength="60" value="${esc(item.category||"")}"></label></div><div class="form-field"><label>Area / region<input name="area" maxlength="60" value="${esc(item.area||"")}"></label></div></div>
    <div class="form-field"><label>Steps — one per line<textarea name="steps">${esc((item.steps||[]).map(s=>s.text).join("\n"))}</textarea></label></div>
    <div class="form-field"><label>Notes<textarea name="notes">${esc(item.notes||"")}</textarea></label></div></div>`;
  if(type==="material")return `<div class="form-grid">
    <div class="form-field"><label>Material / ingredient<input name="name" required maxlength="80" value="${esc(item.name||"")}"></label></div>
    <div class="form-row"><div class="form-field"><label>Owned<input name="owned" type="number" min="0" value="${num(item.owned||0)}"></label></div><div class="form-field"><label>Needed<input name="needed" type="number" min="0" value="${num(item.needed||1)}"></label></div></div>
    <div class="form-field"><label>Quest / project<input name="project" maxlength="100" value="${esc(item.project||"")}"></label></div></div>`;
  if(type==="collectible")return `<div class="form-grid">
    <div class="form-field"><label>Collection name<input name="name" required maxlength="100" value="${esc(item.name||"")}"></label></div>
    <div class="form-row"><div class="form-field"><label>Category<input name="category" maxlength="60" value="${esc(item.category||"")}"></label></div><div class="form-field"><label>Notes<input name="notes" maxlength="120" value="${esc(item.notes||"")}"></label></div></div>
    <div class="form-field"><label>Items / locations — one per line<textarea name="items">${esc((item.items||[]).map(i=>i.name).join("\n"))}</textarea></label></div></div>`;
  return `<div class="form-grid">
    <div class="form-field"><label>Enemy name<input name="name" required maxlength="100" value="${esc(item.name||"")}"></label></div>
    <div class="form-row"><div class="form-field"><label>Type<input name="type" maxlength="60" value="${esc(item.type||"")}"></label></div><div class="form-field"><label>Location<input name="location" maxlength="100" value="${esc(item.location||"")}"></label></div></div>
    <div class="form-row"><div class="form-field"><label>HP minimum<input name="hpMin" type="number" min="0" value="${num(item.hpMin||0)}"></label></div><div class="form-field"><label>HP maximum<input name="hpMax" type="number" min="0" value="${num(item.hpMax||0)}"></label></div></div>
    <div class="form-row"><div class="form-field"><label>Resistances<input name="resistances" maxlength="160" value="${esc(item.resistances||"")}"></label></div><div class="form-field"><label>Weaknesses<input name="weaknesses" maxlength="160" value="${esc(item.weaknesses||"")}"></label></div></div>
    <div class="form-field"><label>Notes<textarea name="notes">${esc(item.notes||"")}</textarea></label></div></div>`;
}
function openModal(type,item=null){
  currentModal={type,id:item?.id||null};
  const titles={quest:["Quest journal",item?"Edit quest":"Add quest"],material:["Ingredient calculator",item?"Edit material":"Add material"],collectible:["Grouped collectibles",item?"Edit collection":"Add collection"],enemy:["Bestiary",item?"Edit enemy":"Add enemy"]};
  $("#dialogEyebrow").textContent=titles[type][0];$("#dialogTitle").textContent=titles[type][1];
  $("#dialogFields").innerHTML=modalFields(type,item||{});
  $("#entryDialog").showModal();
  setTimeout(()=>$("#dialogFields input")?.focus(),30);
}
function closeModal(){ $("#entryDialog").close(); currentModal=null }

$("#entryForm").addEventListener("submit",e=>{
  e.preventDefault();if(!currentModal)return;
  const fd=Object.fromEntries(new FormData(e.currentTarget).entries()), {type,id}=currentModal;
  const map={quest:"quests",material:"materials",collectible:"collections",enemy:"enemies"}, arr=state[map[type]];
  const existing=id?arr.find(x=>x.id===id):null;
  if(type==="quest"){
    const oldByText=new Map((existing?.steps||[]).map(s=>[s.text,s]));
    const steps=String(fd.steps||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,100).map(text=>oldByText.get(text)||{id:uid("s"),text,done:false});
    const obj={id:id||uid("q"),gameId:state.activeGameId,name:fd.name.trim(),category:fd.category.trim(),area:fd.area.trim(),notes:fd.notes.trim(),steps};
    existing?Object.assign(existing,obj):arr.push(obj);
  }else if(type==="material"){
    const obj={id:id||uid("m"),gameId:state.activeGameId,name:fd.name.trim(),owned:num(fd.owned),needed:num(fd.needed),project:fd.project.trim()};existing?Object.assign(existing,obj):arr.push(obj);
  }else if(type==="collectible"){
    const oldByName=new Map((existing?.items||[]).map(i=>[i.name,i]));
    const items=String(fd.items||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,300).map(name=>oldByName.get(name)||{id:uid("ci"),name,done:false});
    const obj={id:id||uid("c"),gameId:state.activeGameId,name:fd.name.trim(),category:fd.category.trim(),notes:fd.notes.trim(),items};existing?Object.assign(existing,obj):arr.push(obj);
  }else{
    const obj={id:id||uid("e"),gameId:state.activeGameId,name:fd.name.trim(),type:fd.type.trim(),location:fd.location.trim(),hpMin:num(fd.hpMin),hpMax:num(fd.hpMax),resistances:fd.resistances.trim(),weaknesses:fd.weaknesses.trim(),notes:fd.notes.trim()};existing?Object.assign(existing,obj):arr.push(obj);
  }
  closeModal();renderAll();toast("Saved");
});

$$("[data-open-modal]").forEach(b=>b.addEventListener("click",()=>openModal(b.dataset.openModal)));
$("#closeDialogBtn").addEventListener("click",closeModal);$("#cancelDialogBtn").addEventListener("click",closeModal);

$(".tabs").addEventListener("click",e=>{
  const b=e.target.closest(".tab");if(!b)return;
  $$(".tab").forEach(x=>x.classList.toggle("active",x===b));$$(".panel").forEach(p=>p.classList.toggle("active",p.id===b.dataset.tab));
});
$("#gameSelect").addEventListener("change",e=>{state.activeGameId=e.target.value;renderAll()});
$("#addGameBtn").addEventListener("click",()=>{
  const name=prompt("Game name");if(!name?.trim())return;const id=uid("g");state.games.push({id,name:name.trim().slice(0,80)});state.activeGameId=id;renderAll()
});
$("#editGameBtn").addEventListener("click",()=>{
  const g=activeGame();if(!g)return;const name=prompt("Rename game",g.name);if(!name?.trim())return;g.name=name.trim().slice(0,80);renderAll()
});
$("#questSearch").addEventListener("input",renderQuests);$("#questStatusFilter").addEventListener("change",renderQuests);$("#enemySearch").addEventListener("input",renderEnemies);

$("#questList").addEventListener("change",e=>{
  if(!e.target.classList.contains("quest-step"))return;const card=e.target.closest("[data-id]"),q=state.quests.find(x=>x.id===card.dataset.id),s=q?.steps.find(x=>x.id===e.target.dataset.step);if(s){s.done=e.target.checked;renderAll()}
});
$("#questList").addEventListener("submit",e=>{
  if(!e.target.classList.contains("add-step-form"))return;e.preventDefault();const input=e.target.querySelector("input"),text=input.value.trim();if(!text)return;const q=state.quests.find(x=>x.id===e.target.closest("[data-id]").dataset.id);q.steps.push({id:uid("s"),text,done:false});renderAll()
});
$("#questList").addEventListener("click",e=>{
  const card=e.target.closest("[data-id]");if(!card)return;const q=state.quests.find(x=>x.id===card.dataset.id);
  if(e.target.closest(".edit-quest"))openModal("quest",q);
  if(e.target.closest(".delete-quest")&&confirm(`Delete "${q.name}"?`)){state.quests=state.quests.filter(x=>x.id!==q.id);renderAll()}
});
$("#materialList").addEventListener("change",e=>{
  const card=e.target.closest("[data-id]");if(!card)return;const m=state.materials.find(x=>x.id===card.dataset.id);if(e.target.classList.contains("mat-owned"))m.owned=num(e.target.value);if(e.target.classList.contains("mat-needed"))m.needed=num(e.target.value);renderAll()
});
$("#materialList").addEventListener("click",e=>{
  const card=e.target.closest("[data-id]");if(!card)return;const m=state.materials.find(x=>x.id===card.dataset.id);
  if(e.target.closest(".edit-material"))openModal("material",m);
  if(e.target.closest(".delete-material")&&confirm(`Delete "${m.name}"?`)){state.materials=state.materials.filter(x=>x.id!==m.id);renderAll()}
});
$("#collectibleList").addEventListener("change",e=>{
  if(!e.target.classList.contains("collection-check"))return;const c=state.collections.find(x=>x.id===e.target.closest("[data-id]").dataset.id),i=c?.items.find(x=>x.id===e.target.dataset.item);if(i){i.done=e.target.checked;renderAll()}
});
$("#collectibleList").addEventListener("submit",e=>{
  if(!e.target.classList.contains("add-collection-item"))return;e.preventDefault();const input=e.target.querySelector("input"),name=input.value.trim();if(!name)return;const c=state.collections.find(x=>x.id===e.target.closest("[data-id]").dataset.id);c.items.push({id:uid("ci"),name,done:false});renderAll()
});
$("#collectibleList").addEventListener("click",e=>{
  const card=e.target.closest("[data-id]");if(!card)return;const c=state.collections.find(x=>x.id===card.dataset.id);
  if(e.target.closest(".edit-collection"))openModal("collectible",c);
  if(e.target.closest(".delete-collection")&&confirm(`Delete "${c.name}"?`)){state.collections=state.collections.filter(x=>x.id!==c.id);renderAll()}
});
$("#enemyList").addEventListener("click",e=>{
  const card=e.target.closest("[data-id]");if(!card)return;const en=state.enemies.find(x=>x.id===card.dataset.id);
  if(e.target.closest(".edit-enemy"))openModal("enemy",en);
  if(e.target.closest(".delete-enemy")&&confirm(`Delete "${en.name}"?`)){state.enemies=state.enemies.filter(x=>x.id!==en.id);renderAll()}
});

$("#menuBtn").addEventListener("click",()=>{
  const m=$("#dataMenu"),open=m.hidden;m.hidden=!open;$("#menuBtn").setAttribute("aria-expanded",String(open))
});
$("#exportBtn").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`game-companion-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);toast("Backup exported")
});
$("#importInput").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const data=JSON.parse(await file.text());if(!data.games||!data.quests||!data.materials||!data.collections||!data.enemies)throw new Error();state=data;renderAll();toast("Backup imported")}catch{alert("That file does not look like a valid Game Companion backup.")}finally{e.target.value=""}
});
$("#resetBtn").addEventListener("click",()=>{if(confirm("Reset all app data to the demo defaults?")){state=structuredClone(defaultState);renderAll();toast("App reset")}});

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("#installBtn").hidden=false});
$("#installBtn").addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("#installBtn").hidden=true});

if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
renderAll();
