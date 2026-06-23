import { useState, useRef, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const APP_NAME="Caja Acerk"; const APP_ICON="🖨️";

// ─── SUPABASE CONNECTION ──────────────────────────────────────────────────────
const SUPABASE_URL="https://exwfrjasmwaljrolkhw.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4d2ZyamFzbXdhbGpyb2xqa2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MzMxNjQsImV4cCI6MjA5NzUwOTE2NH0.2YQ4hZTHu2ftBtY8lQ9YsJ8rIqkLx8xc2vva5Sxt0t4";

async function sbRequest(path,options={}){
  const url=`${SUPABASE_URL}/rest/v1/${path}`;
  const headers={
    "apikey":SUPABASE_ANON_KEY,
    "Authorization":`Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type":"application/json",
    "Prefer":options.prefer||"return=representation",
    ...options.headers,
  };
  const res=await fetch(url,{...options,headers});
  if(!res.ok){
    const errText=await res.text().catch(()=>res.statusText);
    throw new Error(`Supabase error (${res.status}): ${errText}`);
  }
  const text=await res.text();
  return text?JSON.parse(text):null;
}

const sb={
  select:(table,query="")=>sbRequest(`${table}?select=*${query}`),
  insert:(table,data)=>sbRequest(table,{method:"POST",body:JSON.stringify(data)}),
  update:(table,id,data,idCol="id")=>sbRequest(`${table}?${idCol}=eq.${id}`,{method:"PATCH",body:JSON.stringify(data)}),
  remove:(table,id,idCol="id")=>sbRequest(`${table}?${idCol}=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}),
};

// ─── MAPEO: snake_case (BD) <-> camelCase (app) ───────────────────────────────
const userFromDB=(u)=>({id:u.id,name:u.name,email:u.email,password:u.password,role:u.role,avatar:u.avatar});
const userToDB=(u)=>({name:u.name,email:u.email,password:u.password,role:u.role,avatar:u.avatar});

const productoFromDB=(p)=>({id:p.id,nombre:p.nombre,categoria:p.categoria,precioBase:Number(p.precio_base),unidad:p.unidad});
const productoToDB=(p)=>({nombre:p.nombre,categoria:p.categoria,precio_base:p.precioBase,unidad:p.unidad});

const clienteFromDB=(c)=>({id:c.id,nombre:c.nombre,rfc:c.rfc||"",tel:c.tel||"",email:c.email||"",ciudad:c.ciudad||""});
const clienteToDB=(c)=>({nombre:c.nombre,rfc:c.rfc,tel:c.tel,email:c.email,ciudad:c.ciudad});

const notaFromDB=(n)=>({
  id:n.id,
  clienteId:n.cliente_id,
  clienteInline:n.cliente_inline||null,
  vendedorId:n.vendedor_id,
  fecha:n.fecha,
  vencimiento:n.vencimiento||"",
  estado:n.estado,
  anticipo:Number(n.anticipo||0),
  metodoPago:n.metodo_pago||"efectivo",
  items:n.items||[],
  notas:n.notas||"",
});
const notaToDB=(n)=>({
  cliente_id:n.clienteInline?null:n.clienteId,
  cliente_inline:n.clienteInline||null,
  vendedor_id:n.vendedorId,
  fecha:n.fecha,
  vencimiento:n.vencimiento||null,
  estado:n.estado,
  anticipo:n.anticipo||0,
  metodo_pago:n.metodoPago||"efectivo",
  items:n.items,
  notas:n.notas||"",
});

const gastoFromDB=(g)=>({id:g.id,concepto:g.concepto,categoria:g.categoria,monto:Number(g.monto),fecha:g.fecha,metodoPago:g.metodo_pago||"efectivo",notas:g.notas||""});
const gastoToDB=(g)=>({concepto:g.concepto,categoria:g.categoria,monto:g.monto,fecha:g.fecha,metodo_pago:g.metodoPago||"efectivo",notas:g.notas||""});

// ─── BREAKPOINT HOOK ─────────────────────────────────────────────────────────
function useBreakpoint(){
  const [w,setW]=useState(window.innerWidth);
  useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return{isMobile:w<640,isTablet:w>=640&&w<1024,isDesktop:w>=1024,w};
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const INIT_USERS=[
  {id:1,name:"Admin General", email:"admin@acerk.com", password:"admin123", role:"admin",   avatar:"AG"},
  {id:2,name:"Carlos Mendoza",email:"carlos@acerk.com",password:"carlos123",role:"vendedor",avatar:"CM"},
  {id:3,name:"Laura Reyes",   email:"laura@acerk.com", password:"laura123", role:"vendedor",avatar:"LR"},
];
const INIT_PRODUCTOS=[
  {id:1,nombre:"Tarjetas de Presentación",categoria:"Offset",      precioBase:350, unidad:"millar"},
  {id:2,nombre:"Folletos Tamaño Carta",   categoria:"Offset",      precioBase:1200,unidad:"millar"},
  {id:3,nombre:"Lonas Publicitarias",     categoria:"Gran Formato",precioBase:85,  unidad:"m2"},
  {id:4,nombre:"Flyers 1/2 Carta",        categoria:"Digital",     precioBase:450, unidad:"millar"},
  {id:5,nombre:"Revistas / Catálogos",    categoria:"Offset",      precioBase:8500,unidad:"ciento"},
  {id:6,nombre:"Etiquetas Adhesivas",     categoria:"Digital",     precioBase:280, unidad:"rollo"},
  {id:7,nombre:"Banners Enrollables",     categoria:"Gran Formato",precioBase:650, unidad:"pieza"},
  {id:8,nombre:"Carpetas Corporativas",   categoria:"Offset",      precioBase:1800,unidad:"ciento"},
];
const INIT_CLIENTES=[
  {id:1,nombre:"Grupo Empresarial Norte",rfc:"GEN9801234AB1",tel:"6671234567",email:"contacto@gen.mx",     ciudad:"Culiacán"},
  {id:2,nombre:"Farmacia San Rafael",    rfc:"FSR0212345CD2",tel:"6672345678",email:"compras@sanrafael.mx",ciudad:"Mazatlán"},
  {id:3,nombre:"Constructora Pacífico",  rfc:"CPP1523456EF3",tel:"6673456789",email:"admin@cppacifico.mx", ciudad:"Los Mochis"},
  {id:4,nombre:"Restaurante El Rancho",  rfc:"RER0834567GH4",tel:"6674567890",email:"info@elrancho.mx",    ciudad:"Culiacán"},
  {id:5,nombre:"Centro Comercial Plaza", rfc:"CCP1145678IJ5",tel:"6675678901",email:"compras@ccplaza.mx",  ciudad:"Guasave"},
];
const INIT_NOTAS=[
  {id:"NV-001",clienteId:1,clienteInline:null,vendedorId:2,fecha:"2026-01-15",vencimiento:"2026-01-30",estado:"aprobada", anticipo:300,metodoPago:"efectivo",items:[{productoId:1,cantidad:5,precioUnit:350,descuento:5,base:"",altura:""},{productoId:4,cantidad:2,precioUnit:450,descuento:0,base:"",altura:""}],notas:"Entrega urgente"},
  {id:"NV-002",clienteId:2,clienteInline:null,vendedorId:3,fecha:"2026-01-20",vencimiento:"2026-02-04",estado:"pendiente",anticipo:0,metodoPago:"efectivo",items:[{productoId:3,cantidad:1,precioUnit:85,descuento:10,base:"3",altura:"4"}],notas:""},
  {id:"NV-003",clienteId:3,clienteInline:null,vendedorId:2,fecha:"2026-02-05",vencimiento:"2026-02-20",estado:"cobrada",  anticipo:0,metodoPago:"transferencia",items:[{productoId:5,cantidad:1,precioUnit:8500,descuento:0,base:"",altura:""},{productoId:8,cantidad:2,precioUnit:1800,descuento:5,base:"",altura:""}],notas:"Con logotipo"},
  {id:"NV-004",clienteId:4,clienteInline:null,vendedorId:3,fecha:"2026-02-18",vencimiento:"2026-03-04",estado:"rechazada",anticipo:0,metodoPago:"efectivo",items:[{productoId:7,cantidad:3,precioUnit:650,descuento:0,base:"",altura:""}],notas:""},
  {id:"NV-005",clienteId:5,clienteInline:null,vendedorId:2,fecha:"2026-03-01",vencimiento:"2026-03-16",estado:"aprobada", anticipo:1000,metodoPago:"tarjeta",items:[{productoId:2,cantidad:3,precioUnit:1200,descuento:8,base:"",altura:""},{productoId:6,cantidad:5,precioUnit:280,descuento:0,base:"",altura:""}],notas:"2 tintas"},
  {id:"NV-006",clienteId:1,clienteInline:null,vendedorId:2,fecha:"2026-03-10",vencimiento:"2026-03-25",estado:"cobrada",  anticipo:0,metodoPago:"efectivo",items:[{productoId:1,cantidad:10,precioUnit:350,descuento:10,base:"",altura:""}],notas:""},
  {id:"NV-007",clienteId:2,clienteInline:null,vendedorId:3,fecha:"2026-04-02",vencimiento:"2026-04-17",estado:"pendiente",anticipo:0,metodoPago:"efectivo",items:[{productoId:4,cantidad:8,precioUnit:450,descuento:5,base:"",altura:""}],notas:""},
  {id:"NV-008",clienteId:3,clienteInline:null,vendedorId:2,fecha:"2026-04-15",vencimiento:"2026-04-30",estado:"cobrada",  anticipo:0,metodoPago:"transferencia",items:[{productoId:3,cantidad:2,precioUnit:85,descuento:15,base:"5",altura:"2"}],notas:"Lona para feria"},
  {id:"NV-009",clienteId:5,clienteInline:null,vendedorId:3,fecha:"2026-05-03",vencimiento:"2026-05-18",estado:"aprobada", anticipo:2000,metodoPago:"transferencia",items:[{productoId:8,cantidad:5,precioUnit:1800,descuento:0,base:"",altura:""}],notas:""},
  {id:"NV-010",clienteId:4,clienteInline:null,vendedorId:2,fecha:"2026-05-20",vencimiento:"2026-06-04",estado:"pendiente",anticipo:0,metodoPago:"efectivo",items:[{productoId:7,cantidad:2,precioUnit:650,descuento:0,base:"",altura:""},{productoId:1,cantidad:3,precioUnit:350,descuento:0,base:"",altura:""}],notas:""},
];
const CAT_GASTOS=["Materia Prima","Nómina","Renta","Servicios","Equipo","Mantenimiento","Marketing","Transporte","Impuestos","Otros"];
const INIT_GASTOS=[
  {id:1,concepto:"Tinta y sustratos",   categoria:"Materia Prima",monto:4200,fecha:"2026-01-08",notas:"",metodoPago:"efectivo"},
  {id:2,concepto:"Nómina enero",        categoria:"Nómina",       monto:8500,fecha:"2026-01-31",notas:"",metodoPago:"transferencia"},
  {id:3,concepto:"Renta taller",        categoria:"Renta",        monto:6000,fecha:"2026-02-01",notas:"",metodoPago:"transferencia"},
  {id:4,concepto:"Mantenimiento plotter",categoria:"Mantenimiento",monto:1800,fecha:"2026-02-14",notas:"",metodoPago:"efectivo"},
  {id:5,concepto:"Nómina febrero",      categoria:"Nómina",       monto:8500,fecha:"2026-02-28",notas:"",metodoPago:"transferencia"},
  {id:6,concepto:"Electricidad",        categoria:"Servicios",    monto:2100,fecha:"2026-03-05",notas:"",metodoPago:"tarjeta"},
  {id:7,concepto:"Insumos digitales",   categoria:"Materia Prima",monto:3500,fecha:"2026-03-12",notas:"",metodoPago:"tarjeta"},
  {id:8,concepto:"Nómina marzo",        categoria:"Nómina",       monto:8500,fecha:"2026-03-31",notas:"",metodoPago:"transferencia"},
  {id:9,concepto:"Renta taller",        categoria:"Renta",        monto:6000,fecha:"2026-04-01",notas:"",metodoPago:"transferencia"},
  {id:10,concepto:"Nómina abril",       categoria:"Nómina",       monto:8500,fecha:"2026-04-30",notas:"",metodoPago:"transferencia"},
  {id:11,concepto:"Papelería offset",   categoria:"Materia Prima",monto:5100,fecha:"2026-05-03",notas:"",metodoPago:"efectivo"},
  {id:12,concepto:"Nómina mayo",        categoria:"Nómina",       monto:8500,fecha:"2026-05-31",notas:"",metodoPago:"transferencia"},
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const isGF=(pid,prods)=>{const p=prods?.find(p=>p.id===pid);return p?.categoria==="Gran Formato"&&p?.unidad==="m2";};
const getM2=(it)=>parseFloat(it.base||0)*parseFloat(it.altura||0);
const calcSubtotal=(it,prods)=>{if(isGF(it.productoId,prods)){return it.cantidad*getM2(it)*it.precioUnit*(1-it.descuento/100);}return it.cantidad*it.precioUnit*(1-it.descuento/100);};
const calcTotal=(items,prods)=>items.reduce((s,it)=>s+calcSubtotal(it,prods),0);
const fmt=(n)=>n.toLocaleString("es-MX",{style:"currency",currency:"MXN"});
const mkAvatar=(n="")=>n.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
const eColor={pendiente:"#F59E0B",aprobada:"#10B981",rechazada:"#EF4444",cobrada:"#6366F1"};
const eLabel={pendiente:"Pendiente",aprobada:"Aprobada",rechazada:"Rechazada",cobrada:"Cobrada"};
const CATS=["Offset","Digital","Gran Formato","Serigrafía","Sublimación"];
const resolveCliente=(nv,cls)=>nv.clienteInline||cls.find(c=>c.id===nv.clienteId)||{nombre:"—",rfc:"",tel:"",email:"",ciudad:""};

// Métodos de pago
const METODOS_PAGO=["efectivo","transferencia","tarjeta"];
const metodoLabel={efectivo:"Efectivo",transferencia:"Transferencia",tarjeta:"Tarjeta"};
const metodoIcon={efectivo:"💵",transferencia:"🏦",tarjeta:"💳"};
const metodoColor={efectivo:"#10B981",transferencia:"#6366F1",tarjeta:"#F59E0B"};

// Anticipo / cobro helpers
// anticipo = monto pagado por adelantado (se reconoce como ingreso de inmediato)
// el resto del total (total - anticipo) es "cuenta por cobrar" hasta que estado === "cobrada"
const getAnticipo=(n)=>parseFloat(n.anticipo||0);
const getSaldoPendiente=(n,prods)=>Math.max(0,calcTotal(n.items,prods)-getAnticipo(n));
// Ingreso reconocido de una nota: si está cobrada, reconoce el total; si no, solo el anticipo
const getIngresoReconocido=(n,prods)=>n.estado==="cobrada"?calcTotal(n.items,prods):getAnticipo(n);
// Cuenta por cobrar: saldo pendiente de notas no cobradas (pero con anticipo o aprobadas)
const getCuentaPorCobrar=(n,prods)=>n.estado==="cobrada"?0:getSaldoPendiente(n,prods);

const buildTicketText=(nv,cls,prods,vend)=>{
  const cl=resolveCliente(nv,cls);
  let t=`🖨️ *${APP_NAME} — Nota de Venta*\n━━━━━━━━━━━━━━━━━\n`;
  t+=`📋 *${nv.id}* | ${nv.fecha}\n👤 *${cl.nombre}*\n`;
  if(cl.rfc)t+=`RFC: ${cl.rfc}\n`;
  if(cl.ciudad)t+=`Ciudad: ${cl.ciudad}\n`;
  t+=`🧑‍💼 ${vend?.name||"—"}\n━━━━━━━━━━━━━━━━━\n`;
  nv.items.forEach(it=>{
    const p=prods.find(p=>p.id===it.productoId);
    const gf=isGF(it.productoId,prods);
    t+=`▸ *${p?.nombre||"—"}*\n`;
    if(gf){const m2=getM2(it);t+=`  ${it.cantidad}pza × ${it.base}×${it.altura}m (${m2.toFixed(2)}m²) × ${fmt(it.precioUnit)}/m²`;}
    else t+=`  ${it.cantidad} ${p?.unidad||""} × ${fmt(it.precioUnit)}`;
    if(it.descuento>0)t+=` (-${it.descuento}%)`;
    t+=`\n  → ${fmt(calcSubtotal(it,prods))}\n`;
  });
  t+=`━━━━━━━━━━━━━━━━━\n💰 *TOTAL: ${fmt(calcTotal(nv.items,prods))}*\n`;
  t+=`Estado: ${eLabel[nv.estado]}\n`;
  if(nv.notas)t+=`📝 ${nv.notas}\n`;
  t+=`━━━━━━━━━━━━━━━━━\nGracias por su preferencia 🙏`;
  return t;
};


// ─── SHARED UI ────────────────────────────────────────────────────────────────
const IS={width:"100%",background:"#0F1117",border:"1px solid #1E2535",borderRadius:10,padding:"10px 14px",color:"#E2E8F0",fontSize:13};
const Label=({children})=><div style={{fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:.8,marginBottom:6}}>{children}</div>;
const FInput=({label,value,onChange,type="text",placeholder="",onEnter,disabled})=>(
  <div><Label>{label}</Label><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} onKeyDown={onEnter?e=>e.key==="Enter"&&onEnter():undefined} style={{...IS,opacity:disabled?.5:1}}/></div>
);
const RawInput=({value,onChange,type="text",min,max,placeholder=""})=>(<input type={type} value={value} onChange={e=>onChange(e.target.value)} min={min} max={max} placeholder={placeholder} style={IS}/>);
const Sel=({value,onChange,children})=>(<select value={value} onChange={e=>onChange(e.target.value)} style={{...IS,appearance:"none"}}>{children}</select>);

function Modal({onClose,title,children,width=560}){
  const {isMobile}=useBreakpoint();
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:1000,padding:isMobile?0:16}}>
      <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:isMobile?"20px 20px 0 0":20,width:"100%",maxWidth:isMobile?"100%":width,maxHeight:isMobile?"92vh":"90vh",overflow:"auto",padding:isMobile?"20px 16px 24px":28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800}}>{title}</h3>
          <button onClick={onClose} style={{background:"rgba(239,68,68,.12)",border:"none",borderRadius:8,color:"#EF4444",width:30,height:30,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Btn({title,onClick,color,icon,label,small}){
  return(
    <button title={title} onClick={onClick} style={{display:"flex",alignItems:"center",gap:5,padding:label?"7px 12px":"0",width:label?"auto":small?26:30,height:small?26:30,justifyContent:"center",borderRadius:8,border:"none",background:color+"20",color,fontSize:small?11:13,fontWeight:600,whiteSpace:"nowrap"}}>
      <span>{icon}</span>{label&&<span style={{fontSize:12}}>{label}</span>}
    </button>
  );
}
function SaveCancelBtns({onSave,onClose,saveLabel="Guardar"}){
  return(
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20,flexWrap:"wrap"}}>
      <button onClick={onClose} style={{padding:"10px 20px",background:"#1E2535",border:"none",borderRadius:10,color:"#94A3B8",fontWeight:600}}>Cancelar</button>
      <button onClick={onSave} style={{padding:"10px 24px",background:"linear-gradient(135deg,#6366F1,#8B5CF6)",border:"none",borderRadius:10,color:"#fff",fontWeight:700}}>{saveLabel}</button>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({label,value,sub,color,icon}){
  return(
    <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:12,right:12,fontSize:20,opacity:.45}}>{icon}</div>
      <div style={{color:"#64748B",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:6}}>{label}</div>
      <div style={{fontSize:20,fontWeight:700,color}}>{value}</div>
      {sub&&<div style={{color:"#475569",fontSize:11,marginTop:3}}>{sub}</div>}
      <div style={{position:"absolute",bottom:0,left:0,width:"100%",height:3,background:color,opacity:.45}}/>
    </div>
  );
}

// ─── NOTE CARD (mobile list view) ─────────────────────────────────────────────
function NotaCard({n,clientes,productos,users,onView,onEdit,onWA,onEstado,canEdit}){
  const cl=resolveCliente(n,clientes);
  const vend=users.find(u=>u.id===n.vendedorId);
  const total=calcTotal(n.items,productos);
  const saldo=getCuentaPorCobrar(n,productos);
  return(
    <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:16,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div>
          <div style={{color:"#818CF8",fontWeight:800,fontSize:14}}>{n.id}</div>
          <div style={{fontWeight:600,fontSize:15,marginTop:2}}>{cl.nombre}</div>
          {cl.tel&&<div style={{fontSize:12,color:"#64748B",marginTop:1}}>📞 {cl.tel}</div>}
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontWeight:800,fontSize:16,color:"#10B981"}}>{fmt(total)}</div>
          <div style={{fontSize:11,color:"#64748B",marginTop:2}}>{n.fecha}</div>
        </div>
      </div>
      {saldo>0&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",borderRadius:8,padding:"6px 10px",marginBottom:10,fontSize:11}}>
          <span style={{color:"#94A3B8"}}>Anticipo: <strong style={{color:"#10B981"}}>{fmt(getAnticipo(n))}</strong></span>
          <span style={{color:"#F59E0B",fontWeight:700}}>Por cobrar: {fmt(saldo)}</span>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        {canEdit?(
          <select value={n.estado} onChange={e=>onEstado(n.id,e.target.value)}
            style={{background:eColor[n.estado]+"18",color:eColor[n.estado],border:`1px solid ${eColor[n.estado]}55`,borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:700,appearance:"none",WebkitAppearance:"none",outline:"none"}}>
            {Object.entries(eLabel).map(([k,v])=><option key={k} value={k} style={{background:"#161B27",color:"#E2E8F0"}}>{v}</option>)}
          </select>
        ):(
          <span style={{background:eColor[n.estado]+"22",color:eColor[n.estado],padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:700}}>{eLabel[n.estado]}</span>
        )}
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>onView(n)} style={{padding:"7px 12px",borderRadius:8,border:"none",background:"rgba(129,140,248,.15)",color:"#818CF8",fontWeight:700,fontSize:12}}>🧾 Ver</button>
          <button onClick={()=>onWA(n)} style={{padding:"7px 12px",borderRadius:8,border:"1px solid rgba(37,211,102,.4)",background:"rgba(37,211,102,.12)",color:"#25D366",fontWeight:700,fontSize:12}}>💬 WA</button>
          {canEdit&&<button onClick={()=>onEdit(n)} style={{padding:"7px 12px",borderRadius:8,border:"none",background:"rgba(245,158,11,.15)",color:"#F59E0B",fontWeight:700,fontSize:12}}>✏️</button>}
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({data,setData,onLogin,err,users}){
  const {isMobile}=useBreakpoint();
  return(
    <div style={{minHeight:"100vh",background:"#0F1117",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",padding:16}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet"/>
      <div style={{width:"100%",maxWidth:420,background:"#161B27",borderRadius:20,padding:isMobile?"28px 20px":"48px 40px",border:"1px solid #1E2535",boxShadow:"0 24px 80px rgba(0,0,0,.6)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:56,height:56,background:"linear-gradient(135deg,#6366F1,#8B5CF6)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:26}}>{APP_ICON}</div>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:isMobile?24:28,fontWeight:800,color:"#E2E8F0"}}>{APP_NAME}</h1>
          <p style={{color:"#64748B",fontSize:13,marginTop:4}}>Sistema de Notas de Venta & Cobro</p>
        </div>
        <FInput label="Correo" value={data.email} onChange={v=>setData(d=>({...d,email:v}))} type="email" placeholder="usuario@acerk.com"/>
        <div style={{marginTop:14}}><FInput label="Contraseña" value={data.password} onChange={v=>setData(d=>({...d,password:v}))} type="password" placeholder="••••••••" onEnter={onLogin}/></div>
        {err&&<div style={{marginTop:12,color:"#EF4444",fontSize:12,textAlign:"center"}}>{err}</div>}
        <button onClick={onLogin} style={{marginTop:20,width:"100%",padding:"13px",background:"linear-gradient(135deg,#6366F1,#8B5CF6)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:15}}>Iniciar sesión</button>
        <div style={{marginTop:20,background:"#0F1117",borderRadius:10,padding:12}}>
          <p style={{color:"#64748B",fontSize:11,marginBottom:8,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Demo</p>
          {users.map(u=>(
            <div key={u.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94A3B8",padding:"2px 0",flexWrap:"wrap",gap:4}}>
              <span>{u.email}</span><span style={{color:"#6366F1"}}>{u.password}</span><span style={{color:u.role==="admin"?"#EF4444":"#10B981",textTransform:"capitalize"}}>{u.role}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}input,select{outline:none!important}`}</style>
    </div>
  );
}

// ─── BOTTOM NAV (mobile) ──────────────────────────────────────────────────────
const NAV=[
  {id:"dashboard", label:"Dashboard",    icon:"🏠"},
  {id:"notas",     label:"Notas",         icon:"🧾"},
  {id:"gastos",    label:"Gastos",        icon:"💸"},
  {id:"ventas",    label:"Ventas",        icon:"📊"},
  {id:"admin",     label:"Admin",         icon:"⚙️",adminOnly:true},
];
function BottomNav({section,setSection,role}){
  const items=NAV.filter(n=>!n.adminOnly||role==="admin");
  return(
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#161B27",borderTop:"1px solid #1E2535",display:"flex",zIndex:200,paddingBottom:"env(safe-area-inset-bottom)"}}>
      {items.map(it=>(
        <button key={it.id} onClick={()=>setSection(it.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 4px 8px",border:"none",background:"transparent",color:section===it.id?"#818CF8":"#64748B",fontSize:9,fontWeight:700,gap:3,textTransform:"uppercase",letterSpacing:.5}}>
          <span style={{fontSize:20}}>{it.icon}</span>{it.label}
          {section===it.id&&<div style={{width:20,height:2,background:"#6366F1",borderRadius:2,marginTop:1}}/>}
        </button>
      ))}
    </div>
  );
}
function Sidebar({open,section,setSection,role,onLogout}){
  const items=NAV.filter(n=>!n.adminOnly||role==="admin");
  return(
    <div style={{width:open?234:64,background:"#161B27",borderRight:"1px solid #1E2535",display:"flex",flexDirection:"column",transition:"width .25s ease",flexShrink:0,overflow:"hidden"}}>
      <div style={{padding:open?"22px 20px":"22px 14px",borderBottom:"1px solid #1E2535",display:"flex",alignItems:"center",gap:10,minHeight:68}}>
        <div style={{width:36,height:36,background:"linear-gradient(135deg,#6366F1,#8B5CF6)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{APP_ICON}</div>
        {open&&<span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:"#E2E8F0",whiteSpace:"nowrap"}}>{APP_NAME}</span>}
      </div>
      <nav style={{flex:1,padding:"12px 8px"}}>
        {items.map(it=>(
          <button key={it.id} onClick={()=>setSection(it.id)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:open?"10px 12px":"10px",borderRadius:10,border:"none",background:section===it.id?"linear-gradient(135deg,rgba(99,102,241,.25),rgba(139,92,246,.15))":"transparent",color:section===it.id?"#818CF8":"#64748B",fontWeight:600,fontSize:13,transition:"all .2s",marginBottom:2,justifyContent:open?"flex-start":"center",borderLeft:section===it.id?"3px solid #6366F1":"3px solid transparent"}}>
            <span style={{fontSize:16,flexShrink:0}}>{it.icon}</span>{open&&<span style={{whiteSpace:"nowrap"}}>{it.label}</span>}
          </button>
        ))}
      </nav>
      <div style={{padding:"12px 8px",borderTop:"1px solid #1E2535"}}>
        <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:open?"10px 12px":"10px",borderRadius:10,border:"none",background:"transparent",color:"#EF4444",fontWeight:600,fontSize:13,justifyContent:open?"flex-start":"center"}}>
          <span style={{fontSize:16}}>🚪</span>{open&&<span>Salir</span>}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function CajaAcerk(){
  const [users,setUsers]=useState([]);
  const [productos,setProductos]=useState([]);
  const [clientes,setClientes]=useState([]);
  const [notas,setNotas]=useState([]);
  const [gastos,setGastos]=useState([]);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [currentUser,setCurrentUser]=useState(null);
  const [section,setSection]=useState("dashboard");
  const [sideOpen,setSideOpen]=useState(true);
  const [loginData,setLoginData]=useState({email:"",password:""});
  const [loginErr,setLoginErr]=useState("");
  const [toast,setToast]=useState(null);
  const toastTimer=useRef(null);
  const {isMobile,isTablet}=useBreakpoint();

  // Carga inicial de datos desde Supabase
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const [uRes,pRes,cRes,nRes,gRes]=await Promise.all([
          sb.select("usuarios"),
          sb.select("productos"),
          sb.select("clientes"),
          sb.select("notas_venta"),
          sb.select("gastos"),
        ]);
        if(cancelled)return;
        setUsers((uRes||[]).map(userFromDB));
        setProductos((pRes||[]).map(productoFromDB));
        setClientes((cRes||[]).map(clienteFromDB));
        setNotas((nRes||[]).map(notaFromDB));
        setGastos((gRes||[]).map(gastoFromDB));
        setLoading(false);
      }catch(err){
        if(cancelled)return;
        console.error("Error cargando datos de Supabase:",err);
        setLoadError(err.message||"Error de conexión con la base de datos");
        setLoading(false);
      }
    })();
    return()=>{cancelled=true;};
  },[]);

  const showToast=(msg,type="success")=>{clearTimeout(toastTimer.current);setToast({msg,type});toastTimer.current=setTimeout(()=>setToast(null),3000);};
  const login=()=>{const u=users.find(u=>u.email===loginData.email&&u.password===loginData.password);if(u){setCurrentUser(u);}else setLoginErr("Correo o contraseña incorrectos");};
  const logout=()=>{setCurrentUser(null);setSection("dashboard");setLoginData({email:"",password:""});};
  const visibleNotas=currentUser?.role==="vendedor"?notas.filter(n=>n.vendedorId===currentUser.id):notas;

  // ── CRUD: Notas de Venta ──
  const dbCreateNota=async(nv)=>{
    const row=await sb.insert("notas_venta",{id:nv.id,...notaToDB(nv)});
    return notaFromDB(row[0]);
  };
  const dbUpdateNota=async(id,nv)=>{
    const row=await sb.update("notas_venta",id,notaToDB(nv));
    return notaFromDB(row[0]);
  };
  const dbDeleteNota=(id)=>sb.remove("notas_venta",id);

  // ── CRUD: Gastos ──
  const dbCreateGasto=async(g)=>{const row=await sb.insert("gastos",gastoToDB(g));return gastoFromDB(row[0]);};
  const dbUpdateGasto=async(id,g)=>{const row=await sb.update("gastos",id,gastoToDB(g));return gastoFromDB(row[0]);};
  const dbDeleteGasto=(id)=>sb.remove("gastos",id);

  // ── CRUD: Usuarios ──
  const dbCreateUser=async(u)=>{const row=await sb.insert("usuarios",userToDB(u));return userFromDB(row[0]);};
  const dbUpdateUser=async(id,u)=>{const row=await sb.update("usuarios",id,userToDB(u));return userFromDB(row[0]);};
  const dbDeleteUser=(id)=>sb.remove("usuarios",id);

  // ── CRUD: Productos ──
  const dbCreateProducto=async(p)=>{const row=await sb.insert("productos",productoToDB(p));return productoFromDB(row[0]);};
  const dbUpdateProducto=async(id,p)=>{const row=await sb.update("productos",id,productoToDB(p));return productoFromDB(row[0]);};
  const dbDeleteProducto=(id)=>sb.remove("productos",id);

  // ── CRUD: Clientes ──
  const dbCreateCliente=async(c)=>{const row=await sb.insert("clientes",clienteToDB(c));return clienteFromDB(row[0]);};
  const dbUpdateCliente=async(id,c)=>{const row=await sb.update("clientes",id,clienteToDB(c));return clienteFromDB(row[0]);};
  const dbDeleteCliente=(id)=>sb.remove("clientes",id);

  // ── Setters "inteligentes": detectan create/update/delete comparando con el estado anterior
  // y sincronizan con Supabase automáticamente, sin tener que tocar cada componente hijo.
  const syncSetNotas=(updater)=>{
    setNotas(prev=>{
      const next=typeof updater==="function"?updater(prev):updater;
      (async()=>{
        try{
          const prevIds=new Set(prev.map(x=>x.id));
          const nextIds=new Set(next.map(x=>x.id));
          // eliminados
          for(const id of prevIds){if(!nextIds.has(id))await dbDeleteNota(id);}
          // creados o actualizados
          for(const item of next){
            const before=prev.find(x=>x.id===item.id);
            if(!before)await dbCreateNota(item);
            else if(JSON.stringify(before)!==JSON.stringify(item))await dbUpdateNota(item.id,item);
          }
        }catch(err){console.error("Error sincronizando notas con Supabase:",err);showToast("Error al guardar en la base de datos","error");}
      })();
      return next;
    });
  };
  const syncSetGastos=(updater)=>{
    setGastos(prev=>{
      const next=typeof updater==="function"?updater(prev):updater;
      (async()=>{
        try{
          const prevIds=new Set(prev.map(x=>x.id));
          const nextIds=new Set(next.map(x=>x.id));
          for(const id of prevIds){if(!nextIds.has(id))await dbDeleteGasto(id);}
          for(const item of next){
            const before=prev.find(x=>x.id===item.id);
            if(!before){const created=await dbCreateGasto(item);item.id=created.id;}
            else if(JSON.stringify(before)!==JSON.stringify(item))await dbUpdateGasto(item.id,item);
          }
        }catch(err){console.error("Error sincronizando gastos con Supabase:",err);showToast("Error al guardar en la base de datos","error");}
      })();
      return next;
    });
  };
  const syncSetUsers=(updater)=>{
    setUsers(prev=>{
      const next=typeof updater==="function"?updater(prev):updater;
      (async()=>{
        try{
          const prevIds=new Set(prev.map(x=>x.id));
          const nextIds=new Set(next.map(x=>x.id));
          for(const id of prevIds){if(!nextIds.has(id))await dbDeleteUser(id);}
          for(const item of next){
            const before=prev.find(x=>x.id===item.id);
            if(!before){const created=await dbCreateUser(item);item.id=created.id;}
            else if(JSON.stringify(before)!==JSON.stringify(item))await dbUpdateUser(item.id,item);
          }
        }catch(err){console.error("Error sincronizando usuarios con Supabase:",err);showToast("Error al guardar en la base de datos","error");}
      })();
      return next;
    });
  };
  const syncSetProductos=(updater)=>{
    setProductos(prev=>{
      const next=typeof updater==="function"?updater(prev):updater;
      (async()=>{
        try{
          const prevIds=new Set(prev.map(x=>x.id));
          const nextIds=new Set(next.map(x=>x.id));
          for(const id of prevIds){if(!nextIds.has(id))await dbDeleteProducto(id);}
          for(const item of next){
            const before=prev.find(x=>x.id===item.id);
            if(!before){const created=await dbCreateProducto(item);item.id=created.id;}
            else if(JSON.stringify(before)!==JSON.stringify(item))await dbUpdateProducto(item.id,item);
          }
        }catch(err){console.error("Error sincronizando productos con Supabase:",err);showToast("Error al guardar en la base de datos","error");}
      })();
      return next;
    });
  };
  const syncSetClientes=(updater)=>{
    setClientes(prev=>{
      const next=typeof updater==="function"?updater(prev):updater;
      (async()=>{
        try{
          const prevIds=new Set(prev.map(x=>x.id));
          const nextIds=new Set(next.map(x=>x.id));
          for(const id of prevIds){if(!nextIds.has(id))await dbDeleteCliente(id);}
          for(const item of next){
            const before=prev.find(x=>x.id===item.id);
            if(!before){const created=await dbCreateCliente(item);item.id=created.id;}
            else if(JSON.stringify(before)!==JSON.stringify(item))await dbUpdateCliente(item.id,item);
          }
        }catch(err){console.error("Error sincronizando clientes con Supabase:",err);showToast("Error al guardar en la base de datos","error");}
      })();
      return next;
    });
  };

  if(loading){
    return(
      <div style={{minHeight:"100vh",background:"#0F1117",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#94A3B8",fontFamily:"'DM Sans',sans-serif",gap:16}}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>
        <div style={{width:48,height:48,border:"3px solid #1E2535",borderTopColor:"#6366F1",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
        <div style={{fontWeight:600}}>Conectando con la base de datos…</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }
  if(loadError){
    return(
      <div style={{minHeight:"100vh",background:"#0F1117",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#E2E8F0",fontFamily:"'DM Sans',sans-serif",gap:14,padding:24,textAlign:"center"}}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>
        <div style={{fontSize:40}}>⚠️</div>
        <div style={{fontWeight:700,fontSize:18}}>No se pudo conectar a la base de datos</div>
        <div style={{color:"#64748B",fontSize:13,maxWidth:420}}>{loadError}</div>
        <button onClick={()=>window.location.reload()} style={{marginTop:8,padding:"10px 20px",background:"linear-gradient(135deg,#6366F1,#8B5CF6)",border:"none",borderRadius:10,color:"#fff",fontWeight:700}}>Reintentar</button>
      </div>
    );
  }

  if(!currentUser) return <LoginScreen data={loginData} setData={setLoginData} onLogin={login} err={loginErr} users={users}/>;

  const contentPad=isMobile?"16px 12px 90px":"28px 32px";

  return(
    <div style={{display:"flex",height:"100vh",background:"#0F1117",color:"#E2E8F0",fontFamily:"'DM Sans',sans-serif",overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet"/>
      {/* Desktop sidebar */}
      {!isMobile&&<Sidebar open={sideOpen} section={section} setSection={setSection} role={currentUser.role} onLogout={logout}/>}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Topbar */}
        <div style={{background:"#161B27",borderBottom:"1px solid #1E2535",padding:`0 ${isMobile?14:28}px`,height:isMobile?52:60,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          {!isMobile&&<button onClick={()=>setSideOpen(!sideOpen)} style={{background:"none",border:"none",color:"#94A3B8",cursor:"pointer",fontSize:20}}>☰</button>}
          {isMobile&&<div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,display:"flex",alignItems:"center",gap:8}}><span>{APP_ICON}</span>{APP_NAME}</div>}
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {!isMobile&&<div style={{textAlign:"right"}}><div style={{fontWeight:600,fontSize:14}}>{currentUser.name}</div><div style={{fontSize:11,color:"#64748B",textTransform:"capitalize"}}>{currentUser.role}</div></div>}
            <div style={{width:isMobile?32:36,height:isMobile?32:36,borderRadius:"50%",background:"linear-gradient(135deg,#6366F1,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:isMobile?11:13}}>{currentUser.avatar}</div>
            {isMobile&&<button onClick={logout} style={{background:"rgba(239,68,68,.12)",border:"none",borderRadius:8,color:"#EF4444",padding:"6px 10px",fontSize:12,fontWeight:700}}>🚪</button>}
          </div>
        </div>
        {/* Content */}
        <div style={{flex:1,overflow:"auto",padding:contentPad}}>
          {section==="dashboard"&&<Dashboard notas={visibleNotas} gastos={gastos} user={currentUser} productos={productos} clientes={clientes}/>}
          {section==="notas"    &&<NotasVenta notas={visibleNotas} setNotas={syncSetNotas} allNotas={notas} user={currentUser} showToast={showToast} productos={productos} clientes={clientes} users={users}/>}
          {section==="gastos"   &&<PanelGastos gastos={gastos} setGastos={syncSetGastos} showToast={showToast} user={currentUser}/>}
          {section==="ventas"   &&<Ventas notas={visibleNotas} gastos={gastos} productos={productos} clientes={clientes}/>}
          {section==="admin"    &&currentUser.role==="admin"&&<AdminPanel users={users} setUsers={syncSetUsers} productos={productos} setProductos={syncSetProductos} clientes={clientes} setClientes={syncSetClientes} showToast={showToast} currentUser={currentUser}/>}
        </div>
      </div>
      {/* Mobile bottom nav */}
      {isMobile&&<BottomNav section={section} setSection={setSection} role={currentUser.role}/>}
      {toast&&<div style={{position:"fixed",bottom:isMobile?80:32,right:16,background:toast.type==="success"?"#10B981":"#EF4444",color:"#fff",padding:"12px 18px",borderRadius:12,fontWeight:700,fontSize:13,zIndex:9999,boxShadow:"0 8px 24px rgba(0,0,0,.4)",animation:"fadeIn .25s ease",maxWidth:"calc(100vw - 32px)"}}>{toast.msg}</div>}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0F1117}::-webkit-scrollbar-thumb{background:#2D3748;border-radius:2px}input,select,textarea{outline:none!important}button{cursor:pointer}`}</style>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({notas,gastos,user,productos,clientes}){
  const {isMobile,isTablet}=useBreakpoint();
  // Ingresos reconocidos = total de notas cobradas + anticipos de notas no cobradas
  const ing=notas.reduce((s,n)=>s+getIngresoReconocido(n,productos),0);
  const tGas=gastos.reduce((s,g)=>s+g.monto,0);
  const util=ing-tGas;
  const porCobrar=notas.reduce((s,n)=>s+getCuentaPorCobrar(n,productos),0);
  const cols=isMobile?"repeat(2,1fr)":isTablet?"repeat(2,1fr)":"repeat(4,1fr)";
  const chartCols=isMobile?"1fr":isTablet?"1fr":"2fr 1fr";
  const mData=["Ene","Feb","Mar","Abr","May","Jun"].map((mes,i)=>{
    const mn=notas.filter(n=>new Date(n.fecha).getMonth()===i);
    const mi=mn.reduce((s,n)=>s+getIngresoReconocido(n,productos),0);
    const mg=gastos.filter(g=>new Date(g.fecha).getMonth()===i).reduce((s,g)=>s+g.monto,0);
    return{mes,ingresos:mi,gastos:mg,utilidad:mi-mg};
  });
  const pie=[
    {name:"Cobradas",value:notas.filter(n=>n.estado==="cobrada").length,color:"#6366F1"},
    {name:"Aprobadas",value:notas.filter(n=>n.estado==="aprobada").length,color:"#10B981"},
    {name:"Pendientes",value:notas.filter(n=>n.estado==="pendiente").length,color:"#F59E0B"},
    {name:"Rechazadas",value:notas.filter(n=>n.estado==="rechazada").length,color:"#EF4444"},
  ].filter(d=>d.value>0);
  // Ingresos por método de pago (anticipos + cobros)
  const ingByMetodo=METODOS_PAGO.map(m=>({
    metodo:m,
    total:notas.filter(n=>(n.metodoPago||"efectivo")===m).reduce((s,n)=>s+getIngresoReconocido(n,productos),0),
  })).filter(x=>x.total>0);
  // Gastos por método de pago
  const gasByMetodo=METODOS_PAGO.map(m=>({
    metodo:m,
    total:gastos.filter(g=>(g.metodoPago||"efectivo")===m).reduce((s,g)=>s+g.monto,0),
  })).filter(x=>x.total>0);
  // Cuentas por cobrar detalle
  const cuentasPendientes=notas.filter(n=>getCuentaPorCobrar(n,productos)>0).sort((a,b)=>new Date(a.vencimiento||a.fecha)-new Date(b.vencimiento||b.fecha));
  return(
    <div>
      <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:isMobile?20:24,fontWeight:800,marginBottom:4}}>Dashboard</h2>
      <p style={{color:"#64748B",fontSize:13,marginBottom:20}}>{user.role==="admin"?"Vista general":"Mis ventas"}</p>
      <div style={{display:"grid",gridTemplateColumns:cols,gap:12,marginBottom:16}}>
        <StatCard label="Ingresos" value={fmt(ing)} sub="cobros + anticipos" color="#10B981" icon="💰"/>
        <StatCard label="Por Cobrar" value={fmt(porCobrar)} sub={`${cuentasPendientes.length} notas pendientes`} color="#F59E0B" icon="📋"/>
        <StatCard label="Gastos" value={fmt(tGas)} sub={`${gastos.length} registros`} color="#EF4444" icon="💸"/>
        <StatCard label="Utilidad" value={fmt(util)} sub="ingresos − gastos" color={util>=0?"#6366F1":"#EF4444"} icon={util>=0?"📈":"📉"}/>
      </div>
      {/* Result banner */}
      <div style={{background:util>=0?"linear-gradient(135deg,rgba(99,102,241,.12),rgba(16,185,129,.08))":"linear-gradient(135deg,rgba(239,68,68,.12),rgba(245,158,11,.08))",border:`1px solid ${util>=0?"rgba(99,102,241,.25)":"rgba(239,68,68,.25)"}`,borderRadius:14,padding:"14px 18px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div><div style={{fontSize:11,color:"#64748B",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Resultado del período</div><div style={{fontSize:isMobile?22:28,fontWeight:800,color:util>=0?"#818CF8":"#EF4444",fontFamily:"'Syne',sans-serif"}}>{fmt(util)}</div></div>
        <div style={{fontSize:12,color:"#64748B",textAlign:"right"}}>
          <div>Ingresos: <span style={{color:"#10B981",fontWeight:700}}>{fmt(ing)}</span></div>
          <div>Gastos: <span style={{color:"#EF4444",fontWeight:700}}>{fmt(tGas)}</span></div>
          <div>Por cobrar: <span style={{color:"#F59E0B",fontWeight:700}}>{fmt(porCobrar)}</span></div>
        </div>
      </div>
      {/* Ingresos / Gastos por método de pago */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:20}}>
        <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:isMobile?14:20}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"#94A3B8"}}>Ingresos por Método de Pago</div>
          {ingByMetodo.length===0&&<div style={{color:"#475569",fontSize:12,textAlign:"center",padding:12}}>Sin ingresos registrados</div>}
          {ingByMetodo.map(x=>(
            <div key={x.metodo} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:18}}>{metodoIcon[x.metodo]}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:"#94A3B8",fontWeight:600}}>{metodoLabel[x.metodo]}</div>
                <div style={{width:"100%",height:6,background:"#1E2535",borderRadius:3,marginTop:4}}>
                  <div style={{width:`${(x.total/ing)*100}%`,height:"100%",background:metodoColor[x.metodo],borderRadius:3}}/>
                </div>
              </div>
              <div style={{fontWeight:700,fontSize:13,color:metodoColor[x.metodo],minWidth:90,textAlign:"right"}}>{fmt(x.total)}</div>
            </div>
          ))}
        </div>
        <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:isMobile?14:20}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"#94A3B8"}}>Gastos por Método de Pago</div>
          {gasByMetodo.length===0&&<div style={{color:"#475569",fontSize:12,textAlign:"center",padding:12}}>Sin gastos registrados</div>}
          {gasByMetodo.map(x=>(
            <div key={x.metodo} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:18}}>{metodoIcon[x.metodo]}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:"#94A3B8",fontWeight:600}}>{metodoLabel[x.metodo]}</div>
                <div style={{width:"100%",height:6,background:"#1E2535",borderRadius:3,marginTop:4}}>
                  <div style={{width:`${(x.total/tGas)*100}%`,height:"100%",background:metodoColor[x.metodo],borderRadius:3}}/>
                </div>
              </div>
              <div style={{fontWeight:700,fontSize:13,color:metodoColor[x.metodo],minWidth:90,textAlign:"right"}}>{fmt(x.total)}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Charts */}
      <div style={{display:"grid",gridTemplateColumns:chartCols,gap:16,marginBottom:20}}>
        <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:isMobile?14:22}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"#94A3B8"}}>Ingresos vs Gastos</div>
          <ResponsiveContainer width="100%" height={isMobile?160:200}>
            <BarChart data={mData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2535"/>
              <XAxis dataKey="mes" tick={{fill:"#64748B",fontSize:isMobile?9:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#64748B",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} width={36}/>
              <Tooltip contentStyle={{background:"#0F1117",border:"1px solid #1E2535",borderRadius:8,color:"#E2E8F0",fontSize:12}} formatter={v=>fmt(v)}/>
              {!isMobile&&<Legend wrapperStyle={{fontSize:11,color:"#94A3B8"}}/>}
              <Bar dataKey="ingresos" name="Ingresos" fill="#10B981" radius={[4,4,0,0]}/>
              <Bar dataKey="gastos" name="Gastos" fill="#EF4444" radius={[4,4,0,0]}/>
              <Bar dataKey="utilidad" name="Utilidad" fill="#6366F1" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {!isMobile&&(
          <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:22}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"#94A3B8"}}>Estado Notas</div>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart><Pie data={pie} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value">{pie.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip contentStyle={{background:"#0F1117",border:"1px solid #1E2535",borderRadius:8,color:"#E2E8F0",fontSize:12}}/></PieChart>
            </ResponsiveContainer>
            <div style={{display:"flex",flexWrap:"wrap",gap:"5px 10px",justifyContent:"center"}}>
              {pie.map(d=><div key={d.name} style={{display:"flex",alignItems:"center",gap:4,fontSize:10}}><div style={{width:6,height:6,borderRadius:"50%",background:d.color}}/><span style={{color:"#94A3B8"}}>{d.name}: {d.value}</span></div>)}
            </div>
          </div>
        )}
      </div>
      {/* Cuentas por cobrar */}
      {cuentasPendientes.length>0&&(
        <div style={{background:"#161B27",border:"1px solid rgba(245,158,11,.3)",borderRadius:14,padding:isMobile?14:22,marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <span style={{fontSize:16}}>📋</span>
            <div style={{fontSize:13,fontWeight:700,color:"#F59E0B"}}>Cuentas por Cobrar</div>
            <span style={{marginLeft:"auto",fontWeight:800,color:"#F59E0B",fontSize:15}}>{fmt(porCobrar)}</span>
          </div>
          {cuentasPendientes.slice(0,6).map(n=>{
            const cl=resolveCliente(n,clientes);
            const saldo=getCuentaPorCobrar(n,productos);
            const vencido=n.vencimiento&&new Date(n.vencimiento)<new Date();
            return(
              <div key={n.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #0F1117",gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:"#818CF8",fontWeight:700,fontSize:12}}>{n.id}</span>
                    <span style={{fontSize:12,color:"#94A3B8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cl.nombre}</span>
                  </div>
                  {n.vencimiento&&<div style={{fontSize:10,color:vencido?"#EF4444":"#64748B",marginTop:1}}>{vencido?"⚠️ Vencida: ":"Vence: "}{n.vencimiento}</div>}
                </div>
                <div style={{fontWeight:700,color:"#F59E0B",fontSize:13,flexShrink:0}}>{fmt(saldo)}</div>
              </div>
            );
          })}
          {cuentasPendientes.length>6&&<div style={{textAlign:"center",fontSize:11,color:"#64748B",marginTop:8}}>+{cuentasPendientes.length-6} más en Notas de Venta</div>}
        </div>
      )}
      {/* Recent */}
      <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:isMobile?14:22}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"#94A3B8"}}>Notas Recientes</div>
        {isMobile?(
          [...notas].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).slice(0,4).map(n=>(
            <div key={n.id} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #0F1117"}}>
              <div><div style={{color:"#818CF8",fontWeight:700,fontSize:12}}>{n.id}</div><div style={{fontSize:12,color:"#94A3B8"}}>{resolveCliente(n,clientes).nombre}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontWeight:700,fontSize:13}}>{fmt(calcTotal(n.items,productos))}</div><span style={{background:eColor[n.estado]+"22",color:eColor[n.estado],padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700}}>{eLabel[n.estado]}</span></div>
            </div>
          ))
        ):(
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:"1px solid #1E2535"}}>{["Folio","Cliente","Fecha","Total","Estado"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>{h}</th>)}</tr></thead>
            <tbody>{[...notas].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).slice(0,5).map(n=>(
              <tr key={n.id} style={{borderBottom:"1px solid #0F1117"}}>
                <td style={{padding:"9px 10px",fontSize:12,color:"#818CF8",fontWeight:700}}>{n.id}</td>
                <td style={{padding:"9px 10px",fontSize:12}}>{resolveCliente(n,clientes).nombre}</td>
                <td style={{padding:"9px 10px",fontSize:12,color:"#64748B"}}>{n.fecha}</td>
                <td style={{padding:"9px 10px",fontSize:13,fontWeight:600}}>{fmt(calcTotal(n.items,productos))}</td>
                <td style={{padding:"9px 10px"}}><span style={{background:eColor[n.estado]+"25",color:eColor[n.estado],padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{eLabel[n.estado]}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── NOTAS DE VENTA ───────────────────────────────────────────────────────────
function NotasVenta({notas,setNotas,allNotas,user,showToast,productos,clientes,users}){
  const {isMobile}=useBreakpoint();
  const [showModal,setShowModal]=useState(false);
  const [editTarget,setEditTarget]=useState(null);
  const [viewTarget,setViewTarget]=useState(null);
  const [filter,setFilter]=useState("todas");
  const [search,setSearch]=useState("");

  const filtered=notas.filter(n=>filter==="todas"||n.estado===filter).filter(n=>{
    const cl=resolveCliente(n,clientes).nombre.toLowerCase();
    return n.id.toLowerCase().includes(search.toLowerCase())||cl.includes(search.toLowerCase());
  });

  const handleSave=(nv)=>{
    if(nv.id&&allNotas.find(n=>n.id===nv.id)){setNotas(prev=>prev.map(n=>n.id===nv.id?nv:n));showToast("Nota actualizada ✓");}
    else{const newId="NV-"+String(allNotas.length+1).padStart(3,"0");setNotas(prev=>[...prev,{...nv,id:newId}]);showToast("Nota creada ✓");}
    setShowModal(false);setEditTarget(null);
  };
  const handleDelete=(id)=>{setNotas(prev=>prev.filter(n=>n.id!==id));showToast("Eliminada","error");};
  const handleEstado=(id,estado)=>{setNotas(prev=>prev.map(n=>n.id===id?{...n,estado}:n));showToast(estado==="cobrada"?"¡Cobro registrado! 💰":"Estado actualizado ✓");};
  const handleWA=(n)=>{const cl=resolveCliente(n,clientes);const vend=users.find(u=>u.id===n.vendedorId);const txt=buildTicketText(n,clientes,productos,vend);const tel=(cl.tel||"").replace(/\D/g,"");window.open(`https://wa.me/52${tel}?text=${encodeURIComponent(txt)}`,"_blank");};

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:isMobile?20:24,fontWeight:800,marginBottom:2}}>Notas de Venta</h2>
          <p style={{color:"#64748B",fontSize:12}}>{filtered.length} notas</p>
        </div>
        <button onClick={()=>{setEditTarget(null);setShowModal(true);}} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 18px",background:"linear-gradient(135deg,#6366F1,#8B5CF6)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:13}}>
          + Nueva Nota
        </button>
      </div>
      {/* Filters */}
      <div style={{marginBottom:16,display:"flex",flexDirection:"column",gap:10}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar folio o cliente…" style={IS}/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {["todas","pendiente","aprobada","cobrada","rechazada"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 12px",borderRadius:20,border:"1px solid "+(filter===f?"#6366F1":"#1E2535"),background:filter===f?"rgba(99,102,241,.15)":"#161B27",color:filter===f?"#818CF8":"#64748B",fontWeight:600,fontSize:11,textTransform:"capitalize"}}>{f}</button>
          ))}
        </div>
      </div>

      {/* MOBILE: cards */}
      {isMobile?(
        <div>
          {filtered.map(n=>(
            <NotaCard key={n.id} n={n} clientes={clientes} productos={productos} users={users}
              onView={setViewTarget} onEdit={n=>{setEditTarget(n);setShowModal(true);}} onWA={handleWA}
              onEstado={handleEstado} canEdit={user.role==="admin"||n.vendedorId===user.id}/>
          ))}
          {filtered.length===0&&<div style={{textAlign:"center",padding:40,color:"#475569"}}>Sin notas encontradas</div>}
        </div>
      ):(
        /* DESKTOP: table */
        <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#0F1117",borderBottom:"1px solid #1E2535"}}>
                {["Folio","Cliente","Vendedor","Fecha","Total","Por Cobrar","Estado","Acciones"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"12px 14px",color:"#475569",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((n,i)=>{
                const cl=resolveCliente(n,clientes);
                const vend=users.find(u=>u.id===n.vendedorId);
                const canEdit=user.role==="admin"||n.vendedorId===user.id;
                return(
                  <tr key={n.id} style={{borderBottom:"1px solid #0F1117",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}}>
                    <td style={{padding:"11px 14px",color:"#818CF8",fontWeight:700,fontSize:13}}>{n.id}</td>
                    <td style={{padding:"11px 14px",fontSize:13}}>
                      <div style={{fontWeight:600}}>{cl.nombre}</div>
                      {cl.tel&&<div style={{fontSize:11,color:"#64748B",marginTop:1}}>📞 {cl.tel}</div>}
                    </td>
                    <td style={{padding:"11px 14px",fontSize:12,color:"#94A3B8"}}>{vend?.name?.split(" ")[0]||"—"}</td>
                    <td style={{padding:"11px 14px",fontSize:12,color:"#64748B"}}>{n.fecha}</td>
                    <td style={{padding:"11px 14px",fontWeight:700,fontSize:13}}>{fmt(calcTotal(n.items,productos))}</td>
                    <td style={{padding:"11px 14px",fontSize:12}}>
                      {(()=>{const saldo=getCuentaPorCobrar(n,productos);return saldo>0?<span style={{color:"#F59E0B",fontWeight:700}}>{fmt(saldo)}</span>:<span style={{color:"#475569"}}>—</span>;})()}
                    </td>
                    <td style={{padding:"8px 10px"}}>
                      {canEdit?(
                        <select value={n.estado} onChange={e=>handleEstado(n.id,e.target.value)}
                          style={{background:eColor[n.estado]+"18",color:eColor[n.estado],border:`1px solid ${eColor[n.estado]}55`,borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:700,appearance:"none",WebkitAppearance:"none",outline:"none",cursor:"pointer"}}>
                          {Object.entries(eLabel).map(([k,v])=><option key={k} value={k} style={{background:"#161B27",color:"#E2E8F0"}}>{v}</option>)}
                        </select>
                      ):(
                        <span style={{background:eColor[n.estado]+"22",color:eColor[n.estado],padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{eLabel[n.estado]}</span>
                      )}
                    </td>
                    <td style={{padding:"10px 10px"}}>
                      <div style={{display:"flex",gap:5,alignItems:"center"}}>
                        <Btn title="Ver ticket" icon="🧾" color="#818CF8" onClick={()=>setViewTarget(n)}/>
                        <button onClick={()=>handleWA(n)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:8,border:"1px solid rgba(37,211,102,.45)",background:"rgba(37,211,102,.12)",color:"#25D366",fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>💬 WhatsApp</button>
                        {canEdit&&<Btn title="Editar" icon="✏️" color="#F59E0B" onClick={()=>{setEditTarget(n);setShowModal(true);}}/>}
                        {user.role==="admin"&&<Btn title="Eliminar" icon="🗑️" color="#EF4444" onClick={()=>handleDelete(n.id)}/>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length===0&&<div style={{textAlign:"center",padding:48,color:"#475569"}}>No se encontraron notas</div>}
        </div>
      )}
      {showModal&&<NotaModal onClose={()=>{setShowModal(false);setEditTarget(null);}} onSave={handleSave} initial={editTarget} user={user} productos={productos} clientes={clientes} users={users}/>}
      {viewTarget&&<TicketModal nota={viewTarget} onClose={()=>setViewTarget(null)} onEstado={(id,e)=>{handleEstado(id,e);setViewTarget(v=>({...v,estado:e}));}} onSave={(updated)=>{handleSave(updated);setViewTarget(updated);}} user={user} productos={productos} clientes={clientes} users={users}/>}
    </div>
  );
}

// ─── NOTA MODAL ───────────────────────────────────────────────────────────────
function NotaModal({onClose,onSave,initial,user,productos,clientes,users}){
  const {isMobile}=useBreakpoint();
  const today=new Date().toISOString().split("T")[0];
  const blank={productoId:productos[0]?.id||1,cantidad:1,precioUnit:productos[0]?.precioBase||0,descuento:0,base:"",altura:"",descripcion:""};
  const [clienteMode,setClienteMode]=useState(initial?.clienteInline?"nuevo":"catalogo");
  const [form,setForm]=useState(initial||{clienteId:clientes[0]?.id||1,clienteInline:null,vendedorId:user.id,fecha:today,vencimiento:"",estado:"pendiente",anticipo:0,metodoPago:"efectivo",items:[{...blank}],notas:""});
  const [ic,setIC]=useState(initial?.clienteInline||{nombre:"",rfc:"",tel:"",email:"",ciudad:""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const addItem=()=>setForm(f=>({...f,items:[...f.items,{...blank}]}));
  const removeItem=(i)=>setForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)}));
  const setItem=(i,k,v)=>setForm(f=>({...f,items:f.items.map((it,idx)=>idx===i?{...it,[k]:v}:it)}));
  const handleSave=()=>onSave({...form,clienteInline:clienteMode==="nuevo"?ic:null});
  const gCols=isMobile?"1fr 1fr":"1fr 1fr 1fr";
  return(
    <Modal onClose={onClose} title={initial?`Editar ${initial.id}`:"Nueva Nota de Venta"} width={820}>
      {/* Cliente */}
      <div style={{background:"#0F1117",borderRadius:12,padding:14,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <Label>Cliente</Label>
          <div style={{display:"flex",gap:6}}>
            {["catalogo","nuevo"].map(m=>(
              <button key={m} onClick={()=>setClienteMode(m)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid "+(clienteMode===m?"#6366F1":"#1E2535"),background:clienteMode===m?"rgba(99,102,241,.2)":"transparent",color:clienteMode===m?"#818CF8":"#64748B",fontSize:11,fontWeight:700}}>
                {m==="catalogo"?"📋 Catálogo":"✏️ Capturar"}
              </button>
            ))}
          </div>
        </div>
        {clienteMode==="catalogo"?(
          <Sel value={form.clienteId} onChange={v=>set("clienteId",+v)}>{clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel>
        ):(
          <div style={{display:"grid",gridTemplateColumns:gCols,gap:10}}>
            <div style={{gridColumn:isMobile?"1/-1":"auto"}}><FInput label="Nombre" value={ic.nombre} onChange={v=>setIC(f=>({...f,nombre:v}))} placeholder="Nombre o empresa"/></div>
            <FInput label="RFC" value={ic.rfc} onChange={v=>setIC(f=>({...f,rfc:v}))} placeholder="RFC opcional"/>
            <FInput label="Tel. WhatsApp" value={ic.tel} onChange={v=>setIC(f=>({...f,tel:v}))} placeholder="10 dígitos"/>
            {!isMobile&&<><FInput label="Correo" value={ic.email} onChange={v=>setIC(f=>({...f,email:v}))} type="email" placeholder="correo@..."/>
            <FInput label="Ciudad" value={ic.ciudad} onChange={v=>setIC(f=>({...f,ciudad:v}))} placeholder="Ciudad"/></>}
          </div>
        )}
      </div>
      {/* Datos */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:10,marginBottom:14}}>
        {user.role==="admin"&&<div><Label>Vendedor</Label><Sel value={form.vendedorId} onChange={v=>set("vendedorId",+v)}>{users.filter(u=>u.role!=="admin").map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</Sel></div>}
        <div><Label>Fecha</Label><RawInput type="date" value={form.fecha} onChange={v=>set("fecha",v)}/></div>
        <div><Label>Vence</Label><RawInput type="date" value={form.vencimiento} onChange={v=>set("vencimiento",v)}/></div>
        <div><Label>Estado</Label><Sel value={form.estado} onChange={v=>set("estado",v)}>{Object.entries(eLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}</Sel></div>
      </div>
      {/* Anticipo / Método de pago */}
      <div style={{background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.2)",borderRadius:12,padding:14,marginBottom:14}}>
        <Label>💰 Anticipo y Forma de Pago</Label>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:10,marginTop:8}}>
          <FInput label="Anticipo recibido (MXN)" value={form.anticipo} onChange={v=>set("anticipo",parseFloat(v)||0)} type="number" placeholder="0.00"/>
          <div>
            <Label>Método de pago</Label>
            <Sel value={form.metodoPago||"efectivo"} onChange={v=>set("metodoPago",v)}>
              {METODOS_PAGO.map(m=><option key={m} value={m}>{metodoIcon[m]} {metodoLabel[m]}</option>)}
            </Sel>
          </div>
          <div style={{background:"#0F1117",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:10,color:"#475569",fontWeight:700,marginBottom:3}}>SALDO PENDIENTE</div>
            <div style={{fontSize:15,fontWeight:800,color:"#F59E0B"}}>{fmt(Math.max(0,calcTotal(form.items,productos)-(parseFloat(form.anticipo)||0)))}</div>
          </div>
        </div>
        {form.anticipo>0&&form.estado!=="cobrada"&&(
          <div style={{marginTop:8,fontSize:11,color:"#94A3B8"}}>
            ℹ️ El anticipo se reconoce como ingreso de inmediato. El saldo restante se mostrará como <strong style={{color:"#F59E0B"}}>cuenta por cobrar</strong> hasta marcar la nota como "Cobrada".
          </div>
        )}
      </div>
      {/* Items */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <Label>Productos</Label>
          <button onClick={addItem} style={{background:"rgba(99,102,241,.2)",border:"none",borderRadius:8,color:"#818CF8",padding:"4px 12px",fontSize:12,fontWeight:700}}>+ Agregar</button>
        </div>
        <div style={{background:"#0F1117",borderRadius:10,padding:10}}>
          {form.items.map((it,i)=>{
            const prod=productos.find(p=>p.id===it.productoId);
            const gf=isGF(it.productoId,productos);
            const m2=gf?getM2(it):null;
            const sub=calcSubtotal(it,productos);
            return(
              <div key={i} style={{background:"#161B27",borderRadius:10,padding:10,marginBottom:8,border:"1px solid #1E2535"}}>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"2fr 1fr auto":"2fr .7fr 1fr .7fr auto",gap:8,marginBottom:gf?8:0}}>
                  <Sel value={it.productoId} onChange={v=>{const p=productos.find(p=>p.id===+v);setItem(i,"productoId",+v);setItem(i,"precioUnit",p?.precioBase||0);setItem(i,"base","");setItem(i,"altura","");}}>
                    {productos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </Sel>
                  <RawInput type="number" value={it.cantidad} onChange={v=>setItem(i,"cantidad",+v)} min={1}/>
                  {!isMobile&&<RawInput type="number" value={it.precioUnit} onChange={v=>setItem(i,"precioUnit",+v)} min={0}/>}
                  {!isMobile&&<RawInput type="number" value={it.descuento} onChange={v=>setItem(i,"descuento",+v)} min={0} max={100}/>}
                  <button onClick={()=>removeItem(i)} style={{background:"rgba(239,68,68,.15)",border:"none",borderRadius:8,color:"#EF4444",padding:"0 10px",fontSize:16}}>×</button>
                </div>
                <input value={it.descripcion||""} onChange={e=>setItem(i,"descripcion",e.target.value)} placeholder="Descripción opcional (color, acabado, especificaciones…)"
                  style={{width:"100%",background:"#0F1117",border:"1px solid #1E2535",borderRadius:8,padding:"7px 10px",color:"#94A3B8",fontSize:11,marginTop:6,marginBottom:gf?6:0}}/>
                {isMobile&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:6,marginBottom:gf?8:0}}>
                    <div><div style={{fontSize:10,color:"#475569",marginBottom:4}}>Precio</div><RawInput type="number" value={it.precioUnit} onChange={v=>setItem(i,"precioUnit",+v)} min={0}/></div>
                    <div><div style={{fontSize:10,color:"#475569",marginBottom:4}}>Desc. %</div><RawInput type="number" value={it.descuento} onChange={v=>setItem(i,"descuento",+v)} min={0} max={100}/></div>
                  </div>
                )}
                {gf&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                    <div><div style={{fontSize:10,color:"#F59E0B",fontWeight:700,marginBottom:4}}>📐 Base (m)</div><RawInput type="number" value={it.base} onChange={v=>setItem(i,"base",v)} placeholder="0.00" min={0}/></div>
                    <div><div style={{fontSize:10,color:"#F59E0B",fontWeight:700,marginBottom:4}}>Altura (m)</div><RawInput type="number" value={it.altura} onChange={v=>setItem(i,"altura",v)} placeholder="0.00" min={0}/></div>
                    <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#F59E0B",fontWeight:700,marginBottom:3}}>Área</div>
                      <div style={{fontWeight:700,color:"#F59E0B",fontSize:13}}>{((m2||0)*it.cantidad).toFixed(2)} m²</div>
                    </div>
                    <div style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#10B981",fontWeight:700,marginBottom:3}}>Subtotal</div>
                      <div style={{fontWeight:700,color:"#10B981",fontSize:13}}>{fmt(sub)}</div>
                    </div>
                  </div>
                )}
                {!gf&&<div style={{textAlign:"right",fontSize:12,color:"#64748B",marginTop:4}}>Subtotal: <span style={{color:"#10B981",fontWeight:700}}>{fmt(sub)}</span></div>}
              </div>
            );
          })}
          <div style={{borderTop:"1px solid #1E2535",paddingTop:10,textAlign:"right"}}>
            <span style={{fontWeight:700,color:"#10B981",fontSize:16}}>Total: {fmt(calcTotal(form.items,productos))}</span>
          </div>
        </div>
      </div>
      <div style={{marginBottom:8}}><Label>Notas</Label><textarea value={form.notas} onChange={e=>set("notas",e.target.value)} rows={2} style={{width:"100%",background:"#0F1117",border:"1px solid #1E2535",borderRadius:10,padding:"10px 14px",color:"#E2E8F0",fontSize:13,resize:"vertical"}}/></div>
      <SaveCancelBtns onSave={handleSave} onClose={onClose} saveLabel={initial?"Guardar cambios":"Crear Nota de Venta"}/>
    </Modal>
  );
}

// ─── TICKET MODAL ─────────────────────────────────────────────────────────────
function TicketModal({nota:nOrig,onClose,onEstado,onSave,user,productos,clientes,users}){
  const {isMobile}=useBreakpoint();
  const [nota,setNota]=useState({...nOrig,items:nOrig.items.map(it=>({...it}))});
  const [editMode,setEditMode]=useState(false);
  const cl=resolveCliente(nota,clientes);
  const vend=users.find(u=>u.id===nota.vendedorId);
  const total=calcTotal(nota.items,productos);
  const canEdit=user.role==="admin"||nota.vendedorId===user.id;

  const setItem=(i,k,v)=>setNota(n=>({...n,items:n.items.map((it,idx)=>idx===i?{...it,[k]:v}:it)}));
  const addItem=()=>setNota(n=>({...n,items:[...n.items,{productoId:productos[0]?.id||1,cantidad:1,precioUnit:productos[0]?.precioBase||0,descuento:0,base:"",altura:"",descripcion:""}]}));
  const removeItem=(i)=>setNota(n=>({...n,items:n.items.filter((_,idx)=>idx!==i)}));
  const handleSaveEdit=()=>{onSave(nota);setEditMode(false);};

  const handlePrint=()=>{
    const cl2=resolveCliente(nota,clientes);
    const rows=nota.items.map(it=>{
      const p=productos.find(p=>p.id===it.productoId);
      const gf=isGF(it.productoId,productos);
      const m2=gf?getM2(it):null;
      const sub=calcSubtotal(it,productos);
      const medidas=gf
        ?`${it.base}×${it.altura}m<br><span style="font-size:9px;color:#888">${(m2||0).toFixed(2)}m²×${it.cantidad}=${((m2||0)*it.cantidad).toFixed(2)}m²</span>`
        :`${it.cantidad} ${p?.unidad||""}`;
      const desc=it.descripcion?`<div style="font-size:9px;color:#666;margin-top:2px">${it.descripcion}</div>`:"";
      return `<tr><td>${p?.nombre||"—"}${desc}</td><td style="text-align:center">${medidas}</td><td style="text-align:right">${fmt(it.precioUnit)}${gf?"<small>/m²</small>":""}</td><td style="text-align:center">${it.descuento||0}%</td><td style="text-align:right;font-weight:700;color:#16a34a">${fmt(sub)}</td></tr>`;
    }).join("");
    const html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+nota.id+'</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1e2535}.hdr{background:#6366f1;color:#fff;padding:16px 22px;display:flex;justify-content:space-between;align-items:center}.hdr h1{font-size:20px;font-weight:800}.hdr .sub{font-size:9px;opacity:.8;margin-top:2px}.hdr .r{text-align:right}.hdr .folio{font-size:17px;font-weight:800}.info{display:grid;grid-template-columns:1fr 1fr;border:1px solid #e2e8f0;margin:14px 20px 0;border-radius:8px;overflow:hidden}.ib{padding:10px 14px;border-right:1px solid #e2e8f0}.ib:last-child{border-right:none}.il{font-size:9px;color:#6366f1;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}.iv{font-size:13px;font-weight:700}.is{font-size:10px;color:#64748b;margin-top:1px}.sec{margin:14px 20px 0}table{width:100%;border-collapse:collapse;font-size:11px}thead tr{background:#1e293b;color:#fff}th{padding:7px 9px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.5px}td{padding:7px 9px;border-bottom:1px solid #f1f5f9;vertical-align:middle}tr:nth-child(even) td{background:#f8faff}.tot td{background:#6366f1!important;color:#fff;font-size:13px;font-weight:800;border:none;padding:9px}.notes{margin:12px 20px;background:#f8f9ff;border:1px solid #e0e7ff;border-radius:6px;padding:9px 13px;font-size:11px;color:#4b5563}.foot{margin:12px 20px;text-align:center;font-size:9px;color:#94a3b8;padding-top:8px;border-top:1px solid #e2e8f0}.badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:9px;font-weight:700;background:rgba(255,255,255,.22)}@media print{html,body{height:auto}}</style></head><body><div class="hdr"><div><h1>'+APP_NAME+'</h1><div class="sub">Nota de Venta</div></div><div class="r"><div class="folio">'+nota.id+'</div><div style="font-size:10px;margin-top:2px">'+nota.fecha+'</div><div class="badge">'+eLabel[nota.estado]+'</div></div></div><div class="info"><div class="ib"><div class="il">Cliente</div><div class="iv">'+cl2.nombre+'</div>'+(cl2.rfc?'<div class="is">RFC: '+cl2.rfc+'</div>':'')+(cl2.tel?'<div class="is">Tel: '+cl2.tel+'</div>':'')+(cl2.ciudad?'<div class="is">'+cl2.ciudad+'</div>':'')+'</div><div class="ib"><div class="il">Vendedor</div><div class="iv">'+(vend?vend.name:"—")+'</div><div class="is">Fecha: '+nota.fecha+'</div>'+(nota.vencimiento?'<div class="is">Vence: '+nota.vencimiento+'</div>':'')+'</div></div><div class="sec"><table><thead><tr><th>Producto / Descripción</th><th style="text-align:center">Cant./Medidas</th><th style="text-align:right">Precio</th><th style="text-align:center">Desc.</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr class="tot"><td colspan="4">TOTAL</td><td style="text-align:right">'+fmt(total)+'</td></tr></tfoot></table></div>'+(nota.notas?'<div class="notes">📝 <strong>Notas:</strong> '+nota.notas+'</div>':'')+'<div class="foot">'+APP_NAME+' — Generado el '+new Date().toLocaleDateString("es-MX")+' — '+nota.id+'</div></body></html>';

    // Use a hidden iframe instead of window.open — far more reliable, avoids popup blockers
    let frame=document.getElementById("print-frame-acerk");
    if(!frame){
      frame=document.createElement("iframe");
      frame.id="print-frame-acerk";
      frame.style.position="fixed";
      frame.style.right="0";
      frame.style.bottom="0";
      frame.style.width="0";
      frame.style.height="0";
      frame.style.border="0";
      document.body.appendChild(frame);
    }
    const fdoc=frame.contentWindow.document;
    fdoc.open();
    fdoc.write(html);
    fdoc.close();
    setTimeout(()=>{
      try{
        frame.contentWindow.focus();
        frame.contentWindow.print();
      }catch(e){
        console.error("Print error:",e);
        alert("No se pudo abrir el diálogo de impresión. Intenta de nuevo.");
      }
    },300);
  };

  const handleWA=()=>{
    const txt=buildTicketText(nota,clientes,productos,vend);
    const tel=(cl.tel||"").replace(/\D/g,"");
    window.open(`https://wa.me/52${tel}?text=${encodeURIComponent(txt)}`,"_blank");
  };

  return(
    <Modal onClose={onClose} title={`Nota de Venta — ${nota.id}`} width={700}>
      <div style={{background:"linear-gradient(135deg,#6366F1,#8B5CF6)",borderRadius:12,padding:"14px 18px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div><div style={{fontSize:20,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>{nota.id}</div><div style={{fontSize:12,opacity:.8}}>{nota.fecha}</div></div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:24,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>{fmt(total)}</div>
          <select value={nota.estado} onChange={e=>{const v=e.target.value;setNota(n=>({...n,estado:v}));onEstado(nota.id,v);}}
            style={{marginTop:4,background:"rgba(255,255,255,.2)",color:"#fff",border:"1px solid rgba(255,255,255,.4)",borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700,appearance:"none",WebkitAppearance:"none",outline:"none",cursor:"pointer"}}>
            {Object.entries(eLabel).map(([k,v])=><option key={k} value={k} style={{background:"#6366F1",color:"#fff"}}>{v}</option>)}
          </select>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:8,marginBottom:14}}>
        {[["👤 Cliente",cl.nombre],["📞 Tel",cl.tel||"—"],["🧑‍💼 Vendedor",vend?.name||"—"],["📋 RFC",cl.rfc||"—"],["📅 Fecha",nota.fecha],["📅 Vence",nota.vencimiento||"—"]].map(([k,v])=>(
          <div key={k} style={{background:"#0F1117",borderRadius:8,padding:"9px 11px"}}>
            <div style={{fontSize:9,color:"#475569",fontWeight:700,marginBottom:2}}>{k}</div>
            <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Anticipo / Saldo / Método de pago */}
      <div style={{background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)",borderRadius:10,padding:12,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:editMode?8:0}}>
          <span style={{fontSize:11,fontWeight:700,color:"#818CF8",textTransform:"uppercase",letterSpacing:.6}}>💰 Anticipo y Pago</span>
        </div>
        {editMode?(
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:8}}>
            <div>
              <div style={{fontSize:9,color:"#475569",fontWeight:700,marginBottom:3}}>ANTICIPO</div>
              <RawInput type="number" value={nota.anticipo||0} onChange={v=>setNota(n=>({...n,anticipo:parseFloat(v)||0}))} min={0} placeholder="0.00"/>
            </div>
            <div>
              <div style={{fontSize:9,color:"#475569",fontWeight:700,marginBottom:3}}>MÉTODO</div>
              <Sel value={nota.metodoPago||"efectivo"} onChange={v=>setNota(n=>({...n,metodoPago:v}))}>
                {METODOS_PAGO.map(m=><option key={m} value={m}>{metodoIcon[m]} {metodoLabel[m]}</option>)}
              </Sel>
            </div>
            <div style={{background:"#0F1117",borderRadius:8,padding:"8px 10px"}}>
              <div style={{fontSize:9,color:"#475569",fontWeight:700,marginBottom:2}}>SALDO PEND.</div>
              <div style={{fontSize:13,fontWeight:800,color:"#F59E0B"}}>{fmt(Math.max(0,total-(parseFloat(nota.anticipo)||0)))}</div>
            </div>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:8}}>
            <div>
              <div style={{fontSize:9,color:"#475569",fontWeight:700,marginBottom:2}}>ANTICIPO</div>
              <div style={{fontSize:14,fontWeight:700,color:"#10B981"}}>{fmt(getAnticipo(nota))}</div>
            </div>
            <div>
              <div style={{fontSize:9,color:"#475569",fontWeight:700,marginBottom:2}}>MÉTODO</div>
              <div style={{fontSize:13,fontWeight:600}}>{metodoIcon[nota.metodoPago||"efectivo"]} {metodoLabel[nota.metodoPago||"efectivo"]}</div>
            </div>
            <div>
              <div style={{fontSize:9,color:"#475569",fontWeight:700,marginBottom:2}}>{nota.estado==="cobrada"?"SALDO":"CUENTA POR COBRAR"}</div>
              <div style={{fontSize:14,fontWeight:800,color:nota.estado==="cobrada"?"#64748B":"#F59E0B"}}>{fmt(getSaldoPendiente(nota,productos))}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{background:"#0F1117",borderRadius:10,padding:12,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
          <span style={{fontSize:12,fontWeight:700,color:"#94A3B8"}}>Productos</span>
          {canEdit&&(
            <div style={{display:"flex",gap:6}}>
              {editMode&&<button onClick={addItem} style={{background:"rgba(99,102,241,.2)",border:"none",borderRadius:7,color:"#818CF8",padding:"4px 10px",fontSize:11,fontWeight:700}}>+ Agregar</button>}
              <button onClick={()=>{if(editMode)handleSaveEdit();else setEditMode(true);}}
                style={{background:editMode?"rgba(16,185,129,.2)":"rgba(245,158,11,.2)",border:"none",borderRadius:7,color:editMode?"#10B981":"#F59E0B",padding:"4px 12px",fontSize:11,fontWeight:700}}>
                {editMode?"✅ Guardar":"✏️ Editar"}
              </button>
              {editMode&&<button onClick={()=>{setNota({...nOrig,items:nOrig.items.map(it=>({...it}))});setEditMode(false);}}
                style={{background:"rgba(239,68,68,.15)",border:"none",borderRadius:7,color:"#EF4444",padding:"4px 10px",fontSize:11,fontWeight:700}}>✕ Cancelar</button>}
            </div>
          )}
        </div>

        {nota.items.map((it,i)=>{
          const prod=productos.find(p=>p.id===it.productoId);
          const gf=isGF(it.productoId,productos);
          const m2=gf?getM2(it):null;
          const sub=calcSubtotal(it,productos);
          if(!editMode) return(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #161B27",gap:8}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{prod?.nombre||"—"}</div>
                {it.descripcion&&<div style={{fontSize:11,color:"#94A3B8",marginTop:1,fontStyle:"italic"}}>{it.descripcion}</div>}
                <div style={{fontSize:11,color:"#64748B",marginTop:2}}>
                  {gf?<span style={{color:"#F59E0B"}}>{it.base||0}×{it.altura||0}m={((m2||0)*it.cantidad).toFixed(2)}m² · {fmt(it.precioUnit)}/m²</span>
                      :<span>{it.cantidad} {prod?.unidad} × {fmt(it.precioUnit)}</span>}
                  {it.descuento>0&&<span style={{color:"#F59E0B"}}> (-{it.descuento}%)</span>}
                </div>
              </div>
              <div style={{fontWeight:700,color:"#10B981",fontSize:14,flexShrink:0}}>{fmt(sub)}</div>
            </div>
          );
          return(
            <div key={i} style={{background:"#161B27",borderRadius:10,padding:10,marginBottom:8,border:"1px solid #1E2535"}}>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"2fr .6fr .9fr .6fr auto",gap:6,marginBottom:6}}>
                <Sel value={it.productoId} onChange={v=>{const p=productos.find(p=>p.id===+v);setItem(i,"productoId",+v);setItem(i,"precioUnit",p?.precioBase||0);setItem(i,"base","");setItem(i,"altura","");}}>
                  {productos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                </Sel>
                <RawInput type="number" value={it.cantidad} onChange={v=>setItem(i,"cantidad",+v)} min={1} placeholder="Cant."/>
                {!isMobile&&<RawInput type="number" value={it.precioUnit} onChange={v=>setItem(i,"precioUnit",+v)} min={0} placeholder="Precio"/>}
                {!isMobile&&<RawInput type="number" value={it.descuento} onChange={v=>setItem(i,"descuento",+v)} min={0} max={100} placeholder="Desc%"/>}
                {!isMobile&&<button onClick={()=>removeItem(i)} style={{background:"rgba(239,68,68,.15)",border:"none",borderRadius:7,color:"#EF4444",width:30,fontSize:15,cursor:"pointer"}}>×</button>}
              </div>
              {isMobile&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:6,marginBottom:6}}>
                  <RawInput type="number" value={it.precioUnit} onChange={v=>setItem(i,"precioUnit",+v)} min={0} placeholder="Precio"/>
                  <RawInput type="number" value={it.descuento} onChange={v=>setItem(i,"descuento",+v)} min={0} max={100} placeholder="Desc%"/>
                  <button onClick={()=>removeItem(i)} style={{background:"rgba(239,68,68,.15)",border:"none",borderRadius:7,color:"#EF4444",width:30,fontSize:15,cursor:"pointer"}}>×</button>
                </div>
              )}
              <input value={it.descripcion||""} onChange={e=>setItem(i,"descripcion",e.target.value)} placeholder="Descripción opcional (especificaciones, acabado, color…)"
                style={{...IS,fontSize:11,padding:"7px 10px",marginBottom:gf?6:0,color:"#94A3B8"}}/>
              {gf&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginTop:6}}>
                  <div><div style={{fontSize:9,color:"#F59E0B",fontWeight:700,marginBottom:3}}>📐 Base (m)</div><RawInput type="number" value={it.base} onChange={v=>setItem(i,"base",v)} placeholder="0.00" min={0}/></div>
                  <div><div style={{fontSize:9,color:"#F59E0B",fontWeight:700,marginBottom:3}}>Altura (m)</div><RawInput type="number" value={it.altura} onChange={v=>setItem(i,"altura",v)} placeholder="0.00" min={0}/></div>
                  <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#F59E0B",fontWeight:700,marginBottom:2}}>Área</div>
                    <div style={{fontWeight:700,color:"#F59E0B",fontSize:12}}>{((m2||0)*it.cantidad).toFixed(2)} m²</div>
                  </div>
                  <div style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#10B981",fontWeight:700,marginBottom:2}}>Subtotal</div>
                    <div style={{fontWeight:700,color:"#10B981",fontSize:12}}>{fmt(sub)}</div>
                  </div>
                </div>
              )}
              {!gf&&<div style={{textAlign:"right",fontSize:11,color:"#64748B",marginTop:4}}>Subtotal: <span style={{color:"#10B981",fontWeight:700}}>{fmt(sub)}</span></div>}
            </div>
          );
        })}
        <div style={{borderTop:"1px solid #1E2535",paddingTop:10,textAlign:"right",fontWeight:800,color:"#10B981",fontSize:18}}>
          Total: {fmt(total)}
        </div>
      </div>

      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:5}}>📝 NOTAS</div>
        {editMode?(
          <textarea value={nota.notas||""} onChange={e=>setNota(n=>({...n,notas:e.target.value}))} rows={2}
            style={{width:"100%",background:"#0F1117",border:"1px solid #1E2535",borderRadius:10,padding:"10px 12px",color:"#E2E8F0",fontSize:12,resize:"vertical"}}/>
        ):(
          nota.notas
            ?<div style={{background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.2)",borderRadius:10,padding:"10px 12px",fontSize:12,color:"#94A3B8"}}>{nota.notas}</div>
            :<div style={{color:"#475569",fontSize:12,fontStyle:"italic"}}>Sin notas</div>
        )}
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={handlePrint} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 14px",background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.35)",borderRadius:10,color:"#818CF8",fontWeight:700,fontSize:13,minWidth:120}}>
          🖨️ Imprimir / PDF
        </button>
        <button onClick={handleWA} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 14px",background:"rgba(37,211,102,.15)",border:"1px solid rgba(37,211,102,.35)",borderRadius:10,color:"#25D366",fontWeight:700,fontSize:13,minWidth:130}}>
          💬 WhatsApp
        </button>
        <button onClick={onClose} style={{padding:"10px 16px",background:"#1E2535",border:"none",borderRadius:10,color:"#94A3B8",fontWeight:600}}>✕ Cerrar</button>
      </div>
    </Modal>
  );
}

// ─── PANEL GASTOS ─────────────────────────────────────────────────────────────
function PanelGastos({gastos,setGastos,showToast,user}){
  const {isMobile}=useBreakpoint();
  const [modal,setModal]=useState(null);
  const [filtCat,setFiltCat]=useState("todas");
  const [search,setSearch]=useState("");
  const empty={id:null,concepto:"",categoria:"Materia Prima",monto:0,fecha:new Date().toISOString().split("T")[0],notas:"",metodoPago:"efectivo"};
  const save=(form)=>{
    if(!form.concepto||!form.monto){showToast("Completa los campos","error");return;}
    if(form.id){setGastos(prev=>prev.map(g=>g.id===form.id?form:g));showToast("Gasto actualizado ✓");}
    else{const id=Math.max(0,...gastos.map(g=>g.id))+1;setGastos(prev=>[...prev,{...form,id,monto:parseFloat(form.monto)||0}]);showToast("Gasto registrado ✓");}
    setModal(null);
  };
  const del=(id)=>{setGastos(prev=>prev.filter(g=>g.id!==id));showToast("Eliminado","error");};
  const filt=gastos.filter(g=>(filtCat==="todas"||g.categoria===filtCat)&&(g.concepto.toLowerCase().includes(search.toLowerCase())||g.categoria.toLowerCase().includes(search.toLowerCase())));
  const total=filt.reduce((s,g)=>s+g.monto,0);
  const all=gastos.reduce((s,g)=>s+g.monto,0);
  const byCat=CAT_GASTOS.map(c=>({cat:c,v:gastos.filter(g=>g.categoria===c).reduce((s,g)=>s+g.monto,0)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
  const cC={"Materia Prima":"#6366F1","Nómina":"#EF4444","Renta":"#F59E0B","Servicios":"#10B981","Equipo":"#8B5CF6","Mantenimiento":"#06B6D4","Marketing":"#F97316","Transporte":"#84CC16","Impuestos":"#EC4899","Otros":"#94A3B8"};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><h2 style={{fontFamily:"'Syne',sans-serif",fontSize:isMobile?20:24,fontWeight:800,marginBottom:2}}>Gastos</h2><p style={{color:"#64748B",fontSize:12}}>{filt.length} registros · {fmt(total)}</p></div>
        <button onClick={()=>setModal({data:{...empty}})} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 18px",background:"linear-gradient(135deg,#EF4444,#F97316)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:13}}>+ Registrar</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:16}}>
        <StatCard label="Total Gastos" value={fmt(all)} color="#EF4444" icon="💸"/>
        <StatCard label="Mayor Cat." value={byCat[0]?.cat||"—"} color="#8B5CF6" icon="🏷️"/>
      </div>
      {!isMobile&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
          <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:18}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:"#94A3B8"}}>Por Categoría</div>
            {byCat.map(x=>(
              <div key={x.cat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:cC[x.cat]||"#94A3B8",flexShrink:0}}/>
                <div style={{flex:1,fontSize:12}}>{x.cat}</div>
                <div style={{fontWeight:700,fontSize:12,color:cC[x.cat]||"#94A3B8"}}>{fmt(x.v)}</div>
                <div style={{width:60,height:4,background:"#1E2535",borderRadius:2}}><div style={{width:`${(x.v/all)*100}%`,height:"100%",background:cC[x.cat]||"#94A3B8",borderRadius:2}}/></div>
              </div>
            ))}
          </div>
          <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:18}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:"#94A3B8"}}>Por Mes</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={["Ene","Feb","Mar","Abr","May","Jun"].map((mes,i)=>({mes,total:gastos.filter(g=>new Date(g.fecha).getMonth()===i).reduce((s,g)=>s+g.monto,0)}))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2535"/>
                <XAxis dataKey="mes" tick={{fill:"#64748B",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"#64748B",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} width={34}/>
                <Tooltip contentStyle={{background:"#0F1117",border:"1px solid #1E2535",borderRadius:8,color:"#E2E8F0",fontSize:12}} formatter={v=>fmt(v)}/>
                <Bar dataKey="total" fill="#EF4444" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:8,marginBottom:12,flexDirection:"column"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar concepto…" style={IS}/>
        <Sel value={filtCat} onChange={setFiltCat}><option value="todas">Todas las categorías</option>{CAT_GASTOS.map(c=><option key={c} value={c}>{c}</option>)}</Sel>
      </div>
      {isMobile?(
        <div>
          {[...filt].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).map(g=>(
            <div key={g.id} style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:12,padding:14,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div><div style={{fontWeight:700,fontSize:14}}>{g.concepto}</div><div style={{fontSize:11,color:"#64748B",marginTop:2}}>{g.fecha}</div></div>
                <div style={{fontWeight:800,color:"#EF4444",fontSize:16}}>{fmt(g.monto)}</div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <span style={{background:(cC[g.categoria]||"#94A3B8")+"22",color:cC[g.categoria]||"#94A3B8",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{g.categoria}</span>
                  <span style={{background:metodoColor[g.metodoPago||"efectivo"]+"22",color:metodoColor[g.metodoPago||"efectivo"],padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{metodoIcon[g.metodoPago||"efectivo"]} {metodoLabel[g.metodoPago||"efectivo"]}</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <Btn icon="✏️" color="#F59E0B" onClick={()=>setModal({data:{...g}})}/>
                  {user.role==="admin"&&<Btn icon="🗑️" color="#EF4444" onClick={()=>del(g.id)}/>}
                </div>
              </div>
            </div>
          ))}
          {filt.length===0&&<div style={{textAlign:"center",padding:40,color:"#475569"}}>Sin registros</div>}
        </div>
      ):(
        <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#0F1117",borderBottom:"1px solid #1E2535"}}>
              {["Concepto","Categoría","Método","Monto","Fecha","Acciones"].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"12px 14px",color:"#475569",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[...filt].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).map((g,i)=>(
                <tr key={g.id} style={{borderBottom:"1px solid #0F1117",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}}>
                  <td style={{padding:"11px 14px",fontWeight:600,fontSize:13}}>{g.concepto}</td>
                  <td style={{padding:"11px 14px"}}><span style={{background:(cC[g.categoria]||"#94A3B8")+"22",color:cC[g.categoria]||"#94A3B8",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{g.categoria}</span></td>
                  <td style={{padding:"11px 14px"}}><span style={{background:metodoColor[g.metodoPago||"efectivo"]+"22",color:metodoColor[g.metodoPago||"efectivo"],padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{metodoIcon[g.metodoPago||"efectivo"]} {metodoLabel[g.metodoPago||"efectivo"]}</span></td>
                  <td style={{padding:"11px 14px",fontWeight:700,color:"#EF4444",fontSize:13}}>{fmt(g.monto)}</td>
                  <td style={{padding:"11px 14px",color:"#64748B",fontSize:12}}>{g.fecha}</td>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{display:"flex",gap:6}}>
                      <Btn icon="✏️" color="#F59E0B" onClick={()=>setModal({data:{...g}})}/>
                      {user.role==="admin"&&<Btn icon="🗑️" color="#EF4444" onClick={()=>del(g.id)}/>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filt.length===0&&<div style={{textAlign:"center",padding:40,color:"#475569"}}>Sin registros</div>}
          {filt.length>0&&<div style={{padding:"12px 14px",borderTop:"1px solid #1E2535",textAlign:"right",fontSize:13,color:"#64748B"}}>Total: <strong style={{color:"#EF4444"}}>{fmt(total)}</strong></div>}
        </div>
      )}
      {modal&&<GastoModal data={modal.data} onClose={()=>setModal(null)} onSave={save}/>}
    </div>
  );
}

function GastoModal({data,onClose,onSave}){
  const [form,setForm]=useState({...data,monto:data.monto||""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <Modal onClose={onClose} title={form.id?"Editar Gasto":"Registrar Gasto"} width={480}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={{gridColumn:"1/-1"}}><FInput label="Concepto" value={form.concepto} onChange={v=>set("concepto",v)} placeholder="Ej. Compra de tinta"/></div>
        <div><Label>Categoría</Label><Sel value={form.categoria} onChange={v=>set("categoria",v)}>{CAT_GASTOS.map(c=><option key={c} value={c}>{c}</option>)}</Sel></div>
        <FInput label="Monto (MXN)" value={form.monto} onChange={v=>set("monto",v)} type="number" placeholder="0.00"/>
        <div><Label>Método de pago</Label><Sel value={form.metodoPago||"efectivo"} onChange={v=>set("metodoPago",v)}>{METODOS_PAGO.map(m=><option key={m} value={m}>{metodoIcon[m]} {metodoLabel[m]}</option>)}</Sel></div>
        <div style={{gridColumn:"1/-1"}}><FInput label="Fecha" value={form.fecha} onChange={v=>set("fecha",v)} type="date"/></div>
        <div style={{gridColumn:"1/-1"}}><Label>Notas</Label><textarea value={form.notas} onChange={e=>set("notas",e.target.value)} rows={2} style={{width:"100%",background:"#0F1117",border:"1px solid #1E2535",borderRadius:10,padding:"10px 14px",color:"#E2E8F0",fontSize:13,resize:"vertical"}}/></div>
      </div>
      <SaveCancelBtns onSave={()=>onSave({...form,monto:parseFloat(form.monto)||0})} onClose={onClose} saveLabel={form.id?"Guardar":"Registrar gasto"}/>
    </Modal>
  );
}

// ─── VENTAS ───────────────────────────────────────────────────────────────────
function Ventas({notas,gastos,productos,clientes}){
  const {isMobile}=useBreakpoint();
  const cob=notas.filter(n=>n.estado==="cobrada");
  const tCob=notas.reduce((s,n)=>s+getIngresoReconocido(n,productos),0);
  const tGas=gastos.reduce((s,g)=>s+g.monto,0);
  const util=tCob-tGas;
  const porCobrar=notas.reduce((s,n)=>s+getCuentaPorCobrar(n,productos),0);
  const byMonth=["Ene","Feb","Mar","Abr","May","Jun"].map((mes,i)=>{
    const mn=notas.filter(n=>new Date(n.fecha).getMonth()===i);
    const ing=mn.reduce((s,n)=>s+getIngresoReconocido(n,productos),0);
    const gas=gastos.filter(g=>new Date(g.fecha).getMonth()===i).reduce((s,g)=>s+g.monto,0);
    return{mes,ingresos:ing,gastos:gas,utilidad:ing-gas};
  });
  const byProd=productos.map(p=>{
    const items=cob.flatMap(n=>n.items.filter(it=>it.productoId===p.id));
    return{nombre:p.nombre.split(" ").slice(0,2).join(" "),revenue:items.reduce((s,it)=>s+calcSubtotal(it,productos),0)};
  }).filter(p=>p.revenue>0).sort((a,b)=>b.revenue-a.revenue);
  const byClient=clientes.map(cl=>{
    const cs=notas.filter(n=>n.clienteId===cl.id);
    return{nombre:cl.nombre.split(" ").slice(0,2).join(" "),total:cs.reduce((s,n)=>s+getIngresoReconocido(n,productos),0),v:cs.filter(n=>getIngresoReconocido(n,productos)>0).length};
  }).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
  const byMetodo=METODOS_PAGO.map(m=>({metodo:m,total:notas.filter(n=>(n.metodoPago||"efectivo")===m).reduce((s,n)=>s+getIngresoReconocido(n,productos),0)})).filter(x=>x.total>0);
  return(
    <div>
      <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:isMobile?20:24,fontWeight:800,marginBottom:4}}>Ventas</h2>
      <p style={{color:"#64748B",fontSize:12,marginBottom:20}}>Ingresos, gastos y utilidad</p>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(5,1fr)",gap:12,marginBottom:20}}>
        <StatCard label="Ingresos" value={fmt(tCob)} color="#10B981" icon="💰"/>
        <StatCard label="Por Cobrar" value={fmt(porCobrar)} color="#F59E0B" icon="📋"/>
        <StatCard label="Gastos"   value={fmt(tGas)} color="#EF4444" icon="💸"/>
        <StatCard label="Utilidad" value={fmt(util)}  color={util>=0?"#6366F1":"#EF4444"} icon={util>=0?"📈":"📉"}/>
        <StatCard label="Margen"   value={`${tCob>0?((util/tCob)*100).toFixed(1):0}%`} color="#F59E0B" icon="📊"/>
      </div>
      {/* Ingresos por método de pago */}
      {byMetodo.length>0&&(
        <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:isMobile?14:20,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"#94A3B8"}}>Ingresos por Método de Pago</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":`repeat(${byMetodo.length},1fr)`,gap:12}}>
            {byMetodo.map(x=>(
              <div key={x.metodo} style={{background:"#0F1117",borderRadius:10,padding:"12px 14px",textAlign:isMobile?"left":"center"}}>
                <div style={{fontSize:20,marginBottom:4}}>{metodoIcon[x.metodo]}</div>
                <div style={{fontSize:11,color:"#64748B",fontWeight:600,marginBottom:2}}>{metodoLabel[x.metodo]}</div>
                <div style={{fontWeight:800,fontSize:16,color:metodoColor[x.metodo]}}>{fmt(x.total)}</div>
                <div style={{fontSize:10,color:"#475569",marginTop:2}}>{((x.total/tCob)*100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:isMobile?14:22,marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"#94A3B8"}}>Ingresos, Gastos y Utilidad</div>
        <ResponsiveContainer width="100%" height={isMobile?180:240}>
          <BarChart data={byMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2535"/>
            <XAxis dataKey="mes" tick={{fill:"#64748B",fontSize:isMobile?9:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:"#64748B",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} width={36}/>
            <Tooltip contentStyle={{background:"#0F1117",border:"1px solid #1E2535",borderRadius:8,color:"#E2E8F0",fontSize:12}} formatter={v=>fmt(v)}/>
            {!isMobile&&<Legend wrapperStyle={{fontSize:11,color:"#94A3B8"}}/>}
            <Bar dataKey="ingresos" name="Ingresos" fill="#10B981" radius={[4,4,0,0]}/>
            <Bar dataKey="gastos"   name="Gastos"   fill="#EF4444" radius={[4,4,0,0]}/>
            <Bar dataKey="utilidad" name="Utilidad" fill="#6366F1" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!isMobile&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:22}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"#94A3B8"}}>Revenue por Producto</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byProd} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2535" horizontal={false}/>
                <XAxis type="number" tick={{fill:"#64748B",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
                <YAxis type="category" dataKey="nombre" tick={{fill:"#94A3B8",fontSize:10}} axisLine={false} tickLine={false} width={100}/>
                <Tooltip contentStyle={{background:"#0F1117",border:"1px solid #1E2535",borderRadius:8,color:"#E2E8F0",fontSize:12}} formatter={v=>fmt(v)}/>
                <Bar dataKey="revenue" fill="#6366F1" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:22}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"#94A3B8"}}>Top Clientes</div>
            {byClient.map((cl,i)=>(
              <div key={cl.nombre} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #0F1117"}}>
                <div style={{width:24,height:24,borderRadius:7,background:`hsl(${i*60},50%,40%)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:11,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{cl.nombre}</div><div style={{fontSize:10,color:"#64748B"}}>{cl.v} ventas</div></div>
                <div style={{textAlign:"right"}}><div style={{fontWeight:700,color:"#10B981",fontSize:12}}>{fmt(cl.total)}</div><div style={{fontSize:10,color:"#475569"}}>{((cl.total/tCob)*100).toFixed(1)}%</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {isMobile&&byClient.length>0&&(
        <div style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:"#94A3B8"}}>Top Clientes</div>
          {byClient.map((cl,i)=>(
            <div key={cl.nombre} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #0F1117"}}>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{width:22,height:22,borderRadius:6,background:`hsl(${i*60},50%,40%)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:10}}>{i+1}</div>
                <span style={{fontWeight:600,fontSize:13}}>{cl.nombre}</span>
              </div>
              <span style={{fontWeight:700,color:"#10B981",fontSize:13}}>{fmt(cl.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function AdminPanel({users,setUsers,productos,setProductos,clientes,setClientes,showToast,currentUser}){
  const {isMobile}=useBreakpoint();
  const [tab,setTab]=useState("usuarios");
  return(
    <div>
      <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:isMobile?20:24,fontWeight:800,marginBottom:4}}>Administración</h2>
      <p style={{color:"#64748B",fontSize:12,marginBottom:20}}>Usuarios, productos y clientes</p>
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {[{id:"usuarios",l:"👤 Usuarios"},{id:"productos",l:"🖨️ Productos"},{id:"clientes",l:"🏢 Clientes"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"9px 16px",borderRadius:10,border:"1px solid "+(tab===t.id?"#6366F1":"#1E2535"),background:tab===t.id?"rgba(99,102,241,.15)":"#161B27",color:tab===t.id?"#818CF8":"#64748B",fontWeight:700,fontSize:12}}>{t.l}</button>
        ))}
      </div>
      {tab==="usuarios" &&<AdminUsuarios  users={users}    setUsers={setUsers}       showToast={showToast} currentUser={currentUser}/>}
      {tab==="productos"&&<AdminProductos productos={productos} setProductos={setProductos} showToast={showToast}/>}
      {tab==="clientes" &&<AdminClientes  clientes={clientes}   setClientes={setClientes}   showToast={showToast}/>}
    </div>
  );
}

function AdminUsuarios({users,setUsers,showToast,currentUser}){
  const [modal,setModal]=useState(null);
  const save=(f)=>{
    if(!f.name||!f.email||!f.password){showToast("Completa todos los campos","error");return;}
    if(f.id){setUsers(p=>p.map(u=>u.id===f.id?{...f,avatar:mkAvatar(f.name)}:u));showToast("Actualizado ✓");}
    else{const id=Math.max(...users.map(u=>u.id))+1;setUsers(p=>[...p,{...f,id,avatar:mkAvatar(f.name)}]);showToast("Creado ✓");}
    setModal(null);
  };
  const del=(id)=>{if(id===currentUser.id){showToast("No puedes eliminarte","error");return;}setUsers(p=>p.filter(u=>u.id!==id));showToast("Eliminado","error");};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{color:"#64748B",fontSize:12}}>{users.length} usuarios</span>
        <button onClick={()=>setModal({data:{id:null,name:"",email:"",password:"",role:"vendedor",avatar:""}})} style={{padding:"9px 16px",background:"linear-gradient(135deg,#6366F1,#8B5CF6)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:12}}>+ Nuevo</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
        {users.map(u=>(
          <div key={u.id} style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:16}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#6366F1,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:15,flexShrink:0}}>{u.avatar}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div><div style={{color:"#64748B",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div></div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{background:u.role==="admin"?"rgba(239,68,68,.15)":"rgba(16,185,129,.15)",color:u.role==="admin"?"#EF4444":"#10B981",padding:"3px 12px",borderRadius:20,fontSize:11,fontWeight:700,textTransform:"capitalize"}}>{u.role}</span>
              <div style={{display:"flex",gap:6}}><Btn icon="✏️" color="#F59E0B" onClick={()=>setModal({data:{...u}})}/><Btn icon="🗑️" color="#EF4444" onClick={()=>del(u.id)}/></div>
            </div>
          </div>
        ))}
      </div>
      {modal&&<Modal onClose={()=>setModal(null)} title={modal.data.id?"Editar Usuario":"Nuevo Usuario"} width={480}>
        <UserForm data={modal.data} onSave={save} onClose={()=>setModal(null)}/>
      </Modal>}
    </div>
  );
}

function UserForm({data,onSave,onClose}){
  const [f,setF]=useState(data);const set=(k,v)=>setF(p=>({...p,[k]:v}));
  return(
    <>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={{gridColumn:"1/-1"}}><FInput label="Nombre completo" value={f.name} onChange={v=>set("name",v)} placeholder="Ej. Juan García"/></div>
        <FInput label="Correo" value={f.email} onChange={v=>set("email",v)} type="email" placeholder="correo@acerk.com"/>
        <FInput label="Contraseña" value={f.password} onChange={v=>set("password",v)} placeholder="contraseña"/>
        <div><Label>Rol</Label><Sel value={f.role} onChange={v=>set("role",v)}><option value="vendedor">Vendedor</option><option value="admin">Administrador</option></Sel></div>
      </div>
      <SaveCancelBtns onSave={()=>onSave(f)} onClose={onClose} saveLabel={f.id?"Guardar cambios":"Crear usuario"}/>
    </>
  );
}

function AdminProductos({productos,setProductos,showToast}){
  const [modal,setModal]=useState(null);const [s,setS]=useState("");
  const save=(f)=>{
    if(!f.nombre||!f.precioBase){showToast("Completa los campos","error");return;}
    if(f.id){setProductos(p=>p.map(p=>p.id===f.id?f:p));showToast("Actualizado ✓");}
    else{const id=Math.max(...productos.map(p=>p.id))+1;setProductos(p=>[...p,{...f,id}]);showToast("Creado ✓");}
    setModal(null);
  };
  const del=(id)=>{setProductos(p=>p.filter(p=>p.id!==id));showToast("Eliminado","error");};
  const filt=productos.filter(p=>p.nombre.toLowerCase().includes(s.toLowerCase()));
  const cC={Offset:"#6366F1",Digital:"#10B981","Gran Formato":"#F59E0B",Serigrafía:"#8B5CF6",Sublimación:"#06B6D4"};
  return(
    <div>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <input value={s} onChange={e=>setS(e.target.value)} placeholder="Buscar producto…" style={{...IS,flex:1}}/>
        <button onClick={()=>setModal({data:{id:null,nombre:"",categoria:"Offset",precioBase:0,unidad:"millar"}})} style={{padding:"9px 16px",background:"linear-gradient(135deg,#6366F1,#8B5CF6)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:12}}>+ Nuevo</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
        {filt.map(p=>(
          <div key={p.id} style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{p.nombre}</div><span style={{background:(cC[p.categoria]||"#6366F1")+"22",color:cC[p.categoria]||"#6366F1",padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,marginTop:4,display:"inline-block"}}>{p.categoria}</span></div>
              <div style={{display:"flex",gap:5}}><Btn icon="✏️" color="#F59E0B" small onClick={()=>setModal({data:{...p}})}/><Btn icon="🗑️" color="#EF4444" small onClick={()=>del(p.id)}/></div>
            </div>
            <div style={{fontSize:16,fontWeight:800,color:"#10B981"}}>{fmt(p.precioBase)}<span style={{fontSize:11,color:"#64748B",fontWeight:400}}>/{p.unidad==="m2"?"m²":p.unidad}</span></div>
          </div>
        ))}
      </div>
      {modal&&<Modal onClose={()=>setModal(null)} title={modal.data.id?"Editar Producto":"Nuevo Producto"} width={460}>
        <ProdForm data={modal.data} onSave={save} onClose={()=>setModal(null)}/>
      </Modal>}
    </div>
  );
}

function ProdForm({data,onSave,onClose}){
  const [f,setF]=useState(data);const set=(k,v)=>setF(p=>({...p,[k]:v}));
  return(
    <>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={{gridColumn:"1/-1"}}><FInput label="Nombre del producto" value={f.nombre} onChange={v=>set("nombre",v)} placeholder="Ej. Lonas Publicitarias"/></div>
        <div><Label>Categoría</Label><Sel value={f.categoria} onChange={v=>set("categoria",v)}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</Sel></div>
        <div><Label>Unidad</Label><Sel value={f.unidad} onChange={v=>set("unidad",v)}>{["millar","ciento","pieza","rollo","m2","pliego","juego"].map(u=><option key={u} value={u}>{u==="m2"?"m²":u}</option>)}</Sel></div>
        <div style={{gridColumn:"1/-1"}}><FInput label="Precio base (MXN)" value={f.precioBase} onChange={v=>set("precioBase",parseFloat(v)||0)} type="number" placeholder="0.00"/></div>
      </div>
      <SaveCancelBtns onSave={()=>onSave(f)} onClose={onClose} saveLabel={f.id?"Guardar cambios":"Crear producto"}/>
    </>
  );
}

function AdminClientes({clientes,setClientes,showToast}){
  const [modal,setModal]=useState(null);const [s,setS]=useState("");
  const save=(f)=>{
    if(!f.nombre){showToast("El nombre es requerido","error");return;}
    if(f.id){setClientes(p=>p.map(c=>c.id===f.id?f:c));showToast("Actualizado ✓");}
    else{const id=Math.max(...clientes.map(c=>c.id))+1;setClientes(p=>[...p,{...f,id}]);showToast("Creado ✓");}
    setModal(null);
  };
  const del=(id)=>{setClientes(p=>p.filter(c=>c.id!==id));showToast("Eliminado","error");};
  const filt=clientes.filter(c=>c.nombre.toLowerCase().includes(s.toLowerCase())||c.ciudad?.toLowerCase().includes(s.toLowerCase()));
  return(
    <div>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <input value={s} onChange={e=>setS(e.target.value)} placeholder="Buscar cliente…" style={{...IS,flex:1}}/>
        <button onClick={()=>setModal({data:{id:null,nombre:"",rfc:"",tel:"",email:"",ciudad:""}})} style={{padding:"9px 16px",background:"linear-gradient(135deg,#6366F1,#8B5CF6)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:12}}>+ Nuevo</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
        {filt.map(c=>(
          <div key={c.id} style={{background:"#161B27",border:"1px solid #1E2535",borderRadius:14,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div><div style={{fontWeight:700,fontSize:14}}>{c.nombre}</div><div style={{fontSize:11,color:"#64748B",marginTop:2}}>{c.ciudad}</div></div>
              <div style={{display:"flex",gap:5}}><Btn icon="✏️" color="#F59E0B" small onClick={()=>setModal({data:{...c}})}/><Btn icon="🗑️" color="#EF4444" small onClick={()=>del(c.id)}/></div>
            </div>
            <div style={{fontSize:11,color:"#94A3B8"}}>
              {c.tel&&<div>📞 {c.tel}</div>}
              {c.rfc&&<div style={{marginTop:2}}>RFC: {c.rfc}</div>}
            </div>
          </div>
        ))}
      </div>
      {modal&&<Modal onClose={()=>setModal(null)} title={modal.data.id?"Editar Cliente":"Nuevo Cliente"} width={480}>
        <ClienteForm data={modal.data} onSave={save} onClose={()=>setModal(null)}/>
      </Modal>}
    </div>
  );
}

function ClienteForm({data,onSave,onClose}){
  const [f,setF]=useState(data);const set=(k,v)=>setF(p=>({...p,[k]:v}));
  return(
    <>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={{gridColumn:"1/-1"}}><FInput label="Nombre / Razón Social" value={f.nombre} onChange={v=>set("nombre",v)} placeholder="Ej. Empresa ABC"/></div>
        <FInput label="RFC" value={f.rfc} onChange={v=>set("rfc",v)} placeholder="RFC (opcional)"/>
        <FInput label="Teléfono WhatsApp" value={f.tel} onChange={v=>set("tel",v)} placeholder="10 dígitos"/>
        <FInput label="Correo" value={f.email} onChange={v=>set("email",v)} type="email" placeholder="correo@empresa.com"/>
        <FInput label="Ciudad" value={f.ciudad} onChange={v=>set("ciudad",v)} placeholder="Culiacán"/>
      </div>
      <SaveCancelBtns onSave={()=>onSave(f)} onClose={onClose} saveLabel={f.id?"Guardar cambios":"Crear cliente"}/>
    </>
  );
}
