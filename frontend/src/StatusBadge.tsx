export function statusTone(status:string){
 if(['running','active','ok','succeeded','approved','available','enabled','verified','identified','sent','sending'].includes(status))return 'success';
 if(['failed','error','rejected','cancelled_share','expired','tmdb_auth_failed'].includes(status))return 'danger';
 if(['pending','blocked','blocked_tmdb','retry_wait','stopping','catching_up','partial_blocked','needs_confirmation','skipped','unknown','failed_identification'].includes(status))return 'warning';
 if(['disabled','stopped','cancelled','replaced','unconfigured'].includes(status))return 'muted';
 return 'info';
}
export function StatusBadge({status,label}:{status:string;label:string}){return <span className={'status-pill tone-'+statusTone(status)} data-status={status}>{label}</span>;}
