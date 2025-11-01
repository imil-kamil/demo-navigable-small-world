const canvas=document.getElementById('myCanvas');
const ctx=canvas.getContext('2d');

let nodes=[], edges=[], query=null, current=null;
let visited=[], finished=false, hoveredNode=null;
let step=0, historyIndex=0, mouseX=null, mouseY=null;

let vibrateUntil=0;
const VIBRATE_MS=250, VIB_AMP=2.0, CONT_AMP=1.3;

const initBtn=document.getElementById('initBtn');
const efSlider=document.getElementById('efSlider');
const efValue=document.getElementById('efValue');
const buildBtn=document.getElementById('buildBtn');
const forwardBtn=document.getElementById('forwardBtn');
const resetAllBtn=document.getElementById('resetAllBtn');
const resetQueryBtn=document.getElementById('resetQueryBtn');
const statusBox=document.getElementById('statusBox');
const panel=document.getElementById('panel');

let efConstruction=parseInt(efSlider.value);
efSlider.oninput=()=>{ efConstruction=parseInt(efSlider.value); efValue.textContent=efConstruction; };

function distance(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
function updateStatus(msg){ statusBox.textContent=msg; }
function logStep(html){ panel.innerHTML+=html; panel.scrollTop=panel.scrollHeight; }
function jitter(val,amp){ return val+(Math.random()*2-1)*amp; }
function vibrateActive(){ return Date.now()<vibrateUntil; }

function rebuildEdges(){
  edges=[]; if(nodes.length===0) return;
  let unvisited=[...nodes]; let connected=[unvisited.pop()];
  while(unvisited.length>0){
    let n=unvisited.pop();
    let nearest=connected.reduce((best,c)=>{let d=distance(n,c);return d<best.d?{node:c,d}:best;},{node:null,d:Infinity});
    edges.push({from:n,to:nearest.node}); connected.push(n);
  }
  for(let i=0;i<nodes.length;i++){
    let n=nodes[i];
    let candidates=nodes.filter(m=>m!==n).map(m=>({node:m,d:distance(n,m)})).sort((a,b)=>a.d-b.d);
    let k=Math.min(efConstruction,candidates.length);
    for(let j=0;j<k;j++){
      let e={from:n,to:candidates[j].node};
      if(!edges.some(x=>(x.from===e.from&&x.to===e.to)||(x.from===e.to&&x.to===e.from))) edges.push(e);
    }
  }
}

function initNodes(){
  nodes=[]; edges=[]; query=null; current=null; visited=[]; finished=false;
  hoveredNode=null; mouseX=null; mouseY=null; historyIndex=0;
  panel.innerHTML=""; vibrateUntil=0;
  const margin=60, nodeCount=14, minDist=60;
  function farEnough(x,y){ for(const n of nodes){ if(Math.hypot(n.x-x,n.y-y)<minDist) return false; } return true; }
  for(let i=0;i<nodeCount;i++){
    let x,y,tries=0;
    do{ x=margin+Math.random()*(canvas.width-2*margin); y=margin+Math.random()*(canvas.height-2*margin); tries++; }
    while(!farEnough(x,y)&&tries<300);
    nodes.push({x,y});
  }
}

initBtn.onclick=()=>{ initNodes(); efSlider.disabled=false; buildBtn.disabled=false; forwardBtn.disabled=true; resetQueryBtn.disabled=true; updateStatus("Atur efConstruction lalu tekan 'Bangun Jaringan'."); step=1; };
buildBtn.onclick=()=>{ rebuildEdges(); initBtn.disabled=true; efSlider.disabled=true; buildBtn.disabled=true; updateStatus("Arahkan kursor untuk preview Query, lalu klik untuk menetapkan."); step=2; };

forwardBtn.onclick=()=>{
  if(!query||!current||finished) return;
  const neighbors=[]; for(const e of edges){ if(e.from===current) neighbors.push(e.to); if(e.to===current) neighbors.push(e.from); }
  let best=current, bestDist=distance(current,query);
  for(const n of neighbors){ let d=distance(n,query); if(d<bestDist){ bestDist=d; best=n; } }
  if(best!==current){
    current=best; visited.push(current); historyIndex=visited.length-1;
    vibrateUntil = Date.now() + VIBRATE_MS;
    logStep(`<div class="step"><strong>Langkah ${historyIndex}:</strong> Pindah ke Node ${nodes.indexOf(current)+1} <span class="decision">(d=${bestDist.toFixed(2)})</span></div>`);
  } else {
    finished = true;
    logStep(`<div class="step stop">Traversal berhenti di Node ${nodes.indexOf(current)+1} (diasumsikan paling dekat)</div>`);
    updateStatus("Traversal selesai. Anda dapat Reset atau Inisialisasi ulang.");
    initBtn.disabled = false;
  }
  forwardBtn.disabled = finished;
};

// Reset Semua
resetAllBtn.onclick = () => {
  initBtn.disabled = false; efSlider.disabled = true; buildBtn.disabled = true; forwardBtn.disabled = true;
  resetQueryBtn.disabled = true;
  nodes=[]; edges=[]; query=null; current=null; visited=[]; finished=false;
  hoveredNode=null; mouseX=null; mouseY=null; step=0; historyIndex=0;
  panel.innerHTML=""; vibrateUntil=0;
  updateStatus("Status: Klik 'Inisialisasi Node' untuk memulai");
};

// Reset Query/Entry
resetQueryBtn.onclick = () => {
  query=null; current=null; visited=[]; finished=false;
  hoveredNode=null; historyIndex=0;
  panel.innerHTML=""; vibrateUntil=0;
  forwardBtn.disabled=true;
  resetQueryBtn.disabled=true; // kembali nonaktif
  step=2; // kembali ke mode set query
  updateStatus("Query & entry point direset. Arahkan kursor untuk preview Query, lalu klik untuk menetapkan.");
};

// Canvas interactions
canvas.addEventListener('mousemove',(evt)=>{
  const rect=canvas.getBoundingClientRect();
  mouseX=evt.clientX-rect.left; mouseY=evt.clientY-rect.top;
  hoveredNode=null;
  if(step===3){
    let minDist=Infinity;
    for(const n of nodes){
      let d=distance({x:mouseX,y:mouseY},n);
      if(d<14 && d<minDist){ minDist=d; hoveredNode=n; }
    }
  }
});

canvas.addEventListener('click',(evt)=>{
  const rect=canvas.getBoundingClientRect();
  const x=evt.clientX-rect.left, y=evt.clientY-rect.top;
  if(step===2){
    query={x,y};
    resetQueryBtn.disabled=false; // aktifkan tombol reset query
    updateStatus("Query ditetapkan. Sekarang pilih entry point (hover glow ungu lalu klik).");
    step=3;
  } else if(step===3){
    let chosen=hoveredNode;
    if(!chosen){
      for(const n of nodes){ if(distance(n,{x,y})<12){ chosen=n; break; } }
    }
    if(chosen){
      current=chosen; visited=[current]; historyIndex=0; finished=false;
      forwardBtn.disabled=false;
      resetQueryBtn.disabled=false; // aktifkan tombol reset query
      updateStatus("Traversal siap. Klik 'Jelajah Maju' untuk melangkah.");
      step=4;
    }
  }
});

// Draw loop
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const colors=["#3498db","#2ecc71","#9b59b6","#e67e22","#1abc9c"];
  ctx.lineWidth=1.5;
  edges.forEach((e,i)=>{
    ctx.strokeStyle=colors[i%colors.length];
    const x1=vibrateActive()? jitter(e.from.x,VIB_AMP):e.from.x;
    const y1=vibrateActive()? jitter(e.from.y,VIB_AMP):e.from.y;
    const x2=vibrateActive()? jitter(e.to.x,VIB_AMP):e.to.x;
    const y2=vibrateActive()? jitter(e.to.y,VIB_AMP):e.to.y;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  });

  if(historyIndex>0){
    ctx.strokeStyle="red"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(visited[0].x,visited[0].y);
    for(let i=1;i<=historyIndex;i++){ ctx.lineTo(visited[i].x,visited[i].y); }
    ctx.stroke();
  }

  let neighbors=[];
  if(current){
    for(const e of edges){
      if(e.from===current) neighbors.push(e.to);
      else if(e.to===current) neighbors.push(e.from);
    }
  }

  for(let i=0;i<nodes.length;i++){
    const n=nodes[i];
    let nx=n.x, ny=n.y;
    if(current && (n===current||neighbors.includes(n))){
      nx=jitter(n.x,CONT_AMP); ny=jitter(n.y,CONT_AMP);
    }
    ctx.fillStyle="#222";
    ctx.beginPath(); ctx.arc(nx,ny,10,0,2*Math.PI); ctx.fill();
    ctx.fillStyle="white"; ctx.font="12px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(i+1,nx,ny);
  }

  if(current){
    ctx.strokeStyle="rgba(0,200,0,0.7)"; ctx.lineWidth=2;
    for(const n of neighbors){ ctx.beginPath(); ctx.arc(n.x,n.y,14,0,2*Math.PI); ctx.stroke(); }
    ctx.shadowBlur=18; ctx.shadowColor="orange";
    ctx.strokeStyle="orange"; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(current.x,current.y,16,0,2*Math.PI); ctx.stroke();
    ctx.shadowBlur=0;
  }

  if(step===2 && mouseX!==null && mouseY!==null){
    ctx.globalAlpha=0.35; ctx.fillStyle="blue";
    ctx.beginPath(); ctx.arc(mouseX,mouseY,10,0,2*Math.PI); ctx.fill();
    ctx.globalAlpha=1.0;
  }

  if(step===3 && hoveredNode){
    ctx.shadowBlur=16; ctx.shadowColor="#9b59b6";
    ctx.strokeStyle="#9b59b6"; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(hoveredNode.x,hoveredNode.y,18,0,2*Math.PI); ctx.stroke();
    ctx.shadowBlur=0;
  }

  if(query){
    ctx.shadowBlur=10; ctx.shadowColor="blue";
    ctx.fillStyle="blue"; ctx.beginPath(); ctx.arc(query.x,query.y,10,0,2*Math.PI); ctx.fill();
    ctx.shadowBlur=0;
  }

  requestAnimationFrame(draw);
}
draw();
