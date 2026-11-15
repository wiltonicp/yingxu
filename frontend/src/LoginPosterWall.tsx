import posters from '../public/login-posters/posters.json';

/** Bundled public film artwork; login never needs a metadata key or private library access. */
export function LoginPosterWall(){
 return <div className="phone-auth-wall" aria-hidden="true">{posters.map((poster,index)=><img key={poster.tmdb_id} src={poster.src} alt="" width="500" height="750" decoding="async" fetchPriority={index<6?'high':'auto'} draggable={false}/>)}</div>;
}
