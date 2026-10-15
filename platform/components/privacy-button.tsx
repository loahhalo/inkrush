'use client';
export default function PrivacyButton(){return <button onClick={()=>window.dispatchEvent(new Event('inkrush:privacy'))}>Privacy choices</button>;}
