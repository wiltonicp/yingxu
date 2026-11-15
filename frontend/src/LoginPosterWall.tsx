import posters from '../public/login-posters/posters.json';

/** Bundled public film artwork; login never needs a metadata key or private library access. */
export function LoginPosterWall({className='phone-auth-wall',repeat=1}:{className?:string;repeat?:number}){
 return <div className={className} aria-hidden="true">{Array.from({length:repeat},()=>posters).flat().map((poster,index)=><img key={poster.tmdb_id+':'+index} src={poster.src} alt="" width="500" height="750" decoding="async" fetchPriority={index<6?'high':'auto'} draggable={false}/>)}</div>;
}
