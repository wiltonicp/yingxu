type LibraryIdentity={emby_id:string;media_type:'movie'|'tv';tmdb_id:string};

export function uniqueLibraryItems<T extends LibraryIdentity>(items:readonly T[]):T[]{
 const embyIds=new Set<string>(), titles=new Set<string>();
 return items.filter(item=>{
  // Emby may return one title from more than one library folder or edition.
  // Never infer equivalence from a title, year or poster alone.
  const identity=/^[1-9][0-9]*$/.test(item.tmdb_id)?item.media_type+':'+item.tmdb_id:null;
  if(embyIds.has(item.emby_id))return false;
  embyIds.add(item.emby_id);
  if(!identity)return true;
  if(titles.has(identity))return false;
  titles.add(identity);
  return true;
 });
}
