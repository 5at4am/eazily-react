import { useRef } from 'react';
export default function OtpInput({value,onChange,disabled,length=8}){
  const inputs=useRef([]);
  const put=(index,text)=>{
    const digits=text.replace(/\D/g,'').slice(0,length);
    if(digits.length>1){onChange(digits);inputs.current[Math.min(digits.length,length-1)]?.focus();return;}
    const next=Array.from({length},(_,i)=>value[i]||'');next[index]=digits;onChange(next.join(''));
    if(digits)inputs.current[Math.min(index+1,length-1)]?.focus();
  };
  return <fieldset className="otp-field"><legend>Verification code</legend><div className="otp-digits" data-length={length}>{Array.from({length},(_,index)=><input key={index} ref={node=>{inputs.current[index]=node;}} aria-label={`Code digit ${index+1}`} autoComplete={index===0?'one-time-code':'off'} inputMode="numeric" pattern="[0-9]*" value={value[index]||''} disabled={disabled} onChange={event=>put(index,event.target.value)} onPaste={event=>{event.preventDefault();put(0,event.clipboardData.getData('text'));}} onKeyDown={event=>{if(event.key==='Backspace'&&!value[index]&&index)inputs.current[index-1]?.focus();if(event.key==='ArrowLeft')inputs.current[Math.max(0,index-1)]?.focus();if(event.key==='ArrowRight')inputs.current[Math.min(length-1,index+1)]?.focus();}}/>)}</div></fieldset>;
}
