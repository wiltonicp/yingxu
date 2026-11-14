import './Brand.css';
import {VersionBadge} from './VersionBadge';

export function Brand({showVersion=false}:{showVersion?:boolean}){
 return <div className={'brand'+(showVersion?' brand--version':'')}><img className="brand-mark" src="/yingxu-logo.svg?v=2" alt="" width="34" height="34"/><div className="brand-copy"><b className="brand-wordmark">映序</b>{showVersion&&<VersionBadge compact/>}</div></div>;
}
