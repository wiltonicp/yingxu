export function Loading({label='正在加载…',kind='rows',count=3}:{label?:string;kind?:'rows'|'posters'|'compact';count?:number}){
 if(kind==='compact')return <span className="inline-loading" role="status"><span className="design-sk inline-sk" aria-hidden="true"/>{label}</span>;
 return <div role="status" aria-label={label} aria-busy="true" className={kind==='posters'?'poster-wall loading-posters':'loading-rows'}><span className="sr-only">{label}</span>{Array.from({length:count},(_,i)=><div key={i} className={kind==='posters'?'loading-poster':'loading-row'} aria-hidden="true">{kind==='posters'&&<div className="design-sk loading-art"/>}<div className="design-sk loading-line"/><div className="design-sk loading-line short"/></div>)}</div>;
}
