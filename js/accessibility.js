// Accessibility helpers for modal focus management and announcements.

const returnFocus=new WeakMap();
const suppressRestore=new WeakSet();
const FOCUSABLE=[
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function focusables(root){
  return [...root.querySelectorAll(FOCUSABLE)].filter(el=>
    !el.hidden && el.getAttribute("aria-hidden")!=="true"
  );
}

export function setupDialog(dialog){
  if(!dialog||dialog.dataset.a11yReady==="1")return;
  dialog.dataset.a11yReady="1";

  dialog.addEventListener("keydown",event=>{
    if(event.key!=="Tab"||!dialog.open)return;
    const items=focusables(dialog);
    if(!items.length){
      event.preventDefault();
      dialog.setAttribute("tabindex","-1");
      dialog.focus();
      return;
    }
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&document.activeElement===first){
      event.preventDefault();last.focus();
    }else if(!event.shiftKey&&document.activeElement===last){
      event.preventDefault();first.focus();
    }
  });

  dialog.addEventListener("close",()=>{
    if(suppressRestore.has(dialog)){
      suppressRestore.delete(dialog);
      return;
    }
    const target=returnFocus.get(dialog);
    if(target&&typeof target.focus==="function"&&document.contains(target)){
      requestAnimationFrame(()=>target.focus());
    }
  });
}

export function openDialog(dialog,{initialFocus=null,preserveReturnFocus=false}={}){
  if(!dialog)return;
  setupDialog(dialog);
  if(!preserveReturnFocus)returnFocus.set(dialog,document.activeElement);
  if(!dialog.open)dialog.showModal();
  requestAnimationFrame(()=>{
    const target=(initialFocus&&dialog.querySelector(initialFocus))||focusables(dialog)[0]||dialog;
    if(target===dialog)dialog.setAttribute("tabindex","-1");
    if(typeof target.focus==="function")target.focus();
  });
}

export function closeDialog(dialog,{restoreFocus=true}={}){
  if(!dialog||!dialog.open)return;
  if(!restoreFocus)suppressRestore.add(dialog);
  dialog.close();
}

export function announce(message){
  const live=document.getElementById("srStatus");
  if(!live)return;
  live.textContent="";
  requestAnimationFrame(()=>{live.textContent=message||"";});
}
