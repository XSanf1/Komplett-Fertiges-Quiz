const socket = io();
const $ = id => document.getElementById(id);
let state = null, myId = null, isHost = false, myCode = "";
const POINTS = [100,200,300,400,500];
const starterCategories = [
 {name:"Gaming",questions:[
  {points:100,question:"Welche Firma entwickelt Minecraft?",answer:"Mojang"},
  {points:200,question:"Wie heißt die Dimension mit Enderdrachen?",answer:"Das Ende"},
  {points:300,question:"Welches Material braucht man für einen Netherite-Barren zusätzlich zu antiken Trümmern?",answer:"Goldbarren"},
  {points:400,question:"Wie heißt die Kreatur, die mit Musikscheiben Gegenstände aufsammelt?",answer:"Allay"},
  {points:500,question:"Wie viele Obsidianblöcke braucht ein minimales Netherportal ohne Ecken?",answer:"10"}
 ]},
 {name:"Allgemeinwissen",questions:[
  {points:100,question:"Wie viele Tage hat eine Woche?",answer:"7"},
  {points:200,question:"Wie heißt die Hauptstadt von Italien?",answer:"Rom"},
  {points:300,question:"Welcher Planet ist der Sonne am nächsten?",answer:"Merkur"},
  {points:400,question:"Wie viele Minuten hat ein Tag?",answer:"1440"},
  {points:500,question:"Welches chemische Symbol hat Silber?",answer:"Ag"}
 ]},
 {name:"Sport",questions:[
  {points:100,question:"Wie viele Spieler einer Fußballmannschaft stehen zu Spielbeginn auf dem Feld?",answer:"11"},
  {points:200,question:"Wie lange dauert ein reguläres Fußballspiel ohne Nachspielzeit?",answer:"90 Minuten"},
  {points:300,question:"Bei welcher Sportart gibt es einen Slam Dunk?",answer:"Basketball"},
  {points:400,question:"Wie viele Ringe zeigt das olympische Symbol?",answer:"5"},
  {points:500,question:"Wie lang ist ein Marathon offiziell ungefähr in Kilometern?",answer:"42,195 km"}
 ]},
 {name:"Filme & Serien",questions:[
  {points:100,question:"Wie heißt die Schneemann-Figur aus Die Eiskönigin?",answer:"Olaf"},
  {points:200,question:"Wie heißt die Schule für Hexerei in Harry Potter?",answer:"Hogwarts"},
  {points:300,question:"Wie heißt der Heimatplanet von Superman?",answer:"Krypton"},
  {points:400,question:"Wie heißt der Cowboy aus Toy Story?",answer:"Woody"},
  {points:500,question:"Wie heißt der Regisseur der Jurassic-Park-Verfilmung von 1993?",answer:"Steven Spielberg"}
 ]},
 {name:"YouTuber",questions:[
  {points:100,question:"Auf welcher Videoplattform lädt man typischerweise Let’s Plays hoch?",answer:"YouTube"},
  {points:200,question:"Wie nennt man eine live übertragene Sendung im Internet?",answer:"Livestream"},
  {points:300,question:"Wie heißt ein kurzes Vorschaubild für ein Video?",answer:"Thumbnail"},
  {points:400,question:"Wie nennt man eine regelmäßige Serie von Videos zu einem Thema?",answer:"Format oder Serie"},
  {points:500,question:"Wie heißt die Kennzahl, die angibt, wie oft ein Video angesehen wurde?",answer:"Aufrufe / Views"}
 ]}
];
function cloneStarter(){return JSON.parse(JSON.stringify(starterCategories));}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600);}
function emitCreate(name){socket.emit("createRoom",{name,categories:cloneStarter()});}
$("createForm").addEventListener("submit",e=>{e.preventDefault();$("lobbyError").textContent="";emitCreate($("hostName").value);});
$("joinForm").addEventListener("submit",e=>{e.preventDefault();$("lobbyError").textContent="";socket.emit("joinRoom",{name:$("joinName").value,code:$("joinCode").value});});
socket.on("connect",()=>{myId=socket.id;});
socket.on("joined",data=>{myCode=data.code;isHost=data.host;$("lobby").hidden=true;$("game").hidden=false;$("roomLabel").textContent="Spielcode: "+myCode;$("codeDisplay").textContent=myCode;$("roleBadge").textContent=isHost?"SPIELLEITUNG":"SPIELER";$("editBtn").hidden=!isHost;$("resetBtn").hidden=!isHost;toast(isHost?"Runde erstellt! Teile den Spielcode.":"Du bist im Spiel!");});
socket.on("errorMessage",msg=>{$("lobbyError").textContent=msg;toast(msg);});
socket.on("state",s=>{state=s;render();});
function render(){
 if(!state)return;
 $("notice").textContent=state.message;
 $("codeDisplay").textContent=state.code;
 $("roleBadge").textContent=state.hostId===myId?"SPIELLEITUNG":"SPIELER";
 isHost=state.hostId===myId;
 $("editBtn").hidden=!isHost;$("resetBtn").hidden=!isHost;
 const boardMode=state.status==="board";
 $("questionScoreRow").hidden=boardMode||!isHost;
 $("boardSection").hidden=!boardMode;
 $("assignRow").hidden=!boardMode||!isHost;
 renderTargetPlayers();$("questionSection").hidden=boardMode;
 renderBoard();renderPlayers();
 if(!boardMode && state.activeQuestion){
  $("questionMeta").textContent=`${state.activeQuestion.category}  •  ${state.activeQuestion.points} PUNKTE`;
  $("questionText").textContent=state.activeQuestion.question;
  $("answerText").textContent="Lösung: "+state.activeQuestion.answer;
  $("answerText").hidden=true;
  $("hostControls").hidden=!isHost;
  $("questionScoreRow").hidden=!isHost;
  renderQuestionScorer();
  const winner=state.players.find(p=>p.id===state.buzzWinner);
  $("buzzBtn").disabled=!state.buzzOpen || !!state.buzzWinner || state.hostId===myId;
  $("buzzStatus").textContent=winner?`${winner.name} hat zuerst gebuzzert!`:state.buzzOpen?"Buzzer ist freigegeben – drück jetzt!":"Warte auf die Freigabe …";
  $("openBtn").disabled=!!state.buzzWinner || state.buzzOpen;
  $("againBtn").hidden=!state.buzzWinner;
 }
}
function renderTargetPlayers(){
 const select=$("targetPlayer");
 const current=select.value;
 select.innerHTML="";
 const open=document.createElement("option");open.value="";open.textContent="Offen für alle (Buzzer entscheidet)";select.appendChild(open);
 (state?.players||[]).forEach(p=>{
  const option=document.createElement("option");option.value=p.id;option.textContent=p.name+(p.id===myId?" (du)":"");select.appendChild(option);
 });
 if([...select.options].some(o=>o.value===current))select.value=current;
}
function renderQuestionScorer(){
 const select=$("questionScorer");
 const current=state?.activeQuestion?.assignedPlayerId || state?.buzzWinner || "";
 select.innerHTML="";
 const auto=document.createElement("option");auto.value="";auto.textContent="Automatisch: Buzzer-Gewinner";select.appendChild(auto);
 (state?.players||[]).forEach(p=>{
  const option=document.createElement("option");option.value=p.id;option.textContent=p.name+(p.id===myId?" (du)":"");select.appendChild(option);
 });
 select.value=current;
}
function renderBoard(){
 const board=$("board");board.innerHTML="";
 state.categories.forEach((cat,ci)=>{
  const h=document.createElement("div");h.className="cathead";h.textContent=cat.name;board.appendChild(h);
 });
 POINTS.forEach(points=>state.categories.forEach((cat,ci)=>{
  const b=document.createElement("button");const used=state.used.includes(`${ci}:${points}`);
  b.className="tile"+(used?" used":"");b.textContent=used?"✓":points;
  b.disabled=used||!isHost||state.status!=="board";
  b.title=`${cat.name} – ${points} Punkte`;
  b.addEventListener("click",()=>socket.emit("selectQuestion",{categoryIndex:ci,points,targetPlayerId:$("targetPlayer").value||null}));
  board.appendChild(b);
 }));
}
function renderPlayers(){
 const box=$("players");box.innerHTML="";
 const sorted=[...state.players].sort((a,b)=>b.score-a.score);
 sorted.forEach((p,i)=>{
  const el=document.createElement("div");el.className="player"+(p.id===myId?" me":"")+(p.id===state.buzzWinner?" winner":"");
  const name=document.createElement("span");name.className="playername";name.textContent=(i===0&&p.score>0?"👑 ":"")+p.name+(p.id===myId?" (du)":"");
  const score=document.createElement(isHost?"button":"span");score.className="playerpoints";score.textContent=p.score.toLocaleString("de-DE");
  if(isHost){
   score.type="button";score.title="Klicken, um den Punktestand direkt zu bearbeiten";score.setAttribute("aria-label",`Punktestand von ${p.name} bearbeiten`);
   score.addEventListener("click",()=>{const value=prompt(`Neuer Punktestand für ${p.name}:`,String(p.score));if(value!==null&&value.trim()!==""){const n=Number(value);if(Number.isFinite(n))socket.emit("setPlayerScore",{playerId:p.id,score:n});else toast("Bitte eine gültige Zahl eingeben.");}});
  }
  el.append(name,score);
  if(isHost){
   const controls=document.createElement("div");controls.className="score-edit-controls";
   const minus=document.createElement("button");minus.type="button";minus.className="small danger";minus.textContent="−100";minus.title="100 Punkte abziehen";minus.addEventListener("click",()=>socket.emit("adjustPlayerScore",{playerId:p.id,delta:-100}));
   const plus=document.createElement("button");plus.type="button";plus.className="small secondary";plus.textContent="+100";plus.title="100 Punkte hinzufügen";plus.addEventListener("click",()=>socket.emit("adjustPlayerScore",{playerId:p.id,delta:100}));
   const edit=document.createElement("button");edit.type="button";edit.className="small secondary";edit.textContent="Ändern";edit.addEventListener("click",()=>{const value=prompt(`Neuer Punktestand für ${p.name}:`,String(p.score));if(value!==null&&value.trim()!=="")socket.emit("setPlayerScore",{playerId:p.id,score:Number(value)});});
   controls.append(minus,plus,edit);el.appendChild(controls);
  }
  box.appendChild(el);
 });
}
$("buzzBtn").addEventListener("click",()=>{socket.emit("buzz");$("buzzBtn").disabled=true;});
$("openBtn").addEventListener("click",()=>socket.emit("openBuzzers"));
$("showAnswerBtn").addEventListener("click",()=>{$("answerText").hidden=false;});
$("questionScorer").addEventListener("change",()=>socket.emit("setQuestionScorer",{playerId:$("questionScorer").value||null}));
$("rightBtn").addEventListener("click",()=>socket.emit("judge",{correct:true,playerId:$("questionScorer").value||null}));
$("wrongBtn").addEventListener("click",()=>socket.emit("judge",{correct:false,playerId:$("questionScorer").value||null}));
$("againBtn").addEventListener("click",()=>socket.emit("noAnswer"));
$("resetBtn").addEventListener("click",()=>{if(confirm("Punkte und benutzte Fragen wirklich zurücksetzen?"))socket.emit("resetScores");});
$("editBtn").addEventListener("click",()=>{buildEditor();$("editor").hidden=false;$("editor").scrollIntoView({behavior:"smooth"});});
$("closeEditor").addEventListener("click",()=>$("editor").hidden=true);
function buildEditor(){
 const box=$("editorFields");box.innerHTML="";
 state.categories.forEach((cat,ci)=>{
  const wrap=document.createElement("div");wrap.className="editorcat";
  const title=document.createElement("label");title.textContent="Kategorie "+(ci+1);
  const name=document.createElement("input");name.value=cat.name;name.maxLength=28;name.dataset.category=ci;name.dataset.field="name";title.appendChild(name);wrap.appendChild(title);
  cat.questions.forEach((q,qi)=>{
   const row=document.createElement("div");row.className="editorq";
   const pts=document.createElement("div");pts.className="pointslabel";pts.innerHTML=`<div class="eyebrow">${q.points} P.</div>`;row.appendChild(pts);
   [["Frage", "question"],["Lösung","answer"]].forEach(([labelText,field])=>{
    const lab=document.createElement("label");lab.textContent=labelText;
    const input=document.createElement("input");input.value=q[field];input.dataset.category=ci;input.dataset.question=qi;input.dataset.field=field;input.maxLength=300;lab.appendChild(input);row.appendChild(lab);
   });
   wrap.appendChild(row);
  });
  box.appendChild(wrap);
 });
}
$("saveEditor").addEventListener("click",()=>{
 const cats=JSON.parse(JSON.stringify(state.categories));
 $("editorFields").querySelectorAll("input").forEach(inp=>{
  const ci=Number(inp.dataset.category),field=inp.dataset.field;
  if(field==="name")cats[ci].name=inp.value.trim()||`Kategorie ${ci+1}`;
  else cats[ci].questions[Number(inp.dataset.question)][field]=inp.value.trim();
 });
 if(cats.some(c=>c.questions.some(q=>!q.question||!q.answer))){toast("Bitte jede Frage und Lösung ausfüllen.");return;}
 socket.emit("editCategories",cats);$("editor").hidden=true;toast("Fragen gespeichert.");
});
