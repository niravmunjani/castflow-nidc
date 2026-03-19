import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Head from "next/head";

// ─── Supabase ──────────────────────────────────────────
const SB_URL="https://rjklrzzpwrapxdahgidz.supabase.co";
const SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqa2xyenpwd3JhcHhkYWhnaWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTgyMDEsImV4cCI6MjA4OTA5NDIwMX0.gl3fLz-AD4Xvrub9WRAVcOnc7DvCfvveBAz6wSigX1Y";
const sbH={"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":"return=representation"};
const db={
  async get(t,q=""){try{const r=await fetch(`${SB_URL}/rest/v1/${t}${q}`,{headers:sbH});return r.ok?await r.json():[]}catch{return[]}},
  async insert(t,d){try{const r=await fetch(`${SB_URL}/rest/v1/${t}`,{method:"POST",headers:sbH,body:JSON.stringify(d)});return r.ok?await r.json():null}catch{return null}},
  async update(t,id,d){try{await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${id}`,{method:"PATCH",headers:sbH,body:JSON.stringify(d)})}catch{}},
  async del(t,id){try{await fetch(`${SB_URL}/rest/v1/${t}?id=eq.${id}`,{method:"DELETE",headers:sbH})}catch{}},
};

// ─── Constants ─────────────────────────────────────────
const P={bg:"#06080C",sf:"#0E1218",sf2:"#151B24",sf3:"#1C2433",bd:"#232D3B",bd2:"#2E3A4A",tx:"#E4E9F1",tm:"#7E8CA0",td:"#4A5568",ac:"#F7B731",ur:"#EF4444",gn:"#10B981",bl:"#3B82F6",pu:"#8B5CF6",or:"#F97316",cy:"#06B6D4"};
const JC=["#3B82F6","#F59E0B","#10B981","#8B5CF6","#06B6D4","#F97316","#EC4899","#14B8A6","#6366F1","#F43F5E","#22D3EE","#A855F7","#84CC16","#FB923C","#38BDF8"];
const MACH=["M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12","M13","M14"];
const MI={M2:{type:"Zinc",ton:0,avg:500,dch:4},M3:{type:"Zinc",ton:0,avg:500,dch:4},M4:{type:"400T",ton:400,avg:400,dch:4},M5:{type:"400T",ton:400,avg:400,dch:4},M6:{type:"400T",ton:400,avg:350,dch:4},M7:{type:"400T",ton:400,avg:350,dch:4},M8:{type:"400T",ton:400,avg:0,dch:4,down:true},M9:{type:"400T",ton:400,avg:400,dch:4},M10:{type:"400T",ton:400,avg:300,dch:4},M11:{type:"Auto Fan",ton:400,avg:350,dch:5},M12:{type:"600T",ton:600,avg:250,dch:5},M13:{type:"600T",ton:600,avg:275,dch:5},M14:{type:"800T",ton:800,avg:150,dch:5}};
// DCM code → which machines can run it
const DCM_MAP={"200":["M2","M3"],"400":["M4","M5","M6","M7","M9","M10"],"500":["M4","M5","M6","M7","M9","M10"],"600":["M12","M13"],"700":["M4","M5","M6","M7","M9","M10","M12","M13"],"800":["M14"],"1K":["M14"]};
const DAYS=["Mon","Tue","Wed","Thu","Fri"];

// ═══════════════════════════════════════════════════════
function CastFlow(){
  const[page,setPage]=useState("home");
  const[lang,setLang]=useState("en");
  const[allOrders,setAllOrders]=useState([]); // raw shipping data
  const[weekPlan,setWeekPlan]=useState(null); // AI-generated plan
  const[selectedWeek,setSelectedWeek]=useState(""); // "2026-03-17"
  const[fileName,setFileName]=useState("");
  const[toast,setToast]=useState(null);
  const[aiLoading,setAiLoading]=useState(false);
  const[aiChat,setAiChat]=useState([]); // conversation with AI
  const[userMsg,setUserMsg]=useState("");
  const fileRef=useRef();
  const flash=m=>{setToast(m);setTimeout(()=>setToast(null),2500)};

  // Get current Monday
  const getMonday=(d=new Date())=>{const day=d.getDay();const diff=d.getDate()-day+(day===0?-6:1);return new Date(d.setDate(diff)).toISOString().split("T")[0]};

  useEffect(()=>{setSelectedWeek(getMonday())},[]);

  // ─── Parse Shipping Schedule ──────────────────────────
  const handleFile=useCallback(async f=>{
    if(!f)return;setFileName(f.name);
    try{
      const XLSX=await import("xlsx");
      const buf=await f.arrayBuffer();
      const wb=XLSX.read(buf,{type:"array",cellDates:true});
      const sn=wb.SheetNames.find(s=>s.toLowerCase().includes("product"))||wb.SheetNames[0];
      const raw=XLSX.utils.sheet_to_json(wb.Sheets[sn]);
      
      const orders=raw.filter(r=>r["Product Number"]&&r["Needed"]>0).map((r,i)=>({
        id:`O${i}`,
        product:String(r["Product Number"]||""),
        customer:String(r["Cust Name"]||""),
        description:String(r["Description"]||""),
        material:String(r["Material"]||""),
        dcm:String(r["DCM"]||""),
        die:String(r["Die #"]||""),
        po:String(r["Customer PO "]||r["Customer PO"]||""),
        shipDate:r["Ship Date"] instanceof Date?r["Ship Date"].toISOString().split("T")[0]:"",
        qty:Number(r["Quantity"])||0,
        shipped:Number(r["Shipped"])||0,
        toShip:Number(r["To Ship"])||0,
        onHand:Number(r["On Hand"])||0,
        needed:Number(r["Needed"])||0,
        dollars:Number(r["Ext Dollars"])||0,
        machines:DCM_MAP[String(r["DCM"]||"")]||[],
        isCastable:!["FIN","ASY",""].includes(String(r["DCM"]||"")),
      }));
      
      setAllOrders(orders);
      setPage("dashboard");
      flash(`${orders.length} orders loaded! $${(orders.reduce((a,o)=>a+o.dollars,0)/1e3).toFixed(0)}K pipeline`);
    }catch(e){console.error(e);alert("Error: "+e.message)}
  },[]);

  // ─── AI Schedule Generator ────────────────────────────
  const generateAiSchedule=useCallback(async(weekStart)=>{
    if(!allOrders.length)return;
    setAiLoading(true);
    
    // Get orders that need production for this week and beyond
    const castable=allOrders.filter(o=>o.isCastable&&o.needed>0);
    const weekEnd=new Date(weekStart);weekEnd.setDate(weekEnd.getDate()+6);
    
    // Sort by urgency: overdue first, then by ship date
    const sorted=[...castable].sort((a,b)=>(a.shipDate||"9999").localeCompare(b.shipDate||"9999"));
    const urgent=sorted.filter(o=>new Date(o.shipDate)<=weekEnd);
    const upcoming=sorted.filter(o=>new Date(o.shipDate)>weekEnd).slice(0,30);
    
    const orderList=[...urgent,...upcoming].slice(0,50).map(o=>
      `${o.product} | Die:${o.die||"?"} | DCM:${o.dcm} | Need:${o.needed} | Ship:${o.shipDate} | $${o.dollars.toFixed(0)} | ${o.customer} | Machines:${o.machines.join(",")}`
    ).join("\n");

    const prompt=`You are an AI production scheduler for NIDC, an aluminum die casting company.

MACHINES (available this week):
M2,M3: Zinc cold chamber (~500 pcs/shift)
M4,M5,M6,M7,M9,M10: Aluminum 400T (~350-400 pcs/shift)  
M8: DOWN — do not use
M11: Auto Fan 400T (~350 pcs/shift)
M12,M13: Aluminum 600T (~250 pcs/shift)
M14: Aluminum 800T (~150 pcs/shift)

SCHEDULE: Monday to Friday
- Monday-Thursday: ALL machines run, 2 shifts each (1st shift + 2nd shift)
- FRIDAY: Only 2-3 machines run (limited crew), 1 shift only
- Die changes take 3-5 hours = lost production

WEEK: ${weekStart} to ${new Date(new Date(weekStart).getTime()+4*864e5).toISOString().split("T")[0]}

ORDERS TO SCHEDULE (sorted by urgency):
${orderList}

RULES:
1. Group same-die parts on same machine to avoid die changes
2. Overdue orders (ship date before ${weekStart}) are URGENT — schedule first
3. High-dollar orders get priority
4. Friday: pick 2-3 most critical machines only, 1st shift only
5. Don't overschedule — each machine has ~${350} pcs/shift capacity average
6. Consider die change time when switching dies on a machine

RESPOND IN THIS EXACT JSON FORMAT ONLY (no markdown, no backticks, no explanation outside JSON):
{
  "schedule":[
    {"machine":"M4","day":"Mon","shift":1,"product":"PartNum","die":"D123","qty":400,"hours":8},
    {"machine":"M4","day":"Mon","shift":2,"product":"PartNum","die":"D123","qty":350,"hours":8}
  ],
  "die_changes":[
    {"machine":"M4","day":"Tue","from":"D123","to":"D456","hours":4}
  ],
  "friday_machines":["M12","M14"],
  "daily_revenue":{"Mon":45000,"Tue":43000,"Wed":47000,"Thu":44000,"Fri":15000},
  "warnings":["Warning 1","Warning 2"],
  "recommendations":["Recommendation 1"],
  "summary":"2-3 sentence summary of the plan"
}`;

    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:3000,messages:[{role:"user",content:prompt}]})
      });
      const data=await resp.json();
      const text=data.content?.map(c=>c.text||"").join("")||"";
      const clean=text.replace(/```json|```/g,"").trim();
      const plan=JSON.parse(clean);
      plan.weekStart=weekStart;
      setWeekPlan(plan);
      setPage("gantt");
      setAiChat(prev=>[...prev,{role:"ai",text:plan.summary||"Schedule generated."}]);
    }catch(e){
      console.error(e);
      setAiChat(prev=>[...prev,{role:"ai",text:"Error generating schedule. Try again."}]);
    }finally{setAiLoading(false)}
  },[allOrders]);

  // ─── AI Chat ──────────────────────────────────────────
  const sendAiMessage=async()=>{
    if(!userMsg.trim())return;
    const msg=userMsg.trim();setUserMsg("");
    setAiChat(prev=>[...prev,{role:"user",text:msg}]);
    setAiLoading(true);
    
    const context=weekPlan?`Current schedule has ${weekPlan.schedule?.length||0} assignments. `:"No schedule yet. ";
    const orderContext=`${allOrders.length} total orders, ${allOrders.filter(o=>o.isCastable&&o.needed>0).length} need casting.`;
    
    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
          messages:[{role:"user",content:`You are an AI assistant for NIDC die casting production planning. ${context}${orderContext}\n\nUser question: ${msg}\n\nAnswer concisely and helpfully. If they ask about scheduling, reference the NIDC machines (M2-M14), die changes (3-5hrs), shifts (2/day Mon-Thu, Fri limited). Keep answer under 200 words.`}]
        })
      });
      const data=await resp.json();
      const text=data.content?.map(c=>c.text||"").join("")||"No response";
      setAiChat(prev=>[...prev,{role:"ai",text}]);
    }catch{
      setAiChat(prev=>[...prev,{role:"ai",text:"Error connecting to AI."}]);
    }finally{setAiLoading(false)}
  };

  // ─── Computed ─────────────────────────────────────────
  const stats=useMemo(()=>{
    const castable=allOrders.filter(o=>o.isCastable&&o.needed>0);
    const overdue=castable.filter(o=>o.shipDate&&new Date(o.shipDate)<new Date());
    const thisWeek=castable.filter(o=>{const d=new Date(o.shipDate);const now=new Date();const wkEnd=new Date(now);wkEnd.setDate(wkEnd.getDate()+7);return d>=now&&d<=wkEnd});
    return{
      total:allOrders.length,
      castable:castable.length,
      totalPcs:castable.reduce((a,o)=>a+o.needed,0),
      totalRev:castable.reduce((a,o)=>a+o.dollars,0),
      overdue:overdue.length,
      overduePcs:overdue.reduce((a,o)=>a+o.needed,0),
      overdueRev:overdue.reduce((a,o)=>a+o.dollars,0),
      thisWeek:thisWeek.length,
      thisWeekPcs:thisWeek.reduce((a,o)=>a+o.needed,0),
    };
  },[allOrders]);

  // ─── Styles ───────────────────────────────────────────
  const cd=(x={})=>({background:P.sf,border:`1px solid ${P.bd}`,borderRadius:12,padding:16,...x});
  const bt=(v="d")=>({padding:"6px 14px",borderRadius:8,border:v==="o"?`1px solid ${P.bd2}`:"none",background:v==="p"?P.ac:v==="x"?P.ur:v==="g"?P.gn:v==="o"?"transparent":P.sf2,color:v==="p"?"#000":v==="x"||v==="g"?"#fff":P.tx,fontWeight:700,fontSize:12,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5});
  const pill=a=>({padding:"6px 14px",borderRadius:8,background:a?P.ac:"transparent",color:a?"#000":P.tm,fontWeight:a?700:500,fontSize:11,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"});

  // ═════════════════════════════════════════════════════
  // PAGES
  // ═════════════════════════════════════════════════════

  // ─── HOME (Upload) ────────────────────────────────────
  const renderHome=()=><div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"70vh",gap:20}}>
    <div style={{fontSize:48}}>🏭</div>
    <div style={{fontSize:24,fontWeight:900,color:P.ac,textAlign:"center"}}>CastFlow AI Planner</div>
    <div style={{fontSize:13,color:P.tm,textAlign:"center",maxWidth:400}}>Upload your Shipping Schedule Excel file. AI will analyze all orders and generate optimized weekly casting schedules.</div>
    <div onClick={()=>fileRef.current?.click()} style={{padding:"16px 32px",borderRadius:12,background:P.ac,color:"#000",fontWeight:800,fontSize:16,cursor:"pointer",boxShadow:`0 4px 20px ${P.ac}40`}}>
      📂 Upload Shipping Schedule
    </div>
    <div style={{fontSize:10,color:P.td}}>Supports NIDC Shipping Schedule format (.xlsx)</div>
  </div>;

  // ─── DASHBOARD ────────────────────────────────────────
  const renderDash=()=><div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      <div><div style={{fontSize:18,fontWeight:900,color:P.tx}}>📊 Order Pipeline</div><div style={{fontSize:10,color:P.tm}}>📁 {fileName} · {allOrders.length} orders loaded</div></div>
      <div style={{display:"flex",gap:6}}>
        <button onClick={()=>generateAiSchedule(selectedWeek)} disabled={aiLoading} style={bt("p")}>{aiLoading?"⏳ AI Planning...":"🤖 Generate Weekly Plan"}</button>
      </div>
    </div>

    {/* KPIs */}
    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
      {[
        {l:"Orders to Cast",v:stats.castable,c:P.bl},
        {l:"Pieces Needed",v:stats.totalPcs.toLocaleString(),c:P.ac},
        {l:"Revenue Pipeline",v:`$${(stats.totalRev/1e3).toFixed(0)}K`,c:P.gn},
        {l:"OVERDUE",v:`${stats.overdue} orders`,c:P.ur,sub:`${stats.overduePcs.toLocaleString()} pcs · $${(stats.overdueRev/1e3).toFixed(0)}K`},
      ].map((s,i)=><div key={i} style={{...cd(),borderLeft:`4px solid ${s.c}`,flex:1,minWidth:150}}>
        <div style={{fontSize:8,color:P.tm,fontWeight:600,textTransform:"uppercase"}}>{s.l}</div>
        <div style={{fontSize:26,fontWeight:900,color:P.tx,marginTop:3}}>{s.v}</div>
        {s.sub&&<div style={{fontSize:9,color:s.c}}>{s.sub}</div>}
      </div>)}
    </div>

    {/* Week Selector + Generate */}
    <div style={{...cd(),border:`2px solid ${P.ac}30`}}>
      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:13,fontWeight:800,color:P.ac}}>🤖 AI Schedule Generator</div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:11,color:P.tm}}>Week starting:</span>
          <input type="date" value={selectedWeek} onChange={e=>setSelectedWeek(e.target.value)} style={{background:P.sf3,color:P.tx,border:`1px solid ${P.bd}`,borderRadius:6,padding:"4px 8px",fontSize:12}}/>
        </div>
        <button onClick={()=>generateAiSchedule(selectedWeek)} disabled={aiLoading} style={bt("p")}>
          {aiLoading?"⏳ Generating...":"🤖 Generate Plan for This Week"}
        </button>
      </div>
      <div style={{fontSize:9,color:P.td,marginTop:6}}>AI will optimize machine assignments, minimize die changes, prioritize urgent orders, and limit Friday production.</div>
    </div>

    {/* Machine Capacity Overview */}
    <div style={cd()}>
      <div style={{fontSize:13,fontWeight:800,color:P.tx,marginBottom:10}}>Machine Fleet</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {MACH.map(m=>{const info=MI[m];const orderCount=allOrders.filter(o=>o.machines.includes(m)&&o.needed>0).length;
          return<div key={m} style={{background:P.sf2,borderRadius:8,padding:"8px 10px",minWidth:65,textAlign:"center",border:`1px solid ${info.down?P.ur:orderCount>0?P.gn:P.bd}25`,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:info.down?P.ur:orderCount>0?P.gn:P.td}}/>
            <div style={{fontSize:14,fontWeight:900,color:info.down?P.ur:P.tx}}>{m}</div>
            <div style={{fontSize:8,color:P.tm}}>{info.type}</div>
            <div style={{fontSize:10,fontWeight:700,color:info.down?P.ur:P.gn,marginTop:2}}>{info.down?"DOWN":`${info.avg}/sh`}</div>
          </div>})}
      </div>
    </div>

    {/* Top Urgent Orders */}
    <div style={{...cd(),border:stats.overdue>0?`1px solid ${P.ur}30`:`1px solid ${P.bd}`}}>
      <div style={{fontSize:13,fontWeight:800,color:stats.overdue>0?P.ur:P.tx,marginBottom:8}}>
        {stats.overdue>0?`🔴 ${stats.overdue} Overdue Orders`:"📋 Upcoming Orders"}
      </div>
      <div style={{overflow:"auto",maxHeight:300}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
          <thead><tr>{["Product","Customer","Die","DCM","Need","Ship Date","Revenue"].map((h,i)=>
            <th key={i} style={{padding:"5px 6px",textAlign:"left",fontSize:8,fontWeight:700,color:P.tm,borderBottom:`2px solid ${P.bd}`,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{allOrders.filter(o=>o.isCastable&&o.needed>0).sort((a,b)=>(a.shipDate||"9").localeCompare(b.shipDate||"9")).slice(0,25).map((o,i)=>{
            const isOverdue=o.shipDate&&new Date(o.shipDate)<new Date();
            return<tr key={i} style={{background:isOverdue?`${P.ur}06`:"transparent"}}>
              <td style={{padding:"4px 6px",fontWeight:600,borderBottom:`1px solid ${P.bd}`,color:isOverdue?P.ur:P.tx}}>{o.product}</td>
              <td style={{padding:"4px 6px",fontSize:9,borderBottom:`1px solid ${P.bd}`,color:P.tm}}>{o.customer?.split(" ").slice(0,2).join(" ")}</td>
              <td style={{padding:"4px 6px",color:P.ac,borderBottom:`1px solid ${P.bd}`}}>{o.die||"—"}</td>
              <td style={{padding:"4px 6px",borderBottom:`1px solid ${P.bd}`}}>{o.dcm}</td>
              <td style={{padding:"4px 6px",fontWeight:700,borderBottom:`1px solid ${P.bd}`}}>{o.needed.toLocaleString()}</td>
              <td style={{padding:"4px 6px",color:isOverdue?P.ur:P.tx,borderBottom:`1px solid ${P.bd}`,fontWeight:isOverdue?700:400}}>{o.shipDate||"—"}</td>
              <td style={{padding:"4px 6px",color:P.gn,fontWeight:600,borderBottom:`1px solid ${P.bd}`}}>${o.dollars.toLocaleString()}</td>
            </tr>})}</tbody>
        </table>
      </div>
    </div>
  </div>;

  // ─── GANTT CHART ──────────────────────────────────────
  const renderGantt=()=>{
    if(!weekPlan)return<div style={{...cd(),textAlign:"center",padding:40}}><div style={{fontSize:36}}>🏭</div><div style={{color:P.tm,marginTop:8}}>Generate a plan first from the Dashboard</div><button onClick={()=>setPage("dashboard")} style={{...bt("p"),marginTop:12}}>Go to Dashboard</button></div>;

    // Group schedule by machine
    const machineSchedule={};
    MACH.forEach(m=>{machineSchedule[m]={Mon:{1:null,2:null},Tue:{1:null,2:null},Wed:{1:null,2:null},Thu:{1:null,2:null},Fri:{1:null}}});
    
    (weekPlan.schedule||[]).forEach(s=>{
      if(machineSchedule[s.machine]?.[s.day]){
        machineSchedule[s.machine][s.day][s.shift]={product:s.product,die:s.die,qty:s.qty};
      }
    });

    // Die changes
    const dieChanges={};
    (weekPlan.die_changes||[]).forEach(dc=>{
      if(!dieChanges[dc.machine])dieChanges[dc.machine]=[];
      dieChanges[dc.machine].push(dc);
    });

    const isFriday=d=>d==="Fri";
    const fridayMachines=weekPlan.friday_machines||[];

    return<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:18,fontWeight:900,color:P.tx}}>🏭 Weekly Casting Schedule</div>
          <div style={{fontSize:10,color:P.ac}}>Week of {selectedWeek} · AI Generated</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>generateAiSchedule(selectedWeek)} disabled={aiLoading} style={bt("o")}>{aiLoading?"⏳":"🔄 Regenerate"}</button>
          <button onClick={()=>setPage("dashboard")} style={bt("o")}>← Dashboard</button>
        </div>
      </div>

      {/* Summary */}
      {weekPlan.summary&&<div style={{...cd(),border:`2px solid ${P.ac}20`,background:`${P.ac}05`}}>
        <div style={{fontSize:11,color:P.tx,lineHeight:1.5}}>{weekPlan.summary}</div>
      </div>}

      {/* GANTT GRID */}
      <div style={{...cd({padding:0}),overflow:"auto",borderRadius:14,boxShadow:"0 4px 24px rgba(0,0,0,.3)"}}>
        {/* Header */}
        <div style={{display:"flex",position:"sticky",top:0,zIndex:5,background:"#080B10",borderBottom:`2px solid ${P.ac}25`}}>
          <div style={{width:70,minWidth:70,padding:"10px 6px",textAlign:"center",borderRight:`2px solid ${P.bd}`}}>
            <div style={{fontSize:9,fontWeight:800,color:P.ac}}>MACHINE</div>
          </div>
          {DAYS.map((d,di)=><div key={d} style={{flex:1,minWidth:isFriday(d)?90:160,borderRight:di<4?`1px solid ${P.bd}`:"none",textAlign:"center",padding:"6px 0",background:isFriday(d)?`${P.or}08`:"transparent"}}>
            <div style={{fontSize:12,fontWeight:800,color:isFriday(d)?P.or:P.tx}}>{d}</div>
            {isFriday(d)?<div style={{fontSize:7,color:P.or}}>LIMITED</div>:
            <div style={{display:"flex",justifyContent:"center",gap:0,marginTop:3}}>
              <div style={{flex:1,fontSize:8,color:P.td,borderRight:`1px solid ${P.bd}20`}}>1st Shift</div>
              <div style={{flex:1,fontSize:8,color:P.td}}>2nd Shift</div>
            </div>}
          </div>)}
        </div>

        {/* Machine Rows */}
        {MACH.map((m,mi)=>{
          const info=MI[m];
          const mDieChanges=dieChanges[m]||[];
          const isOnFriday=fridayMachines.includes(m);
          
          return<div key={m} style={{display:"flex",borderBottom:`2px solid ${P.bd}`,minHeight:52}}>
            {/* Machine Label */}
            <div style={{width:70,minWidth:70,borderRight:`2px solid ${P.bd}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",position:"relative",background:info.down?`${P.ur}06`:P.sf2}}>
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:4,background:info.down?P.ur:P.gn}}/>
              <div style={{fontSize:16,fontWeight:900,color:info.down?P.ur:P.tx}}>{m}</div>
              <div style={{fontSize:7,color:info.down?P.ur:P.tm}}>{info.down?"DOWN":info.type}</div>
            </div>

            {/* Day Cells */}
            {DAYS.map((d,di)=>{
              const shifts=isFriday(d)?[1]:[1,2];
              const isLimitedFri=isFriday(d)&&!isOnFriday&&!info.down;
              
              if(info.down){
                return<div key={d} style={{flex:1,minWidth:isFriday(d)?90:160,borderRight:di<4?`1px solid ${P.bd}`:"none",display:"flex",alignItems:"center",justifyContent:"center",background:`${P.ur}04`}}>
                  <div style={{width:"90%",height:30,borderRadius:6,background:`repeating-linear-gradient(45deg,${P.ur}10,${P.ur}10 6px,transparent 6px,transparent 12px)`,border:`1px dashed ${P.ur}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:P.ur}}>DOWN</div>
                </div>;
              }
              
              if(isLimitedFri){
                return<div key={d} style={{flex:1,minWidth:90,borderRight:di<4?`1px solid ${P.bd}`:"none",display:"flex",alignItems:"center",justifyContent:"center",background:`${P.or}04`}}>
                  <div style={{fontSize:8,color:P.td,fontStyle:"italic"}}>Off</div>
                </div>;
              }

              return<div key={d} style={{flex:1,minWidth:isFriday(d)?90:160,borderRight:di<4?`1px solid ${P.bd}`:"none",display:"flex",background:isFriday(d)?`${P.or}04`:"transparent"}}>
                {shifts.map(sh=>{
                  const slot=machineSchedule[m]?.[d]?.[sh];
                  if(!slot)return<div key={sh} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",borderRight:sh===1&&!isFriday(d)?`1px solid ${P.bd}15`:"none"}}>
                    <span style={{fontSize:8,color:`${P.td}40`}}>—</span>
                  </div>;
                  
                  const jc=JC[(mi*3+DAYS.indexOf(d)+sh)%JC.length];
                  return<div key={sh} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"4px 3px",borderRight:sh===1&&!isFriday(d)?`1px solid ${P.bd}15`:"none"}}>
                    <div style={{width:"95%",padding:"5px 6px",borderRadius:7,background:`linear-gradient(135deg,${jc}DD,${jc}99)`,border:`1px solid ${jc}`,position:"relative",overflow:"hidden",boxShadow:`0 2px 8px ${jc}30`}}>
                      <div style={{position:"absolute",top:0,left:0,right:0,height:"40%",background:"linear-gradient(180deg,rgba(255,255,255,.12),transparent)",borderRadius:"7px 7px 0 0"}}/>
                      <div style={{fontSize:10,fontWeight:800,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{slot.product}</div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:2}}>
                        {slot.die&&<span style={{fontSize:7,color:"rgba(255,255,255,.7)"}}>🔧{slot.die}</span>}
                        <span style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,.9)"}}>{slot.qty}</span>
                      </div>
                    </div>
                  </div>;
                })}
              </div>;
            })}
          </div>;
        })}
      </div>

      {/* Die Changes */}
      {weekPlan.die_changes?.length>0&&<div style={cd()}>
        <div style={{fontSize:13,fontWeight:800,color:P.or,marginBottom:8}}>🔄 Die Changes ({weekPlan.die_changes.length})</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {weekPlan.die_changes.map((dc,i)=><div key={i} style={{background:P.sf2,borderRadius:8,padding:"8px 12px",border:`1px solid ${P.or}20`}}>
            <div style={{fontSize:13,fontWeight:800,color:P.tx}}>{dc.machine}</div>
            <div style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
              <span style={{padding:"2px 6px",borderRadius:4,background:`${P.bl}20`,color:P.bl,fontSize:9,fontWeight:700}}>{dc.from}</span>
              <span style={{color:P.ac}}>→</span>
              <span style={{padding:"2px 6px",borderRadius:4,background:`${P.gn}20`,color:P.gn,fontSize:9,fontWeight:700}}>{dc.to}</span>
            </div>
            <div style={{fontSize:8,color:P.tm,marginTop:2}}>{dc.day} · ⏱ {dc.hours}h</div>
          </div>)}
        </div>
      </div>}

      {/* Revenue Projection */}
      {weekPlan.daily_revenue&&<div style={cd()}>
        <div style={{fontSize:13,fontWeight:800,color:P.tx,marginBottom:8}}>💰 Daily Revenue Projection</div>
        <div style={{display:"flex",gap:6}}>
          {DAYS.map(d=>{const rev=weekPlan.daily_revenue[d]||0;const pct=Math.min((rev/45e3)*100,120);
            return<div key={d} style={{flex:1,textAlign:"center"}}>
              <div style={{height:80,display:"flex",flexDirection:"column",justifyContent:"flex-end",position:"relative"}}>
                <div style={{position:"absolute",bottom:`${(45e3/55e3)*100}%`,left:0,right:0,height:1,background:P.ur,opacity:.3}}/>
                <div style={{background:rev>=45e3?P.gn:rev>30e3?P.ac:P.or,borderRadius:"5px 5px 0 0",height:`${Math.max((rev/55e3)*100,5)}%`,transition:"height .3s"}}/>
              </div>
              <div style={{fontSize:10,fontWeight:800,color:rev>=45e3?P.gn:P.tx,marginTop:3}}>${(rev/1e3).toFixed(0)}K</div>
              <div style={{fontSize:9,color:d==="Fri"?P.or:P.tm,fontWeight:d==="Fri"?700:400}}>{d}</div>
            </div>})}
        </div>
        <div style={{fontSize:7,color:P.ur,textAlign:"right",marginTop:2}}>— $45K target</div>
      </div>}

      {/* Warnings & Recommendations */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {weekPlan.warnings?.length>0&&<div style={{...cd(),flex:1,minWidth:250,border:`1px solid ${P.ur}20`}}>
          <div style={{fontSize:12,fontWeight:800,color:P.ur,marginBottom:4}}>⚠️ Warnings</div>
          {weekPlan.warnings.map((w,i)=><div key={i} style={{fontSize:10,color:P.or,padding:"3px 0"}}>• {w}</div>)}
        </div>}
        {weekPlan.recommendations?.length>0&&<div style={{...cd(),flex:1,minWidth:250,border:`1px solid ${P.gn}20`}}>
          <div style={{fontSize:12,fontWeight:800,color:P.gn,marginBottom:4}}>💡 Recommendations</div>
          {weekPlan.recommendations.map((r,i)=><div key={i} style={{fontSize:10,color:P.tx,padding:"3px 0"}}>• {r}</div>)}
        </div>}
      </div>
    </div>;
  };

  // ─── AI CHAT ──────────────────────────────────────────
  const renderChat=()=><div style={{display:"flex",flexDirection:"column",gap:10,height:"70vh"}}>
    <div style={{fontSize:16,fontWeight:900,color:P.ac}}>🤖 AI Assistant</div>
    <div style={{fontSize:10,color:P.tm}}>Ask about your production schedule, machine capacity, die changes, or anything else.</div>
    
    {/* Messages */}
    <div style={{flex:1,overflow:"auto",...cd({padding:12})}}>
      {aiChat.length===0&&<div style={{textAlign:"center",color:P.td,fontSize:11,padding:20}}>
        Ask me anything about your production schedule...<br/>
        Examples:<br/>
        "What should I prioritize this week?"<br/>
        "Which machines have capacity?"<br/>
        "How many die changes do we need?"
      </div>}
      {aiChat.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:8}}>
        <div style={{maxWidth:"80%",padding:"8px 12px",borderRadius:10,background:m.role==="user"?P.ac:`${P.bl}20`,color:m.role==="user"?"#000":P.tx,fontSize:11,lineHeight:1.5}}>
          {m.role==="ai"&&<span style={{fontSize:9,color:P.bl,fontWeight:700}}>🤖 AI: </span>}
          {m.text}
        </div>
      </div>)}
      {aiLoading&&<div style={{fontSize:10,color:P.ac,padding:8}}>🤖 Thinking...</div>}
    </div>

    {/* Input */}
    <div style={{display:"flex",gap:6}}>
      <input value={userMsg} onChange={e=>setUserMsg(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendAiMessage()}}
        placeholder="Ask about scheduling, capacity, priorities..."
        style={{flex:1,padding:"10px 14px",borderRadius:8,border:`1px solid ${P.bd2}`,background:P.sf2,color:P.tx,fontSize:12,outline:"none"}}/>
      <button onClick={sendAiMessage} disabled={aiLoading} style={bt("p")}>Send</button>
    </div>
  </div>;

  // ─── ORDERS TABLE ─────────────────────────────────────
  const[orderSearch,setOrderSearch]=useState("");
  const filteredOrders=useMemo(()=>{
    let o=allOrders.filter(o=>o.isCastable&&o.needed>0);
    if(orderSearch){const s=orderSearch.toLowerCase();o=o.filter(x=>(x.product||"").toLowerCase().includes(s)||(x.die||"").toLowerCase().includes(s)||(x.customer||"").toLowerCase().includes(s))}
    return o.sort((a,b)=>(a.shipDate||"9").localeCompare(b.shipDate||"9"));
  },[allOrders,orderSearch]);

  const renderOrders=()=><div style={{display:"flex",flexDirection:"column",gap:10}}>
    <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
      <div style={{fontSize:16,fontWeight:900,color:P.tx}}>📦 All Orders ({filteredOrders.length})</div>
      <input placeholder="Search product, die, customer..." value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${P.bd2}`,background:P.sf2,color:P.tx,fontSize:11,outline:"none",width:250}}/>
    </div>
    <div style={{...cd({padding:0}),overflow:"auto",maxHeight:500}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,minWidth:800}}>
        <thead><tr>{["Product","Customer","Description","Die","DCM","Need","On Hand","Ship Date","Revenue"].map((h,i)=>
          <th key={i} style={{padding:"6px",textAlign:"left",fontSize:8,fontWeight:700,color:P.tm,borderBottom:`2px solid ${P.bd}`,position:"sticky",top:0,background:P.sf,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
        <tbody>{filteredOrders.map((o,i)=>{const od=o.shipDate&&new Date(o.shipDate)<new Date();
          return<tr key={i} style={{background:od?`${P.ur}05`:"transparent"}}>
            <td style={{padding:"5px 6px",fontWeight:700,borderBottom:`1px solid ${P.bd}`,color:od?P.ur:P.tx}}>{o.product}</td>
            <td style={{padding:"5px 6px",fontSize:9,borderBottom:`1px solid ${P.bd}`,color:P.tm}}>{o.customer?.split(" ").slice(0,2).join(" ")}</td>
            <td style={{padding:"5px 6px",fontSize:9,borderBottom:`1px solid ${P.bd}`,color:P.tm,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.description}</td>
            <td style={{padding:"5px 6px",color:P.ac,borderBottom:`1px solid ${P.bd}`}}>{o.die||"—"}</td>
            <td style={{padding:"5px 6px",borderBottom:`1px solid ${P.bd}`}}>{o.dcm}</td>
            <td style={{padding:"5px 6px",fontWeight:700,borderBottom:`1px solid ${P.bd}`}}>{o.needed.toLocaleString()}</td>
            <td style={{padding:"5px 6px",borderBottom:`1px solid ${P.bd}`,color:o.onHand>0?P.gn:P.td}}>{o.onHand.toLocaleString()}</td>
            <td style={{padding:"5px 6px",borderBottom:`1px solid ${P.bd}`,color:od?P.ur:P.tx,fontWeight:od?700:400}}>{o.shipDate}</td>
            <td style={{padding:"5px 6px",color:P.gn,fontWeight:600,borderBottom:`1px solid ${P.bd}`}}>${o.dollars.toLocaleString()}</td>
          </tr>})}</tbody>
      </table>
    </div>
  </div>;

  const pages={home:renderHome,dashboard:renderDash,gantt:renderGantt,chat:renderChat,orders:renderOrders};

  // ═════════════════════════════════════════════════════
  return(
    <div style={{minHeight:"100vh",background:P.bg,color:P.tx,fontFamily:"'Segoe UI',-apple-system,sans-serif"}}>
      <Head><title>CastFlow AI — NIDC</title><meta name="viewport" content="width=device-width, initial-scale=1"/></Head>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:${P.sf}}::-webkit-scrollbar-thumb{background:${P.bd2};border-radius:3px}select option{background:${P.sf2};color:${P.tx}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Top Bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px",background:P.sf,borderBottom:`1px solid ${P.bd}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:30,height:30,borderRadius:7,background:`linear-gradient(135deg,${P.ac},${P.or})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:10,color:"#000"}}>AI</div>
          <div><div style={{fontSize:13,fontWeight:800}}>CastFlow AI — NIDC</div>
            {fileName&&<div style={{fontSize:8,color:P.ac}}>📁 {fileName} · {allOrders.length} orders</div>}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {allOrders.length>0&&<button onClick={()=>fileRef.current?.click()} style={bt("o")}>📂 New File</button>}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>{handleFile(e.target.files[0]);e.target.value=""}}/>
          <button onClick={()=>setLang(l=>l==="en"?"es":"en")} style={bt("o")}>{lang==="en"?"🇺🇸":"🇲🇽"}</button>
        </div>
      </div>

      {/* Nav */}
      {allOrders.length>0&&<div style={{display:"flex",gap:2,padding:"5px 16px",background:P.sf,borderBottom:`1px solid ${P.bd}`,overflowX:"auto"}}>
        {[{id:"dashboard",ic:"📊",l:"Dashboard"},{id:"gantt",ic:"🏭",l:"Schedule"},{id:"chat",ic:"🤖",l:"AI Chat"},{id:"orders",ic:"📦",l:"Orders"}].map(n=>
          <button key={n.id} onClick={()=>setPage(n.id)} style={pill(page===n.id)}><span style={{fontSize:12}}>{n.ic}</span>{n.l}</button>)}
      </div>}

      <div style={{padding:"14px 16px",maxWidth:1400,margin:"0 auto"}}>{(pages[page]||renderHome)()}</div>

      {toast&&<div style={{position:"fixed",bottom:16,right:16,zIndex:2e3,background:P.gn,color:"#fff",padding:"8px 18px",borderRadius:8,fontWeight:700,fontSize:11,boxShadow:"0 4px 16px rgba(0,0,0,.3)"}}>{toast}</div>}
    </div>
  );
}

export default function Home(){return<CastFlow/>}
