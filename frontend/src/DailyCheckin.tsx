import {useEffect,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {CalendarCheck2,Clock3,Save} from 'lucide-react';
import {api} from './api';
import './DailyCheckin.css';

type Config={enabled:boolean;time:string};
type Result={config:Config;timezone:string;next_at:string|null;status:{state?:string;is_today?:boolean;message?:string;finished_at?:number;started_at?:number}};
const states:Record<string,[string,string]>={succeeded:['签到成功','success'],already_signed:['今日已签到','success'],running:['执行中','pending'],uncertain:['待核对','warning'],failed:['执行失败','error'],blocked:['等待授权','warning'],cancelled:['已取消','neutral']};
export function DailyCheckin({provider}:{provider:'115'|'re0'}){
 const name=provider==='115'?'115':'RE0',cache=useQueryClient(),key=['daily-checkin',provider];
 const query=useQuery({queryKey:key,queryFn:()=>api<Result>('/settings/checkin/'+provider),refetchInterval:30000});
 const [draft,setDraft]=useState<Config|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>{setDraft(null);setError('');setSaved(false);},[provider]);
 const value=draft??query.data?.config,state=query.data?.status;
 const badge=state?.state==='already_signed'&&!state.is_today?['上次已签到','success']:state?.state?states[state.state]:null;
 async function save(){
  if(!value)return;setBusy(true);setError('');setSaved(false);
  try{const result=await api<Result&{saved:boolean}>('/settings/checkin/'+provider,'PUT',value);if(!result.saved)throw new Error('保存未确认');cache.setQueryData(key,result);setDraft(null);setSaved(true);}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section className="panel daily-checkin" aria-label={name+'每日签到设置'}>
  <div className="checkin-heading"><span className="checkin-icon"><CalendarCheck2 size={24}/></span><div><h2>{name} 每日签到</h2><p>独立定时执行，不影响订阅、转存或整理任务。</p></div>{badge&&<span className={'checkin-badge '+badge[1]}><i/>{badge[0]}</span>}</div>
  {value&&<><div className="checkin-switch-row"><div><strong>自动签到</strong><p>使用已保存的{name==='115'?'115扫码会话':'RE0授权'}，默认关闭。</p></div><label className="switch"><input type="checkbox" role="switch" aria-label={'启用'+name+'自动签到'} disabled={busy} checked={value.enabled} onChange={e=>{setDraft({...value,enabled:e.target.checked});setSaved(false);}}/></label></div>
  <div className="checkin-schedule"><label><span><Clock3 size={16}/>每日签到时间</span><input type="time" required aria-label={name+'签到时间'} disabled={busy} value={value.time} onChange={e=>{setDraft({...value,time:e.target.value});setSaved(false);}}/></label><div className="checkin-schedule-note"><strong>北京时间 · UTC+8</strong><p>服务需保持运行；当日错过时间，启动后补执行一次。今日已完成或结果待核对时不重复提交。</p></div></div>
  <div className="checkin-status"><span>{query.data?.config.enabled?'计划已启用':'计划未启用'}</span>{query.data?.next_at&&<span>下次执行：{new Date(query.data.next_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</span>}{state?.message&&<p>{state.is_today?'':'上次状态：'}{state.message}</p>}{state?.finished_at&&<small>最近执行：{new Date(state.finished_at*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</small>}</div>
  <footer><button className="primary" disabled={busy||!draft||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)} onClick={save}><Save size={16}/>{busy?'保存中…':'保存签到设置'}</button>{saved&&<span className="checkin-saved" role="status">已保存</span>}{draft&&<span className="muted">有未保存修改</span>}</footer></>}
  {query.isPending&&<p className="muted">读取签到计划…</p>}{(error||query.error)&&<p className="error" role="alert">{error||query.error?.message}</p>}
 </section>;
}
